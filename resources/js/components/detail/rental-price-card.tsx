import { CalendarCheckIcon, CalendarXIcon } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatRupiah } from "@/components/product-shared";

type RentalPriceCardProps = {
    title?: string;
    unitPrice: number | null;
    depositPerUnit: number;
    totalDays: number | null;
    available: number | null;
    dailyPrice: number;
    /** Bagian atas card, mis. pemilih varian. */
    variantSelector?: React.ReactNode;
    rentalRangeComponent?: React.ReactNode;
    /** Slot di bawah TOTAL, misalnya aksi keranjang. */
    footerAction?: React.ReactNode;
    loading?: boolean;
};

export function RentalPriceCard({
    title,
    unitPrice,
    depositPerUnit,
    totalDays,
    available,
    dailyPrice,
    variantSelector,
    rentalRangeComponent,
    footerAction,
    loading = false,
}: RentalPriceCardProps) {
    const isUnavailable = available === 0;
    const hasDateSelection = unitPrice !== null && totalDays !== null;

    return (
        <div className="rounded-2xl border border-border bg-card p-4 md:p-5">
            <div className="flex flex-col gap-4">
                {title && (
                    <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                        {title}
                    </h1>
                )}

                <div className="flex flex-col gap-3">
                    <div className="flex items-start gap-4">
                        <div className="flex flex-1 flex-col gap-1.5">
                            <p className="text-sm text-muted-foreground">
                                Harga Sewa
                            </p>
                            {loading ? (
                                <Skeleton className="h-7 w-28 bg-muted" />
                            ) : (
                                <p className="text-xl font-semibold text-primary">
                                    {formatRupiah(dailyPrice)}
                                    <span className="text-sm font-normal text-muted-foreground">
                                        {" "}
                                        / hari
                                    </span>
                                </p>
                            )}
                        </div>

                        <div className="flex flex-1 flex-col gap-1.5">
                            <p className="text-sm text-muted-foreground">
                                Deposit
                            </p>
                            {loading ? (
                                <Skeleton className="h-7 w-24 bg-muted" />
                            ) : (
                                <p className="text-xl font-semibold text-foreground">
                                    {formatRupiah(depositPerUnit)}
                                    <span className="text-sm font-normal text-muted-foreground">
                                        {" "}
                                        / qty
                                    </span>
                                </p>
                            )}
                        </div>
                    </div>

                    {loading ? (
                        <Skeleton className="h-4 w-32 bg-muted" />
                    ) : (
                        available !== null && (
                            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                {isUnavailable ? (
                                    <CalendarXIcon className="size-3.5 text-destructive" />
                                ) : (
                                    <CalendarCheckIcon className="size-3.5 text-primary" />
                                )}
                                {isUnavailable
                                    ? "Tidak tersedia"
                                    : `${available} unit tersedia`}
                            </p>
                        )
                    )}
                </div>

                {variantSelector}

                {rentalRangeComponent}

                {loading && hasDateSelection ? (
                    <div className="flex flex-col gap-2 rounded-xl p-3">
                        <Skeleton className="h-4 w-full bg-muted" />
                        <Skeleton className="h-4 w-full bg-muted" />
                        <Skeleton className="h-5 w-full bg-muted" />
                    </div>
                ) : (
                    hasDateSelection && (
                        <div className="flex flex-col gap-2 rounded-xl p-3">
                            <div className="mt-1 flex items-baseline justify-between gap-2 border-t border-border pt-2">
                                <span className="text-xs font-medium">
                                    Total Sewa
                                </span>
                                <span className="text-base font-semibold text-primary">
                                    {formatRupiah(unitPrice!)}
                                </span>
                            </div>
                        </div>
                    )
                )}

                {footerAction}
            </div>
        </div>
    );
}
