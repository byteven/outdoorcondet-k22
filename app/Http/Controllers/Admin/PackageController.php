<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StorePackageRequest;
use App\Http\Requests\Admin\UpdatePackageRequest;
use App\Models\Package;
use App\Models\Product;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class PackageController extends Controller
{
    /**
     * Show a paginated list of packages for admins.
     */
    public function index(Request $request): Response
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', 'in:all,active,inactive'],
            'per_page' => ['nullable', 'integer', 'min:5', 'max:100'],
            'sort_by' => ['nullable', 'in:name,slug,created_at'],
            'sort_dir' => ['nullable', 'in:asc,desc'],
        ]);

        $status = $filters['status'] ?? 'all';
        $sortBy = $filters['sort_by'] ?? 'created_at';
        $sortDir = $filters['sort_dir'] ?? 'desc';

        $packages = Package::query()
            ->with([
                'items:id,package_id,product_id,product_variant_id,allow_variant_selection,quantity',
                'items.product:id,name',
                'items.product.variants:id,product_id,stock,is_active',
                'items.variant:id,product_id,sku,stock',
                'items.variant.product:id,name',
                'items.variant.values:id,product_variant_id,attribute_id,value',
                'durationPrices:id,package_id,duration_days,price',
            ])
            ->when(
                $filters['search'] ?? null,
                fn ($query, string $search) => $query->search($search),
            )
            ->when(
                $status !== 'all',
                fn ($query) => $query->where('is_active', $status === 'active'),
            )
            ->orderBy($sortBy, $sortDir)
            ->paginate($filters['per_page'] ?? 10)
            ->through(function (Package $package): Package {
                $package->setAttribute('available_stock', $package->availableStock());

                return $package;
            })
            ->withQueryString();

        $total = Package::query()->count();
        $active = Package::query()->where('is_active', true)->count();

        return Inertia::render('packages/index', [
            'packages' => $packages,
            'summary' => [
                'total' => $total,
                'active' => $active,
                'inactive' => $total - $active,
            ],
            'products' => Product::query()
                ->with([
                    'variants' => fn ($query) => $query
                        ->select(['id', 'product_id', 'sku', 'stock', 'is_active'])
                        ->with(['values:id,product_variant_id,attribute_id,value'])
                        ->orderBy('sku'),
                ])
                ->orderBy('name')
                ->get(['id', 'name']),
            'filters' => [
                'search' => $filters['search'] ?? '',
                'status' => $status,
                'per_page' => (int) ($filters['per_page'] ?? 10),
                'sort_by' => $sortBy,
                'sort_dir' => $sortDir,
            ],
        ]);
    }

    /**
     * Store a newly created package with its items and duration prices.
     */
    public function store(StorePackageRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        DB::transaction(function () use ($validated, $request): void {
            $package = Package::create([
                'name' => $validated['name'],
                'slug' => $validated['slug'],
                'description' => $validated['description'] ?? null,
                'daily_price' => $validated['daily_price'],
                'deposit_per_package' => $validated['deposit_per_package'] ?? 0,
                'image_path' => $this->storeImage($request),
                'is_active' => $validated['is_active'] ?? true,
            ]);

            $this->syncItems($package, (array) $validated['items']);
            $this->syncDurationPrices($package, (array) ($validated['duration_prices'] ?? []));
        });

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => "Paket {$validated['name']} berhasil ditambahkan.",
        ]);

        return back();
    }

    /**
     * Update the given package with its items and duration prices.
     */
    public function update(UpdatePackageRequest $request, Package $package): RedirectResponse
    {
        $validated = $request->validated();

        DB::transaction(function () use ($validated, $request, $package): void {
            $imagePath = $package->image_path;

            if ($request->hasFile('image')) {
                $this->deleteImage($imagePath);
                $imagePath = $this->storeImage($request);
            } elseif ($validated['remove_image'] ?? false) {
                $this->deleteImage($imagePath);
                $imagePath = null;
            }

            $package->update([
                'name' => $validated['name'],
                'slug' => $validated['slug'],
                'description' => $validated['description'] ?? null,
                'daily_price' => $validated['daily_price'],
                'deposit_per_package' => $validated['deposit_per_package'] ?? 0,
                'image_path' => $imagePath,
                'is_active' => $validated['is_active'] ?? true,
            ]);

            $this->syncItems($package, (array) $validated['items']);
            $this->syncDurationPrices($package, (array) ($validated['duration_prices'] ?? []));
        });

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => "Perubahan paket {$validated['name']} berhasil disimpan.",
        ]);

        return back();
    }

    /**
     * Soft delete the given package and remove its image.
     */
    public function destroy(Package $package): RedirectResponse
    {
        $name = $package->name;
        $imagePath = $package->image_path;

        DB::transaction(function () use ($package, $imagePath): void {
            $this->deleteImage($imagePath);
            $package->delete();
        });

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => "Paket {$name} berhasil dihapus.",
        ]);

        return back();
    }

    /**
     * Replace all items of the package with the given payload.
     *
     * @param  array<int, array<string, mixed>>  $items
     */
    private function syncItems(Package $package, array $items): void
    {
        $package->items()->delete();

        foreach ($items as $row) {
            $allowVariantSelection = (bool) ($row['allow_variant_selection'] ?? false);

            $package->items()->create([
                'product_id' => $row['product_id'],
                'product_variant_id' => $allowVariantSelection
                    ? null
                    : ($row['product_variant_id'] ?? null),
                'allow_variant_selection' => $allowVariantSelection,
                'quantity' => $row['quantity'],
            ]);
        }
    }

    /**
     * Replace all duration prices of the package with the given payload.
     *
     * @param  array<int, array<string, mixed>>  $durationPrices
     */
    private function syncDurationPrices(Package $package, array $durationPrices): void
    {
        $package->durationPrices()->delete();

        foreach ($durationPrices as $row) {
            $package->durationPrices()->create([
                'duration_days' => $row['duration_days'],
                'price' => $row['price'],
            ]);
        }
    }

    /**
     * Store the uploaded package image, if any.
     */
    private function storeImage(Request $request): ?string
    {
        $file = $request->file('image');

        return $file instanceof UploadedFile
            ? $file->store('packages', 'public')
            : null;
    }

    /**
     * Delete a stored package image.
     */
    private function deleteImage(?string $imagePath): void
    {
        if ($imagePath) {
            Storage::disk('public')->delete($imagePath);
        }
    }
}
