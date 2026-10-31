<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ProductVariant;
use App\Models\VariantMaintenance;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MaintenanceController extends Controller
{
    /**
     * Tampilkan antrean dan riwayat perawatan alat (AD-08 Return Inspector & Maintenance).
     */
    public function index(Request $request): Response
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', 'in:all,in_maintenance,ready'],
            'reason' => ['nullable', 'string', 'max:50'],
            'per_page' => ['nullable', 'integer', 'min:5', 'max:100'],
        ]);

        $status = $filters['status'] ?? 'in_maintenance';
        $reason = $filters['reason'] ?? 'all';
        $perPage = (int) ($filters['per_page'] ?? 15);

        $query = VariantMaintenance::query()
            ->with([
                'variant.product.images',
                'variant.values.attribute',
                'rentalItem.rental.customer.user:id,name,email',
            ])
            ->when(
                $filters['search'] ?? null,
                function ($query, string $search) {
                    $query->where(function ($q) use ($search) {
                        $q->where('notes', 'like', "%{$search}%")
                            ->orWhere('custom_reason', 'like', "%{$search}%")
                            ->orWhereHas('variant', function ($qv) use ($search) {
                                $qv->where('sku', 'like', "%{$search}%")
                                    ->orWhereHas('product', function ($qp) use ($search) {
                                        $qp->where('name', 'like', "%{$search}%");
                                    });
                            })
                            ->orWhereHas('rentalItem.rental', function ($qr) use ($search) {
                                $qr->where('rental_code', 'like', "%{$search}%");
                            });
                    });
                },
            )
            ->when(
                $status !== 'all',
                fn ($query) => $query->where('status', $status),
            )
            ->when(
                $reason !== 'all',
                function ($query) use ($reason) {
                    if ($reason === 'custom') {
                        $query->whereNotNull('custom_reason');
                    } else {
                        $query->where('reason', $reason)->whereNull('custom_reason');
                    }
                }
            )
            ->orderByRaw("CASE WHEN status = 'in_maintenance' THEN 0 ELSE 1 END")
            ->orderByDesc('created_at');

        $maintenances = $query->paginate($perPage)->withQueryString();

        // Transform collection to include clean display properties
        $maintenances->getCollection()->transform(function (VariantMaintenance $maintenance) {
            $variant = $maintenance->variant;
            $product = $variant?->product;
            $primaryImage = $product?->images?->firstWhere('is_primary', true) ?? $product?->images?->first();

            $attributesSummary = $variant?->values?->map(function ($val) {
                return ($val->attribute?->name ?? 'Atribut').': '.$val->value;
            })->implode(' | ') ?? '';

            $rental = $maintenance->rentalItem?->rental;
            $customerName = $rental?->customer?->user?->name ?? 'Manual/Gudang';

            $effectiveReason = !empty($maintenance->custom_reason) ? $maintenance->custom_reason : $maintenance->reason;

            $maintenance->setAttribute('product_name', $product?->name ?? 'Produk Tidak Ditemukan');
            $maintenance->setAttribute('sku', $variant?->sku ?? '-');
            $maintenance->setAttribute('attributes_summary', $attributesSummary);
            $maintenance->setAttribute('image_url', $primaryImage?->image_path ? '/storage/'.$primaryImage->image_path : null);
            $maintenance->setAttribute('rental_code', $rental?->rental_code);
            $maintenance->setAttribute('customer_name', $customerName);
            $maintenance->setAttribute('reason', $effectiveReason);

            return $maintenance;
        });

        // Ringkasan global untuk metrics card
        $summary = [
            'total_in_maintenance' => VariantMaintenance::where('status', 'in_maintenance')->sum('quantity'),
            'cleaning' => VariantMaintenance::where('status', 'in_maintenance')->where('reason', 'cleaning')->sum('quantity'),
            'repair' => VariantMaintenance::where('status', 'in_maintenance')->where('reason', 'repair')->sum('quantity'),
            'inspection' => VariantMaintenance::where('status', 'in_maintenance')->where('reason', 'inspection')->sum('quantity'),
            'ready_total' => VariantMaintenance::where('status', 'ready')->sum('quantity'),
        ];

        // Daftar varian untuk form tambah perawatan manual
        $variants = ProductVariant::query()
            ->with(['product:id,name', 'values.attribute:id,name'])
            ->where('is_active', true)
            ->get()
            ->map(function (ProductVariant $variant) {
                $attrs = $variant->values->map(fn ($v) => ($v->attribute?->name ?? '').': '.$v->value)->implode(', ');
                $label = ($variant->product?->name ?? 'Produk').($attrs ? " ({$attrs})" : '')." [{$variant->sku}] (Stok: {$variant->stock})";

                return [
                    'id' => $variant->id,
                    'sku' => $variant->sku,
                    'product_name' => $variant->product?->name,
                    'label' => $label,
                    'stock' => $variant->stock,
                ];
            });

        return Inertia::render('maintenances/index', [
            'maintenances' => $maintenances,
            'summary' => $summary,
            'variants' => $variants,
            'filters' => [
                'search' => $filters['search'] ?? '',
                'status' => $status,
                'reason' => $reason,
                'per_page' => $perPage,
            ],
        ]);
    }

    /**
     * Tandai unit perawatan selesai / siap digunakan.
     * Stok otomatis kembali ke pool yang tersedia (AD-08 PRD 6.2.3).
     */
    public function markReady(VariantMaintenance $maintenance): RedirectResponse
    {
        $maintenance->update([
            'status' => 'ready',
            'completed_at' => CarbonImmutable::now(),
        ]);

        $productName = $maintenance->variant?->product?->name ?? 'Unit';

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => "{$maintenance->quantity} unit {$productName} telah ditandai siap dan dikembalikan ke stok aktif.",
        ]);

        return back();
    }

    /**
     * Tambah perawatan alat secara manual (misal saat pengecekan gudang rutin).
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'product_variant_id' => ['required', 'integer', 'exists:product_variants,id'],
            'quantity' => ['required', 'integer', 'min:1'],
            'reason' => ['required', 'in:cleaning,repair,inspection,custom'],
            'custom_reason' => ['nullable', 'required_if:reason,custom', 'string', 'max:100'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $isCustom = $validated['reason'] === 'custom';
        $finalReason = $isCustom ? 'repair' : $validated['reason'];
        $customReason = $isCustom && !empty($validated['custom_reason']) ? trim($validated['custom_reason']) : null;

        VariantMaintenance::create([
            'product_variant_id' => $validated['product_variant_id'],
            'rental_item_id' => null,
            'quantity' => $validated['quantity'],
            'reason' => $finalReason,
            'custom_reason' => $customReason,
            'status' => 'in_maintenance',
            'notes' => $validated['notes'] ?? null,
        ]);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Unit berhasil ditambahkan ke antrean perawatan.',
        ]);

        return back();
    }
}

