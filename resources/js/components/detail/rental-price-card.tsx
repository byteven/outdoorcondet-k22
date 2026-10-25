import { CalendarCheckIcon, CalendarXIcon, IdCardIcon } from 'lucide-react';
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
    const hasDateSelection = unitPrice !== null && totalDays !== null;

    return (
        <div className="rounded-2xl border border-border bg-card p-4 md:p-5">
            <div className="flex flex-col gap-4">
                {/* Row 1: Harga Sewa & Deposit */}
                <div className="flex flex-col gap-3">
                    <div className="flex items-start gap-4">
                        {/* Harga Sewa */}
                        <div className="flex flex-1 flex-col gap-1.5">
                            <p className="text-sm text-muted-foreground">Harga Sewa</p>
                            <p className="text-xl font-semibold text-primary">
                                {formatRupiah(dailyPrice)}
                                <span className="text-sm font-normal text-muted-foreground">
                                    {' '}
                                    / hari
                                </span>
                            </p>
                        </div>

                        {/* Deposit */}
                        <div className="flex flex-1 flex-col gap-1.5">
                            <p className="text-sm text-muted-foreground">Deposit</p>
                            <p className="text-xl font-semibold text-foreground">
                                {formatRupiah(depositPerUnit)}
                                <span className="text-sm font-normal text-muted-foreground">
                                    {' '}
                                    / qty
                                </span>
                            </p>
                        </div>
                    </div>

                    {/* Availability */}
                    {available !== null && (
                        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            {isUnavailable ? (
                                <CalendarXIcon className="size-3.5 text-destructive" />
                            ) : (
                                <CalendarCheckIcon className="size-3.5 text-primary" />
                            )}
                            {isUnavailable
                                ? 'Tidak tersedia'
                                : `${available} unit tersedia`}
                        </p>
                    )}
                </div>

                {/* Row 2: Rental Range */}
                {rentalRangeComponent}

                {/* Row 3: Ringkasan - Show when dates selected */}
                {hasDateSelection && (
                    <div className="flex flex-col gap-2 rounded-xl p-3">
                        <div className="flex items-baseline justify-between gap-2">
                            <span className="text-xs text-muted-foreground">
                                Sewa {totalDays} hari
                            </span>
                            <span className="text-sm font-semibold">
                                {formatRupiah(unitPrice)}
                            </span>
                        </div>
                        <div className="flex items-baseline justify-between gap-2">
                            <span className="text-xs text-muted-foreground">
                                Deposit
                            </span>
                            <span className="text-sm font-semibold">
                                {formatRupiah(depositPerUnit)}
                            </span>
                        </div>
                        <div className="mt-1 flex items-baseline justify-between gap-2 border-t border-border pt-2">
                            <span className="text-xs font-medium">Total</span>
                            <span className="text-base font-semibold text-primary">
                                {formatRupiah(unitPrice + depositPerUnit)}
                            </span>
                        </div>
                    </div>
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
                'flex items-center gap-3 rounded-xl bg-card border border-border px-4 py-3 text-muted-foreground',
            )}
        >
            <IdCardIcon className="mt-0.5 size-5 shrink-0" />
            <p className="text-xs leading-relaxed">
                <span className="font-semibold">
                    KTP / kartu identitas diperlukan.
                </span>
            </p>
        </div>
    );
}
