<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Package;
use App\Models\PackageItem;
use App\Models\Product;
use App\Services\AvailabilityService;
use Carbon\Carbon;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class LandingController extends Controller
{
    private const TABS = ['alat', 'bundle'];

    private const DEFAULT_TAB = 'alat';

    private const DEFAULT_PER_PAGE = 24;

    private const MAX_PER_PAGE = 48;

    /**
     * Show the customer landing page with the rental catalog.
     */
    public function index(Request $request): Response
    {
        $filters = $this->filters($request);

        return Inertia::render('landing', [
            'filters' => [
                'tab' => $filters['tab'],
                'search' => $filters['search'],
                'category' => $filters['category'],
                'page' => $filters['page'],
                'per_page' => $filters['per_page'],
                'pickup_date' => $filters['pickup']?->format('Y-m-d'),
                'return_date' => $filters['return']?->format('Y-m-d'),
            ],
            'catalog' => Inertia::defer(fn (): array => $this->catalog($filters)),
        ]);
    }

    /**
     * Build the catalog payload shown on the landing page.
     *
     * Products and packages are always resolved so a single deferred
     * prop serves both tabs; pagination metadata follows the active tab.
     *
     * @param  array{tab: string, search: string, category: int|null, page: int, per_page: int, pickup: Carbon|null, return: Carbon|null}  $filters
     * @return array{
     *     categories: array<int, array{id: int, name: string}>,
     *     products: array<int, array<string, mixed>>|null,
     *     packages: array<int, array<string, mixed>>|null,
     *     pagination: array{current_page: int, last_page: int, per_page: int, total: int, from: int|null, to: int|null}
     * }
     */
    private function catalog(array $filters): array
    {
        $pickupDate = $filters['pickup'];
        $returnDate = $filters['return'];

        $availability = ($pickupDate && $returnDate)
            ? app(AvailabilityService::class)
            : null;

        $products = $this->products($filters, $availability, $pickupDate, $returnDate);
        $packages = $this->packages($filters, $availability, $pickupDate, $returnDate);

        return [
            'categories' => $this->categories(),
            'products' => $products['products'],
            'packages' => $packages['packages'],
            'pagination' => $filters['tab'] === 'bundle'
                ? $packages['pagination']
                : $products['pagination'],
        ];
    }

    /**
     * Resolve and sanitize the catalog filters from the request.
     *
     * @return array{tab: string, search: string, category: int|null, page: int, per_page: int, pickup: Carbon|null, return: Carbon|null}
     */
    private function filters(Request $request): array
    {
        $tab = (string) $request->input('tab', self::DEFAULT_TAB);
        $category = $request->input('category');

        return [
            'tab' => in_array($tab, self::TABS, true) ? $tab : self::DEFAULT_TAB,
            'search' => (string) $request->input('search', ''),
            'category' => is_numeric($category) ? (int) $category : null,
            'page' => max(1, (int) $request->input('page', 1)),
            'per_page' => min(
                self::MAX_PER_PAGE,
                max(self::DEFAULT_PER_PAGE, (int) $request->input('per_page', self::DEFAULT_PER_PAGE)),
            ),
            'pickup' => $this->parseDate($request->input('pickup_date')),
            'return' => $this->parseDate($request->input('return_date')),
        ];
    }

    /**
     * Parse a Y-m-d request value into a Carbon instance, or null when invalid.
     */
    private function parseDate(mixed $value): ?Carbon
    {
        if (! is_string($value) || ! Carbon::hasFormat($value, 'Y-m-d')) {
            return null;
        }

        return Carbon::parse($value);
    }

    /**
     * Escape user input so it cannot inject LIKE wildcards.
     */
    private function likePattern(string $search): string
    {
        return '%'.addcslashes($search, '\\%_').'%';
    }

    /**
     * Categories that have at least one active product with active variants.
     *
     * @return array<int, array{id: int, name: string}>
     */
    private function categories(): array
    {
        $categoryIds = Product::query()
            ->where('is_active', true)
            ->whereHas('variants', fn (Builder $query) => $query->where('is_active', true))
            ->whereNotNull('category_id')
            ->distinct()
            ->pluck('category_id');

        return Category::query()
            ->whereIn('id', $categoryIds)
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn (Category $category): array => [
                'id' => $category->id,
                'name' => $category->name,
            ])
            ->all();
    }

    /**
     * Paginated packages for the bundle tab.
     *
     * @param  array{tab: string, search: string, category: int|null, page: int, per_page: int, pickup: Carbon|null, return: Carbon|null}  $filters
     * @return array{
     *     packages: array<int, array<string, mixed>>,
     *     pagination: array{current_page: int, last_page: int, per_page: int, total: int, from: int|null, to: int|null}
     * }
     */
    private function packages(
        array $filters,
        ?AvailabilityService $availability,
        ?Carbon $pickupDate,
        ?Carbon $returnDate,
    ): array {
        $query = Package::query()
            ->where('is_active', true)
            ->with([
                'items:id,package_id,product_variant_id,quantity',
                'items.variant:id,product_id,sku',
                'items.variant.product:id,name',
            ])
            ->orderBy('name');

        if ($filters['search'] !== '') {
            $pattern = $this->likePattern($filters['search']);

            $query->where(function (Builder $query) use ($pattern): void {
                $query->where('name', 'like', $pattern)
                    ->orWhere('description', 'like', $pattern);
            });
        }

        $paginated = $query->paginate($filters['per_page'], ['*'], 'page', $filters['page']);

        return [
            'packages' => collect($paginated->items())
                ->map(fn (Package $package): array => $this->packagePayload(
                    $package,
                    $availability,
                    $pickupDate,
                    $returnDate,
                ))
                ->values()
                ->all(),
            'pagination' => $this->paginationPayload($paginated),
        ];
    }

    /**
     * Paginated products for the alat tab.
     *
     * @param  array{tab: string, search: string, category: int|null, page: int, per_page: int, pickup: Carbon|null, return: Carbon|null}  $filters
     * @return array{
     *     products: array<int, array<string, mixed>>,
     *     pagination: array{current_page: int, last_page: int, per_page: int, total: int, from: int|null, to: int|null}
     * }
     */
    private function products(
        array $filters,
        ?AvailabilityService $availability,
        ?Carbon $pickupDate,
        ?Carbon $returnDate,
    ): array {
        $query = Product::query()
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

        if ($filters['search'] !== '') {
            $query->where('name', 'like', $this->likePattern($filters['search']));
        }

        if ($filters['category'] !== null) {
            $query->where('category_id', $filters['category']);
        }

        $paginated = $query->paginate($filters['per_page'], ['*'], 'page', $filters['page']);

        $variantIds = collect($paginated->items())
            ->flatMap(fn (Product $product) => $product->variants->pluck('id'))
            ->all();

        $variantAvailability = [];
        if ($availability && $variantIds !== []) {
            $variantAvailability = $availability->batchAvailableStock(
                $variantIds,
                $pickupDate,
                $returnDate,
            );
        }

        return [
            'products' => collect($paginated->items())
                ->map(fn (Product $product): array => $this->productPayload(
                    $product,
                    $availability,
                    $variantAvailability,
                ))
                ->values()
                ->all(),
            'pagination' => $this->paginationPayload($paginated),
        ];
    }

    /**
     * Map a package into the payload consumed by the landing page.
     *
     * @return array<string, mixed>
     */
    private function packagePayload(
        Package $package,
        ?AvailabilityService $availability,
        ?Carbon $pickupDate,
        ?Carbon $returnDate,
    ): array {
        $available = $availability && $pickupDate && $returnDate
            ? $availability->availablePackageStock($package->id, $pickupDate, $returnDate)
            : null;

        return [
            'id' => $package->id,
            'name' => $package->name,
            'description' => $package->description,
            'image' => $package->image_path,
            'daily_price' => (float) $package->daily_price,
            'deposit_per_package' => (float) $package->deposit_per_package,
            'item_count' => $package->items->count(),
            'available' => $available,
            'items' => $package->items
                ->map(fn (PackageItem $item): array => [
                    'name' => $item->variant?->product?->name ?? $item->variant?->sku ?? 'Item',
                    'quantity' => $item->quantity,
                ])
                ->values()
                ->all(),
        ];
    }

    /**
     * Map a product into the payload consumed by the landing page.
     *
     * @param  array<int, int>  $variantAvailability
     * @return array<string, mixed>
     */
    private function productPayload(
        Product $product,
        ?AvailabilityService $availability,
        array $variantAvailability,
    ): array {
        $totalStock = (int) $product->variants->sum('stock');

        $available = $availability
            ? (int) $product->variants->sum(fn ($variant) => $variantAvailability[$variant->id] ?? 0)
            : ($totalStock > 0 ? $totalStock : null);

        return [
            'id' => $product->id,
            'name' => $product->name,
            'description' => $product->description,
            'category' => $product->category ? [
                'id' => $product->category->id,
                'name' => $product->category->name,
            ] : null,
            'image' => $this->primaryImage($product->images),
            'daily_price' => (float) ($product->variants->min('rental_price_per_day') ?? 0),
            'deposit_per_unit' => (float) ($product->variants->min('deposit_per_unit') ?? 0),
            'stock' => $totalStock,
            'available' => $available,
        ];
    }

    /**
     * Path of the primary product image, falling back to the first image.
     */
    private function primaryImage(Collection $images): ?string
    {
        $image = $images->firstWhere('is_primary', true) ?? $images->first();

        return $image?->image_path;
    }

    /**
     * Shared pagination metadata for both tab payloads.
     *
     * @return array{current_page: int, last_page: int, per_page: int, total: int, from: int|null, to: int|null}
     */
    private function paginationPayload(LengthAwarePaginator $paginated): array
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
}
