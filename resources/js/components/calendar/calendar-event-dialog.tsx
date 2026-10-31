import { Link } from '@inertiajs/react';
import {
    Calendar,
    Clock,
    ExternalLink,
    Hammer,
    Package,
    Phone,
    ShieldAlert,
    Sparkles,
    User,
    Wrench,
} from 'lucide-react';
import { formatDate, formatRupiah } from '@/components/rental-shared';
import { RentalStatusBadge } from '@/components/rental-status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { index as maintenancesIndex } from '@/routes/admin/maintenances';
import { show as rentalsShow } from '@/routes/admin/rentals';

export type CalendarBookingEvent = {
    id: string;
    type: 'booking';
    rental_id: number;
    rental_code: string;
    customer_name: string;
    customer_phone: string;
    start_date: string;
    end_date: string;
    status: string;
    total_price: number;
    deposit_total: number;
    total_units: number;
    items_summary: string;
    items: Array<{
        id: number;
        name: string;
        quantity: number;
        unit_price: number;
        subtotal: number;
    }>;
};

export type CalendarBufferEvent = {
    id: string;
    type: 'buffer';
    rental_id: number;
    rental_code: string;
    customer_name: string;
    customer_phone: string;
    date: string;
    total_units: number;
    items_summary: string;
    rental_start: string;
    rental_end: string;
};

export type CalendarMaintenanceEvent = {
    id: string;
    type: 'maintenance';
    maintenance_id: number;
    product_name: string;
    variant_sku: string;
    attributes_summary: string;
    quantity: number;
    reason: string;
    status: string;
    start_date: string;
    end_date: string | null;
    notes: string | null;
    customer_name?: string | null;
    rental_code?: string | null;
};

export type CalendarSelectedEvent =
    | CalendarBookingEvent
    | CalendarBufferEvent
    | CalendarMaintenanceEvent
    | null;

type Props = {
    event: CalendarSelectedEvent;
    onClose: () => void;
};

export function CalendarEventDialog({ event, onClose }: Props) {
    if (!event) return null;

    const isBooking = event.type === 'booking';
    const isBuffer = event.type === 'buffer';
    const isMaintenance = event.type === 'maintenance';

    return (
        <Dialog open={!!event} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-lg">
                {/* 1. Modal Detail Booking Rental */}
                {isBooking && (
                    <>
                        <DialogHeader>
                            <div className="flex flex-wrap items-center justify-between gap-2 pr-6">
                                <DialogTitle className="text-lg font-bold">
                                    {event.rental_code}
                                </DialogTitle>
                                <RentalStatusBadge status={event.status as any} />
                            </div>
                            <DialogDescription className="text-xs text-muted-foreground">
                                Ringkasan jadwal peminjaman alat outdoor pelanggan.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-2 text-xs">
                            {/* Pelanggan */}
                            <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <User className="size-4 text-muted-foreground" />
                                        <span className="font-semibold text-sm text-foreground">
                                            {event.customer_name}
                                        </span>
                                    </div>
                                    {event.customer_phone && event.customer_phone !== '-' && (
                                        <a
                                            href={`https://wa.me/${event.customer_phone.replace(/\D/g, '')}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                                        >
                                            <Phone className="size-3" />
                                            <span>{event.customer_phone}</span>
                                        </a>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-2 border-t border-border pt-2 text-[11px]">
                                    <div>
                                        <span className="text-muted-foreground">Mulai Sewa:</span>
                                        <div className="font-medium text-foreground">
                                            {formatDate(event.start_date)}
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Batas Kembali:</span>
                                        <div className="font-medium text-foreground">
                                            {formatDate(event.end_date)}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Daftar Item Sewa */}
                            <div className="space-y-1.5">
                                <span className="font-medium text-foreground">
                                    Peralatan yang Disewa ({event.total_units} unit total):
                                </span>
                                <div className="divide-y divide-border rounded-md border border-border bg-card">
                                    {event.items.map((it) => (
                                        <div
                                            key={it.id}
                                            className="flex items-center justify-between p-2.5 text-xs"
                                        >
                                            <div className="flex items-center gap-2">
                                                <Package className="size-3.5 text-muted-foreground" />
                                                <span className="font-medium">{it.name}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-muted-foreground">
                                                    {it.quantity} unit
                                                </span>
                                                <span className="font-medium">
                                                    {formatRupiah(it.subtotal)}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Ringkasan Biaya */}
                            <div className="flex items-center justify-between rounded-md border border-border bg-muted/20 p-2.5">
                                <span className="text-muted-foreground">Total Tagihan Rental:</span>
                                <span className="text-sm font-bold text-foreground">
                                    {formatRupiah(event.total_price)}
                                </span>
                            </div>
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button variant="outline" onClick={onClose}>
                                Tutup
                            </Button>
                            <Button asChild>
                                <Link href={rentalsShow({ rental: event.rental_code }).url}>
                                    <span>Lihat Transaksi Lengkap</span>
                                    <ExternalLink className="ml-1.5 size-3.5" />
                                </Link>
                            </Button>
                        </DialogFooter>
                    </>
                )}

                {/* 2. Modal Detail Buffer Pengembalian */}
                {isBuffer && (
                    <>
                        <DialogHeader>
                            <div className="flex items-center gap-2 text-warning">
                                <Clock className="size-5" />
                                <DialogTitle className="text-lg font-bold">
                                    Masa Buffer Pengembalian (H+1)
                                </DialogTitle>
                            </div>
                            <DialogDescription className="text-xs text-muted-foreground">
                                Stok unit dialokasikan untuk pembersihan & pengecekan sebelum masuk katalog lagi jam 00:00 hari berikutnya.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-3 py-2 text-xs">
                            <div className="rounded-lg border border-warning/30 bg-warning-muted/40 p-3 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="font-semibold text-sm text-foreground">
                                        {event.rental_code}
                                    </span>
                                    <Badge
                                        variant="outline"
                                        className="border-warning/40 bg-warning-muted text-warning text-[10px]"
                                    >
                                        Buffer 1 Hari
                                    </Badge>
                                </div>
                                <div className="text-muted-foreground">
                                    Penyewa: <span className="font-medium text-foreground">{event.customer_name}</span>
                                </div>
                                <div className="text-muted-foreground">
                                    Tanggal Buffer: <strong className="text-foreground">{formatDate(event.date)}</strong>
                                </div>
                                <div className="text-[11px] text-muted-foreground">
                                    Periode sewa sebelumnya: {formatDate(event.rental_start)} s/d {formatDate(event.rental_end)}
                                </div>
                            </div>

                            <div className="rounded-md border border-border bg-card p-3 space-y-1">
                                <span className="font-medium text-foreground">Peralatan Terkait:</span>
                                <p className="text-muted-foreground">{event.items_summary}</p>
                                <span className="text-[11px] text-muted-foreground block pt-1">
                                    Total: {event.total_units} unit alat
                                </span>
                            </div>

                            <p className="text-[11px] text-muted-foreground italic">
                                * Berdasarkan sistem ketersediaan (AvailabilityService), buffer 1 hari dihitung otomatis untuk menjaga kebersihan unit sebelum disewakan ke pelanggan berikutnya.
                            </p>
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button variant="outline" onClick={onClose}>
                                Tutup
                            </Button>
                            <Button asChild>
                                <Link href={rentalsShow({ rental: event.rental_code }).url}>
                                    <span>Buka Data Sewa</span>
                                    <ExternalLink className="ml-1.5 size-3.5" />
                                </Link>
                            </Button>
                        </DialogFooter>
                    </>
                )}

                {/* 3. Modal Detail Maintenance */}
                {isMaintenance && (
                    <>
                        <DialogHeader>
                            <div className="flex items-center gap-2 text-foreground">
                                <Wrench className="size-5" />
                                <DialogTitle className="text-lg font-bold">
                                    {event.product_name}
                                </DialogTitle>
                            </div>
                            <DialogDescription className="text-xs text-muted-foreground">
                                Unit alat sedang dalam antrean perawatan / perbaikan toko.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-3 py-2 text-xs">
                            <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-medium text-muted-foreground">
                                        SKU: {event.variant_sku}
                                    </span>
                                    <Badge
                                        variant={event.status === 'ready' ? 'secondary' : 'outline'}
                                        className={
                                            event.status === 'ready'
                                                ? 'bg-success-muted text-success border-transparent'
                                                : 'border-border bg-background text-foreground'
                                        }
                                    >
                                        {event.status === 'ready' ? 'Siap digunakan' : 'Dalam perawatan'}
                                    </Badge>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-[11px]">
                                    <div>
                                        <span className="text-muted-foreground">Jumlah:</span>
                                        <div className="font-semibold text-foreground">
                                            {event.quantity} unit
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Alasan:</span>
                                        <div className="font-medium capitalize text-foreground">
                                            {event.reason}
                                        </div>
                                    </div>
                                </div>

                                {event.attributes_summary && (
                                    <div className="text-[11px] text-muted-foreground">
                                        Varian: {event.attributes_summary}
                                    </div>
                                )}
                            </div>

                            {/* Catatan */}
                            <div className="rounded-md border border-border bg-card p-3 space-y-1">
                                <span className="font-medium text-foreground">Catatan Masalah:</span>
                                <p className="text-muted-foreground">
                                    {event.notes || <span className="italic text-muted-foreground/60">Tidak ada catatan</span>}
                                </p>
                                <div className="text-[10px] text-muted-foreground/80 pt-1 border-t border-border">
                                    Masuk antrean: {formatDate(event.start_date)}
                                    {event.end_date && ` • Selesai: ${formatDate(event.end_date)}`}
                                </div>
                            </div>

                            {event.rental_code && (
                                <div className="text-[11px] text-muted-foreground">
                                    Sumber: Pengembalian sewa{' '}
                                    <Link
                                        href={rentalsShow({ rental: event.rental_code }).url}
                                        className="font-medium text-primary hover:underline"
                                    >
                                        {event.rental_code}
                                    </Link>
                                    {event.customer_name && ` (${event.customer_name})`}
                                </div>
                            )}
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button variant="outline" onClick={onClose}>
                                Tutup
                            </Button>
                            <Button asChild>
                                <Link href={maintenancesIndex().url}>
                                    <span>Buka Return & Maintenance</span>
                                    <ExternalLink className="ml-1.5 size-3.5" />
                                </Link>
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}

