import { Head, router } from '@inertiajs/react';
import {
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    Clock,
    Filter,
    Package,
    RotateCcw,
    SlidersHorizontal,
    Wrench,
} from 'lucide-react';
import { useState } from 'react';
import {
    CalendarEventDialog,
    type CalendarBookingEvent,
    type CalendarBufferEvent,
    type CalendarMaintenanceEvent,
    type CalendarSelectedEvent,
} from '@/components/calendar/calendar-event-dialog';
import { CalendarLegend } from '@/components/calendar/calendar-legend';
import { formatDate } from '@/components/rental-shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

const MONTH_NAMES = [
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember',
];

const DAY_NAMES = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

type DailyCapacity = {
    date: string;
    day_of_month: number;
    day_name: string;
    is_current_month: boolean;
    is_today: boolean;
    rentals_count: number;
    units_rented: number;
    units_in_buffer: number;
    units_in_maintenance: number;
};

type Props = {
    booking_events: CalendarBookingEvent[];
    buffer_events: CalendarBufferEvent[];
    maintenance_events: CalendarMaintenanceEvent[];
    daily_capacity: Record<string, DailyCapacity>;
    products: Array<{ id: number; name: string }>;
    filters: {
        view: 'month' | 'week';
        month: number;
        year: number;
        week_date: string;
        product_id: number | null;
        query_start: string;
        query_end: string;
    };
};

export default function RentalCalendarIndex({
    booking_events,
    buffer_events,
    maintenance_events,
    daily_capacity,
    products,
    filters,
}: Props) {
    const [selectedEvent, setSelectedEvent] = useState<CalendarSelectedEvent>(null);
    const [selectedDayEvents, setSelectedDayEvents] = useState<{
        date: string;
        bookings: CalendarBookingEvent[];
        buffers: CalendarBufferEvent[];
        maintenances: CalendarMaintenanceEvent[];
    } | null>(null);

    const currentYear = filters.year;
    const currentMonth = filters.month;
    const currentView = filters.view;
    const currentWeekDate = filters.week_date;
    const selectedProductId = filters.product_id ? String(filters.product_id) : 'all';

    // Navigasi URL
    const navigateCalendar = (params: Partial<typeof filters>) => {
        const query: Record<string, string | number> = {
            view: params.view ?? currentView,
            month: params.month ?? currentMonth,
            year: params.year ?? currentYear,
            week_date: params.week_date ?? currentWeekDate,
        };

        const prodId = params.product_id !== undefined ? params.product_id : filters.product_id;
        if (prodId) {
            query.product_id = prodId;
        }

        router.get('/admin/calendar', query, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    // Handler Navigasi Bulan / Minggu
    const handlePrev = () => {
        if (currentView === 'month') {
            let nextM = currentMonth - 1;
            let nextY = currentYear;
            if (nextM < 1) {
                nextM = 12;
                nextY -= 1;
            }
            navigateCalendar({ month: nextM, year: nextY });
        } else {
            const d = new Date(currentWeekDate);
            d.setDate(d.getDate() - 7);
            const iso = d.toISOString().split('T')[0];
            navigateCalendar({ week_date: iso, month: d.getMonth() + 1, year: d.getFullYear() });
        }
    };

    const handleNext = () => {
        if (currentView === 'month') {
            let nextM = currentMonth + 1;
            let nextY = currentYear;
            if (nextM > 12) {
                nextM = 1;
                nextY += 1;
            }
            navigateCalendar({ month: nextM, year: nextY });
        } else {
            const d = new Date(currentWeekDate);
            d.setDate(d.getDate() + 7);
            const iso = d.toISOString().split('T')[0];
            navigateCalendar({ week_date: iso, month: d.getMonth() + 1, year: d.getFullYear() });
        }
    };

    const handleToday = () => {
        const now = new Date();
        const iso = now.toISOString().split('T')[0];
        navigateCalendar({
            month: now.getMonth() + 1,
            year: now.getFullYear(),
            week_date: iso,
        });
    };

    const handleViewChange = (newView: 'month' | 'week') => {
        navigateCalendar({ view: newView });
    };

    const handleProductChange = (val: string) => {
        const pId = val === 'all' ? null : parseInt(val, 10);
        navigateCalendar({ product_id: pId });
    };

    // Perhitungan Tanggal di Grid
    const sortedDates = Object.keys(daily_capacity).sort();

    // Dapatkan event per tanggal
    const getEventsForDate = (dateStr: string) => {
        const bookings = booking_events.filter(
            (ev) => dateStr >= ev.start_date && dateStr <= ev.end_date,
        );
        const buffers = buffer_events.filter((ev) => ev.date === dateStr);
        const maintenances = maintenance_events.filter((ev) => {
            if (ev.status === 'in_maintenance') {
                return dateStr >= ev.start_date;
            }
            return dateStr >= ev.start_date && (ev.end_date ? dateStr <= ev.end_date : true);
        });

        return { bookings, buffers, maintenances };
    };

    // Header label waktu
    const headerTitle =
        currentView === 'month'
            ? `${MONTH_NAMES[currentMonth - 1]} ${currentYear}`
            : `Minggu: ${formatDate(filters.query_start)} — ${formatDate(filters.query_end)}`;

    // Statistik Ringkas
    const totalBookingsCount = booking_events.length;
    const totalUnitsRented = booking_events.reduce((acc, b) => acc + b.total_units, 0);
    const totalUnitsBuffer = buffer_events.reduce((acc, b) => acc + b.total_units, 0);
    const totalUnitsMaintenance = maintenance_events.reduce((acc, m) => acc + m.quantity, 0);

    return (
        <>
            <Head title="Kalender Rental" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4">
                {/* Header Utama Halaman */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-col gap-1">
                        <h1 className="text-2xl font-bold tracking-tight">
                            Kalender Rental & Visual Scheduler
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Pantau antrean booking alat, buffer pengembalian, antrean perawatan, dan kepadatan kapasitas per tanggal.
                        </p>
                    </div>

                    {/* Quick Metric Badges */}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                        <Badge variant="outline" className="border-border bg-card px-2.5 py-1">
                            <span className="font-semibold text-foreground mr-1">
                                {totalBookingsCount}
                            </span>
                            <span className="text-muted-foreground">Sewa Aktif</span>
                        </Badge>
                        <Badge variant="outline" className="border-border bg-card px-2.5 py-1">
                            <span className="font-semibold text-info mr-1">
                                {totalUnitsRented}
                            </span>
                            <span className="text-muted-foreground">Unit Disewa</span>
                        </Badge>
                        <Badge variant="outline" className="border-border bg-card px-2.5 py-1">
                            <span className="font-semibold text-warning mr-1">
                                {totalUnitsBuffer}
                            </span>
                            <span className="text-muted-foreground">Unit Buffer</span>
                        </Badge>
                        <Badge variant="outline" className="border-border bg-card px-2.5 py-1">
                            <span className="font-semibold text-foreground mr-1">
                                {totalUnitsMaintenance}
                            </span>
                            <span className="text-muted-foreground">Unit Rawat</span>
                        </Badge>
                    </div>
                </div>

                {/* Toolbar Navigasi & Filter Kalender */}
                <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        {/* Navigasi Bulan / Minggu */}
                        <div className="flex items-center gap-2">
                            <div className="flex items-center rounded-md border border-border">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-9 rounded-r-none border-r border-border"
                                    onClick={handlePrev}
                                    title="Sebelumnya"
                                >
                                    <ChevronLeft className="size-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-9 px-3 text-xs font-semibold"
                                    onClick={handleToday}
                                >
                                    Hari Ini
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-9 rounded-l-none border-l border-border"
                                    onClick={handleNext}
                                    title="Selanjutnya"
                                >
                                    <ChevronRight className="size-4" />
                                </Button>
                            </div>

                            <span className="text-base font-bold text-foreground sm:text-lg">
                                {headerTitle}
                            </span>
                        </div>

                        {/* Controls View & Filter Produk */}
                        <div className="flex flex-wrap items-center gap-2.5">
                            {/* Filter Produk */}
                            <div className="w-full sm:w-[220px]">
                                <Select
                                    value={selectedProductId}
                                    onValueChange={handleProductChange}
                                >
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue placeholder="Semua Produk" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-60">
                                        <SelectItem value="all">Semua Produk</SelectItem>
                                        {products.map((p) => (
                                            <SelectItem key={p.id} value={String(p.id)}>
                                                {p.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* View Switcher: Bulan vs Minggu */}
                            <div className="flex rounded-md border border-border bg-muted p-0.5">
                                <Button
                                    size="sm"
                                    variant={currentView === 'month' ? 'default' : 'ghost'}
                                    className="h-8 px-3 text-xs"
                                    onClick={() => handleViewChange('month')}
                                >
                                    Bulan
                                </Button>
                                <Button
                                    size="sm"
                                    variant={currentView === 'week' ? 'default' : 'ghost'}
                                    className="h-8 px-3 text-xs"
                                    onClick={() => handleViewChange('week')}
                                >
                                    Minggu
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Keterangan Warna Blok */}
                    <div className="border-t border-border pt-3">
                        <CalendarLegend />
                    </div>
                </div>

                {/* 1. TAMPILAN GRID BULANAN (MONTH VIEW) */}
                {currentView === 'month' && (
                    <div className="overflow-hidden rounded-md border border-border bg-card">
                        {/* Header Nama Hari */}
                        <div className="grid grid-cols-7 border-b border-border bg-muted/40 text-center text-xs font-semibold text-muted-foreground">
                            {DAY_NAMES.map((d) => (
                                <div key={d} className="py-2.5">
                                    {d}
                                </div>
                            ))}
                        </div>

                        {/* Grid Kotak Tanggal */}
                        <div className="grid grid-cols-7 divide-x divide-y divide-border text-xs">
                            {sortedDates.map((dateStr) => {
                                const cap = daily_capacity[dateStr];
                                const { bookings, buffers, maintenances } = getEventsForDate(dateStr);
                                const totalEvents = bookings.length + buffers.length + maintenances.length;

                                return (
                                    <div
                                        key={dateStr}
                                        className={`flex min-h-[120px] flex-col p-1.5 transition-colors sm:min-h-[140px] ${
                                            !cap.is_current_month
                                                ? 'bg-muted/15 text-muted-foreground/50'
                                                : 'bg-card hover:bg-muted/10'
                                        } ${cap.is_today ? 'bg-primary/[0.03] ring-1 ring-inset ring-primary/40' : ''}`}
                                    >
                                        {/* Tanggal & Rekap Kapasitas */}
                                        <div className="flex items-center justify-between pb-1">
                                            <span
                                                className={`flex size-6 items-center justify-center rounded-full text-xs font-semibold ${
                                                    cap.is_today
                                                        ? 'bg-primary text-primary-foreground'
                                                        : cap.is_current_month
                                                          ? 'text-foreground'
                                                          : 'text-muted-foreground/50'
                                                }`}
                                            >
                                                {cap.day_of_month}
                                            </span>

                                            {/* Ringkasan Kapasitas Harian */}
                                            {cap.units_rented > 0 && (
                                                <span
                                                    className="text-[10px] font-medium text-info"
                                                    title={`${cap.units_rented} unit sedang disewa`}
                                                >
                                                    {cap.units_rented}u sewa
                                                </span>
                                            )}
                                        </div>

                                        {/* List Blok Event di Tanggal Ini */}
                                        <div className="flex flex-1 flex-col gap-1 overflow-hidden">
                                            {/* Booking Event */}
                                            {bookings.slice(0, 2).map((ev) => (
                                                <button
                                                    key={`${ev.id}-${dateStr}`}
                                                    onClick={() => setSelectedEvent(ev)}
                                                    className="flex w-full items-center gap-1 truncate rounded border border-info/20 bg-info-muted px-1.5 py-0.5 text-left text-[11px] font-medium text-info transition-opacity hover:opacity-85"
                                                    title={`${ev.rental_code} - ${ev.customer_name} (${ev.items_summary})`}
                                                >
                                                    <span className="size-1.5 shrink-0 rounded-full bg-info" />
                                                    <span className="truncate">
                                                        {ev.rental_code} • {ev.customer_name}
                                                    </span>
                                                </button>
                                            ))}

                                            {/* Buffer Event */}
                                            {buffers.slice(0, 1).map((ev) => (
                                                <button
                                                    key={`${ev.id}-${dateStr}`}
                                                    onClick={() => setSelectedEvent(ev)}
                                                    className="flex w-full items-center gap-1 truncate rounded border border-dashed border-warning/40 bg-warning-muted px-1.5 py-0.5 text-left text-[11px] font-medium text-warning transition-opacity hover:opacity-85"
                                                    title={`Buffer: ${ev.rental_code} - ${ev.customer_name}`}
                                                >
                                                    <Clock className="size-3 shrink-0" />
                                                    <span className="truncate">
                                                        Buffer: {ev.rental_code}
                                                    </span>
                                                </button>
                                            ))}

                                            {/* Maintenance Event */}
                                            {maintenances.slice(0, 1).map((ev) => (
                                                <button
                                                    key={`${ev.id}-${dateStr}`}
                                                    onClick={() => setSelectedEvent(ev)}
                                                    className="flex w-full items-center gap-1 truncate rounded border border-border bg-background px-1.5 py-0.5 text-left text-[11px] font-medium text-foreground transition-colors hover:bg-muted"
                                                    title={`Perawatan: ${ev.product_name} (${ev.quantity} unit)`}
                                                >
                                                    <Wrench className="size-3 shrink-0 text-muted-foreground" />
                                                    <span className="truncate">
                                                        {ev.product_name} ({ev.quantity}u)
                                                    </span>
                                                </button>
                                            ))}

                                            {/* Jika lebih dari 3 event */}
                                            {totalEvents > 3 && (
                                                <button
                                                    onClick={() =>
                                                        setSelectedDayEvents({
                                                            date: dateStr,
                                                            bookings,
                                                            buffers,
                                                            maintenances,
                                                        })
                                                    }
                                                    className="mt-auto text-left text-[10px] font-semibold text-muted-foreground hover:text-foreground"
                                                >
                                                    +{totalEvents - 3} lainnya...
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* 2. TAMPILAN MINGGUAN (WEEK VIEW) */}
                {currentView === 'week' && (
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-7">
                        {sortedDates.map((dateStr) => {
                            const cap = daily_capacity[dateStr];
                            const { bookings, buffers, maintenances } = getEventsForDate(dateStr);

                            return (
                                <div
                                    key={dateStr}
                                    className={`flex flex-col rounded-lg border border-border bg-card p-3 ${
                                        cap.is_today ? 'ring-2 ring-primary/50' : ''
                                    }`}
                                >
                                    {/* Header Hari */}
                                    <div className="flex items-center justify-between border-b border-border pb-2.5">
                                        <div>
                                            <div className="text-xs font-semibold text-muted-foreground">
                                                {cap.day_name}
                                            </div>
                                            <div className="text-sm font-bold text-foreground">
                                                {formatDate(dateStr)}
                                            </div>
                                        </div>
                                        {cap.is_today && (
                                            <Badge
                                                variant="secondary"
                                                className="border-transparent bg-primary text-[10px] text-primary-foreground"
                                            >
                                                Hari ini
                                            </Badge>
                                        )}
                                    </div>

                                    {/* Kepadatan Tanggal Ini */}
                                    <div className="grid grid-cols-2 gap-1.5 py-2 text-[11px] text-muted-foreground border-b border-border mb-2.5">
                                        <div>
                                            Sewa: <strong className="text-foreground">{cap.units_rented}u</strong>
                                        </div>
                                        <div>
                                            Buffer: <strong className="text-foreground">{cap.units_in_buffer}u</strong>
                                        </div>
                                    </div>

                                    {/* Daftar Kartu Event Hari Ini */}
                                    <div className="flex flex-1 flex-col gap-2">
                                        {bookings.length === 0 &&
                                        buffers.length === 0 &&
                                        maintenances.length === 0 ? (
                                            <span className="py-6 text-center text-xs text-muted-foreground/60 italic">
                                                Tidak ada agenda sewa
                                            </span>
                                        ) : (
                                            <>
                                                {/* Booking Cards */}
                                                {bookings.map((ev) => (
                                                    <div
                                                        key={`${ev.id}-${dateStr}`}
                                                        onClick={() => setSelectedEvent(ev)}
                                                        className="cursor-pointer rounded-md border border-info/30 bg-info-muted p-2 text-xs transition-colors hover:bg-info/20"
                                                    >
                                                        <div className="flex items-center justify-between font-semibold text-info">
                                                            <span>{ev.rental_code}</span>
                                                            <span className="text-[10px]">
                                                                {ev.total_units} unit
                                                            </span>
                                                        </div>
                                                        <div className="text-[11px] text-foreground font-medium pt-0.5">
                                                            {ev.customer_name}
                                                        </div>
                                                        <div className="line-clamp-2 text-[10px] text-muted-foreground pt-1">
                                                            {ev.items_summary}
                                                        </div>
                                                    </div>
                                                ))}

                                                {/* Buffer Cards */}
                                                {buffers.map((ev) => (
                                                    <div
                                                        key={`${ev.id}-${dateStr}`}
                                                        onClick={() => setSelectedEvent(ev)}
                                                        className="cursor-pointer rounded-md border border-dashed border-warning/40 bg-warning-muted p-2 text-xs transition-colors hover:bg-warning/20"
                                                    >
                                                        <div className="flex items-center gap-1 font-semibold text-warning">
                                                            <Clock className="size-3.5" />
                                                            <span>Buffer Pengembalian</span>
                                                        </div>
                                                        <div className="text-[11px] text-foreground font-medium pt-0.5">
                                                            {ev.rental_code} • {ev.customer_name}
                                                        </div>
                                                        <span className="text-[10px] text-muted-foreground block pt-0.5">
                                                            Pengecekan unit ({ev.total_units} unit)
                                                        </span>
                                                    </div>
                                                ))}

                                                {/* Maintenance Cards */}
                                                {maintenances.map((ev) => (
                                                    <div
                                                        key={`${ev.id}-${dateStr}`}
                                                        onClick={() => setSelectedEvent(ev)}
                                                        className="cursor-pointer rounded-md border border-border bg-background p-2 text-xs transition-colors hover:bg-muted"
                                                    >
                                                        <div className="flex items-center gap-1 font-semibold text-foreground">
                                                            <Wrench className="size-3.5 text-muted-foreground" />
                                                            <span>{ev.product_name}</span>
                                                        </div>
                                                        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                                                            <span>{ev.quantity} unit</span>
                                                            <span className="capitalize">{ev.reason}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Modal Detail Saat Blok Event Diklik */}
            <CalendarEventDialog
                event={selectedEvent}
                onClose={() => setSelectedEvent(null)}
            />

            {/* Modal Daftar Semua Event di Tanggal Tertentu (Expand dari Month View) */}
            {selectedDayEvents && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in-50"
                    onClick={() => setSelectedDayEvents(null)}
                >
                    <div
                        className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-lg border border-border bg-card p-5 shadow-lg space-y-4 text-xs"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b border-border pb-3">
                            <div>
                                <h3 className="text-base font-bold text-foreground">
                                    Agenda {formatDate(selectedDayEvents.date)}
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                    Total {selectedDayEvents.bookings.length + selectedDayEvents.buffers.length + selectedDayEvents.maintenances.length} agenda pada tanggal ini
                                </p>
                            </div>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedDayEvents(null)}
                            >
                                Tutup
                            </Button>
                        </div>

                        <div className="space-y-2">
                            {/* Bookings */}
                            {selectedDayEvents.bookings.map((ev) => (
                                <div
                                    key={ev.id}
                                    onClick={() => {
                                        setSelectedDayEvents(null);
                                        setSelectedEvent(ev);
                                    }}
                                    className="cursor-pointer rounded-md border border-info/30 bg-info-muted p-2.5 transition-colors hover:bg-info/20"
                                >
                                    <div className="flex items-center justify-between font-semibold text-info">
                                        <span>{ev.rental_code}</span>
                                        <span>{ev.total_units} unit</span>
                                    </div>
                                    <div className="font-medium text-foreground pt-0.5">
                                        {ev.customer_name}
                                    </div>
                                    <div className="text-[11px] text-muted-foreground pt-0.5">
                                        {ev.items_summary}
                                    </div>
                                </div>
                            ))}

                            {/* Buffers */}
                            {selectedDayEvents.buffers.map((ev) => (
                                <div
                                    key={ev.id}
                                    onClick={() => {
                                        setSelectedDayEvents(null);
                                        setSelectedEvent(ev);
                                    }}
                                    className="cursor-pointer rounded-md border border-dashed border-warning/40 bg-warning-muted p-2.5 transition-colors hover:bg-warning/20"
                                >
                                    <div className="flex items-center gap-1 font-semibold text-warning">
                                        <Clock className="size-3.5" />
                                        <span>Buffer 1 Hari ({ev.rental_code})</span>
                                    </div>
                                    <div className="text-foreground pt-0.5">
                                        {ev.customer_name} • {ev.items_summary}
                                    </div>
                                </div>
                            ))}

                            {/* Maintenances */}
                            {selectedDayEvents.maintenances.map((ev) => (
                                <div
                                    key={ev.id}
                                    onClick={() => {
                                        setSelectedDayEvents(null);
                                        setSelectedEvent(ev);
                                    }}
                                    className="cursor-pointer rounded-md border border-border bg-background p-2.5 transition-colors hover:bg-muted"
                                >
                                    <div className="flex items-center justify-between font-semibold text-foreground">
                                        <span>{ev.product_name}</span>
                                        <span>{ev.quantity} unit</span>
                                    </div>
                                    <div className="capitalize text-muted-foreground pt-0.5">
                                        Alasan: {ev.reason}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

RentalCalendarIndex.layout = {
    breadcrumbs: [
        {
            title: 'Kalender Rental',
            href: '/admin/calendar',
        },
    ],
};

