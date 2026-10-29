<?php

namespace App\Services;

use App\Models\CartItem;
use App\Models\Customer;
use App\Models\Package;
use App\Models\ProductVariant;
use App\Models\Rental;
use App\Models\RentalPayment;
use App\Models\User;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Contracts\Cache\LockTimeoutException;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Support\Facades\Cache;
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

    /**
     * Kunci antar-proses checkout: cek stok lalu insert rental harus atomik
     * agar dua customer yang checkout bersamaan tidak bisa double-booking.
     */
    private const AVAILABILITY_LOCK = 'checkout:rental-availability';

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

        $lock = Cache::lock(self::AVAILABILITY_LOCK, 10);

        try {
            $lock->block(5);
        } catch (LockTimeoutException) {
            throw ValidationException::withMessages([
                'cart' => 'Sedang ada transaksi lain yang diproses. Coba lagi beberapa saat.',
            ]);
        }

        try {
            return $this->createRentalFromCart($user, $customer, $paymentType);
        } finally {
            $lock->release();
        }
    }

    /**
     * Buat rental + item + pembayaran dari isi keranjang di dalam transaksi.
     * Dipanggil dengan availability lock terpegang agar cek stok dan insert
     * rental bersifat atomik terhadap checkout lain.
     *
     * @throws ValidationException
     */
    private function createRentalFromCart(User $user, Customer $customer, string $paymentType): Rental
    {
        return DB::transaction(function () use ($user, $customer, $paymentType): Rental {
            $cartItems = CartItem::query()
                ->where('user_id', $user->id)
                ->with([
                    'rentable' => fn (MorphTo $morphTo) => $morphTo->morphWith([
                        Package::class => ['items'],
                    ]),
                ])
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

            $this->assertVariantDemandFitsStock($cartItems, $pickupDate, $returnDate);

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
                    // Snapshot nama: tampilan rental tetap benar meski
                    // produk/bundle kemudian dihapus dari master data.
                    'name' => $this->rentableName($rentable),
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
                // DP = 50% absolut dari biaya sewa, tanpa pembulatan.
                $downPaymentAmount = $rentalAmount * 0.5;
                $remainingBalance = max(0.0, $rentalAmount - $downPaymentAmount);
            }
            // Untuk 'full': down_payment_amount = 0 dan remaining_balance = 0
            // (biaya sewa dibayar sepenuhnya sekarang).

            $rentalCode = $this->generateRentalCode();

            $rental = Rental::create([
                'rental_code' => $rentalCode,
                'customer_id' => $customer->id,
                'start_date' => $pickupDate,
                'end_date' => $returnDate,
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
            ]);

            foreach ($rentalItemData as $itemData) {
                $rental->items()->create($itemData);
            }

            // Pembayaran online selalu QRIS, atas biaya sewa saja (DP atau
            // lunas); nominalnya derivable dari rental.payment_type.
            $rental->payments()->create([
                'amount' => $paymentType === 'down_payment' ? $downPaymentAmount : $rentalAmount,
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
     * Hanya diizinkan saat rental masih pending_payment dan belum lewat
     * batas waktu pembayaran.
     */
    public function recordPayment(Rental $rental, string $proofPath): RentalPayment
    {
        if ($rental->status !== 'pending_payment') {
            throw ValidationException::withMessages([
                'payment' => 'Bukti pembayaran untuk pesanan ini sudah diunggah.',
            ]);
        }

        if ($rental->payment_deadline_at?->isPast()) {
            throw ValidationException::withMessages([
                'payment' => 'Waktu pembayaran sudah habis. Buat pesanan kembali dari keranjang.',
            ]);
        }

        $payment = $rental->payments()
            ->where('status', 'waiting')
            ->whereNull('proof_path')
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
     * Total kebutuhan varian seluruh keranjang harus muat dalam stok
     * tersedia: baris varian memakai langsung, baris paket memakai isi
     * paketnya. Satu cek agregat menggantikan cek per item agar alat
     * yang sama di beberapa baris (individual + paket) tidak saling
     * mengklaim stok yang sama.
     *
     * @param  Collection<int, CartItem>  $cartItems
     */
    private function assertVariantDemandFitsStock(
        Collection $cartItems,
        CarbonInterface $pickupDate,
        CarbonInterface $returnDate,
    ): void {
        $demand = [];

        foreach ($cartItems as $cartItem) {
            $rentable = $cartItem->rentable;

            if ($rentable === null) {
                continue;
            }

            if ($rentable instanceof ProductVariant) {
                $demand[$rentable->id] = ($demand[$rentable->id] ?? 0) + $cartItem->quantity;

                continue;
            }

            foreach ($rentable->items as $packageItem) {
                if ($packageItem->product_variant_id === null) {
                    continue;
                }

                $demand[$packageItem->product_variant_id] = ($demand[$packageItem->product_variant_id] ?? 0)
                    + $packageItem->quantity * $cartItem->quantity;
            }
        }

        foreach ($demand as $variantId => $needed) {
            $available = $this->availability->availableStock($variantId, $pickupDate, $returnDate);

            if ($needed > $available) {
                throw ValidationException::withMessages([
                    'cart' => 'Stok tidak cukup untuk beberapa item pada rentang tanggal ini. Kurangi quantity atau hapus item yang bertumpuk.',
                ]);
            }
        }
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
