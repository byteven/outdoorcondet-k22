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
        <div className="rounded-2xl bg-card border border-border p-4 md:p-5">
            <div className="flex flex-col gap-4">
                {rentalRangeComponent}

                {/* Harga & Deposit - 2 Kolom */}
                <div className="grid grid-cols-2 gap-4">
                    {/* Harga Sewa */}
                    <div className="flex flex-col gap-1">
                        <p className="text-xs text-muted-foreground">
                            {unitPrice !== null && totalDays !== null
                                ? `Sewa ${totalDays} hari`
                                : 'Sewa per hari'}
                        </p>
                        <p className="text-lg font-semibold text-primary md:text-xl">
                            {unitPrice !== null && totalDays !== null
                                ? formatRupiah(unitPrice)
                                : formatRupiah(dailyPrice)}
                        </p>
                    </div>

                    {/* Deposit */}
                    <div className="flex flex-col gap-1">
                        <p className="text-xs text-muted-foreground">
                            Deposit
                        </p>
                        <p className="text-lg font-semibold text-foreground md:text-xl">
                            {formatRupiah(depositPerUnit)}
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
                            ? 'Tidak tersedia'
                            : `${available} unit tersedia`}
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
                'flex items-center gap-3 rounded-xl bg-card border border-border w-fit px-4 py-3 text-muted-foreground',
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
