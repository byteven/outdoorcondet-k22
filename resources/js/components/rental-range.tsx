import { useMemo, useState } from 'react';
import { startOfToday } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import {
    CalendarArrowDownIcon,
    CalendarArrowUpIcon,
    ClockArrowDown,
    RefreshCwIcon,
    SearchIcon,
    XIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card } from '@/components/ui/card';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
    formatDateID,
    getBillingStartDate,
    getRentalDurationDays,
    STORE_PICKUP_TIME,
    STORE_RETURN_TIME,
} from '@/lib/rental-date';

export type RentalRangeParams = {
    pickupDate?: Date;
    returnDate?: Date;
    billingStartDate?: Date;
    totalDays?: number;
};

type RentalRangeProps = {
    onSearch?: (params: RentalRangeParams) => void;
    initialPickupDate?: Date;
    initialReturnDate?: Date;
    className?: string;
};

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
}: RentalRangeProps) {
    const [pickupOpen, setPickupOpen] = useState(false);
    const [returnOpen, setReturnOpen] = useState(false);
    const [range, setRange] = useState<DateRange | undefined>(() =>
        initialPickupDate
            ? { from: initialPickupDate, to: initialReturnDate }
            : undefined,
    );
    const [showError, setShowError] = useState(false);


    const pickupDate = range?.from;
    const returnDate = range?.to;

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

        setRange({
            from: date,
            to:
                range?.to && range.to >= nextBillingStart
                    ? range.to
                    : undefined,
        });
    };

    const handleReturnSelect = (next?: PickedRange) => {
        if (!next?.from) {
            return;
        }

        const nextBillingStart = getBillingStartDate(
            next.from,
            STORE_PICKUP_TIME,
        );

        setRange({
            from: next.from,
            to: next.to && next.to >= nextBillingStart ? next.to : undefined,
        });
    };

    const handleSearch = () => {
        if (!pickupDate || !returnDate) {
            setShowError(true);
            return;
        }

        setShowError(false);

        onSearch?.({
            pickupDate,
            returnDate,
            billingStartDate,
            totalDays,
        });
    };

    const handleClearPickup = (e: React.MouseEvent) => {
        e.stopPropagation();
        setRange(undefined);
        // Clear URL by calling onSearch with no dates
        onSearch?.({});
    };

    const handleClearReturn = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!range?.from) {
            return;
        }
        setRange({ from: range.from });
        // Clear URL by calling onSearch with no dates
        onSearch?.({});
    };

    return (
        <Card
            className={cn(
                'relative gap-0 overflow-hidden rounded-2xl border-none bg-card p-3 shadow-lg',
                className,
            )}
        >
            <div className="grid gap-y-3 md:grid-cols-[1fr_1fr_auto]">
                <div className="relative md:pr-3">
                    <div className="flex flex-col gap-2 rounded-xl px-4 py-4 hover:bg-muted/50 md:px-5 md:py-4">
                        <div className="flex items-center gap-2 text-left">
                            <span className="text-sm font-medium text-muted-foreground">
                                Tanggal Ambil
                            </span>

                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <ClockArrowDown className="w-3 text-muted-foreground/50" />
                                {STORE_PICKUP_TIME} - {STORE_RETURN_TIME}
                            </span>
                        </div>

                        <Popover open={pickupOpen} onOpenChange={setPickupOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="ghost"
                                    className="group h-11 w-full justify-start gap-4 px-0 text-base font-medium text-foreground hover:bg-transparent hover:text-foreground"
                                >
                                    <span className="flex shrink-0 items-center justify-center">
                                        <CalendarArrowDownIcon className="size-4 text-primary" />
                                    </span>
                                    <span
                                        className={cn(
                                            'flex-1 text-left',
                                            !pickupDate && showError && 'text-primary',
                                        )}
                                    >
                                        {pickupDate ? formatDateID(pickupDate) : 'Pilih tanggal'}
                                    </span>
                                    {pickupDate && (
                                        <span
                                            role="button"
                                            tabIndex={0}
                                            onClick={handleClearPickup}
                                            onKeyDown={(event) => {
                                                if (
                                                    event.key === 'Enter' ||
                                                    event.key === ' '
                                                ) {
                                                    event.preventDefault();
                                                    handleClearPickup(
                                                        event as unknown as React.MouseEvent,
                                                    );
                                                }
                                            }}
                                            aria-label="Hapus tanggal ambil"
                                            className="inline-flex items-center justify-center rounded-full p-1 text-muted-foreground hover:text-foreground"
                                        >
                                            <XIcon className="size-4" />
                                        </span>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent
                                align="start"
                                className="w-[17.5rem] max-w-[calc(100vw-2rem)] p-3 shadow-lg"
                            >
                                <Calendar
                                    mode="single"
                                    locale={idLocale}
                                    selected={pickupDate}
                                    onSelect={handlePickupSelect}
                                    disabled={{ before: startOfToday() }}
                                />

                                <div className="mt-3 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                                    <p>
                                        Pengambilan selalu jam{' '}
                                        {STORE_PICKUP_TIME}, dihitung mulai
                                        tanggal berikutnya.
                                    </p>
                                    {billingStartDate && (
                                        <p className="text-foreground">
                                            Mulai dihitung{' '}
                                            {formatDateID(billingStartDate)}
                                        </p>
                                    )}
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>

                    <span
                        aria-hidden="true"
                        className="absolute inset-y-[12%] right-0 hidden w-px bg-border/60 md:block"
                    />
                </div>

                <div className="md:pl-3">
                    <div className="flex flex-col gap-2 rounded-xl px-4 py-4 hover:bg-muted/50 md:px-5 md:py-4">
                        <div className="flex items-center gap-2 text-left">
                            <span className="text-sm font-medium text-muted-foreground">
                                Tanggal Kembali
                            </span>
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <ClockArrowDown className="w-3 text-muted-foreground/50" />
                                {STORE_PICKUP_TIME} - {STORE_RETURN_TIME}
                            </span>
                        </div>

                        <Popover open={returnOpen} onOpenChange={setReturnOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="ghost"
                                    disabled={!pickupDate}
                                    className="group h-11 w-full justify-start gap-4 px-0 text-base font-medium text-foreground hover:bg-transparent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    <span className="flex shrink-0 items-center justify-center">
                                        <CalendarArrowUpIcon className="size-4 text-primary" />
                                    </span>
                                    <span
                                        className={cn(
                                            'flex-1 text-left',
                                            !returnDate && showError && 'text-primary',
                                        )}
                                    >
                                        {returnDate ? formatDateID(returnDate) : 'Pilih tanggal'}
                                    </span>
                                    {returnDate && (
                                        <span
                                            role="button"
                                            tabIndex={0}
                                            onClick={handleClearReturn}
                                            onKeyDown={(event) => {
                                                if (
                                                    event.key === 'Enter' ||
                                                    event.key === ' '
                                                ) {
                                                    event.preventDefault();
                                                    handleClearReturn(
                                                        event as unknown as React.MouseEvent,
                                                    );
                                                }
                                            }}
                                            aria-label="Hapus tanggal kembali"
                                            className="inline-flex items-center justify-center rounded-full p-1 text-muted-foreground hover:text-foreground"
                                        >
                                            <XIcon className="size-4" />
                                        </span>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent
                                align="start"
                                className="w-[17.5rem] max-w-[calc(100vw-2rem)] p-3 shadow-lg"
                            >
                                <Calendar
                                    mode="range"
                                    locale={idLocale}
                                    selected={range}
                                    onSelect={handleReturnSelect}
                                    disabled={{ before: startOfToday() }}
                                />

                                <p className="mt-3 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                                    Pengembalian maksimal pukul{' '}
                                    {STORE_RETURN_TIME} pada tanggal kembali.
                                    Klik tanggal lain untuk mengubah awal atau
                                    akhir sewa.
                                </p>
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>

                <div className="flex items-center md:pl-2">
                    <Button
                        className="h-14 w-full rounded-full text-base md:h-15 md:w-auto md:min-w-40 md:px-8"
                        onClick={handleSearch}
                    >
                        <SearchIcon />
                        Cek
                    </Button>
                </div>

                {totalDays && billingStartDate && returnDate && (
                    <div className="col-span-full flex flex-wrap items-center gap-2 rounded-lg bg-accent px-2 py-3 pr-10 text-xs text-muted-foreground md:col-span-3 md:px-3 md:pr-12">
                        <div className="inline-flex items-center gap-1 rounded-lg bg-destructive/10 px-3 py-1 text-sm font-semibold text-destructive">
                            <RefreshCwIcon className="hidden size-3 md:inline" />
                            <span>{totalDays} Hari</span>
                        </div>
                        <span>
                            Kembali maks.{' '}
                            <span className="text-primary italic">
                                {formatDateID(returnDate)}
                            </span>{' '}
                            {' '}
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
