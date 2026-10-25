import {
    CalendarCheckIcon,
    CalendarXIcon,
    IdCardIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatRupiah } from '@/components/product-shared';

type RentalPriceCardProps = {
    unitPrice: number | null;
    depositPerUnit: number;
    totalDays: number | null;
    available: number | null;
    dailyPrice: number;
    rentalRangeComponent?: React.ReactNode;
};

export function RentalPriceCard({
    unitPrice,
    depositPerUnit,
    totalDays,
    available,
    dailyPrice,
    rentalRangeComponent,
}: RentalPriceCardProps) {
    const isUnavailable = available === 0;

    return (
        <div className="rounded-xl border border-border bg-card p-4 md:p-5">
            <div className="flex flex-col gap-4">
                {rentalRangeComponent}

                <div id="harga" className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1">
                        {unitPrice !== null && totalDays !== null ? (
                            <>
                                <p className="text-xs text-muted-foreground">
                                    Harga sewa {totalDays} hari
                                </p>
                                <p className="text-xl font-bold text-primary md:text-2xl">
                                    {formatRupiah(unitPrice)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    per unit
                                </p>
                            </>
                        ) : (
                            <>
                                <p className="text-xs text-muted-foreground">
                                    Harga sewa per hari
                                </p>
                                <p className="text-xl font-bold text-primary md:text-2xl">
                                    {formatRupiah(dailyPrice)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    per unit
                                </p>
                            </>
                        )}
                    </div>

                    <div className="h-px bg-border" />

                    <div className="flex flex-col gap-1">
                        <p className="text-xs text-muted-foreground">
                            Deposit per unit
                        </p>
                        <p className="text-base font-semibold text-foreground">
                            {formatRupiah(depositPerUnit)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Disetor saat ambil barang
                        </p>
                    </div>
                </div>

                {available !== null && (
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        {isUnavailable ? (
                            <CalendarXIcon className="size-3.5 text-destructive" />
                        ) : (
                            <CalendarCheckIcon className="size-3.5 text-primary" />
                        )}
                        {isUnavailable
                            ? 'Tidak tersedia pada rentang ini.'
                            : `${available} unit tersedia.`}
                    </p>
                )}

                <IdentityRequiredBanner />
            </div>
        </div>
    );
}

function IdentityRequiredBanner() {
    return (
        <div
            className={cn(
                'flex items-start gap-3 rounded-xl bg-amber-100/70 px-4 py-3 text-amber-900',
            )}
        >
            <IdCardIcon className="mt-0.5 size-5 shrink-0" />
            <p className="text-xs leading-relaxed">
                <span className="font-semibold">
                    KTP / kartu identitas diperlukan.
                </span>{' '}
                Transaksi fisik (KTP & deposit) diserahkan di outlet saat
                pengambilan barang.
            </p>
        </div>
    );
}
