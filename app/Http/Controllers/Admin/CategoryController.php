<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreCategoryRequest;
use App\Http\Requests\Admin\UpdateCategoryRequest;
use App\Models\Category;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CategoryController extends Controller
{
    /**
     * Show a paginated list of categories for admins.
     */
    public function index(Request $request): Response
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'per_page' => ['nullable', 'integer', 'min:5', 'max:100'],
            'sort_by' => ['nullable', 'in:name,slug,created_at'],
            'sort_dir' => ['nullable', 'in:asc,desc'],
        ]);

        $sortBy = $filters['sort_by'] ?? 'created_at';
        $sortDir = $filters['sort_dir'] ?? 'desc';

        $categories = Category::query()
            ->when(
                $filters['search'] ?? null,
                fn ($query, string $search) => $query->search($search),
            )
            ->orderBy($sortBy, $sortDir)
            ->paginate($filters['per_page'] ?? 10)
            ->withQueryString();

        $summary = [
            'total' => Category::count(),
        ];

        return Inertia::render('categories/index', [
            'categories' => $categories,
            'summary' => $summary,
            'filters' => [
                'search' => $filters['search'] ?? '',
                'per_page' => (int) ($filters['per_page'] ?? 10),
                'sort_by' => $sortBy,
                'sort_dir' => $sortDir,
            ],
        ]);
    }

    /**
     * Store a newly created category.
     */
    public function store(StoreCategoryRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        $category = Category::create($validated);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => "Kategori {$category->name} berhasil ditambahkan.",
        ]);

        return back();
    }

    /**
     * Update the specified category.
     */
    public function update(UpdateCategoryRequest $request, Category $category): RedirectResponse
    {
        $validated = $request->validated();

        $category->update($validated);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => "Perubahan kategori {$category->name} berhasil disimpan.",
        ]);

        return back();
    }

    /**
     * Soft delete the specified category.
     */
    public function destroy(Category $category): RedirectResponse
    {
        $name = $category->name;

        $category->delete();

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => "Kategori {$name} berhasil dihapus.",
        ]);

        return back();
    }
}

