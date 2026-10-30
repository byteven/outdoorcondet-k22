import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { startOfToday } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
    CalendarArrowDownIcon,
    CalendarArrowUpIcon,
    ClockArrowDown,
    RefreshCwIcon,
    SearchIcon,
    XIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
    formatDateID,
    getBillingStartDate,
    getRentalDurationDays,
    STORE_PICKUP_TIME,
    STORE_RETURN_TIME,
} from "@/lib/rental-date";

export type RentalRangeOrigin = "auto" | "button" | "clear";

export type RentalRangeParams = {
    pickupDate?: Date;
    returnDate?: Date;
    billingStartDate?: Date;
    totalDays?: number;
    origin?: RentalRangeOrigin;
};

type RentalRangeProps = {
    onSearch?: (params: RentalRangeParams) => void;
    initialPickupDate?: Date;
    initialReturnDate?: Date;
    className?: string;
    variant?: "default" | "compact";
    hideButton?: boolean;
    dateError?: boolean;
};

const AUTO_SEARCH_DELAY = 500;

type DateRange = {
    from: Date;
    to?: Date;
};

type PickedRange = {
    from?: Date;
    to?: Date;
};

export function RentalRange({
    onSearch,
    initialPickupDate,
    initialReturnDate,
    className,
    variant = "default",
    hideButton = false,
    dateError = false,
}: RentalRangeProps) {
    const [pickupOpen, setPickupOpen] = useState(false);
    const [returnOpen, setReturnOpen] = useState(false);
    const [range, setRange] = useState<DateRange | undefined>(() =>
        initialPickupDate
            ? { from: initialPickupDate, to: initialReturnDate }
            : undefined,
    );
    const [showError, setShowError] = useState(false);
    const autoSearchTimer = useRef<number | null>(null);

    useEffect(() => {
        return () => {
            if (autoSearchTimer.current !== null) {
                window.clearTimeout(autoSearchTimer.current);
            }
        };
    }, []);

    const cancelAutoSearch = () => {
        if (autoSearchTimer.current !== null) {
            window.clearTimeout(autoSearchTimer.current);
            autoSearchTimer.current = null;
        }
    };

    const scheduleAutoSearch = (params: RentalRangeParams) => {
        cancelAutoSearch();

        autoSearchTimer.current = window.setTimeout(() => {
            autoSearchTimer.current = null;

            onSearch?.({ ...params, origin: "auto" });
        }, AUTO_SEARCH_DELAY);
    };

    useEffect(() => {
        if (!initialPickupDate) {
            setRange(undefined);

            return;
        }

        setRange({ from: initialPickupDate, to: initialReturnDate });
    }, [dateKey(initialPickupDate), dateKey(initialReturnDate)]);

    const pickupDate = range?.from;
    const returnDate = range?.to;
    const showDateError = showError || dateError;

    const billingStartDate = useMemo(
        () =>
            pickupDate
                ? getBillingStartDate(pickupDate, STORE_PICKUP_TIME)
                : undefined,
        [pickupDate],
    );

    const totalDays = useMemo(
        () =>
            billingStartDate && returnDate
                ? getRentalDurationDays(billingStartDate, returnDate)
                : undefined,
        [billingStartDate, returnDate],
    );

    const handlePickupSelect = (date?: Date) => {
        if (!date) {
            return;
        }

        const nextBillingStart = getBillingStartDate(date, STORE_PICKUP_TIME);

        const newRange = {
            from: date,
            to:
                range?.to && range.to >= nextBillingStart
                    ? range.to
                    : undefined,
        };

        setRange(newRange);

        if (newRange.to) {
            const billing = getBillingStartDate(date, STORE_PICKUP_TIME);
            const days = getRentalDurationDays(billing, newRange.to);

            scheduleAutoSearch({
                pickupDate: date,
                returnDate: newRange.to,
                billingStartDate: billing,
                totalDays: days,
            });
        }
    };

    const handleReturnSelect = (next?: PickedRange) => {
        if (!next?.from) {
            return;
        }

        const nextBillingStart = getBillingStartDate(
            next.from,
            STORE_PICKUP_TIME,
        );

        const newRange = {
            from: next.from,
            to: next.to && next.to >= nextBillingStart ? next.to : undefined,
        };

        setRange(newRange);

        if (newRange.to) {
            const billing = getBillingStartDate(next.from, STORE_PICKUP_TIME);
            const days = getRentalDurationDays(billing, newRange.to);

            scheduleAutoSearch({
                pickupDate: next.from,
                returnDate: newRange.to,
                billingStartDate: billing,
                totalDays: days,
            });
        }
    };

    const handleSearch = () => {
        if (!pickupDate || !returnDate) {
            setShowError(true);
            return;
        }

        setShowError(false);
        cancelAutoSearch();

        onSearch?.({
            pickupDate,
            returnDate,
            billingStartDate,
            totalDays,
            origin: "button",
        });
    };

    const handleClearPickup = (event: React.MouseEvent) => {
        event.stopPropagation();
        cancelAutoSearch();
        setRange(undefined);
        onSearch?.({ origin: "clear" });
    };

    const handleClearReturn = (event: React.MouseEvent) => {
        event.stopPropagation();
        cancelAutoSearch();

        if (!range?.from) {
            return;
        }

        setRange({ from: range.from });
        onSearch?.({ origin: "clear" });
    };

    return (
        <Card
            className={cn(
                "relative gap-0 overflow-hidden bg-card",
                variant === "compact"
                    ? "rounded-lg p-2 shadow-none"
                    : "rounded-xl border-none p-2 shadow-md md:rounded-2xl md:p-3 md:shadow-lg",
                className,
            )}
        >
            <div
                className={cn(
                    "grid gap-y-2",
                    hideButton
                        ? "md:grid-cols-2 md:gap-x-3 md:gap-y-2"
                        : variant === "compact"
                          ? "md:grid-cols-[1fr_1fr_auto] md:gap-y-2"
                          : "md:grid-cols-[1fr_1fr_auto] md:gap-y-3",
                )}
            >
                <div className="relative md:pr-3">
                    <RentalDateField
                        label="Tanggal Ambil"
                        icon={
                            <CalendarArrowDownIcon
                                className={cn(
                                    "text-primary",
                                    variant === "compact"
                                        ? "size-3 md:size-3.5"
                                        : "size-3.5 md:size-4",
                                )}
                            />
                        }
                        open={pickupOpen}
                        onOpenChange={setPickupOpen}
                        selectedDate={pickupDate}
                        showError={showDateError}
                        clearLabel="Hapus tanggal ambil"
                        onClear={handleClearPickup}
                        calendar={
                            <Calendar
                                mode="single"
                                locale={idLocale}
                                selected={pickupDate}
                                onSelect={handlePickupSelect}
                                disabled={{ before: startOfToday() }}
                            />
                        }
                        helpContent={
                            <div className="mt-3 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                                <p>
                                    Pengambilan selalu jam {STORE_PICKUP_TIME},
                                    dihitung mulai tanggal berikutnya.
                                </p>
                                {billingStartDate && (
                                    <p className="text-foreground">
                                        Mulai dihitung{" "}
                                        {formatDateID(billingStartDate)}
                                    </p>
                                )}
                            </div>
                        }
                        variant={variant}
                    />

                    <span
                        aria-hidden="true"
                        className="absolute inset-y-[12%] right-0 hidden w-px bg-border/60 md:block"
                    />
                </div>

                <div className="md:pl-3">
                    <RentalDateField
                        label="Tanggal Kembali"
                        icon={
                            <CalendarArrowUpIcon
                                className={cn(
                                    "text-primary",
                                    variant === "compact"
                                        ? "size-3 md:size-3.5"
                                        : "size-3.5 md:size-4",
                                )}
                            />
                        }
                        open={returnOpen}
                        onOpenChange={setReturnOpen}
                        selectedDate={returnDate}
                        showError={showDateError}
                        clearLabel="Hapus tanggal kembali"
                        onClear={handleClearReturn}
                        triggerDisabled={!pickupDate}
                        calendar={
                            <Calendar
                                mode="range"
                                locale={idLocale}
                                selected={range}
                                onSelect={handleReturnSelect}
                                disabled={{ before: startOfToday() }}
                            />
                        }
                        helpContent={
                            <p className="mt-3 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                                Pengembalian maksimal pukul {STORE_RETURN_TIME}{" "}
                                pada tanggal kembali. Klik tanggal lain untuk
                                mengubah awal atau akhir sewa.
                            </p>
                        }
                        variant={variant}
                    />
                </div>

                {!hideButton && (
                    <div className="flex items-center md:pl-2">
                        <Button
                            className={cn(
                                "w-full rounded-full",
                                variant === "compact"
                                    ? "h-9 text-xs md:h-10 md:w-auto md:min-w-24 md:px-4 md:text-sm"
                                    : "h-11 text-sm md:h-14 md:w-auto md:min-w-32 md:px-6 md:text-base",
                            )}
                            onClick={handleSearch}
                        >
                            <SearchIcon
                                className={
                                    variant === "compact"
                                        ? "size-3.5"
                                        : "size-4"
                                }
                            />
                            Cek
                        </Button>
                    </div>
                )}

                {totalDays && billingStartDate && returnDate && (
                    <div
                        className={cn(
                            "flex flex-wrap items-center gap-2 rounded-lg bg-accent text-muted-foreground",
                            hideButton
                                ? "col-span-full md:col-span-2"
                                : "col-span-full md:col-span-3",
                            variant === "compact"
                                ? "px-2 py-1.5 text-[10px] md:px-2.5 md:py-2 md:text-xs"
                                : "px-2 py-2 text-xs md:px-3 md:py-3",
                        )}
                    >
                        <div
                            className={cn(
                                "inline-flex items-center gap-1 rounded-lg bg-destructive/10 font-semibold text-destructive",
                                variant === "compact"
                                    ? "px-1.5 py-0.5 text-[10px] md:px-2 md:py-0.5 md:text-xs"
                                    : "px-2 py-0.5 text-xs md:px-3 md:py-1 md:text-sm",
                            )}
                        >
                            <RefreshCwIcon
                                className={
                                    variant === "compact"
                                        ? "size-2.5"
                                        : "size-3"
                                }
                            />
                            <span>{totalDays} Hari</span>
                        </div>
                        <span>
                            Kembali maks.{" "}
                            <span className="text-primary italic">
                                {formatDateID(returnDate)}
                            </span>{" "}
                            <span className="text-primary italic">
                                {STORE_RETURN_TIME}
                            </span>
                        </span>
                    </div>
                )}
            </div>
        </Card>
    );
}

type RentalDateFieldProps = {
    label: string;
    icon: ReactNode;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    selectedDate?: Date;
    showError: boolean;
    clearLabel: string;
    onClear: (event: React.MouseEvent) => void;
    calendar: ReactNode;
    helpContent: ReactNode;
    triggerDisabled?: boolean;
    variant?: "default" | "compact";
};

function RentalDateField({
    label,
    icon,
    open,
    onOpenChange,
    selectedDate,
    showError,
    clearLabel,
    onClear,
    calendar,
    helpContent,
    triggerDisabled = false,
    variant = "default",
}: RentalDateFieldProps) {
    return (
        <div
            className={cn(
                "flex flex-col rounded-lg hover:bg-muted/30",
                variant === "compact"
                    ? "gap-1 px-1.5 py-1.5 md:gap-1.5 md:px-2 md:py-2"
                    : "gap-1.5 px-2 py-2 md:gap-2 md:rounded-xl md:px-4 md:py-3 md:hover:bg-muted/50",
            )}
        >
            <div className="flex items-center gap-2 text-left">
                <span
                    className={cn(
                        "font-medium text-muted-foreground",
                        variant === "compact"
                            ? "text-[10px] md:text-xs"
                            : "text-xs md:text-sm",
                    )}
                >
                    {label}
                </span>

                <span
                    className={cn(
                        "flex items-center gap-1 text-muted-foreground",
                        variant === "compact"
                            ? "text-[9px] md:text-[10px]"
                            : "text-xs",
                    )}
                >
                    <ClockArrowDown
                        className={cn(
                            "text-muted-foreground/50",
                            variant === "compact"
                                ? "w-2 md:w-2.5"
                                : "w-2.5 md:w-3",
                        )}
                    />
                    <span>
                        {STORE_PICKUP_TIME} - {STORE_RETURN_TIME}
                    </span>
                </span>
            </div>

            <Popover open={open} onOpenChange={onOpenChange}>
                <PopoverTrigger asChild>
                    <Button
                        variant="ghost"
                        disabled={triggerDisabled}
                        className={cn(
                            "group w-full justify-start gap-2 px-0 font-medium text-foreground hover:bg-transparent hover:text-foreground",
                            variant === "compact"
                                ? "h-7 text-[11px] md:h-8 md:text-xs"
                                : "h-8 text-sm md:h-11 md:gap-4 md:text-base",
                            triggerDisabled &&
                                "disabled:cursor-not-allowed disabled:opacity-60",
                        )}
                    >
                        <span className="flex shrink-0 items-center justify-center">
                            {icon}
                        </span>
                        <span
                            className={cn(
                                "flex-1 text-left",
                                !selectedDate && showError && "text-primary",
                            )}
                        >
                            {selectedDate
                                ? formatDateID(selectedDate)
                                : "Pilih tanggal"}
                        </span>
                        {selectedDate && (
                            <ClearDateButton
                                label={clearLabel}
                                onClick={onClear}
                                variant={variant}
                            />
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent
                    align="start"
                    className="w-[17.5rem] max-w-[calc(100vw-2rem)] p-3 shadow-lg"
                >
                    {calendar}
                    {helpContent}
                </PopoverContent>
            </Popover>
        </div>
    );
}

function dateKey(date?: Date): string | undefined {
    return date?.toLocaleDateString("en-CA");
}

function ClearDateButton({
    label,
    onClick,
    variant = "default",
}: {
    label: string;
    onClick: (event: React.MouseEvent) => void;
    variant?: "default" | "compact";
}) {
    return (
        <span
            role="button"
            tabIndex={0}
            onClick={onClick}
            onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onClick(event as unknown as React.MouseEvent);
                }
            }}
            aria-label={label}
            className="inline-flex items-center justify-center rounded-full p-1 text-muted-foreground hover:text-foreground"
        >
            <XIcon
                className={
                    variant === "compact"
                        ? "size-2.5 md:size-3"
                        : "size-3 md:size-4"
                }
            />
        </span>
    );
}
