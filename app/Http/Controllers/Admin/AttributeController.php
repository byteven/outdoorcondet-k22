<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreAttributeRequest;
use App\Http\Requests\Admin\UpdateAttributeRequest;
use App\Models\Attribute;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AttributeController extends Controller
{
    /**
     * Show a paginated list of attributes for admins.
     */
    public function index(Request $request): Response
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'per_page' => ['nullable', 'integer', 'min:5', 'max:100'],
            'sort_by' => ['nullable', 'in:name,created_at'],
            'sort_dir' => ['nullable', 'in:asc,desc'],
        ]);

        $sortBy = $filters['sort_by'] ?? 'created_at';
        $sortDir = $filters['sort_dir'] ?? 'desc';

        $attributes = Attribute::query()
            ->when(
                $filters['search'] ?? null,
                fn ($query, string $search) => $query->search($search),
            )
            ->orderBy($sortBy, $sortDir)
            ->paginate($filters['per_page'] ?? 10)
            ->withQueryString();

        $summary = [
            'total' => Attribute::count(),
        ];

        return Inertia::render('attributes/index', [
            'attributes' => $attributes,
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
     * Store a newly created attribute.
     */
    public function store(StoreAttributeRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        $attribute = Attribute::create($validated);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => "Atribut {$attribute->name} berhasil ditambahkan.",
        ]);

        return back();
    }

    /**
     * Update the specified attribute.
     */
    public function update(UpdateAttributeRequest $request, Attribute $attribute): RedirectResponse
    {
        $validated = $request->validated();

        $attribute->update($validated);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => "Perubahan atribut {$attribute->name} berhasil disimpan.",
        ]);

        return back();
    }

    /**
     * Soft delete the specified attribute.
     */
    public function destroy(Attribute $attribute): RedirectResponse
    {
        $name = $attribute->name;

        $attribute->delete();

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => "Atribut {$name} berhasil dihapus.",
        ]);

        return back();
    }
}
