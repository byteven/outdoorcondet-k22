<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Package;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Rental;
use App\Models\VariantMaintenance;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class RentalCalendarController extends Controller
{
    /**
     * Tampilkan kalender visual scheduler rental (AD-09).
     * View bulanan/mingguan; blok booking, buffer (warna beda), maintenance, kapasitas per tanggal.
     */
    public function index(Request $request): Response
    {
        $validated = $request->validate([
            'month' => ['nullable', 'integer', 'between:1,12'],
            'year' => ['nullable', 'integer', 'min:2020', 'max:2050'],
            'view' => ['nullable', 'in:month,week'],
            'week_date' => ['nullable', 'date_format:Y-m-d'],
            'product_id' => ['nullable', 'integer', 'exists:products,id'],
        ]);

        $today = CarbonImmutable::now();
        $view = $validated['view'] ?? 'month';
        $year = (int) ($validated['year'] ?? $today->year);
        $month = (int) ($validated['month'] ?? $today->month);
        $weekDateStr = $validated['week_date'] ?? $today->toDateString();
        $productId = isset($validated['product_id']) ? (int) $validated['product_id'] : null;

        // Tentukan batas rentang kalender
        if ($view === 'week') {
            $currentWeekDate = CarbonImmutable::parse($weekDateStr);
            $queryStart = $currentWeekDate->startOfWeek(CarbonInterface::MONDAY);
            $queryEnd = $currentWeekDate->endOfWeek(CarbonInterface::SUNDAY);
        } else {
            $monthAnchor = CarbonImmutable::create($year, $month, 1);
            $monthStart = $monthAnchor->startOfMonth();
            $monthEnd = $monthAnchor->endOfMonth();

            // Grid kalender bulanan (mulai dari hari Senin minggu pertama s/d Minggu minggu terakhir)
            $queryStart = $monthStart->startOfWeek(CarbonInterface::MONDAY);
            $queryEnd = $monthEnd->endOfWeek(CarbonInterface::SUNDAY);
        }

        $queryStartDateStr = $queryStart->toDateString();
        $queryEndDateStr = $queryEnd->toDateString();

        // 1. Query Rentals yang overlap dengan rentang kalender (termasuk buffer H+1)
        $blockingStatuses = [
            'pending_payment',
            'waiting_confirmation',
            'dp_paid',
            'fully_paid',
            'picked_up',
            'returned',
        ];

        $rentalsQuery = Rental::query()
            ->with([
                'customer.user:id,name,email',
                'items.rentable',
            ])
            ->whereIn('status', $blockingStatuses)
            // Overlap: rental mulai sebelum akhir kalender DAN (selesai + buffer 1 hari) setelah awal kalender
            ->whereDate('start_date', '<=', $queryEndDateStr)
            ->whereDate('end_date', '>=', $queryStart->copy()->subDay()->toDateString())
            ->when($productId, function ($q) use ($productId) {
                $q->whereHas('items', function ($qi) use ($productId) {
                    $qi->where(function ($qItem) use ($productId) {
                        $qItem->where('rentable_type', ProductVariant::class)
                            ->whereHasMorph('rentable', [ProductVariant::class], fn ($qv) => $qv->where('product_id', $productId));
                    })->orWhere(function ($qItem) use ($productId) {
                        $qItem->where('rentable_type', Package::class)
                            ->whereHasMorph('rentable', [Package::class], fn ($qp) => $qp->whereHas('items.variant', fn ($qv) => $qv->where('product_id', $productId)));
                    });
                });
            })
            ->orderBy('start_date');

        $rentals = $rentalsQuery->get();

        // 2. Query Maintenances yang aktif atau overlap
        $maintenancesQuery = VariantMaintenance::query()
            ->with([
                'variant.product:id,name',
                'variant.values.attribute:id,name',
                'rentalItem.rental.customer.user:id,name',
            ])
            ->when($productId, fn ($q) => $q->whereHas('variant', fn ($qv) => $qv->where('product_id', $productId)))
            ->where(function ($q) use ($queryStart, $queryEnd) {
                $q->where('status', 'in_maintenance')
                    ->orWhereBetween('created_at', [$queryStart->startOfDay(), $queryEnd->endOfDay()])
                    ->orWhereBetween('completed_at', [$queryStart->startOfDay(), $queryEnd->endOfDay()]);
            })
            ->orderByDesc('created_at');

        $maintenances = $maintenancesQuery->get();

        // 3. Format Event Booking & Buffer untuk Frontend
        $bookingEvents = [];
        $bufferEvents = [];

        foreach ($rentals as $rental) {
            $rentalStart = CarbonImmutable::parse($rental->start_date)->toDateString();
            $rentalEnd = CarbonImmutable::parse($rental->end_date)->toDateString();
            $bufferDate = CarbonImmutable::parse($rental->end_date)->addDay()->toDateString();

            // Hitung total unit dan ringkasan barang
            $itemsDetail = [];
            $totalUnits = 0;

            foreach ($rental->items as $item) {
                $totalUnits += (int) $item->quantity;
                $itemsDetail[] = [
                    'id' => $item->id,
                    'name' => $item->name,
                    'quantity' => (int) $item->quantity,
                    'unit_price' => (int) $item->unit_price,
                    'subtotal' => (int) $item->subtotal,
                ];
            }

            $itemsSummary = collect($itemsDetail)
                ->map(fn ($it) => "{$it['name']} ({$it['quantity']}x)")
                ->take(2)
                ->implode(', ');

            if (count($itemsDetail) > 2) {
                $itemsSummary .= ' +'.(count($itemsDetail) - 2).' lainnya';
            }

            $customerName = $rental->customer?->user?->name ?? 'Pelanggan';
            $customerPhone = $rental->customer?->phone_number ?? '-';

            // Event Blok Booking
            $bookingEvents[] = [
                'id' => "booking-{$rental->id}",
                'type' => 'booking',
                'rental_id' => $rental->id,
                'rental_code' => $rental->rental_code,
                'customer_name' => $customerName,
                'customer_phone' => $customerPhone,
                'start_date' => $rentalStart,
                'end_date' => $rentalEnd,
                'status' => $rental->status,
                'total_price' => (int) $rental->total_price,
                'deposit_total' => (int) $rental->deposit_total,
                'total_units' => $totalUnits,
                'items_summary' => $itemsSummary,
                'items' => $itemsDetail,
            ];

            // Event Blok Buffer (1 hari tepat setelah end_date)
            $bufferEvents[] = [
                'id' => "buffer-{$rental->id}",
                'type' => 'buffer',
                'rental_id' => $rental->id,
                'rental_code' => $rental->rental_code,
                'customer_name' => $customerName,
                'customer_phone' => $customerPhone,
                'date' => $bufferDate,
                'total_units' => $totalUnits,
                'items_summary' => $itemsSummary,
                'rental_start' => $rentalStart,
                'rental_end' => $rentalEnd,
            ];
        }

        // 4. Format Event Maintenance
        $maintenanceEvents = [];
        foreach ($maintenances as $m) {
            $effectiveReason = $m->custom_reason ?: $m->reason;
            $mCreatedAt = $m->created_at ? CarbonImmutable::parse($m->created_at)->toDateString() : $today->toDateString();
            $mCompletedAt = $m->completed_at ? CarbonImmutable::parse($m->completed_at)->toDateString() : null;

            $attrs = $m->variant?->values?->map(fn ($v) => ($v->attribute?->name ?? 'Atribut').': '.$v->value)->implode(', ') ?? '';

            $maintenanceEvents[] = [
                'id' => "maintenance-{$m->id}",
                'type' => 'maintenance',
                'maintenance_id' => $m->id,
                'product_name' => $m->variant?->product?->name ?? 'Alat',
                'variant_sku' => $m->variant?->sku ?? '-',
                'attributes_summary' => $attrs,
                'quantity' => (int) $m->quantity,
                'reason' => $effectiveReason,
                'status' => $m->status,
                'start_date' => $mCreatedAt,
                'end_date' => $mCompletedAt,
                'notes' => $m->notes,
                'customer_name' => $m->rentalItem?->rental?->customer?->user?->name,
                'rental_code' => $m->rentalItem?->rental?->rental_code,
            ];
        }

        // 5. Agregasi Kapasitas Harian (Daily Capacity) untuk Tiap Tanggal di Rentang Grid
        $dailyCapacity = [];
        $cursor = $queryStart->copy();

        while ($cursor->lessThanOrEqualTo($queryEnd)) {
            $dateStr = $cursor->toDateString();

            // Rental aktif yang mencakup tanggal ini
            $activeRentalsOnDate = collect($bookingEvents)->filter(function ($ev) use ($dateStr) {
                return $dateStr >= $ev['start_date'] && $dateStr <= $ev['end_date'];
            });

            // Buffer yang jatuh pada tanggal ini
            $buffersOnDate = collect($bufferEvents)->filter(function ($ev) use ($dateStr) {
                return $ev['date'] === $dateStr;
            });

            // Maintenance yang aktif pada tanggal ini
            $maintenanceOnDate = collect($maintenanceEvents)->filter(function ($ev) use ($dateStr) {
                if ($ev['status'] === 'in_maintenance') {
                    return $dateStr >= $ev['start_date'];
                }
                return $dateStr >= $ev['start_date'] && ($ev['end_date'] ? $dateStr <= $ev['end_date'] : true);
            });

            $dailyCapacity[$dateStr] = [
                'date' => $dateStr,
                'day_of_month' => (int) $cursor->format('j'),
                'day_name' => $cursor->locale('id')->isoFormat('dddd'),
                'is_current_month' => $cursor->month === $month,
                'is_today' => $cursor->isToday(),
                'rentals_count' => $activeRentalsOnDate->count(),
                'units_rented' => (int) $activeRentalsOnDate->sum('total_units'),
                'units_in_buffer' => (int) $buffersOnDate->sum('total_units'),
                'units_in_maintenance' => (int) $maintenanceOnDate->sum('quantity'),
            ];

            $cursor = $cursor->addDay();
        }

        // 6. Daftar Produk Aktif untuk Filter Dropdown
        $products = Product::query()
            ->select('id', 'name')
            ->where('is_active', true)
            ->orderBy('name')
            ->get();

        return Inertia::render('calendar/index', [
            'booking_events' => $bookingEvents,
            'buffer_events' => $bufferEvents,
            'maintenance_events' => $maintenanceEvents,
            'daily_capacity' => $dailyCapacity,
            'products' => $products,
            'filters' => [
                'view' => $view,
                'month' => $month,
                'year' => $year,
                'week_date' => $weekDateStr,
                'product_id' => $productId,
                'query_start' => $queryStartDateStr,
                'query_end' => $queryEndDateStr,
            ],
        ]);
    }
}

