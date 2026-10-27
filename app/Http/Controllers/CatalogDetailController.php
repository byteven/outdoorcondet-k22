<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\BuildsCatalogPayloads;
use App\Models\CartItem;
use App\Models\Package;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Services\AvailabilityService;
use App\UserRole;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CatalogDetailController extends Controller
{
    use BuildsCatalogPayloads;

    private const RELATED_LIMIT = 8;

    /**
     * Show the rental page for a single product (alat).
     */
    public function product(Request $request, string $productSlug): Response
    {
        $product = Product::query()
            ->where('slug', $productSlug)
            ->where('is_active', true)
            ->with([
                'category:id,name,slug',
                'images:id,product_id,image_path,is_primary',
                'variants' => fn ($query) => $query->where('is_active', true)->select([
                    'id',
                    'product_id',
                    'sku',
                    'stock',
                    'rental_price_per_day',
                    'deposit_per_unit',
                ]),
                'variants.durationPrices:id,product_variant_id,duration_days,price',
                'variants.values:id,product_variant_id,attribute_id,value',
                'variants.values.attribute:id,name',
            ])
            ->firstOrFail();

        $range = $this->resolveRentalRange($request);
        $availability = $this->resolveAvailability($range['pickup'], $range['return']);

        $availabilityByVariant = $availability?->batchAvailableStock(
            $product->variants->modelKeys(),
            $range['pickup'],
            $range['return'],
        );

        return Inertia::render('products/show', [
            'filters' => $this->filterDates($range['pickup'], $range['return']),
            'detail' => $this->productPayload($product, $availabilityByVariant),
            'availability' => $this->availableForProduct(
                $product,
                $availability,
                $range['pickup'],
                $range['return'],
            ),
            'in_cart' => $this->inCart(
                $request,
                ProductVariant::class,
                $product->variants->modelKeys(),
            ),
            'related' => $this->relatedProducts($product, $range, $availability),
        ]);
    }

    /**
     * Show the rental page for a package (paket/bundle).
     */
    public function package(Request $request, string $packageSlug): Response
    {
        $package = Package::query()
            ->where('slug', $packageSlug)
            ->where('is_active', true)
            ->with([
                'durationPrices:id,package_id,duration_days,price',
                'items:id,package_id,product_variant_id,quantity',
                'items.variant:id,product_id,sku',
                'items.variant.product:id,name',
            ])
            ->firstOrFail();

        $range = $this->resolveRentalRange($request);
        $availability = $this->resolveAvailability($range['pickup'], $range['return']);

        return Inertia::render('products/show', [
            'filters' => $this->filterDates($range['pickup'], $range['return']),
            'detail' => $this->packagePayload($package),
            'availability' => $this->availableForPackage(
                $package,
                $availability,
                $range['pickup'],
                $range['return'],
            ),
            'in_cart' => $this->inCart($request, Package::class, [$package->id]),
            'related' => $this->relatedProducts(null, $range, $availability),
        ]);
    }

    /**
     * Instantiate the availability service only when a full range is present.
     */
    private function resolveAvailability(?Carbon $pickupDate, ?Carbon $returnDate): ?AvailabilityService
    {
        return ($pickupDate && $returnDate)
            ? app(AvailabilityService::class)
            : null;
    }

    /**
     * Apakah item ini (produk/paket) sudah ada di keranjang customer,
     * dipakai untuk mengganti tombol "Tambah ke Keranjang" menjadi
     * "Lihat Keranjang" di halaman detail.
     *
     * @param  array<int, int>  $rentableIds
     */
    private function inCart(Request $request, string $rentableType, array $rentableIds): bool
    {
        $user = $request->user();

        if (! $user || $user->role !== UserRole::Customer || $rentableIds === []) {
            return false;
        }

        return CartItem::query()
            ->where('user_id', $user->id)
            ->where('rentable_type', $rentableType)
            ->whereIn('rentable_id', $rentableIds)
            ->exists();
    }

    /**
     * Build the full product payload consumed by the detail page.
     *
     * @param  array<int, int>|null  $availabilityByVariant  stok tersedia per variant id
     * @return array<string, mixed>
     */
    private function productPayload(Product $product, ?array $availabilityByVariant = null): array
    {
        return [
            'type' => 'alat',
            'id' => $product->id,
            'name' => $product->name,
            'slug' => $product->slug,
            'description' => $product->description,
            'category' => $product->category ? [
                'id' => $product->category->id,
                'name' => $product->category->name,
                'slug' => $product->category->slug,
            ] : null,
            'images' => $this->galleryImages($product->images),
            'variants' => $product->variants
                ->sortBy('id')
                ->values()
                ->map(fn ($variant): array => [
                    'id' => $variant->id,
                    'sku' => $variant->sku,
                    'stock' => (int) $variant->stock,
                    'available' => $availabilityByVariant === null
                        ? null
                        : (int) ($availabilityByVariant[$variant->id] ?? 0),
                    'rental_price_per_day' => (float) $variant->rental_price_per_day,
                    'deposit_per_unit' => (float) $variant->deposit_per_unit,
                    'values' => $variant->values
                        ->map(fn ($value): array => [
                            'attribute' => $value->attribute?->name,
                            'value' => $value->value,
                        ])
                        ->all(),
                    'duration_prices' => $variant->durationPrices
                        ->sortBy('duration_days')
                        ->values()
                        ->map(fn ($durationPrice): array => [
                            'duration_days' => (int) $durationPrice->duration_days,
                            'price' => (float) $durationPrice->price,
                        ])
                        ->all(),
                ])
                ->all(),
        ];
    }

    /**
     * Build the full package payload consumed by the detail page.
     *
     * @return array<string, mixed>
     */
    private function packagePayload(Package $package): array
    {
        return [
            'type' => 'bundle',
            'id' => $package->id,
            'name' => $package->name,
            'slug' => $package->slug,
            'description' => $package->description,
            'image' => $package->image_path,
            'daily_price' => (float) $package->daily_price,
            'deposit_per_package' => (float) $package->deposit_per_package,
            'duration_prices' => $package->durationPrices
                ->sortBy('duration_days')
                ->values()
                ->map(fn ($durationPrice): array => [
                    'duration_days' => (int) $durationPrice->duration_days,
                    'price' => (float) $durationPrice->price,
                ])
                ->all(),
            'items' => $package->items
                ->map(fn ($item): array => [
                    'name' => $item->variant?->product?->name ?? $item->variant?->sku ?? 'Item',
                    'quantity' => (int) $item->quantity,
                ])
                ->values()
                ->all(),
        ];
    }

    /**
     * Available stock for a package rental range.
     */
    private function availableForPackage(
        Package $package,
        ?AvailabilityService $availability,
        ?Carbon $pickupDate,
        ?Carbon $returnDate,
    ): ?int {
        if (! $availability || ! $pickupDate || ! $returnDate) {
            return null;
        }

        return $availability->availablePackageStock($package->id, $pickupDate, $returnDate);
    }

    /**
     * Other rentable products for the "Peralatan Lainnya" section.
     * Fills up with products from other categories when needed.
     *
     * @param  array{pickup: Carbon|null, return: Carbon|null}  $range
     * @return array<int, array<string, mixed>>
     */
    private function relatedProducts(
        ?Product $product,
        array $range,
        ?AvailabilityService $availability,
    ): array {
        $base = Product::query()
            ->where('is_active', true)
            ->whereHas('variants', fn (Builder $query) => $query->where('is_active', true))
            ->with([
                'category:id,name,slug',
                'images:id,product_id,image_path,is_primary',
                'variants' => fn ($query) => $query->where('is_active', true)->select([
                    'id',
                    'product_id',
                    'stock',
                    'rental_price_per_day',
                    'deposit_per_unit',
                ]),
            ])
            ->orderBy('name');

        if ($product) {
            $base->whereNot('id', $product->id);
        }

        $excludedCategoryIds = $product?->category_id ? [$product->category_id] : [];
        $related = $excludedCategoryIds === []
            ? (clone $base)->limit(self::RELATED_LIMIT)->get()
            : (clone $base)
                ->whereIn('category_id', $excludedCategoryIds)
                ->limit(self::RELATED_LIMIT)
                ->get();

        if ($related->count() < self::RELATED_LIMIT) {
            $fillerIds = $related->pluck('id')
                ->when($product, fn ($ids) => $ids->prepend($product->id))
                ->all();

            $filler = (clone $base)
                ->whereNotIn('id', $fillerIds)
                ->limit(self::RELATED_LIMIT - $related->count())
                ->get();

            $related = $related->concat($filler);
        }

        return $related
            ->values()
            ->map(fn (Product $item): array => $this->productCardPayload(
                $item,
                $this->availableForProduct($item, $availability, $range['pickup'], $range['return']),
            ))
            ->all();
    }
}
