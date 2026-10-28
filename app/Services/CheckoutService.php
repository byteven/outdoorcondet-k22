<?php

namespace App\Services;

use App\Models\CartItem;
use App\Models\Package;
use App\Models\ProductVariant;
use App\Models\Rental;
use App\Models\RentalPayment;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Logika bisnis checkout (CU-06): membuat rental dari keranjang,
 * menghitung harga sewa & deposit, memvalidasi ketersediaan stok,
 * dan menyiapkan pembayaran online (selalu QRIS).
 */
class CheckoutService
{
    private const PAYMENT_TIMEOUT_MINUTES = 30;

    public function __construct(
        private readonly AvailabilityService $availability,
        private readonly RentalPricingService $pricing,
    ) {}

    /**
     * Buat rental dari seluruh item keranjang milik user.
     *
     * @throws ValidationException
     */
    public function checkout(User $user, string $paymentType): Rental
    {
        $customer = $user->customer;

        if ($customer === null) {
            throw ValidationException::withMessages([
                'customer' => 'Data pelanggan tidak ditemukan.',
            ]);
        }

        return DB::transaction(function () use ($user, $customer, $paymentType): Rental {
            $cartItems = CartItem::query()
                ->where('user_id', $user->id)
                ->with('rentable')
                ->lockForUpdate()
                ->get();

            if ($cartItems->isEmpty()) {
                throw ValidationException::withMessages([
                    'cart' => 'Keranjang kosong. Tambah item sebelum checkout.',
                ]);
            }

            $pickupDate = $cartItems->first()->pickup_date;
            $returnDate = $cartItems->first()->return_date;
            $totalDays = $this->pricing->totalDays($pickupDate, $returnDate);

            $rentalAmount = 0.0;
            $depositAmount = 0.0;
            $rentalItemData = [];

            foreach ($cartItems as $cartItem) {
                $rentable = $cartItem->rentable;

                if ($rentable === null) {
                    throw ValidationException::withMessages([
                        'cart' => 'Salah satu item di keranjang sudah tidak tersedia.',
                    ]);
                }

                $isActive = $rentable instanceof ProductVariant
                    ? $rentable->is_active && ($rentable->product?->is_active ?? false)
                    : $rentable->is_active;

                if (! $isActive) {
                    throw ValidationException::withMessages([
                        'cart' => 'Salah satu item di keranjang sudah tidak aktif.',
                    ]);
                }

                $available = $rentable instanceof ProductVariant
                    ? $this->availability->availableStock(
                        $rentable->id,
                        $pickupDate,
                        $returnDate,
                    )
                    : $this->availability->availablePackageStock(
                        $rentable->id,
                        $pickupDate,
                        $returnDate,
                    );

                if ($cartItem->quantity > $available) {
                    throw ValidationException::withMessages([
                        'cart' => 'Stok tidak cukup untuk '.$this->rentableName($rentable).' pada rentang tanggal ini.',
                    ]);
                }

                $unitPrice = $rentable instanceof ProductVariant
                    ? $this->pricing->unitPriceForVariant($rentable, $totalDays)
                    : $this->pricing->unitPriceForPackage($rentable, $totalDays);

                if ($unitPrice === null) {
                    throw ValidationException::withMessages([
                        'cart' => 'Harga tidak dapat dihitung untuk salah satu item.',
                    ]);
                }

                $subtotal = $unitPrice * $cartItem->quantity;
                $depositPerUnit = $rentable instanceof ProductVariant
                    ? (float) $rentable->deposit_per_unit
                    : (float) $rentable->deposit_per_package;
                $depositSubtotal = $depositPerUnit * $cartItem->quantity;

                $rentalAmount += $subtotal;
                $depositAmount += $depositSubtotal;

                $rentalItemData[] = [
                    'rentable_type' => $rentable->getMorphClass(),
                    'rentable_id' => $rentable->id,
                    'quantity' => $cartItem->quantity,
                    'unit_price' => $unitPrice,
                    'price_breakdown' => $this->priceBreakdown($rentable, $totalDays),
                    'subtotal' => $subtotal,
                    'deposit_per_unit' => $depositPerUnit,
                    'deposit_subtotal' => $depositSubtotal,
                ];
            }

            $grandTotal = $rentalAmount + $depositAmount;

            $downPaymentAmount = 0.0;
            $remainingBalance = 0.0;

            if ($paymentType === 'down_payment') {
                // DP = 50% dari biaya sewa saja, dibulatkan ke atas ke kelipatan Rp1.000.
                $downPaymentAmount = (float) ceil($rentalAmount * 0.5 / 1000) * 1000;
                $remainingBalance = max(0.0, $rentalAmount - $downPaymentAmount);
            }
            // Untuk 'full': down_payment_amount = 0 dan remaining_balance = 0
            // (biaya sewa dibayar sepenuhnya sekarang).

            $rentalCode = $this->generateRentalCode();

            $rental = Rental::create([
                'rental_code' => $rentalCode,
                'customer_id' => $customer->id,
                'start_date' => $pickupDate,
                'billing_start_date' => $pickupDate->copy()->addDay(),
                'end_date' => $returnDate,
                'return_due_at' => $returnDate->copy()->endOfDay(),
                'total_days' => $totalDays,
                'rental_amount' => $rentalAmount,
                'deposit_amount' => $depositAmount,
                'grand_total' => $grandTotal,
                'payment_type' => $paymentType,
                'down_payment_amount' => $downPaymentAmount,
                'remaining_balance' => $remainingBalance,
                'payment_deadline_at' => CarbonImmutable::now()->addMinutes(self::PAYMENT_TIMEOUT_MINUTES),
                'late_fee_per_day' => config('rental.late_fee_per_day', 50000),
                'status' => 'pending_payment',
                'is_self_order' => false,
            ]);

            foreach ($rentalItemData as $itemData) {
                $rental->items()->create($itemData);
            }

            // Pembayaran online selalu QRIS, atas biaya sewa saja (DP atau lunas).
            // `kind` pada rental_payments adalah 'dp' atau 'full', beda dari
            // `payment_type` pada rental yang bernilai 'down_payment'.
            $rental->payments()->create([
                'kind' => $paymentType === 'down_payment' ? 'dp' : 'full',
                'amount' => $paymentType === 'down_payment' ? $downPaymentAmount : $rentalAmount,
                'method' => 'qris',
                'proof_path' => null,
                'status' => 'waiting',
            ]);

            // Kosongkan keranjang setelah rental berhasil dibuat.
            CartItem::query()->where('user_id', $user->id)->delete();

            return $rental->load(['items', 'customer.user']);
        });
    }

    /**
     * Simpan bukti pembayaran dan ubah status rental menunggu konfirmasi admin.
     */
    public function recordPayment(Rental $rental, string $proofPath): RentalPayment
    {
        $payment = $rental->payments()->where('kind', $rental->payment_type)
            ->where('method', 'qris')
            ->where('status', 'waiting')
            ->first();

        if ($payment === null) {
            throw ValidationException::withMessages([
                'payment' => 'Pembayaran menunggu tidak ditemukan.',
            ]);
        }

        $payment->update([
            'proof_path' => $proofPath,
        ]);

        $rental->update(['status' => 'waiting_confirmation']);

        return $payment->fresh();
    }

    /**
     * Nama rentable untuk pesan kesalahan.
     */
    private function rentableName(ProductVariant|Package $rentable): string
    {
        if ($rentable instanceof ProductVariant) {
            return $rentable->product?->name ?? $rentable->sku;
        }

        return $rentable->name;
    }

    /**
     * Snapshot ringkasan basis harga untuk rental item.
     */
    private function priceBreakdown(ProductVariant|Package $rentable, int $totalDays): array
    {
        if ($rentable instanceof ProductVariant) {
            return [
                'basis' => 'variant',
                'variant_id' => $rentable->id,
                'sku' => $rentable->sku,
                'rental_price_per_day' => (float) $rentable->rental_price_per_day,
                'duration_days' => $totalDays,
                'unit_price' => $this->pricing->unitPriceForVariant($rentable, $totalDays),
                'deposit_per_unit' => (float) $rentable->deposit_per_unit,
            ];
        }

        return [
            'basis' => 'package',
            'package_id' => $rentable->id,
            'daily_price' => (float) $rentable->daily_price,
            'duration_days' => $totalDays,
            'unit_price' => $this->pricing->unitPriceForPackage($rentable, $totalDays),
            'deposit_per_package' => (float) $rentable->deposit_per_package,
        ];
    }

    /**
     * Kode rental: OC-YYYYMMDD-001 (berurutan per hari).
     */
    private function generateRentalCode(): string
    {
        $datePart = CarbonImmutable::now()->format('Ymd');
        $prefix = 'OC-'.$datePart.'-';

        $last = Rental::where('rental_code', 'like', $prefix.'%')
            ->max('rental_code');

        $sequence = 1;

        if ($last !== null) {
            $lastPart = (string) Str::after($last, $prefix);
            $sequence = ((int) $lastPart) + 1;
        }

        return $prefix.str_pad((string) $sequence, 3, '0', STR_PAD_LEFT);
    }
}
