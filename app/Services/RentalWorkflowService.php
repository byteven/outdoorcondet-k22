<?php

namespace App\Services;

use App\Models\Rental;
use App\Models\RentalPayment;
use Carbon\CarbonImmutable;
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
     * (tanggal kembali + 1 hari buffer, ready jam 00:00 berikutnya).
     *
     * @throws ValidationException
     */
    public function confirmReturn(Rental $rental): Rental
    {
        if (! in_array($rental->status, ['dp_paid', 'fully_paid'], true)) {
            throw ValidationException::withMessages([
                'rental' => 'Rental ini belum dapat dikonfirmasi pengembaliannya.',
            ]);
        }

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

        return $rental->fresh();
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
