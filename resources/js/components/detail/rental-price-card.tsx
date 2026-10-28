import { CalendarCheckIcon, CalendarXIcon } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatRupiah } from "@/components/product-shared";

type RentalPriceCardProps = {
    title?: string;
    unitPrice: number | null;
    normalPrice: number | null;
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
    normalPrice,
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
    const hasDiscount =
        hasDateSelection &&
        normalPrice !== null &&
        unitPrice !== null &&
        normalPrice > unitPrice;

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
                            <div className="mt-1 flex items-center justify-between gap-3 border-t border-border pt-3">
                                <span className="text-sm font-medium">Total Sewa</span>

                                <div className="flex flex-wrap items-center justify-end gap-x-2 gap-y-1">
                                    {hasDiscount && (
                                        <span className="text-xs text-muted-foreground tabular-nums line-through">
                                            {formatRupiah(normalPrice!)}
                                        </span>
                                    )}

                                    <span className="text-lg leading-tight font-semibold text-primary tabular-nums">
                                        {formatRupiah(unitPrice!)}
                                    </span>

                                    {hasDiscount && (
                                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap text-emerald-700">
                                            Hemat {formatRupiah(normalPrice! - unitPrice!)}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                                            )
                )}

                {footerAction}
            </div>
        </div>
    );
}
