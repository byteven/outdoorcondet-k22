<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\BuildsCatalogPayloads;
use App\Models\Category;
use App\Models\Package;
use App\Models\Product;
use App\Services\AvailabilityService;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class LandingController extends Controller
{
    use BuildsCatalogPayloads;

    private const TABS = ['alat', 'bundle'];

    private const DEFAULT_TAB = 'alat';

    private const DEFAULT_PER_PAGE = 24;

    private const MAX_PER_PAGE = 48;

    /**
     * Show the customer landing page with the rental catalog.
     */
    public function index(Request $request): Response
    {
        $filters = $this->landingFilters($request);

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
        $availability = $this->resolveAvailability(
            $filters['pickup'],
            $filters['return'],
        );

        $products = $this->products($filters, $availability);
        $packages = $this->packages($filters, $availability);

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
    private function landingFilters(Request $request): array
    {
        $tab = (string) $request->input('tab', self::DEFAULT_TAB);
        $category = $request->input('category');
        $range = $this->resolveRentalRange($request);

        return [
            'tab' => in_array($tab, self::TABS, true) ? $tab : self::DEFAULT_TAB,
            'search' => (string) $request->input('search', ''),
            'category' => is_numeric($category) ? (int) $category : null,
            'page' => max(1, (int) $request->input('page', 1)),
            'per_page' => min(
                self::MAX_PER_PAGE,
                max(self::DEFAULT_PER_PAGE, (int) $request->input('per_page', self::DEFAULT_PER_PAGE)),
            ),
            'pickup' => $range['pickup'],
            'return' => $range['return'],
        ];
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
    private function packages(array $filters, ?AvailabilityService $availability): array
    {
        $query = Package::query()
            ->where('is_active', true)
            ->with([
                'items:id,package_id,product_id,product_variant_id,allow_variant_selection,quantity',
                'items.product:id,name',
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
                ->map(fn (Package $package): array => $this->packageCardPayload(
                    $package,
                    $this->availableForPackage($package, $availability, $filters['pickup'], $filters['return']),
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
    private function products(array $filters, ?AvailabilityService $availability): array
    {
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

        return [
            'products' => collect($paginated->items())
                ->map(fn (Product $product): array => $this->productCardPayload(
                    $product,
                    $this->availableForProduct($product, $availability, $filters['pickup'], $filters['return']),
                ))
                ->values()
                ->all(),
            'pagination' => $this->paginationPayload($paginated),
        ];
    }

    /**
     * Available package stock = the limiting item's availability.
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
}
