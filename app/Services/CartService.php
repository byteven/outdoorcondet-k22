<?php

namespace App\Services;

use App\Models\CartItem;
use App\Models\Package;
use App\Models\PackageItem;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\ProductVariantValue;
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
                            'product.variants:id,product_id,sku,is_active',
                            'product.variants.values:id,product_variant_id,attribute_id,value',
                            'product.variants.values.attribute:id,name',
                            'durationPrices:id,product_variant_id,duration_days,price',
                            'values:id,product_variant_id,attribute_id,value',
                            'values.attribute:id,name',
                        ],
                        Package::class => [
                            'durationPrices:id,package_id,duration_days,price',
                            'items:id,package_id,product_id,product_variant_id,allow_variant_selection,quantity',
                            'items.product:id,name,is_active',
                            'items.product.variants' => fn ($query) => $query
                                ->where('is_active', true)
                                ->select(['id', 'product_id', 'sku', 'is_active']),
                            'items.product.variants.values:id,product_variant_id,attribute_id,value',
                            'items.product.variants.values.attribute:id,name',
                            'items.variant:id,product_id,sku',
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
     * Untuk baris paket, `selectedVariants` (key = package item id)
     * mengisi pilihan varian bebas; yang tidak dikirim memakai default.
     */
    public function addItem(
        User $user,
        string $rentableType,
        int $rentableId,
        int $quantity,
        string $pickupDate,
        string $returnDate,
        array $selectedVariants = [],
    ): void {
        DB::transaction(function () use ($user, $rentableType, $rentableId, $quantity, $pickupDate, $returnDate, $selectedVariants): void {
            $range = $this->resolveRange($pickupDate, $returnDate);
            $rentableClass = self::rentableClass($rentableType);
            $rentable = $this->resolveRentable($rentableClass, $rentableId);

            $variantSelections = $rentable instanceof Package
                ? $this->resolvePackageSelections($rentable, $selectedVariants)
                : null;

            $cartItem = CartItem::query()
                ->where('user_id', $user->id)
                ->where('rentable_type', $rentableClass)
                ->where('rentable_id', $rentable->id)
                ->lockForUpdate()
                ->first();

            $available = $this->availableStock(
                $rentable,
                $range['pickup'],
                $range['return'],
                $variantSelections ?? [],
            );

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
                    'variant_selections' => $variantSelections,
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
                    $this->selectionsFor($cartItem),
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
     * Ubah pilihan varian bebas pada satu baris paket di keranjang.
     * Key harus package item id, value id varian aktif milik produk item
     * tersebut; ketersediaan paket divalidasi ulang dengan pilihan baru.
     */
    public function updateItemSelections(User $user, CartItem $cartItem, array $selectedVariants): void
    {
        DB::transaction(function () use ($user, $cartItem, $selectedVariants): void {
            $cartItem = $this->lockedItemFor($user, $cartItem->id);

            $package = $cartItem->rentable;

            if (! $package instanceof Package) {
                throw ValidationException::withMessages([
                    'selected_variants' => 'Item ini bukan paket.',
                ]);
            }

            $selections = $this->resolvePackageSelections(
                $package,
                $selectedVariants,
                strict: true,
            );

            $available = $this->availability->availablePackageStock(
                $package->id,
                $cartItem->pickup_date,
                $cartItem->return_date,
                $selections,
            );

            if ($cartItem->quantity > $available) {
                throw ValidationException::withMessages([
                    'selected_variants' => $this->stockMessage($available),
                ]);
            }

            $cartItem->variant_selections = $selections;
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
                        $this->selectionsFor($cartItem),
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
     * Ubah varian satu item keranjang ke varian lain pada produk yang sama.
     * Varian target harus aktif; jika varian target sudah ada barisnya di
     * keranjang, quantity digabung (dibatasi stok tersedia).
     */
    public function updateItemVariant(User $user, CartItem $cartItem, int $variantId): void
    {
        DB::transaction(function () use ($user, $cartItem, $variantId): void {
            $cartItem = $this->lockedItemFor($user, $cartItem->id);

            if ($cartItem->rentable_type !== ProductVariant::class) {
                throw ValidationException::withMessages([
                    'variant_id' => 'Item ini tidak memiliki varian.',
                ]);
            }

            $target = ProductVariant::query()
                ->where('product_id', $cartItem->rentable->product_id)
                ->where('is_active', true)
                ->find($variantId);

            if ($target === null) {
                throw ValidationException::withMessages([
                    'variant_id' => 'Varian tidak tersedia.',
                ]);
            }

            if ($target->id === $cartItem->rentable_id) {
                return;
            }

            $available = $this->availableStock(
                $target,
                $cartItem->pickup_date,
                $cartItem->return_date,
            );

            if ($cartItem->quantity > $available) {
                throw ValidationException::withMessages([
                    'variant_id' => $this->stockMessage($available),
                ]);
            }

            $existing = CartItem::query()
                ->where('user_id', $user->id)
                ->where('rentable_type', ProductVariant::class)
                ->where('rentable_id', $target->id)
                ->lockForUpdate()
                ->first();

            if ($existing === null) {
                $cartItem->rentable_id = $target->id;
                $cartItem->save();

                return;
            }

            $existing->quantity = min($available, $existing->quantity + $cartItem->quantity);
            $existing->save();
            $cartItem->delete();
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
            productId: $variant->product?->id,
            variantOptions: $this->variantOptionsPayload($variant, $cartItem),
        );
    }

    /**
     * Varian lain pada produk yang sama, lengkap dengan stok tersedia untuk
     * rentang tanggal baris keranjang, sebagai opsi dropdown ganti varian.
     *
     * @return array<int, array<string, mixed>>
     */
    private function variantOptionsPayload(ProductVariant $variant, CartItem $cartItem): array
    {
        $siblings = $variant->product?->variants
            ?->where('is_active', true)
            ->sortBy('id')
            ->values();

        if ($siblings === null || $siblings->isEmpty()) {
            return [];
        }

        $availabilityByVariant = $this->availability->batchAvailableStock(
            $siblings->modelKeys(),
            $cartItem->pickup_date,
            $cartItem->return_date,
        );

        return $siblings
            ->map(fn (ProductVariant $option): array => [
                'id' => $option->id,
                'available' => (int) ($availabilityByVariant[$option->id] ?? 0),
                'values' => $option->values
                    ->map(fn (ProductVariantValue $value): array => [
                        'attribute' => $value->attribute?->name,
                        'value' => $value->value,
                    ])
                    ->all(),
            ])
            ->all();
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
     * Item keranjang dari paket: pilihan varian bebas tersimpan pada baris
     * dan dikirim kembali sebagai preselect dropdown pemilihnya.
     */
    private function packagePayload(CartItem $cartItem): array
    {
        /** @var Package $package */
        $package = $cartItem->rentable;

        $selections = $this->resolvePackageSelections(
            $package,
            $this->selectionsFor($cartItem),
        );

        $payload = $this->itemPayload(
            $cartItem,
            type: 'bundle',
            name: $package->name,
            sku: null,
            slug: $package->slug,
            image: $package->image_path,
            depositPerUnit: (float) $package->deposit_per_package,
            isRentable: $package->is_active,
        );

        // Stok mentah seluruh varian yang relevan: varian tetap milik item
        // paket dan seluruh varian aktif produk yang bebas dipilih, untuk
        // rentang tanggal baris keranjang.
        $variantIds = $package->items
            ->flatMap(fn (PackageItem $item): array => match (true) {
                $item->allow_variant_selection => $item->product?->variants
                    ->where('is_active', true)
                    ->modelKeys() ?? [],
                $item->product_variant_id !== null => [$item->product_variant_id],
                default => [],
            })
            ->unique()
            ->values()
            ->all();

        $variantAvailable = $this->availability->batchAvailableStock(
            $variantIds,
            $cartItem->pickup_date,
            $cartItem->return_date,
        );

        $payload['variant_available'] = $variantAvailable;

        // Kebutuhan varian per satu unit paket: item tetap selalu, item
        // bebas pilih memakai varian yang terpilih (untuk pensil stok
        // lintas baris di frontend).
        $payload['variant_consumptions'] = [];

        foreach ($package->items as $item) {
            $consumptionVariantId = $item->allow_variant_selection
                ? ($selections[$item->id] ?? null)
                : $item->product_variant_id;

            if ($consumptionVariantId !== null) {
                $payload['variant_consumptions'][(string) $consumptionVariantId] = $item->quantity;
            }
        }

        // Data dropdown pemilih varian per item paket.
        $payload['items'] = $package->items
            ->map(fn (PackageItem $item): array => [
                'id' => (int) $item->id,
                'name' => $item->product?->name
                    ?? $item->variant?->product?->name
                    ?? $item->variant?->sku
                    ?? 'Item',
                'quantity' => (int) $item->quantity,
                'allow_variant_selection' => (bool) $item->allow_variant_selection,
                'variant_id' => $item->allow_variant_selection
                    ? ($selections[$item->id] ?? null)
                    : $item->product_variant_id,
                'variant_options' => $item->allow_variant_selection
                    ? $item->product?->variants
                        ->where('is_active', true)
                        ->sortBy('id')
                        ->values()
                        ->map(fn (ProductVariant $variant): array => [
                            'id' => (int) $variant->id,
                            'sku' => $variant->sku,
                            'available' => (int) ($variantAvailable[$variant->id] ?? 0),
                            'values' => $variant->values
                                ->map(fn (ProductVariantValue $value): array => [
                                    'attribute' => $value->attribute?->name,
                                    'value' => $value->value,
                                ])
                                ->all(),
                        ])
                        ->all()
                    : [],
            ])
            ->all();

        return $payload;
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
        ?int $productId = null,
        array $variantOptions = [],
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
            'product_id' => $productId,
            'variant_id' => $type === 'alat' ? $cartItem->rentable_id : null,
            'variant_options' => $variantOptions,
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
            'name' => 'Produk tidak tersedia',
            'sku' => null,
            'slug' => null,
            'image' => null,
            'product_id' => null,
            'variant_id' => null,
            'variant_options' => [],
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
     * Stok tersedia untuk rentang tanggal keranjang. Pilihan varian paket
     * (key = package item id) ikut meneruskan ketersediaan paket.
     */
    private function availableStock(
        ProductVariant|Package $rentable,
        CarbonInterface $pickupDate,
        CarbonInterface $returnDate,
        array $selectedVariantIds = [],
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
            $selectedVariantIds,
        );
    }

    /**
     * Pilihan varian tersimpan pada baris paket (key = package item id).
     */
    private function selectionsFor(CartItem $cartItem): array
    {
        return $cartItem->variant_selections ?? [];
    }

    /**
     * Validasi pilihan varian paket; entry tidak valid dilengkapi default
     * (varian aktif pertama) kecuali $strict — mis. saat customer mengubah
     * pilihan langsung dari keranjang.
     */
    private function resolvePackageSelections(
        Package $package,
        array $requested,
        bool $strict = false,
    ): array {
        return $package->resolveVariantSelections($requested, strict: $strict);
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
                'rentable_id' => 'Produk tidak tersedia.',
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
