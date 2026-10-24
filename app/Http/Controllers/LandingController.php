<?php

namespace App\Http\Controllers;

use App\Models\Package;
use App\Models\PackageItem;
use App\Models\Product;
use App\Services\AvailabilityService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class LandingController extends Controller
{
    /**
     * Show the customer landing page with the rental catalog.
     */
    public function index(Request $request): Response
    {
        $tab = $request->input('tab', 'alat');
        $search = (string) $request->input('search', '');
        $categoryId = $request->input('category');
        $page = max(1, (int) $request->input('page', 1));
        $perPage = min(48, max(24, (int) $request->input('per_page', 24)));
        $pickupDate = $request->input('pickup_date');
        $returnDate = $request->input('return_date');

        return Inertia::render('landing', [
            'filters' => [
                'tab' => in_array($tab, ['alat', 'bundle'], true) ? $tab : 'alat',
                'search' => $search,
                'category' => $categoryId ? (int) $categoryId : null,
                'page' => $page,
                'per_page' => $perPage,
                'pickup_date' => $pickupDate,
                'return_date' => $returnDate,
            ],
            'catalog' => Inertia::defer(fn (): array => $this->catalog(
                tab: in_array($tab, ['alat', 'bundle'], true) ? $tab : 'alat',
                search: $search,
                categoryId: $categoryId ? (int) $categoryId : null,
                page: $page,
                perPage: $perPage,
                pickupDate: $pickupDate,
                returnDate: $returnDate,
            )),
        ]);
    }

    /**
     * Build the catalog payload shown on the landing page.
     *
     * @return array{
     *     categories: array<int, array{id: int, name: string}>,
     *     products: array<string, mixed>|null,
     *     packages: array<string, mixed>|null,
     *     pagination: array{current_page: int, last_page: int, per_page: int, total: int, from: int|null, to: int|null}
     * }
     */
    private function catalog(
        string $tab,
        string $search,
        ?int $categoryId,
        int $page,
        int $perPage,
        ?string $pickupDate = null,
        ?string $returnDate = null,
    ): array {
        $pickupCarbon = $pickupDate ? Carbon::parse($pickupDate) : null;
        $returnCarbon = $returnDate ? Carbon::parse($returnDate) : null;
    
        $availabilityService = ($pickupCarbon && $returnCarbon)
            ? app(AvailabilityService::class)
            : null;
        
        $allProducts = Product::query()
            ->where('is_active', true)
            ->whereHas('variants', fn ($query) => $query->where('is_active', true))
            ->with(['category:id,name,slug'])
            ->orderBy('name')
            ->get(['id', 'category_id']);

        $categories = $allProducts
            ->pluck('category')
            ->filter()
            ->unique('id')
            ->sortBy('name')
            ->values()
            ->map(fn ($category) => ['id' => $category->id, 'name' => $category->name])
            ->all();

        if ($tab === 'bundle') {
            $query = Package::query()
                ->where('is_active', true)
                ->with([
                    'items:id,package_id,product_variant_id,quantity',
                    'items.variant:id,product_id,sku',
                    'items.variant.product:id,name',
                ])
                ->orderBy('name');

            if ($search !== '') {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%");
                });
            }

            $paginated = $query->paginate($perPage, ['*'], 'page', $page);

            $packages = collect($paginated->items())->map(function (Package $package) use ($availabilityService, $pickupCarbon, $returnCarbon): array {
                $available = null;
                if ($availabilityService && $pickupCarbon && $returnCarbon) {
                    $available = $availabilityService->availablePackageStock(
                        $package->id,
                        $pickupCarbon,
                        $returnCarbon
                    );
                }
                
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
            })->values()->all();

            return [
                'categories' => $categories,
                'products' => null,
                'packages' => $packages,
                'pagination' => [
                    'current_page' => $paginated->currentPage(),
                    'last_page' => $paginated->lastPage(),
                    'per_page' => $paginated->perPage(),
                    'total' => $paginated->total(),
                    'from' => $paginated->firstItem(),
                    'to' => $paginated->lastItem(),
                ],
            ];
        }

        $query = Product::query()
            ->where('is_active', true)
            ->whereHas('variants', fn ($q) => $q->where('is_active', true))
            ->with([
                'category:id,name,slug',
                'images:id,product_id,image_path,is_primary',
                'variants' => fn ($q) => $q->where('is_active', true)->select([
                    'id',
                    'product_id',
                    'stock',
                    'rental_price_per_day',
                    'deposit_per_unit',
                ]),
            ])
            ->orderBy('name');

        if ($search !== '') {
            $query->where('name', 'like', "%{$search}%");
        }

        if ($categoryId !== null) {
            $query->where('category_id', $categoryId);
        }

        $paginated = $query->paginate($perPage, ['*'], 'page', $page);

        $variantIds = collect($paginated->items())
            ->flatMap(fn ($product) => $product->variants->pluck('id'))
            ->all();
            
        $availability = [];
        if ($availabilityService && $pickupCarbon && $returnCarbon && !empty($variantIds)) {
            $availability = $availabilityService->batchAvailableStock(
                $variantIds,
                $pickupCarbon,
                $returnCarbon
            );
        }

        $products = collect($paginated->items())->map(function (Product $product) use ($availability, $availabilityService, $pickupCarbon, $returnCarbon): array {
            $totalStock = (int) $product->variants->sum('stock');
            
        
            $available = null;
            
            if ($availabilityService && $pickupCarbon && $returnCarbon) {
    
                $totalAvailable = $product->variants->sum(fn ($variant) => $availability[$variant->id] ?? 0);
                $available = (int) $totalAvailable;
            } elseif ($totalStock > 0) {
            
                $available = $totalStock;
            }
            
            return [
                'id' => $product->id,
                'name' => $product->name,
                'description' => $product->description,
                'category' => $product->category ? [
                    'id' => $product->category->id,
                    'name' => $product->category->name,
                ] : null,
                'image' => $this->primaryImagePath($product),
                'daily_price' => (float) ($product->variants->min('rental_price_per_day') ?? 0),
                'deposit_per_unit' => (float) ($product->variants->min('deposit_per_unit') ?? 0),
                'stock' => $totalStock,
                'available' => $available,
            ];
        })->values()->all();

        return [
            'categories' => $categories,
            'products' => $products,
            'packages' => null,
            'pagination' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
                'from' => $paginated->firstItem(),
                'to' => $paginated->lastItem(),
            ],
        ];
    }

    /**
     * Resolve the path of the primary product image.
     */
    private function primaryImagePath(Product $product): ?string
    {
        $image = $product->images->firstWhere('is_primary', true)
            ?? $product->images->first();

        return $image?->image_path;
    }
}

