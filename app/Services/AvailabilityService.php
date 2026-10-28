<?php

namespace App\Services;

use App\Models\PackageItem;
use App\Models\ProductVariant;
use App\Models\Rental;
use App\Models\RentalItem;
use App\Models\VariantMaintenance;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;

/**
 * Menghitung ketersediaan stok mempertimbangkan:
 *  1. Rental aktif yang overlapping (rentang + buffer 1 hari).
 *  2. Unit dalam maintenance (in_maintenance).
 *
 * Operasional toko: 18:00-23:59 setiap hari.
 * Buffer setelah rental: 1 hari penuh, stok ready jam 00:00 hari berikutnya.
 */
class AvailabilityService
{
    /**
     * Status rental yang memblokir stok.
     *
     * @var list<string>
     */
    public const BLOCKING_STATUSES = [
        'pending_payment',
        'waiting_confirmation',
        'dp_paid',
        'fully_paid',
        'picked_up',
        'returned',
    ];

    /**
     * Stok tersedia untuk SATU varian pada rentang tanggal tertentu.
     *
     * @param  int  $variantId  ID dari product_variant
     * @param  CarbonInterface  $pickupDate  tanggal ambil (start_date)
     * @param  CarbonInterface  $returnDate  tanggal kembali (end_date, sebelum buffer)
     * @return int stok yang tersedia (0 or lebih)
     */
    public function availableStock(
        int $variantId,
        CarbonInterface $pickupDate,
        CarbonInterface $returnDate,
    ): int {
        $totalStock = ProductVariant::where('id', $variantId)->value('stock') ?? 0;

        return max(0, $totalStock - $this->rentedQty($variantId, $pickupDate, $returnDate) - $this->maintenanceQty($variantId));
    }

    /**
     * Stok tersedia untuk BANYAK varian sekaligus (efisien, 3 query total).
     *
     * @param  array<int>  $variantIds
     * @param  CarbonInterface  $pickupDate  tanggal ambil
     * @param  CarbonInterface  $returnDate  tanggal kembali
     * @return array<int, int> map variantId => availableQty
     */
    public function batchAvailableStock(
        array $variantIds,
        CarbonInterface $pickupDate,
        CarbonInterface $returnDate,
    ): array {
        if (empty($variantIds)) {
            return [];
        }

        // 1. Total stok per varian
        $stocks = ProductVariant::whereIn('id', $variantIds)
            ->pluck('stock', 'id');

        // 2. Stok terpakai oleh rental aktif overlapping (satu query GROUP BY)
        $rented = $this->batchRentedQty($variantIds, $pickupDate, $returnDate);

        // 3. Stok dalam maintenance
        $maintenance = VariantMaintenance::query()
            ->selectRaw('product_variant_id, SUM(quantity) as qty')
            ->whereIn('product_variant_id', $variantIds)
            ->where('status', 'in_maintenance')
            ->groupBy('product_variant_id')
            ->pluck('qty', 'product_variant_id');

        $result = [];
        foreach ($variantIds as $id) {
            $total = (int) ($stocks[$id] ?? 0);
            $used = (int) ($rented[$id] ?? 0) + (int) ($maintenance[$id] ?? 0);
            $result[$id] = max(0, $total - $used);
        }

        return $result;
    }

    /**
     * Ketersediaan paket = min floor(available(variant) / qty_per_paket) dari semua items.
     *
     * @return int jumlah paket yang tersedia
     */
    public function availablePackageStock(
        int $packageId,
        CarbonInterface $pickupDate,
        CarbonInterface $returnDate,
    ): int {
        $items = PackageItem::where('package_id', $packageId)->get();

        if ($items->isEmpty()) {
            return 0;
        }

        $variantIds = $items
            ->where('product_variant_id', '!=', null)
            ->pluck('product_variant_id')
            ->all();

        if (empty($variantIds)) {
            return 0;
        }

        $availability = $this->batchAvailableStock($variantIds, $pickupDate, $returnDate);

        return $items->reduce(function (mixed $carry, PackageItem $item) use ($availability): int {
            /** @var int $carry */
            if ($item->product_variant_id === null) {
                return $carry; // Skip jika variant tidak fixed
            }

            $variantAvail = $availability[$item->product_variant_id] ?? 0;
            $canFit = $item->quantity > 0 ? (int) floor($variantAvail / $item->quantity) : 0;

            return min($carry, $canFit);
        }, PHP_INT_MAX);
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    /**
     * Hitung jumlah unit yang sudah dipesan untuk satu varian pada rentang tanggal.
     *
     * Overlap check: rental overlap dengan [pickupDate, returnDate+buffer] jika:
     *   rental.start_date <= returnDate + buffer
     *   AND  rental.end_date + buffer >= pickupDate
     *
     * Buffer = 1 hari penuh setelah return, stok ready jam 00:00 hari berikutnya.
     */
    private function rentedQty(
        int $variantId,
        CarbonInterface $pickupDate,
        CarbonInterface $returnDate,
    ): int {
        return (int) RentalItem::query()
            ->where('rentable_type', ProductVariant::class)
            ->where('rentable_id', $variantId)
            ->whereHas('rental', fn ($q) => $this->applyOverlapScope($q, $pickupDate, $returnDate))
            ->sum('quantity');
    }

    /**
     * Batch version: satu query GROUP BY untuk banyak varian.
     *
     * @param  array<int>  $variantIds
     * @return array<int, int>
     */
    private function batchRentedQty(
        array $variantIds,
        CarbonInterface $pickupDate,
        CarbonInterface $returnDate,
    ): array {
        return RentalItem::query()
            ->selectRaw('rentable_id, SUM(quantity) as qty')
            ->where('rentable_type', ProductVariant::class)
            ->whereIn('rentable_id', $variantIds)
            ->whereHas('rental', fn ($q) => $this->applyOverlapScope($q, $pickupDate, $returnDate))
            ->groupBy('rentable_id')
            ->pluck('qty', 'rentable_id')
            ->map(fn ($v) => (int) $v)
            ->all();
    }

    /**
     * Terapkan kondisi overlap + blocking status ke query builder rental.
     *
     * Overlap logic:
     * - Rental memblokir: start_date sampai end_date + 1 hari buffer
     * - Untuk query tanggal A-B, ada overlap jika:
     *   rental.start_date <= B + buffer
     *   AND rental.end_date + buffer >= A
     */
    private function applyOverlapScope(
        Builder $query,
        CarbonInterface $pickupDate,
        CarbonInterface $returnDate,
    ): void {
        $bufferDays = 1; // Buffer 1 hari penuh setelah rental.end_date
        $now = now();

        $bufferedReturnDate = $returnDate->copy()->addDays($bufferDays)->toDateString();

        $query
            ->whereIn('status', self::BLOCKING_STATUSES)
            // pending_payment: hanya blokir sampai payment_deadline_at belum lewat
            ->where(function ($q) use ($now): void {
                $q->where('status', '!=', 'pending_payment')
                    ->orWhere('payment_deadline_at', '>', $now);
            })
            // returned: hanya blokir sampai stock_release_at belum lewat
            ->where(function ($q) use ($now): void {
                $q->where('status', '!=', 'returned')
                    ->orWhere(function ($q2) use ($now): void {
                        $q2->whereNull('stock_release_at')
                            ->orWhere('stock_release_at', '>', $now);
                    });
            })
            // Overlap: rental.start_date <= returnDate + buffer
            ->whereDate('start_date', '<=', $bufferedReturnDate)
            // AND rental.end_date + buffer >= pickupDate
            // (dihitung di PHP agar kompatibel MySQL dan SQLite)
            ->where('end_date', '>=', $pickupDate->copy()->subDays($bufferDays)->toDateString());
    }

    /**
     * Unit yang sedang di-maintenance untuk varian tertentu (tanpa batas tanggal).
     */
    private function maintenanceQty(int $variantId): int
    {
        return (int) VariantMaintenance::query()
            ->where('product_variant_id', $variantId)
            ->where('status', 'in_maintenance')
            ->sum('quantity');
    }
}
