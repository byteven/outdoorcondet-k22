<?php

namespace App\Services;

use App\Models\CartItem;
use App\Models\Package;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Logika bisnis keranjang customer (CU-05).
 *
 * Semua harga (unit, subtotal, deposit, total) dihitung di sisi server
 * memakai RentalPricingService (PRD 4.2); ketersediaan stok divalidasi
 * memakai AvailabilityService (PRD 4.4) pada setiap perubahan, dan
 * divalidasi ulang penuh saat checkout (PRD CU-05).
 *
 * Keranjang memakai satu rentang tanggal sewa (selaras dengan CU-06
 * yang memproses satu rental per tanggal ambil/kembali).
 */
class CartService
{
    /**
     * Batas durasi sewa maksimal (hari), selaras dengan batas tier harga.
     */
    private const MAX_RENTAL_DAYS = 365;

    public function __construct(
        private readonly AvailabilityService $availability,
        private readonly RentalPricingService $pricing,
    ) {}

    /**
     * Tipe item dari sisi klien -> class rentable.
     *
     * @return class-string<ProductVariant|Package>
     */
    public static function rentableClass(string $type): string
    {
        return match ($type) {
            'variant' => ProductVariant::class,
            'package' => Package::class,
            default => throw ValidationException::withMessages([
                'rentable_type' => 'Tipe item tidak valid.',
            ]),
        };
    }

    /**
     * Payload halaman keranjang: item + ringkasan harga.
     *
     * @return array<string, mixed>
     */
    public function summaryFor(User $user): array
    {
        $items = CartItem::query()
            ->where('user_id', $user->id)
            ->orderBy('created_at')
            // Constraint eager load per tipe wajib lewat morphWith();
            // array ber-key nama class memicu RelationNotFoundException
            // karena key dicari sebagai nama relasi.
            ->with([
                'rentable' => function (MorphTo $morphTo): void {
                    $morphTo->morphWith([
                        ProductVariant::class => [
                            'product:id,name,slug,is_active',
                            'product.images:id,product_id,image_path,is_primary',
                            'durationPrices:id,product_variant_id,duration_days,price',
                        ],
                        Package::class => [
                            'durationPrices:id,package_id,duration_days,price',
                        ],
                    ]);
                },
            ])
            ->get();

        $payloadItems = [];
        $rentalAmount = 0.0;
        $depositAmount = 0.0;

        foreach ($items as $item) {
            if ($item->rentable === null) {
                // Rentable sudah terhapus dari master data; tetap tampil
                // agar customer bisa menghapusnya dari keranjang.
                $payloadItems[] = $this->orphanPayload($item);
                continue;
            }

            $payloadItem = $item->rentable_type === ProductVariant::class
                ? $this->variantPayload($item)
                : $this->packagePayload($item);

            $payloadItems[] = $payloadItem;

            // Hanya item yang masih rentable yang dihitung ke ringkasan;
            // item nonaktif tetap tampil agar customer bisa menghapusnya.
            if (! $payloadItem['is_rentable']) {
                continue;
            }

            $rentalAmount += $payloadItem['rental_subtotal'];
            $depositAmount += $payloadItem['deposit_subtotal'];
        }

        return [
            'items' => $payloadItems,
            'summary' => [
                'rental_amount' => $rentalAmount,
                'deposit_amount' => $depositAmount,
                'grand_total' => $rentalAmount + $depositAmount,
            ],
            'count' => count($items),
        ];
    }

    /**
     * Tambah item ke keranjang. Item yang sama menumpuk quantity-nya;
     * rentang tanggal di baris item diperbarui ke rentang yang diminta.
     */
    public function addItem(
        User $user,
        string $rentableType,
        int $rentableId,
        int $quantity,
        string $pickupDate,
        string $returnDate,
    ): void {
        DB::transaction(function () use ($user, $rentableType, $rentableId, $quantity, $pickupDate, $returnDate): void {
            $range = $this->resolveRange($pickupDate, $returnDate);
            $rentableClass = self::rentableClass($rentableType);
            $rentable = $this->resolveRentable($rentableClass, $rentableId);

            $cartItem = CartItem::query()
                ->where('user_id', $user->id)
                ->where('rentable_type', $rentableClass)
                ->where('rentable_id', $rentable->id)
                ->lockForUpdate()
                ->first();

            $available = $this->availableStock($rentable, $range['pickup'], $range['return']);

            if ($available < 1) {
                throw ValidationException::withMessages([
                    'quantity' => 'Item tidak tersedia untuk rentang tanggal ini.',
                ]);
            }

            $newQuantity = min($available, ($cartItem?->quantity ?? 0) + $quantity);

            CartItem::query()->updateOrCreate(
                [
                    'user_id' => $user->id,
                    'rentable_type' => $rentableClass,
                    'rentable_id' => $rentable->id,
                ],
                [
                    'quantity' => $newQuantity,
                    'pickup_date' => $range['pickup'],
                    'return_date' => $range['return'],
                ],
            );
        });
    }

    /**
     * Ubah quantity satu item keranjang.
     */
    public function updateItem(User $user, CartItem $cartItem, int $quantity): void
    {
        DB::transaction(function () use ($user, $cartItem, $quantity): void {
            $cartItem = $this->lockedItemFor($user, $cartItem->id);

            if ($quantity < 1) {
                throw ValidationException::withMessages([
                    'quantity' => 'Quantity minimal 1 unit. Hapus item jika tidak jadi disewa.',
                ]);
            }

            $available = $cartItem->rentable === null
                ? 0
                : $this->availableStock(
                    $cartItem->rentable,
                    $cartItem->pickup_date,
                    $cartItem->return_date,
                );

            if ($quantity > $available) {
                throw ValidationException::withMessages([
                    'quantity' => $this->stockMessage($available),
                ]);
            }

            $cartItem->quantity = $quantity;
            $cartItem->save();
        });
    }

    /**
     * Ubah rentang tanggal untuk SEMUA item keranjang. Quantity item
     * yang melebihi stok tersedia di-clamp mengikuti "qty dibatasi
     * stok tersedia" (PRD CU-05); kelebihan divalidasi ulang saat checkout.
     *
     * @return bool true jika ada quantity yang di-clamp.
     */
    public function updateRange(
        User $user,
        string $pickupDate,
        string $returnDate,
    ): bool {
        return DB::transaction(function () use ($user, $pickupDate, $returnDate): bool {
            $range = $this->resolveRange($pickupDate, $returnDate);

            $cartItems = CartItem::query()
                ->where('user_id', $user->id)
                ->with('rentable')
                ->lockForUpdate()
                ->get();

            $hasClamped = false;

            foreach ($cartItems as $cartItem) {
                $available = $cartItem->rentable === null
                    ? 0
                    : $this->availableStock(
                        $cartItem->rentable,
                        $range['pickup'],
                        $range['return'],
                    );

                if ($cartItem->quantity > $available) {
                    $cartItem->quantity = max(1, $available);
                    $hasClamped = true;
                }

                $cartItem->pickup_date = $range['pickup'];
                $cartItem->return_date = $range['return'];
                $cartItem->save();
            }

            return $hasClamped;
        });
    }

    /**
     * Hapus satu item keranjang.
     */
    public function removeItem(User $user, CartItem $cartItem): void
    {
        CartItem::query()
            ->where('user_id', $user->id)
            ->whereKey($cartItem->id)
            ->delete();
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    /**
     * Baris keranjang milik user, terkunci untuk transaksi.
     */
    private function lockedItemFor(User $user, int $itemId): CartItem
    {
        return CartItem::query()
            ->where('user_id', $user->id)
            ->whereKey($itemId)
            ->lockForUpdate()
            ->firstOrFail();
    }

    /**
     * Item keranjang dari varian produk.
     */
    private function variantPayload(CartItem $cartItem): array
    {
        /** @var ProductVariant $variant */
        $variant = $cartItem->rentable;
        $product = $variant->product;

        return $this->itemPayload(
            $cartItem,
            type: 'alat',
            name: $product?->name ?? $variant->sku,
            sku: $variant->sku,
            slug: $product?->slug,
            image: $this->primaryImagePath($product),
            depositPerUnit: (float) $variant->deposit_per_unit,
            isRentable: $variant->is_active && ($product?->is_active ?? false),
        );
    }

    /**
     * Path gambar utama produk (fallback: gambar pertama).
     */
    private function primaryImagePath(?Product $product): ?string
    {
        $images = $product?->images;

        if ($images === null || $images->isEmpty()) {
            return null;
        }

        return ($images->firstWhere('is_primary', true) ?? $images->first())?->image_path;
    }

    /**
     * Item keranjang dari paket.
     */
    private function packagePayload(CartItem $cartItem): array
    {
        /** @var Package $package */
        $package = $cartItem->rentable;

        return $this->itemPayload(
            $cartItem,
            type: 'bundle',
            name: $package->name,
            sku: null,
            slug: $package->slug,
            image: $package->image_path,
            depositPerUnit: (float) $package->deposit_per_package,
            isRentable: $package->is_active,
        );
    }

    /**
     * Satu item keranjang + harga yang dihitung ulang dari data terkini
     * (konsisten dengan halaman detail produk).
     */
    private function itemPayload(
        CartItem $cartItem,
        string $type,
        string $name,
        ?string $sku,
        ?string $slug,
        ?string $image,
        float $depositPerUnit,
        bool $isRentable,
    ): array {
        $pickupDate = $cartItem->pickup_date;
        $returnDate = $cartItem->return_date;
        $totalDays = $this->pricing->totalDays($pickupDate, $returnDate);
        $quantity = $cartItem->quantity;

        $available = $isRentable
            ? $this->availableStock($cartItem->rentable, $pickupDate, $returnDate)
            : 0;

        $unitPrice = $this->unitPrice($cartItem, $totalDays);

        return [
            'id' => $cartItem->id,
            'type' => $type,
            'name' => $name,
            'sku' => $sku,
            'slug' => $slug,
            'image' => $image,
            'quantity' => $quantity,
            'max_quantity' => max($quantity, $available),
            'available' => $available,
            'is_out_of_stock' => $quantity > $available,
            'is_rentable' => $isRentable,
            'total_days' => $totalDays,
            'pickup_date' => $pickupDate->format('Y-m-d'),
            'return_date' => $returnDate->format('Y-m-d'),
            'unit_price' => $unitPrice ?? 0.0,
            'deposit_per_unit' => $depositPerUnit,
            'rental_subtotal' => ($unitPrice ?? 0.0) * $quantity,
            'deposit_subtotal' => $depositPerUnit * $quantity,
        ];
    }

    /**
     * Item keranjang yang rentable-nya sudah terhapus dari master data.
     *
     * @return array<string, mixed>
     */
    private function orphanPayload(CartItem $cartItem): array
    {
        return [
            'id' => $cartItem->id,
            'type' => 'alat',
            'name' => 'Item tidak ditemukan',
            'sku' => null,
            'slug' => null,
            'image' => null,
            'quantity' => $cartItem->quantity,
            'max_quantity' => 0,
            'available' => 0,
            'is_out_of_stock' => true,
            'is_rentable' => false,
            'total_days' => $this->pricing->totalDays($cartItem->pickup_date, $cartItem->return_date),
            'pickup_date' => $cartItem->pickup_date->format('Y-m-d'),
            'return_date' => $cartItem->return_date->format('Y-m-d'),
            'unit_price' => 0.0,
            'deposit_per_unit' => 0.0,
            'rental_subtotal' => 0.0,
            'deposit_subtotal' => 0.0,
        ];
    }

    /**
     * Harga sewa per unit.
     */
    private function unitPrice(CartItem $cartItem, int $totalDays): ?float
    {
        if ($totalDays < 1) {
            return null;
        }

        /** @var ProductVariant|Package $rentable */
        $rentable = $cartItem->rentable;

        if ($cartItem->rentable_type === ProductVariant::class) {
            return $this->pricing->unitPriceForVariant($rentable, $totalDays);
        }

        return $this->pricing->unitPriceForPackage($rentable, $totalDays);
    }

    /**
     * Stok tersedia untuk rentang tanggal keranjang.
     */
    private function availableStock(
        ProductVariant|Package $rentable,
        CarbonInterface $pickupDate,
        CarbonInterface $returnDate,
    ): int {
        if ($rentable instanceof ProductVariant) {
            return $this->availability->availableStock(
                $rentable->id,
                $pickupDate,
                $returnDate,
            );
        }

        return $this->availability->availablePackageStock(
            $rentable->id,
            $pickupDate,
            $returnDate,
        );
    }

    /**
     * Validasi + parse rentang tanggal sewa.
     *
     * @return array{pickup: CarbonImmutable, return: CarbonImmutable}
     */
    private function resolveRange(string $pickupDate, string $returnDate): array
    {
        $pickup = $this->parseDate($pickupDate, 'pickup_date');
        $return = $this->parseDate($returnDate, 'return_date');

        if ($pickup->lessThan(CarbonImmutable::today())) {
            throw ValidationException::withMessages([
                'pickup_date' => 'Tanggal ambil tidak boleh di masa lalu.',
            ]);
        }

        // Semua pengambilan terjadi pada jam operasional 18:00-23:59
        // sehingga mulai dihitung selalu tanggal berikutnya (PRD 4.3).
        $billingStart = $pickup->addDay();

        if ($return->lessThan($billingStart)) {
            throw ValidationException::withMessages([
                'return_date' => 'Tanggal kembali minimal sehari setelah tanggal ambil.',
            ]);
        }

        if ($this->pricing->totalDays($pickup, $return) > self::MAX_RENTAL_DAYS) {
            throw ValidationException::withMessages([
                'return_date' => 'Durasi sewa maksimal '.self::MAX_RENTAL_DAYS.' hari.',
            ]);
        }

        return ['pickup' => $pickup, 'return' => $return];
    }

    /**
     * Unit rentable yang aktif dan valid.
     */
    private function resolveRentable(
        string $rentableClass,
        int $rentableId,
    ): ProductVariant|Package {
        $rentable = $rentableClass::query()->find($rentableId);

        if ($rentable === null) {
            throw ValidationException::withMessages([
                'rentable_id' => 'Item tidak ditemukan.',
            ]);
        }

        $isActive = $rentable instanceof ProductVariant
            ? $rentable->is_active && $rentable->product?->is_active
            : $rentable->is_active;

        if (! $isActive) {
            throw ValidationException::withMessages([
                'rentable_id' => 'Item tidak tersedia.',
            ]);
        }

        return $rentable;
    }

    private function parseDate(string $value, string $field): CarbonImmutable
    {
        $date = CarbonImmutable::hasFormat($value, 'Y-m-d')
            ? CarbonImmutable::createFromFormat('Y-m-d', $value)
            : null;

        if ($date === null) {
            throw ValidationException::withMessages([
                $field => 'Format tanggal tidak valid.',
            ]);
        }

        return $date->startOfDay();
    }

    private function stockMessage(int $available): string
    {
        return $available > 0
            ? "Stok tidak cukup untuk rentang tanggal ini. Maksimal {$available} unit."
            : 'Item tidak tersedia untuk rentang tanggal ini.';
    }
}
