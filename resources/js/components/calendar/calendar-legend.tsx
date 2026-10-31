import { Clock, Package, Wrench } from 'lucide-react';

export function CalendarLegend() {
    return (
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Keterangan:</span>

            {/* Booking */}
            <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-info" />
                <span className="text-[11px] text-foreground">Sewa Aktif (Booking)</span>
            </div>

            {/* Buffer */}
            <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-warning" />
                <span className="text-[11px] text-foreground">Buffer Pengembalian (H+1)</span>
            </div>

            {/* Maintenance */}
            <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-muted-foreground" />
                <span className="text-[11px] text-foreground">Dalam Perawatan (Maintenance)</span>
            </div>
        </div>
    );
}

