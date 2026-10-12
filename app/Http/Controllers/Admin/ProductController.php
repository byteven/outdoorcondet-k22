<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreProductRequest;
use App\Http\Requests\Admin\UpdateProductRequest;
use App\Models\Attribute;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class ProductController extends Controller
{
    /**
     * Show a paginated list of products for admins.
     */
    public function index(Request $request): Response
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'category_id' => ['nullable', 'integer', 'exists:categories,id'],
            'status' => ['nullable', 'in:all,active,inactive'],
            'per_page' => ['nullable', 'integer', 'min:5', 'max:100'],
            'sort_by' => ['nullable', 'in:name,slug,created_at'],
            'sort_dir' => ['nullable', 'in:asc,desc'],
        ]);

        $status = $filters['status'] ?? 'all';
        $sortBy = $filters['sort_by'] ?? 'created_at';
        $sortDir = $filters['sort_dir'] ?? 'desc';

        $products = Product::query()
            ->with(['category:id,name,slug', 'images', 'variants.values.attribute:id,name'])
            ->when(
                $filters['search'] ?? null,
                fn ($query, string $search) => $query->search($search),
            )
            ->when(
                $filters['category_id'] ?? null,
                fn ($query, int $categoryId) => $query->where('category_id', $categoryId),
            )
            ->when(
                $status !== 'all',
                fn ($query) => $query->where('is_active', $status === 'active'),
            )
            ->orderBy($sortBy, $sortDir)
            ->paginate($filters['per_page'] ?? 10)
            ->withQueryString();

        $summaryRow = Product::query()
            ->selectRaw('COUNT(*) AS total, COALESCE(SUM(is_active), 0) AS active')
            ->first();

        $summary = [
            'total' => (int) $summaryRow->total,
            'active' => (int) $summaryRow->active,
            'inactive' => (int) $summaryRow->total - (int) $summaryRow->active,
            'total_stock' => (int) ProductVariant::sum('stock'),
        ];

        return Inertia::render('products/index', [
            'products' => $products,
            'summary' => $summary,
            'categories' => Category::orderBy('name')->get(['id', 'name', 'slug']),
            'attributes' => Attribute::orderBy('name')->get(['id', 'name']),
            'filters' => [
                'search' => $filters['search'] ?? '',
                'category_id' => $filters['category_id'] ?? null,
                'status' => $status,
                'per_page' => (int) ($filters['per_page'] ?? 10),
                'sort_by' => $sortBy,
                'sort_dir' => $sortDir,
            ],
        ]);
    }

    /**
     * Store a newly created product with variants and images.
     */
    public function store(StoreProductRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        DB::transaction(function () use ($validated, $request): void {
            $product = Product::create([
                'category_id' => $validated['category_id'],
                'name' => $validated['name'],
                'slug' => $validated['slug'],
                'description' => $validated['description'] ?? null,
                'is_active' => $validated['is_active'] ?? true,
            ]);

            $this->syncVariants($product, $validated['variants']);
            $this->storeImages($product, $request, (int) ($validated['primary_image'] ?? 0));
        });

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => "Produk {$validated['name']} berhasil ditambahkan.",
        ]);

        return back();
    }

    /**
     * Update the given product with variants and images.
     */
    public function update(UpdateProductRequest $request, Product $product): RedirectResponse
    {
        $validated = $request->validated();

        DB::transaction(function () use ($validated, $request, $product): void {
            $product->update([
                'category_id' => $validated['category_id'],
                'name' => $validated['name'],
                'slug' => $validated['slug'],
                'description' => $validated['description'] ?? null,
                'is_active' => $validated['is_active'] ?? true,
            ]);

            $this->syncVariants($product, $validated['variants']);
            $this->syncImages($product, $request, $validated);
        });

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => "Perubahan produk {$validated['name']} berhasil disimpan.",
        ]);

        return back();
    }

    /**
     * Soft delete the given product with its images.
     */
    public function destroy(Product $product): RedirectResponse
    {
        $name = $product->name;

        DB::transaction(function () use ($product): void {
            foreach ($product->images as $image) {
                Storage::disk('public')->delete($image->image_path);
            }
            $product->delete();
        });

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => "Produk {$name} berhasil dihapus.",
        ]);

        return back();
    }

    /**
     * Replace all variants of the product with the given payload.
     *
     * @param  array<int, array<string, mixed>>  $variants
     */
    private function syncVariants(Product $product, array $variants): void
    {
        $keepIds = collect($variants)->map(fn ($v) => $v['id'] ?? null)->filter()->all();
        $product->variants()->whereNotIn('id', $keepIds ?: [0])->delete();

        foreach ($variants as $row) {
            $variant = $product->variants()->updateOrCreate(
                ['id' => $row['id'] ?? 0],
                [
                    'sku' => $row['sku'],
                    'stock' => $row['stock'],
                    'rental_price_per_day' => $row['rental_price_per_day'],
                    'weight_grams' => $row['weight_grams'] ?? 0,
                    'is_active' => filter_var($row['is_active'] ?? true, FILTER_VALIDATE_BOOLEAN),
                ],
            );

            $variant->values()->delete();
            foreach ($row['values'] ?? [] as $value) {
                $variant->values()->create([
                    'attribute_id' => $value['attribute_id'],
                    'value' => $value['value'],
                ]);
            }
        }
    }

    /**
     * Store uploaded images for a new product.
     */
    private function storeImages(Product $product, Request $request, int $primaryIndex): void
    {
        if (! $request->hasFile('images')) {
            return;
        }

        foreach ($request->file('images') as $index => $file) {
            $product->images()->create([
                'image_path' => $file->store('products', 'public'),
                'is_primary' => $index === $primaryIndex,
            ]);
        }
    }

    /**
     * Sync images on update: keep selected, delete the rest, append uploads.
     *
     * @param  array<string, mixed>  $validated
     */
    private function syncImages(Product $product, Request $request, array $validated): void
    {
        $keepIds = $validated['keep_images'] ?? null;

        if (is_array($keepIds)) {
            $removed = $product->images()->whereNotIn('id', $keepIds ?: [0])->get();
            foreach ($removed as $image) {
                Storage::disk('public')->delete($image->image_path);
                $image->delete();
            }
        }

        $existingCount = is_array($keepIds) ? $product->images()->count() : $product->images()->count();
        $primaryIndex = (int) ($validated['primary_image'] ?? 0);

        if ($request->hasFile('images')) {
            $offset = is_array($keepIds) ? count($keepIds) : $existingCount;
            foreach ($request->file('images') as $index => $file) {
                $product->images()->create([
                    'image_path' => $file->store('products', 'public'),
                    'is_primary' => ($offset + $index) === $primaryIndex,
                ]);
            }
        }

        if (is_array($keepIds)) {
            // Tandai ulang gambar utama berdasarkan urutan gabungan (lama + baru).
            $ordered = $product->images()->orderBy('id')->get()->values();
            foreach ($ordered as $index => $image) {
                $image->update(['is_primary' => $index === $primaryIndex]);
            }
        }
    }
}
