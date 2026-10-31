import { Head, Link, router } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowRight,
    Boxes,
    Calendar,
    CheckCircle2,
    Clock,
    Layers,
    Package,
    Sparkles,
    Store,
    TrendingUp,
    Users,
    Wallet,
    Wrench,
    X,
} from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { formatRupiah } from '@/components/rental-shared';
import { dashboard } from '@/routes/admin';

interface DashboardProps {
    metrics: {
        total_omzet: number;
        sisa_piutang: number;
        sewa_aktif: number;
        butuh_konfirmasi: number;
        total_orders: number;
        order_selesai: number;
        stok_unit_siap: number;
        total_produk: number;
        total_pelanggan: number;
        unit_disewa: number;
        unit_maintenance: number;
    };
    today_stats: {
        orders_count: number;
        omzet: number;
    };
    status_breakdown: {
        waiting_confirmation: number;
        pending_payment: number;
        dp_paid: number;
        fully_paid: number;
        returned: number;
        cancelled: number;
    };
    popular_items: Array<{
        name: string;
        total_rented: number;
        total_revenue: number;
    }>;
    low_stock_variants: Array<{
        id: number;
        sku: string;
        name: string;
        stock: number;
        min_limit: number;
    }>;
    upcoming_returns: Array<{
        id: number;
        rental_code: string;
        customer_name: string;
        customer_phone?: string;
        end_date: string;
        is_today: boolean;
    }>;
    needs_confirmation: Array<{
        id: number;
        rental_code: string;
        customer_name: string;
        grand_total: number;
        created_at: string;
    }>;
    monthly_stats: Array<{
        month: string;
        month_name: string;
        orders: number;
        omzet: number;
    }>;
    selected_year: number;
    available_years: number[];
    selected_period?: string;
}

export default function Dashboard({
    metrics,
    today_stats,
    status_breakdown,
    popular_items,
    low_stock_variants,
    upcoming_returns,
    needs_confirmation,
    monthly_stats,
    selected_year,
    available_years,
    selected_period = 'all',
}: DashboardProps) {
    const [activeTab, setActiveTab] = useState<'operasional' | 'order' | 'stok' | 'keuangan'>('operasional');
    const [chartMode, setChartMode] = useState<'semua' | 'order' | 'omzet'>('semua');
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    // Perhitungan koordinat grafik SVG Dual-Axis
    const maxOrders = Math.max(...monthly_stats.map((m) => m.orders), 2);
    const maxOmzet = Math.max(...monthly_stats.map((m) => m.omzet), 4000000);

    const svgWidth = 860;
    const svgHeight = 240;
    const paddingX = 45;
    const paddingY = 32;
    const usableWidth = svgWidth - paddingX * 2;
    const usableHeight = svgHeight - paddingY * 2;

    const pointsOrders = monthly_stats.map((m, idx) => {
        const x = paddingX + (idx / (monthly_stats.length - 1)) * usableWidth;
        const y = svgHeight - paddingY - (m.orders / maxOrders) * usableHeight;
        return { x, y, val: m.orders, label: m.month };
    });

    const pointsOmzet = monthly_stats.map((m, idx) => {
        const x = paddingX + (idx / (monthly_stats.length - 1)) * usableWidth;
        const y = svgHeight - paddingY - (m.omzet / maxOmzet) * usableHeight;
        return { x, y, val: m.omzet, label: m.month };
    });

    // Helper membuat path kurva halus (smooth bezier)
    const makeSmoothPath = (pts: Array<{ x: number; y: number }>) => {
        if (pts.length === 0) return '';
        return pts.reduce((acc, pt, i, arr) => {
            if (i === 0) return `M ${pt.x},${pt.y}`;
            const prev = arr[i - 1];
            const cx1 = prev.x + (pt.x - prev.x) / 2;
            const cy1 = prev.y;
            const cx2 = prev.x + (pt.x - prev.x) / 2;
            const cy2 = pt.y;
            return `${acc} C ${cx1},${cy1} ${cx2},${cy2} ${pt.x},${pt.y}`;
        }, '');
    };

    const pathOrders = makeSmoothPath(pointsOrders);
    const pathOmzet = makeSmoothPath(pointsOmzet);

    // Kartu Metrik bergantung pada Tab yang dipilih (Konsisten dengan SummaryCards)
    const renderStatCards = () => {
        switch (activeTab) {
            case 'order':
                return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard
                            label="Total order sewa"
                            value={metrics.total_orders.toString()}
                            icon={CheckCircle2}
                            iconClass="bg-primary bg-[radial-gradient(circle_at_50%_0%,rgb(255_255_255/0.45),transparent_80%)] text-primary-foreground"
                            href="/admin/rentals"
                        />
                        <StatCard
                            label="Order berjalan"
                            value={metrics.sewa_aktif.toString()}
                            icon={Calendar}
                            iconClass="bg-info bg-[radial-gradient(circle_at_50%_0%,rgb(255_255_255/0.45),transparent_80%)] text-primary-foreground"
                            href="/admin/rentals?status=active"
                        />
                        <StatCard
                            label="Butuh konfirmasi"
                            value={metrics.butuh_konfirmasi.toString()}
                            icon={AlertCircle}
                            iconClass="bg-warning bg-[radial-gradient(circle_at_50%_0%,rgb(255_255_255/0.45),transparent_80%)] text-primary-foreground"
                            href="/admin/rentals?status=waiting_confirmation"
                        />
                        <StatCard
                            label="Selesai / kembali"
                            value={metrics.order_selesai.toString()}
                            icon={Store}
                            iconClass="bg-success bg-[radial-gradient(circle_at_50%_0%,rgb(255_255_255/0.45),transparent_80%)] text-primary-foreground"
                            href="/admin/rentals?status=returned"
                        />
                    </div>
                );
            case 'stok':
                return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard
                            label="Stok unit siap"
                            value={metrics.stok_unit_siap.toString()}
                            icon={Package}
                            iconClass="bg-primary bg-[radial-gradient(circle_at_50%_0%,rgb(255_255_255/0.45),transparent_80%)] text-primary-foreground"
                            href="/admin/products"
                        />
                        <StatCard
                            label="Unit sedang disewa"
                            value={metrics.unit_disewa.toString()}
                            icon={Boxes}
                            iconClass="bg-info bg-[radial-gradient(circle_at_50%_0%,rgb(255_255_255/0.45),transparent_80%)] text-primary-foreground"
                            href="/admin/rentals"
                        />
                        <StatCard
                            label="Unit maintenance"
                            value={metrics.unit_maintenance.toString()}
                            icon={Wrench}
                            iconClass="bg-warning bg-[radial-gradient(circle_at_50%_0%,rgb(255_255_255/0.45),transparent_80%)] text-primary-foreground"
                            href="/admin/maintenances"
                        />
                        <StatCard
                            label="Stok menipis"
                            value={low_stock_variants.length.toString()}
                            icon={AlertCircle}
                            iconClass="bg-destructive bg-[radial-gradient(circle_at_50%_0%,rgb(255_255_255/0.45),transparent_80%)] text-primary-foreground"
                            href="/admin/products"
                        />
                    </div>
                );
            case 'keuangan':
                return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard
                            label="Total omzet"
                            value={formatRupiah(metrics.total_omzet)}
                            icon={TrendingUp}
                            iconClass="bg-primary bg-[radial-gradient(circle_at_50%_0%,rgb(255_255_255/0.45),transparent_80%)] text-primary-foreground"
                            href="/admin/rentals"
                        />
                        <StatCard
                            label="Sisa piutang"
                            value={formatRupiah(metrics.sisa_piutang)}
                            icon={AlertCircle}
                            iconClass="bg-destructive bg-[radial-gradient(circle_at_50%_0%,rgb(255_255_255/0.45),transparent_80%)] text-primary-foreground"
                            href="/admin/rentals"
                        />
                        <StatCard
                            label="Order berjalan"
                            value={metrics.sewa_aktif.toString()}
                            icon={Calendar}
                            iconClass="bg-info bg-[radial-gradient(circle_at_50%_0%,rgb(255_255_255/0.45),transparent_80%)] text-primary-foreground"
                            href="/admin/rentals"
                        />
                        <StatCard
                            label="Total pelanggan"
                            value={metrics.total_pelanggan.toString()}
                            icon={Users}
                            iconClass="bg-warning bg-[radial-gradient(circle_at_50%_0%,rgb(255_255_255/0.45),transparent_80%)] text-primary-foreground"
                            href="/admin/customers"
                        />
                    </div>
                );
            case 'operasional':
            default:
                return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard
                            label="Total omzet"
                            value={formatRupiah(metrics.total_omzet)}
                            icon={TrendingUp}
                            iconClass="bg-primary bg-[radial-gradient(circle_at_50%_0%,rgb(255_255_255/0.45),transparent_80%)] text-primary-foreground"
                            href="/admin/rentals"
                        />
                        <StatCard
                            label="Sewa aktif"
                            value={metrics.sewa_aktif.toString()}
                            icon={Calendar}
                            iconClass="bg-info bg-[radial-gradient(circle_at_50%_0%,rgb(255_255_255/0.45),transparent_80%)] text-primary-foreground"
                            href="/admin/rentals"
                        />
                        <StatCard
                            label="Stok unit siap"
                            value={metrics.stok_unit_siap.toString()}
                            icon={Package}
                            iconClass="bg-success bg-[radial-gradient(circle_at_50%_0%,rgb(255_255_255/0.45),transparent_80%)] text-primary-foreground"
                            href="/admin/products"
                        />
                        <StatCard
                            label="Total pelanggan"
                            value={metrics.total_pelanggan.toString()}
                            icon={Users}
                            iconClass="bg-warning bg-[radial-gradient(circle_at_50%_0%,rgb(255_255_255/0.45),transparent_80%)] text-primary-foreground"
                            href="/admin/customers"
                        />
                    </div>
                );
        }
    };

    return (
        <>
            <Head title="Dashboard Admin" />

            <div className="flex flex-col gap-6 p-4 sm:p-6 font-sans">
                {/* 1. Header Filter & Tab Navigasi */}
                <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                            <span>Periode:</span>
                            <Select
                                value={selected_period}
                                onValueChange={(val) => {
                                    router.get(
                                        dashboard(),
                                        { period: val, year: selected_year },
                                        { preserveState: true }
                                    );
                                }}
                            >
                                <SelectTrigger className="h-8 w-40 text-xs font-medium border-border bg-card">
                                    <div className="flex items-center gap-1.5 truncate">
                                        <Calendar className="size-3.5 text-muted-foreground shrink-0" />
                                        <SelectValue placeholder="Pilih periode" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all" className="text-xs">Semua periode</SelectItem>
                                    <SelectItem value="today" className="text-xs">Hari ini</SelectItem>
                                    <SelectItem value="this_week" className="text-xs">Minggu ini</SelectItem>
                                    <SelectItem value="this_month" className="text-xs">Bulan ini</SelectItem>
                                    <SelectItem value="this_year" className="text-xs">Tahun ini</SelectItem>
                                </SelectContent>
                            </Select>

                            {selected_period !== 'all' && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        router.get(
                                            dashboard(),
                                            { period: 'all', year: selected_year },
                                            { preserveState: true }
                                        );
                                    }}
                                    className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                                    title="Reset ke semua periode"
                                >
                                    <X className="size-3.5 mr-1" />
                                    Reset
                                </Button>
                            )}

                            {/* Rekap Transaksi Hari Ini (PRD AD-10) */}
                            <Badge variant="outline" className="border-border bg-card text-foreground px-3 py-1 font-normal gap-1.5 rounded-md hidden md:inline-flex text-xs">
                                <Clock className="size-3 text-primary" />
                                Hari ini: <span className="font-semibold">{today_stats.orders_count} transaksi</span> ({formatRupiah(today_stats.omzet)})
                            </Badge>
                        </div>

                        {metrics.butuh_konfirmasi > 0 && (
                            <Link href="/admin/rentals?status=waiting_confirmation">
                                <Badge variant="secondary" className="border-0 bg-warning-muted text-warning gap-1.5 px-3 py-1 text-xs rounded-md">
                                    <AlertCircle className="size-3.5 text-warning" />
                                    {metrics.butuh_konfirmasi} pesanan butuh konfirmasi
                                </Badge>
                            </Link>
                        )}
                    </div>

                    {/* Navigation Tabs (Sesuai Design System: Inter, bg-primary saat aktif) */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-muted/60 p-1.5 rounded-lg border border-border">
                        <button
                            type="button"
                            onClick={() => setActiveTab('operasional')}
                            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                                activeTab === 'operasional'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'text-muted-foreground hover:bg-card hover:text-foreground'
                            }`}
                        >
                            <Layers className="size-4" />
                            Operasional
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('order')}
                            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                                activeTab === 'order'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'text-muted-foreground hover:bg-card hover:text-foreground'
                            }`}
                        >
                            <Calendar className="size-4" />
                            Order & rental
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('stok')}
                            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                                activeTab === 'stok'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'text-muted-foreground hover:bg-card hover:text-foreground'
                            }`}
                        >
                            <Package className="size-4" />
                            Unit & stok
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('keuangan')}
                            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                                activeTab === 'keuangan'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'text-muted-foreground hover:bg-card hover:text-foreground'
                            }`}
                        >
                            <Wallet className="size-4" />
                            Keuangan
                        </button>
                    </div>
                </div>

                {/* 2. Top Metric Cards */}
                {renderStatCards()}

                {/* Antrean "Butuh Konfirmasi" (Section Khusus PRD AD-10) */}
                {needs_confirmation.length > 0 && (
                    <Card className="border border-warning/40 bg-warning-muted/15 shadow-none">
                        <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b border-warning/20">
                            <div className="flex items-center gap-2">
                                <AlertCircle className="size-4 text-warning" />
                                <CardTitle className="text-sm font-semibold text-foreground">
                                    Antrean Butuh Konfirmasi ({needs_confirmation.length})
                                </CardTitle>
                            </div>
                            <Link
                                href="/admin/rentals?status=waiting_confirmation"
                                className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
                            >
                                Kelola antrean
                                <ArrowRight className="size-3" />
                            </Link>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-border/60">
                                {needs_confirmation.map((item) => (
                                    <div key={item.id} className="py-2.5 px-4 flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2 truncate pr-2">
                                            <span className="font-semibold text-foreground">{item.rental_code}</span>
                                            <span className="text-muted-foreground truncate">oleh {item.customer_name}</span>
                                            <span className="text-[11px] text-muted-foreground shrink-0 hidden sm:inline">({item.created_at})</span>
                                        </div>
                                        <div className="flex items-center gap-3 shrink-0">
                                            <span className="font-semibold text-foreground">{formatRupiah(item.grand_total)}</span>
                                            <Link href={`/admin/rentals?search=${item.rental_code}`}>
                                                <Button size="sm" variant="outline" className="h-7 text-xs border-border bg-card">
                                                    Tinjau
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* 3. Grafik Tren Kinerja Sewa & Order (Dual-Axis SVG dengan Token CSS) */}
                <Card className="border border-border bg-card shadow-none">
                    <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border">
                        <div>
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                                    <TrendingUp className="size-4" />
                                </div>
                                <CardTitle className="text-base font-semibold text-foreground">
                                    Tren Kinerja Sewa & Order
                                </CardTitle>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Statistik transaksi penyewaan armada bulanan tahun {selected_year}
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* Filter Mode Series */}
                            <div className="flex items-center bg-muted/60 p-1 rounded-md border border-border">
                                <button
                                    type="button"
                                    onClick={() => setChartMode('semua')}
                                    className={`px-2.5 py-1 text-xs rounded-sm font-medium transition-colors ${
                                        chartMode === 'semua' ? 'bg-card text-foreground border border-border/50' : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    Semua
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setChartMode('order')}
                                    className={`px-2.5 py-1 text-xs rounded-sm font-medium transition-colors ${
                                        chartMode === 'order' ? 'bg-card text-foreground border border-border/50' : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    Order
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setChartMode('omzet')}
                                    className={`px-2.5 py-1 text-xs rounded-sm font-medium transition-colors ${
                                        chartMode === 'omzet' ? 'bg-card text-foreground border border-border/50' : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    Omzet
                                </button>
                            </div>

                            {/* Year Selector Menggunakan Shadcn UI Select */}
                            <div className="w-32">
                                <Select
                                    value={selected_year.toString()}
                                    onValueChange={(val) => {
                                        router.get(dashboard(), { period: selected_period, year: val }, { preserveState: true });
                                    }}
                                >
                                    <SelectTrigger className="h-8 text-xs font-medium border-border bg-card">
                                        <div className="flex items-center gap-1.5">
                                            <Calendar className="size-3.5 text-muted-foreground" />
                                            <SelectValue placeholder="Tahun" />
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {available_years.map((y) => (
                                            <SelectItem key={y} value={y.toString()} className="text-xs">
                                                Tahun {y}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="pt-4">
                        {/* Legend */}
                        <div className="flex items-center justify-end gap-4 text-xs font-medium mb-3">
                            {(chartMode === 'semua' || chartMode === 'order') && (
                                <span className="flex items-center gap-1.5 text-foreground">
                                    <span className="size-2 rounded-sm bg-primary inline-block" />
                                    Total order sewa
                                </span>
                            )}
                            {(chartMode === 'semua' || chartMode === 'omzet') && (
                                <span className="flex items-center gap-1.5 text-foreground">
                                    <span className="size-2 rounded-sm bg-info inline-block" />
                                    Omzet sewa (Rp)
                                </span>
                            )}
                        </div>

                        {/* Responsive SVG Chart */}
                        <div className="w-full overflow-x-auto">
                            <div className="min-w-[700px] relative">
                                <svg
                                    viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                                    className="w-full h-auto overflow-visible select-none"
                                >
                                    {/* Grid Lines Vertikal & Horizontal */}
                                    {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                                        const y = svgHeight - paddingY - ratio * usableHeight;
                                        return (
                                            <g key={i}>
                                                <line
                                                    x1={paddingX}
                                                    y1={y}
                                                    x2={svgWidth - paddingX}
                                                    y2={y}
                                                    stroke="currentColor"
                                                    strokeDasharray="3 3"
                                                    className="text-border/50"
                                                />
                                                {/* Left Axis Label (Order) */}
                                                <text
                                                    x={paddingX - 8}
                                                    y={y + 4}
                                                    textAnchor="end"
                                                    className="text-[10px] fill-muted-foreground font-sans"
                                                >
                                                    {Math.round(ratio * maxOrders)}
                                                </text>
                                                {/* Right Axis Label (Omzet) */}
                                                <text
                                                    x={svgWidth - paddingX + 8}
                                                    y={y + 4}
                                                    textAnchor="start"
                                                    className="text-[10px] fill-muted-foreground font-sans"
                                                >
                                                    {ratio === 0 ? 'Rp 0' : `Rp ${(ratio * (maxOmzet / 1000000)).toFixed(1)}jt`}
                                                </text>
                                            </g>
                                        );
                                    })}

                                    {/* X Axis Months */}
                                    {monthly_stats.map((m, idx) => {
                                        const x = paddingX + (idx / (monthly_stats.length - 1)) * usableWidth;
                                        return (
                                            <text
                                                key={idx}
                                                x={x}
                                                y={svgHeight - 8}
                                                textAnchor="middle"
                                                className="text-[10px] fill-muted-foreground font-sans"
                                            >
                                                {m.month}
                                            </text>
                                        );
                                    })}

                                    {/* Curves Menggunakan Token CSS Langsung */}
                                    {(chartMode === 'semua' || chartMode === 'omzet') && (
                                        <path
                                            d={pathOmzet}
                                            fill="none"
                                            stroke="var(--color-info)"
                                            strokeWidth="2.5"
                                            strokeLinecap="round"
                                        />
                                    )}

                                    {(chartMode === 'semua' || chartMode === 'order') && (
                                        <path
                                            d={pathOrders}
                                            fill="none"
                                            stroke="var(--color-primary)"
                                            strokeWidth="2.5"
                                            strokeLinecap="round"
                                        />
                                    )}

                                    {/* Interactive Dots */}
                                    {monthly_stats.map((m, idx) => {
                                        const pOrder = pointsOrders[idx];
                                        const pOmzet = pointsOmzet[idx];

                                        return (
                                            <g
                                                key={idx}
                                                className="cursor-pointer"
                                                onMouseEnter={() => setHoveredIndex(idx)}
                                                onMouseLeave={() => setHoveredIndex(null)}
                                            >
                                                {(chartMode === 'semua' || chartMode === 'omzet') && (
                                                    <circle
                                                        cx={pOmzet.x}
                                                        cy={pOmzet.y}
                                                        r={hoveredIndex === idx ? '5.5' : '3.5'}
                                                        fill="var(--background)"
                                                        stroke="var(--color-info)"
                                                        strokeWidth="2"
                                                        className="transition-all"
                                                    />
                                                )}
                                                {(chartMode === 'semua' || chartMode === 'order') && (
                                                    <circle
                                                        cx={pOrder.x}
                                                        cy={pOrder.y}
                                                        r={hoveredIndex === idx ? '5.5' : '3.5'}
                                                        fill="var(--background)"
                                                        stroke="var(--color-primary)"
                                                        strokeWidth="2"
                                                        className="transition-all"
                                                    />
                                                )}
                                            </g>
                                        );
                                    })}
                                </svg>

                                {/* Tooltip saat hover */}
                                {hoveredIndex !== null && (
                                    <div
                                        style={{
                                            left: `${(pointsOrders[hoveredIndex].x / svgWidth) * 100}%`,
                                            top: `${(Math.min(pointsOrders[hoveredIndex].y, pointsOmzet[hoveredIndex].y) / svgHeight) * 100}%`,
                                        }}
                                        className="absolute -translate-x-1/2 -translate-y-full -mt-2 pointer-events-none z-10 bg-popover text-popover-foreground border border-border p-2.5 rounded-lg text-xs whitespace-nowrap"
                                    >
                                        <div className="font-semibold text-foreground mb-1">
                                            {monthly_stats[hoveredIndex].month}
                                        </div>
                                        <div className="flex items-center gap-2 text-primary font-medium">
                                            <span className="size-1.5 rounded-sm bg-primary" />
                                            Order: {monthly_stats[hoveredIndex].orders} transaksi
                                        </div>
                                        <div className="flex items-center gap-2 text-info font-medium">
                                            <span className="size-1.5 rounded-sm bg-info" />
                                            Omzet: {formatRupiah(monthly_stats[hoveredIndex].omzet)}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* 4. Bagian Bawah: Barang Populer & Modul Cepat (Kiri), Widget Status & Stok (Kanan) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    {/* Kolom Kiri: Barang Terpopuler & Modul Operasional Cepat */}
                    <div className="lg:col-span-2 space-y-4">
                        {/* Barang Terpopuler (PRD AD-10) */}
                        <Card className="border border-border bg-card shadow-none">
                            <CardHeader className="pb-3 flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                                        <Sparkles className="size-4 text-primary" />
                                        Barang Terpopuler
                                    </CardTitle>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Peralatan outdoor paling sering disewa oleh pelanggan
                                    </p>
                                </div>
                                <Badge variant="outline" className="text-xs font-normal">
                                    Top 5
                                </Badge>
                            </CardHeader>
                            <CardContent>
                                {popular_items.length > 0 ? (
                                    <div className="divide-y divide-border/60">
                                        {popular_items.map((item, idx) => (
                                            <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                                                <div className="flex items-center gap-3 truncate pr-2">
                                                    <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-bold text-foreground">
                                                        {idx + 1}
                                                    </span>
                                                    <span className="font-medium text-foreground truncate" title={item.name}>
                                                        {item.name}
                                                    </span>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <span className="font-semibold text-foreground">{item.total_rented} unit disewa</span>
                                                    <span className="block text-[11px] text-muted-foreground">{formatRupiah(item.total_revenue)}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-6 text-xs text-muted-foreground">
                                        Belum ada data barang sewa yang selesai
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Modul Operasional Cepat */}
                        <Card className="border border-border bg-card shadow-none">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base font-semibold text-foreground">
                                    Modul Operasional Cepat
                                </CardTitle>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Akses langsung ke alur kerja utama bisnis rental Anda
                                </p>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <QuickActionCard
                                        title="Manajemen order"
                                        desc="Atur jadwal booking dan sewa unit"
                                        icon={Calendar}
                                        iconClass="bg-primary bg-[radial-gradient(circle_at_50%_0%,rgb(255_255_255/0.45),transparent_80%)] text-primary-foreground"
                                        href="/admin/rentals"
                                    />
                                    <QuickActionCard
                                        title="Produk & stok unit"
                                        desc="Cek inventaris & ketersediaan"
                                        icon={Package}
                                        iconClass="bg-info bg-[radial-gradient(circle_at_50%_0%,rgb(255_255_255/0.45),transparent_80%)] text-primary-foreground"
                                        href="/admin/products"
                                    />
                                    <QuickActionCard
                                        title="Data pelanggan"
                                        desc="Database penyewa & verifikasi"
                                        icon={Users}
                                        iconClass="bg-success bg-[radial-gradient(circle_at_50%_0%,rgb(255_255_255/0.45),transparent_80%)] text-primary-foreground"
                                        href="/admin/pelanggan"
                                    />
                                    <QuickActionCard
                                        title="Kasir & onsite (POS)"
                                        desc="Input sewa langsung & cetak struk"
                                        icon={Store}
                                        iconClass="bg-warning bg-[radial-gradient(circle_at_50%_0%,rgb(255_255_255/0.45),transparent_80%)] text-primary-foreground"
                                        href="/admin/pos"
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Kolom Kanan: Status Breakdown, Pengembalian Terdekat, Stok Menipis, Ringkasan */}
                    <div className="space-y-4">
                        {/* Widget: Jumlah per Status (PRD AD-10) */}
                        <Card className="border border-border bg-card shadow-none">
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-sm font-semibold text-foreground">
                                        Jumlah per Status
                                    </CardTitle>
                                    <Link href="/admin/rentals" className="text-xs text-primary hover:underline">
                                        Lihat semua
                                    </Link>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-2 text-xs">
                                <div className="flex items-center justify-between pb-1 border-b border-border/50">
                                    <span className="text-muted-foreground flex items-center gap-1.5">
                                        <span className="size-2 rounded-sm bg-warning inline-block" />
                                        Butuh konfirmasi
                                    </span>
                                    <span className="font-semibold text-warning">{status_breakdown.waiting_confirmation ?? 0}</span>
                                </div>
                                <div className="flex items-center justify-between pb-1 border-b border-border/50">
                                    <span className="text-muted-foreground flex items-center gap-1.5">
                                        <span className="size-2 rounded-sm bg-muted-foreground inline-block" />
                                        Menunggu pembayaran
                                    </span>
                                    <span className="font-semibold text-foreground">{status_breakdown.pending_payment ?? 0}</span>
                                </div>
                                <div className="flex items-center justify-between pb-1 border-b border-border/50">
                                    <span className="text-muted-foreground flex items-center gap-1.5">
                                        <span className="size-2 rounded-sm bg-info inline-block" />
                                        DP dibayar
                                    </span>
                                    <span className="font-semibold text-info">{status_breakdown.dp_paid ?? 0}</span>
                                </div>
                                <div className="flex items-center justify-between pb-1 border-b border-border/50">
                                    <span className="text-muted-foreground flex items-center gap-1.5">
                                        <span className="size-2 rounded-sm bg-primary inline-block" />
                                        Lunas
                                    </span>
                                    <span className="font-semibold text-primary">{status_breakdown.fully_paid ?? 0}</span>
                                </div>
                                <div className="flex items-center justify-between pb-1 border-b border-border/50">
                                    <span className="text-muted-foreground flex items-center gap-1.5">
                                        <span className="size-2 rounded-sm bg-success inline-block" />
                                        Selesai (Kembali)
                                    </span>
                                    <span className="font-semibold text-success">{status_breakdown.returned ?? 0}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground flex items-center gap-1.5">
                                        <span className="size-2 rounded-sm bg-destructive inline-block" />
                                        Dibatalkan
                                    </span>
                                    <span className="font-semibold text-destructive">{status_breakdown.cancelled ?? 0}</span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Widget 1: Jadwal Kembali Terdekat */}
                        <Card className="border border-border bg-card shadow-none">
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                                        <Clock className="size-4 text-primary" />
                                        Jadwal kembali terdekat
                                    </CardTitle>
                                    <Badge variant="outline" className="text-[11px] font-normal rounded-md">
                                        {upcoming_returns.length} unit
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {upcoming_returns.length > 0 ? (
                                    upcoming_returns.map((item) => (
                                        <div
                                            key={item.id}
                                            className="flex items-center justify-between p-2.5 rounded-md border border-border bg-muted/30 text-xs"
                                        >
                                            <div className="space-y-0.5">
                                                <div className="font-medium text-foreground">{item.rental_code}</div>
                                                <div className="text-muted-foreground">{item.customer_name}</div>
                                            </div>
                                            <Badge
                                                variant="secondary"
                                                className={`rounded-md border-0 ${
                                                    item.is_today
                                                        ? 'bg-warning-muted text-warning'
                                                        : 'bg-muted text-muted-foreground'
                                                }`}
                                            >
                                                {item.end_date}
                                            </Badge>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-5 text-xs text-muted-foreground">
                                        Tidak ada jadwal kembali terdekat
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Widget 2: Stok Menipis */}
                        <Card className="border border-border bg-card shadow-none">
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                                        <AlertCircle className="size-4 text-warning" />
                                        Stok menipis ({low_stock_variants.length})
                                    </CardTitle>
                                </div>
                                <p className="text-[11px] text-muted-foreground">
                                    Unit tersisa perlu restock
                                </p>
                            </CardHeader>
                            <CardContent className="space-y-2 max-h-56 overflow-y-auto pr-1">
                                {low_stock_variants.length > 0 ? (
                                    low_stock_variants.map((v) => (
                                        <div
                                            key={v.id}
                                            className="flex items-center justify-between p-2 rounded-md border border-border bg-muted/30 text-xs"
                                        >
                                            <div className="space-y-0.5 truncate pr-2">
                                                <div className="font-medium text-foreground truncate" title={v.name}>
                                                    {v.name}
                                                </div>
                                                <div className="text-[10px] text-muted-foreground">
                                                    Batas minimum: {v.min_limit} unit
                                                </div>
                                            </div>
                                            <Badge
                                                variant="secondary"
                                                className="border-0 bg-warning-muted text-warning shrink-0 text-[10px] font-medium rounded-md"
                                            >
                                                {v.stock} tersedia
                                            </Badge>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-5 text-xs text-muted-foreground">
                                        Seluruh stok unit dalam batas aman
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Widget 3: Ringkasan Operasional */}
                        <Card className="border border-border bg-card shadow-none">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-semibold text-foreground">
                                    Ringkasan operasional
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2.5 text-xs">
                                <div className="flex items-center justify-between pb-1 border-b border-border/50">
                                    <span className="text-muted-foreground">Total katalog produk</span>
                                    <span className="font-medium text-foreground">{metrics.total_produk}</span>
                                </div>
                                <div className="flex items-center justify-between pb-1 border-b border-border/50">
                                    <span className="text-muted-foreground">Total unit armada</span>
                                    <span className="font-medium text-foreground">{metrics.stok_unit_siap} unit</span>
                                </div>
                                <div className="flex items-center justify-between pb-1 border-b border-border/50">
                                    <span className="text-muted-foreground">Total database pelanggan</span>
                                    <span className="font-medium text-foreground">{metrics.total_pelanggan} orang</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Sisa piutang sewa</span>
                                    <span className="font-semibold text-destructive">{formatRupiah(metrics.sisa_piutang)}</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </>
    );
}

// Komponen Pembantu: Kartu Metrik (Konsisten dengan SummaryCards di halaman lain)
function StatCard({
    label,
    value,
    icon: Icon,
    iconClass,
    href,
}: {
    label: string;
    value: string;
    icon: React.ComponentType<{ className?: string }>;
    iconClass: string;
    href: string;
}) {
    return (
        <Link
            href={href}
            className="flex items-center gap-4 rounded-lg border border-border bg-card p-4 hover:border-primary/50 transition-colors group"
        >
            <span
                className={`flex size-10 shrink-0 items-center justify-center rounded-md ${iconClass}`}
            >
                <Icon className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
                <span className="block text-sm text-muted-foreground truncate" title={label}>
                    {label}
                </span>
                <span className="block text-2xl font-bold tracking-tight text-foreground truncate">
                    {value}
                </span>
            </span>
        </Link>
    );
}

// Komponen Pembantu: Modul Operasional Cepat
function QuickActionCard({
    title,
    desc,
    icon: Icon,
    iconClass,
    href,
}: {
    title: string;
    desc: string;
    icon: React.ComponentType<{ className?: string }>;
    iconClass: string;
    href: string;
}) {
    return (
        <Link
            href={href}
            className="flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:border-primary/50 transition-colors group"
        >
            <div className="flex items-center gap-3.5 min-w-0">
                <span
                    className={`flex size-10 shrink-0 items-center justify-center rounded-md ${iconClass}`}
                >
                    <Icon className="size-5" />
                </span>
                <div className="space-y-0.5 min-w-0">
                    <div className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors truncate">
                        {title}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                        {desc}
                    </div>
                </div>
            </div>
            <ArrowRight className="size-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 ml-3" />
        </Link>
    );
}

Dashboard.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
    ],
};
