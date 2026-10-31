<?php

namespace App\Services;

use App\Models\Package;
use App\Models\ProductVariant;
use App\Models\Rental;
use App\Models\RentalItem;
use App\Models\RentalPayment;
use App\Models\VariantMaintenance;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Alur admin untuk rental (tanpa pencatatan pickup): mengonfirmasi atau
 * menolak bukti pembayaran QRIS dan mencatat pengembalian barang
 * beserta denda keterlambatan dan waktu pelepasan stok.
 */
class RentalWorkflowService
{
    /**
     * Konfirmasi bukti pembayaran: waiting_confirmation menjadi dp_paid
     * atau fully_paid sesuai payment_type. Pembayaran sisa & deposit
     * dilunasi di outlet, jadi tidak ada pembayaran online lanjutan.
     *
     * @throws ValidationException
     */
    public function confirmPayment(Rental $rental): Rental
    {
        if ($rental->status !== 'waiting_confirmation') {
            throw ValidationException::withMessages([
                'rental' => 'Rental ini tidak sedang menunggu konfirmasi pembayaran.',
            ]);
        }

        $payment = $this->proofAwaitingReview($rental);

        $paidStatus = $rental->payment_type === 'down_payment' ? 'dp_paid' : 'fully_paid';

        $payment->update([
            'status' => 'approved',
            'reviewed_at' => CarbonImmutable::now(),
        ]);

        $rental->update(['status' => $paidStatus]);

        return $rental->fresh();
    }

    /**
     * Tolak bukti pembayaran: rental batal beserta alasannya.
     * Status cancelled tidak memblokir stok, jadi stok langsung lepas.
     *
     * @throws ValidationException
     */
    public function rejectPayment(Rental $rental, string $reason): Rental
    {
        if ($rental->status !== 'waiting_confirmation') {
            throw ValidationException::withMessages([
                'rental' => 'Rental ini tidak sedang menunggu konfirmasi pembayaran.',
            ]);
        }

        $payment = $this->proofAwaitingReview($rental);

        $payment->update([
            'status' => 'rejected',
            'reviewed_at' => CarbonImmutable::now(),
        ]);

        $rental->update([
            'status' => 'cancelled',
            'cancel_reason' => $reason,
        ]);

        return $rental->fresh();
    }

    /**
     * Catat pengembalian barang: set returned_at, hitung denda
     * keterlambatan, dan tentukan kapan stok kembali tersedia
     * (tanggal kembali + 1 hari buffer, ready jam 00:00 berikutnya),
     * serta proses Return Inspector checklist per rental_items.
     *
     * @param  array<int, array{
     *     rental_item_id: int,
     *     condition?: string,
     *     needs_maintenance?: bool,
     *     maintenance_qty?: int,
     *     maintenance_reason?: string,
     *     product_variant_id?: int,
     *     notes?: string|null,
     *     lost_qty?: int
     * }>  $inspections
     * @throws ValidationException
     */
    public function confirmReturn(Rental $rental, array $inspections = []): Rental
    {
        if (! in_array($rental->status, ['dp_paid', 'fully_paid'], true)) {
            throw ValidationException::withMessages([
                'rental' => 'Rental ini belum dapat dikonfirmasi pengembaliannya.',
            ]);
        }

        return DB::transaction(function () use ($rental, $inspections) {
            $returnedAt = CarbonImmutable::now();
            $lateDays = max(0, (int) $rental->end_date->startOfDay()->diffInDays($returnedAt->startOfDay(), false));
            $lateFeeAmount = $lateDays * (float) $rental->late_fee_per_day;

            $rental->update([
                'returned_at' => $returnedAt,
                'return_confirmed_by' => 'admin',
                'return_confirmed_at' => $returnedAt,
                'late_days' => $lateDays,
                'late_fee_amount' => $lateFeeAmount,
                'stock_release_at' => $returnedAt->startOfDay()->addDays(2),
                'status' => 'returned',
            ]);

            $this->processReturnInspections($rental, $inspections);

            return $rental->fresh();
        });
    }

    /**
     * Proses hasil inspeksi pengembalian barang (AD-08 Return Inspector).
     *
     * - Kondisi 'good': return_condition = 'good'. Jika needs_maintenance diceklis admin,
     *   masukkan juga ke antrean perawatan (misal cuci rutin).
     * - Kondisi 'damaged': return_condition = 'damaged', needs_maintenance = true,
     *   buat rekaman VariantMaintenance (in_maintenance).
     * - Kondisi 'lost': return_condition = 'lost', kurangi stok varian permanen di DB.
     *
     * @param  array<int, array<string, mixed>>  $inspections
     */
    private function processReturnInspections(Rental $rental, array $inspections): void
    {
        $rental->loadMissing('items.rentable');

        // Petakan inspeksi berdasarkan rental_item_id
        $inspectionsByItemId = collect($inspections)->keyBy('rental_item_id');

        foreach ($rental->items as $item) {
            $inspection = $inspectionsByItemId->get($item->id);

            // Default jika tidak ada inspeksi eksplisit: kondisi 'good', tanpa maintenance
            $condition = $inspection['condition'] ?? 'good';
            if (! in_array($condition, ['good', 'damaged', 'lost'], true)) {
                $condition = 'good';
            }

            $needsMaintenance = (bool) ($inspection['needs_maintenance'] ?? ($condition === 'damaged'));
            $itemNotes = isset($inspection['notes']) ? trim((string) $inspection['notes']) : null;
            $maintenanceQty = max(1, min((int) ($inspection['maintenance_qty'] ?? $item->quantity), $item->quantity));
            $maintenanceReason = $inspection['maintenance_reason'] ?? ($condition === 'damaged' ? 'repair' : 'cleaning');
            if (! in_array($maintenanceReason, ['cleaning', 'repair', 'inspection'], true)) {
                $maintenanceReason = 'repair';
            }

            $item->update([
                'return_condition' => $condition,
                'needs_maintenance' => $needsMaintenance,
            ]);

            // 1. Jika barang hilang: kurangi stock varian secara permanen (PRD 6.2.3)
            if ($condition === 'lost') {
                $lostQty = max(1, min((int) ($inspection['lost_qty'] ?? $inspection['maintenance_qty'] ?? $item->quantity), $item->quantity));
                $this->handleLostItem($item, $lostQty);
            }

            // 2. Jika perlu maintenance (rusak atau cuci/inspeksi rutin): buat antrean VariantMaintenance
            if ($needsMaintenance && $condition !== 'lost') {
                $overrideVariantId = isset($inspection['product_variant_id']) ? (int) $inspection['product_variant_id'] : null;
                $this->createMaintenanceRecord($item, $maintenanceQty, $maintenanceReason, $itemNotes, $overrideVariantId);
            }
        }
    }

    /**
     * Kurangi stok varian permanen karena barang hilang.
     */
    private function handleLostItem(RentalItem $item, int $lostQty): void
    {
        $rentable = $item->rentable;

        if ($rentable instanceof ProductVariant) {
            $rentable->decrement('stock', min($rentable->stock, $lostQty));
        } elseif ($rentable instanceof Package) {
            // Jika paket hilang, kurangi stok tiap varian penyusunnya
            $rentable->loadMissing('items.variant');
            foreach ($rentable->items as $packageItem) {
                if ($packageItem->variant) {
                    $qtyToDecrement = $packageItem->quantity * $lostQty;
                    $packageItem->variant->decrement('stock', min($packageItem->variant->stock, $qtyToDecrement));
                }
            }
        }
    }

    /**
     * Buat rekaman antrean perawatan (VariantMaintenance).
     */
    private function createMaintenanceRecord(
        RentalItem $item,
        int $quantity,
        string $reason,
        ?string $notes,
        ?int $overrideVariantId = null,
    ): void {
        $rentable = $item->rentable;
        $variantId = $overrideVariantId;

        if (! $variantId) {
            if ($rentable instanceof ProductVariant) {
                $variantId = $rentable->id;
            } elseif ($rentable instanceof Package) {
                // Ambil varian pertama dari paket jika tidak dispesifikasikan
                $rentable->loadMissing('items');
                $variantId = $rentable->items->firstWhere('product_variant_id', '!=', null)?->product_variant_id;
            }
        }

        if ($variantId) {
            VariantMaintenance::create([
                'product_variant_id' => $variantId,
                'rental_item_id' => $item->id,
                'quantity' => $quantity,
                'reason' => $reason,
                'status' => 'in_maintenance',
                'notes' => $notes,
            ]);
        }
    }

    /**
     * Batalkan rental secara manual oleh admin (kapan pun sebelum returned).
     *
     * @throws ValidationException
     */
    public function cancel(Rental $rental, string $reason): Rental
    {
        if ($rental->status === 'returned') {
            throw ValidationException::withMessages([
                'rental' => 'Rental yang sudah dikembalikan tidak dapat dibatalkan.',
            ]);
        }

        if ($rental->status === 'cancelled') {
            throw ValidationException::withMessages([
                'rental' => 'Rental ini sudah dibatalkan.',
            ]);
        }

        $rental->update([
            'status' => 'cancelled',
            'cancel_reason' => $reason,
        ]);

        return $rental->fresh();
    }

    /**
     * Bukti pembayaran yang masih menunggu review admin.
     *
     * @throws ValidationException
     */
    private function proofAwaitingReview(Rental $rental): RentalPayment
    {
        $payment = $rental->payments()
            ->whereNotNull('proof_path')
            ->where('status', 'waiting')
            ->first();

        if ($payment === null) {
            throw ValidationException::withMessages([
                'rental' => 'Bukti pembayaran tidak ditemukan.',
            ]);
        }

        return $payment;
    }
}
