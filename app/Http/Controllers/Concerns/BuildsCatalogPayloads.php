<?php

namespace App\Http\Controllers\Concerns;

use App\Models\Package;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\ProductVariant;
use App\Services\AvailabilityService;
use Carbon\Carbon;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Request;

/**
 * Shared helpers for building the customer-facing catalog payloads.
 */
trait BuildsCatalogPayloads
{
    /**
     * Escape user input so it cannot inject LIKE wildcards.
     */
    protected function likePattern(string $search): string
    {
        return '%'.addcslashes($search, '\\%_').'%';
    }

    /**
     * Parse a Y-m-d request value into a Carbon instance, or null when invalid.
     */
    protected function parseRangeDate(mixed $value): ?Carbon
    {
        if (! is_string($value) || ! Carbon::hasFormat($value, 'Y-m-d')) {
            return null;
        }

        return Carbon::parse($value);
    }

    /**
     * Resolve the rental date range from query params.
     *
     * @return array{pickup: Carbon|null, return: Carbon|null}
     */
    protected function resolveRentalRange(Request $request): array
    {
        return [
            'pickup' => $this->parseRangeDate($request->input('pickup_date')),
            'return' => $this->parseRangeDate($request->input('return_date')),
        ];
    }

    /**
     * Date range filters sent back to the frontend.
     *
     * @return array{pickup_date: string|null, return_date: string|null}
     */
    protected function filterDates(?Carbon $pickup, ?Carbon $return): array
    {
        return [
            'pickup_date' => $pickup?->format('Y-m-d'),
            'return_date' => $return?->format('Y-m-d'),
        ];
    }

    /**
     * Path of the primary product image, falling back to the first image.
     */
    protected function primaryImage(Collection $images): ?string
    {
        $image = $images->firstWhere('is_primary', true) ?? $images->first();

        return $image?->image_path;
    }

    /**
     * Map a product into the compact card payload.
     *
     * @return array<string, mixed>
     */
    protected function productCardPayload(Product $product, ?int $available): array
    {
        return [
            'id' => $product->id,
            'name' => $product->name,
            'slug' => $product->slug,
            'description' => $product->description,
            'category' => $product->category ? [
                'id' => $product->category->id,
                'name' => $product->category->name,
                'slug' => $product->category->slug,
            ] : null,
            'image' => $this->primaryImage($product->images),
            'daily_price' => (float) ($product->variants->min('rental_price_per_day') ?? 0),
            'deposit_per_unit' => (float) ($product->variants->min('deposit_per_unit') ?? 0),
            'stock' => (int) $product->variants->sum('stock'),
            'available' => $available,
        ];
    }

    /**
     * Map a package into the compact card payload.
     *
     * @return array<string, mixed>
     */
    protected function packageCardPayload(Package $package, ?int $available): array
    {
        return [
            'id' => $package->id,
            'name' => $package->name,
            'slug' => $package->slug,
            'description' => $package->description,
            'image' => $package->image_path,
            'daily_price' => (float) $package->daily_price,
            'deposit_per_package' => (float) $package->deposit_per_package,
            'item_count' => $package->items->count(),
            'items' => $package->items
                ->map(fn ($item): array => [
                    'name' => $item->variant?->product?->name
                        ?? $item->variant?->sku
                        ?? 'Item',
                    'quantity' => (int) $item->quantity,
                ])
                ->all(),
            'available' => $available,
        ];
    }

    /**
     * Shared pagination metadata for asymmetric payloads.
     *
     * @return array{current_page: int, last_page: int, per_page: int, total: int, from: int|null, to: int|null}
     */
    protected function paginationPayload(LengthAwarePaginator $paginated): array
    {
        return [
            'current_page' => $paginated->currentPage(),
            'last_page' => $paginated->lastPage(),
            'per_page' => $paginated->perPage(),
            'total' => $paginated->total(),
            'from' => $paginated->firstItem(),
            'to' => $paginated->lastItem(),
        ];
    }

    /**
     * Total available stock across a product's active variants.
     */
    protected function availableForProduct(
        Product $product,
        ?AvailabilityService $availability,
        ?Carbon $pickupDate,
        ?Carbon $returnDate,
    ): ?int {
        if (! $availability || ! $pickupDate || ! $returnDate) {
            return null;
        }

        $variantIds = $product->variants->pluck('id')->all();

        if ($variantIds === []) {
            return 0;
        }

        $availabilityByVariant = $availability->batchAvailableStock(
            $variantIds,
            $pickupDate,
            $returnDate,
        );

        return (int) $product->variants
            ->sum(fn (ProductVariant $variant) => $availabilityByVariant[$variant->id] ?? 0);
    }

    /**
     * Available stock for a single image record helper (ImagePayload menu).
     */
    protected function galleryImages(Collection $images): array
    {
        return $images
            ->sortByDesc('is_primary')
            ->values()
            ->map(fn (ProductImage $image): string => $image->image_path)
            ->all();
    }
}
