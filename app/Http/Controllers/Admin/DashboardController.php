<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Rental;
use App\Models\VariantMaintenance;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /**
     * Tampilkan data dashboard analitik admin (AD-10).
     */
    public function index(Request $request): Response
    {
        $period = (string) $request->input('period', 'all');
        $selectedYear = (int) $request->input('year', date('Y'));

        // Status filter
        $confirmedStatuses = ['dp_paid', 'fully_paid', 'returned'];
        $activeStatuses = ['dp_paid', 'fully_paid'];

        // 1. Transaksi Hari Ini (PRD AD-10)
        $todayStart = Carbon::today()->startOfDay();
        $todayEnd = Carbon::today()->endOfDay();
        $todayRentals = Rental::whereBetween('created_at', [$todayStart, $todayEnd]);
        $todayOrdersCount = (clone $todayRentals)->count();
        $todayOmzet = (float) (clone $todayRentals)->whereIn('status', $confirmedStatuses)->sum('rental_amount');

        // 2. Jumlah per Status Lengkap (PRD AD-10)
        $statusCounts = Rental::query()
            ->select('status', DB::raw('COUNT(id) as count'))
            ->groupBy('status')
            ->pluck('count', 'status')
            ->toArray();

        $statusBreakdown = [
            'waiting_confirmation' => (int) ($statusCounts['waiting_confirmation'] ?? 0),
            'pending_payment' => (int) ($statusCounts['pending_payment'] ?? 0),
            'dp_paid' => (int) ($statusCounts['dp_paid'] ?? 0),
            'fully_paid' => (int) ($statusCounts['fully_paid'] ?? 0),
            'returned' => (int) ($statusCounts['returned'] ?? 0),
            'cancelled' => (int) ($statusCounts['cancelled'] ?? 0),
        ];

        // 3. Barang Terpopuler / Paling Sering Disewa (PRD AD-10)
        $popularItems = DB::table('rental_items')
            ->join('rentals', 'rentals.id', '=', 'rental_items.rental_id')
            ->whereIn('rentals.status', $confirmedStatuses)
            ->select(
                'rental_items.name',
                DB::raw('SUM(rental_items.quantity) as total_rented'),
                DB::raw('SUM(rental_items.subtotal) as total_revenue')
            )
            ->groupBy('rental_items.name')
            ->orderByDesc('total_rented')
            ->limit(5)
            ->get()
            ->map(fn ($item) => [
                'name' => $item->name,
                'total_rented' => (int) $item->total_rented,
                'total_revenue' => (float) $item->total_revenue,
            ]);

        // Tentukan rentang tanggal filter periode
        $startDate = null;
        $endDate = null;

        switch ($period) {
            case 'today':
                $startDate = Carbon::today()->startOfDay();
                $endDate = Carbon::today()->endOfDay();
                break;
            case 'this_week':
                $startDate = Carbon::now()->startOfWeek();
                $endDate = Carbon::now()->endOfWeek();
                break;
            case 'this_month':
                $startDate = Carbon::now()->startOfMonth();
                $endDate = Carbon::now()->endOfMonth();
                break;
            case 'this_year':
                $startDate = Carbon::now()->startOfYear();
                $endDate = Carbon::now()->endOfYear();
                break;
            case 'all':
            default:
                $period = 'all';
                break;
        }

        // 1. Data Agregasi Keuangan & Order dengan filter periode (jika aktif)
        $rentalQuery = Rental::query();
        if ($startDate && $endDate) {
            $rentalQuery->whereBetween('start_date', [$startDate, $endDate]);
        }

        $totalOmzet = (float) (clone $rentalQuery)->whereIn('status', $confirmedStatuses)->sum('rental_amount');
        $sisaPiutang = (float) (clone $rentalQuery)->whereIn('status', $activeStatuses)->sum('remaining_balance');
        $sewaAktifCount = (clone $rentalQuery)->whereIn('status', $activeStatuses)->count();
        $waitingConfirmationCount = (clone $rentalQuery)->where('status', 'waiting_confirmation')->count();
        $totalOrdersCount = (clone $rentalQuery)->whereIn('status', $confirmedStatuses)->count();
        $returnedCount = (clone $rentalQuery)->where('status', 'returned')->count();

        // 2. Data Stok & Produk
        $totalProdukCount = Product::where('is_active', true)->count();
        $stokUnitSiap = (int) ProductVariant::where('is_active', true)->sum('stock');
        $totalPelangganCount = Customer::count();
        $maintenanceCount = (int) VariantMaintenance::where('status', 'in_maintenance')->sum('quantity');

        // Unit saat ini di customer (berdasarkan rental aktif)
        $unitDisewaCount = (int) DB::table('rental_items')
            ->join('rentals', 'rentals.id', '=', 'rental_items.rental_id')
            ->whereIn('rentals.status', $activeStatuses)
            ->sum('rental_items.quantity');

        // 3. Stok Menipis (stok <= 2)
        $lowStockVariants = ProductVariant::query()
            ->with(['product:id,name', 'values'])
            ->where('is_active', true)
            ->where('stock', '<=', 2)
            ->orderBy('stock', 'asc')
            ->limit(10)
            ->get()
            ->map(function ($variant) {
                $options = $variant->values->pluck('value')->filter()->join(' / ');
                $displayName = ($variant->product?->name ?? 'Produk') . ($options ? " ({$options})" : '');

                return [
                    'id' => $variant->id,
                    'sku' => $variant->sku,
                    'name' => $displayName,
                    'stock' => $variant->stock,
                    'min_limit' => 1,
                ];
            });

        // 4. Jadwal Pengembalian Terdekat (hari ini atau yang akan datang)
        $today = Carbon::today()->toDateString();
        $upcomingReturns = Rental::query()
            ->with(['customer.user:id,name,phone'])
            ->whereIn('status', $activeStatuses)
            ->where('end_date', '>=', $today)
            ->orderBy('end_date', 'asc')
            ->limit(5)
            ->get()
            ->map(fn ($rental) => [
                'id' => $rental->id,
                'rental_code' => $rental->rental_code,
                'customer_name' => $rental->customer?->user?->name ?? 'Pelanggan',
                'customer_phone' => $rental->customer?->phone_number ?? $rental->customer?->user?->phone,
                'end_date' => $rental->end_date->format('d M Y'),
                'is_today' => $rental->end_date->isToday(),
            ]);

        // 5. Antrean Butuh Konfirmasi
        $needsConfirmationRentals = Rental::query()
            ->with(['customer.user:id,name'])
            ->where('status', 'waiting_confirmation')
            ->orderBy('created_at', 'asc')
            ->limit(5)
            ->get()
            ->map(fn ($r) => [
                'id' => $r->id,
                'rental_code' => $r->rental_code,
                'customer_name' => $r->customer?->user?->name ?? 'Pelanggan',
                'grand_total' => (float) $r->grand_total,
                'created_at' => $r->created_at->diffForHumans(),
            ]);

        // 6. Tren Bulanan (Jan - Des untuk selectedYear)
        $monthlyStats = [];
        $monthsName = [
            1 => 'Jan', 2 => 'Feb', 3 => 'Mar', 4 => 'Apr',
            5 => 'Mei', 6 => 'Jun', 7 => 'Jul', 8 => 'Agu',
            9 => 'Sep', 10 => 'Okt', 11 => 'Nop', 12 => 'Des',
        ];

        $rentalsInYear = Rental::query()
            ->whereYear('start_date', $selectedYear)
            ->whereIn('status', $confirmedStatuses)
            ->get(['start_date', 'rental_amount']);

        $groupedByMonth = $rentalsInYear->groupBy(function ($rental) {
            return (int) Carbon::parse($rental->start_date)->format('n');
        });

        for ($m = 1; $m <= 12; $m++) {
            $monthRentals = $groupedByMonth->get($m, collect());
            $monthlyStats[] = [
                'month' => $monthsName[$m] . '-' . $selectedYear,
                'month_name' => $monthsName[$m],
                'orders' => $monthRentals->count(),
                'omzet' => (float) $monthRentals->sum('rental_amount'),
            ];
        }

        $currentYear = (int) date('Y');
        $availableYears = range($currentYear, max($currentYear - 2, 2024));

        return Inertia::render('dashboard', [
            'metrics' => [
                'total_omzet' => $totalOmzet,
                'sisa_piutang' => $sisaPiutang,
                'sewa_aktif' => $sewaAktifCount,
                'butuh_konfirmasi' => $waitingConfirmationCount,
                'total_orders' => $totalOrdersCount,
                'order_selesai' => $returnedCount,
                'stok_unit_siap' => $stokUnitSiap,
                'total_produk' => $totalProdukCount,
                'total_pelanggan' => $totalPelangganCount,
                'unit_disewa' => $unitDisewaCount,
                'unit_maintenance' => $maintenanceCount,
            ],
            'today_stats' => [
                'orders_count' => $todayOrdersCount,
                'omzet' => $todayOmzet,
            ],
            'status_breakdown' => $statusBreakdown,
            'popular_items' => $popularItems,
            'low_stock_variants' => $lowStockVariants,
            'upcoming_returns' => $upcomingReturns,
            'needs_confirmation' => $needsConfirmationRentals,
            'monthly_stats' => $monthlyStats,
            'selected_year' => $selectedYear,
            'available_years' => $availableYears,
            'selected_period' => $period,
        ]);
    }
}
