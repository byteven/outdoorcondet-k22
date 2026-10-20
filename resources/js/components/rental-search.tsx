import { useMemo, useState } from 'react';
import { startOfToday } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import {
    CalendarArrowDownIcon,
    CalendarArrowUpIcon,
    SearchIcon,
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

export type RentalSearchParams = {
    pickupDate?: Date;
    returnDate?: Date;
    billingStartDate?: Date;
    totalDays?: number;
};

type RentalSearchProps = {
    onSearch?: (params: RentalSearchParams) => void;
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

export function RentalSearch({ onSearch, className }: RentalSearchProps) {
    const [pickupOpen, setPickupOpen] = useState(false);
    const [returnOpen, setReturnOpen] = useState(false);
    const [range, setRange] = useState<DateRange | undefined>(undefined);

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

    const hasRange = Boolean(pickupDate && returnDate);

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
        onSearch?.({
            pickupDate,
            returnDate,
            billingStartDate,
            totalDays,
        });
    };

    return (
        <Card
            className={cn(
                'gap-0 overflow-hidden rounded-2xl border border-border/60 bg-card p-3',
                className,
            )}
        >
            <div className="grid gap-y-3 md:grid-cols-[1fr_1fr_auto]">
                <div className="relative md:pr-3">
                    <div className="flex flex-col gap-3 rounded-xl px-4 py-4 hover:bg-muted/50 md:px-5 md:py-5">
                        <button
                            type="button"
                            onClick={() => setPickupOpen(true)}
                            className="flex w-full cursor-pointer items-center gap-2 text-left"
                        >
                            <span className="flex size-6 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                                <CalendarArrowDownIcon className="size-4" />
                            </span>
                            <span className="text-sm font-medium">
                                Tanggal ambil
                            </span>
                            <span className="text-xs text-muted-foreground">
                                ({STORE_PICKUP_TIME} - {STORE_RETURN_TIME})
                            </span>
                        </button>

                        <Popover open={pickupOpen} onOpenChange={setPickupOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="ghost"
                                    className={cn(
                                        'h-11 w-full justify-between px-0 text-base font-medium hover:bg-transparent',
                                        hasRange && 'text-primary',
                                    )}
                                >
                                    <span
                                        className={cn(
                                            !pickupDate &&
                                                'text-muted-foreground',
                                        )}
                                    >
                                        {pickupDate
                                            ? formatDateID(pickupDate)
                                            : 'Pilih tanggal'}
                                    </span>
                                    <CalendarArrowDownIcon
                                        className={cn(
                                            'size-4 text-muted-foreground',
                                            hasRange && 'text-primary',
                                        )}
                                    />
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
                    <div className="flex flex-col gap-3 rounded-xl px-4 py-4 hover:bg-muted/50 md:px-5 md:py-5">
                        <button
                            type="button"
                            onClick={() => setReturnOpen(true)}
                            disabled={!pickupDate}
                            className="flex w-full cursor-pointer items-center gap-2 text-left disabled:cursor-not-allowed"
                        >
                            <span className="flex size-6 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                                <CalendarArrowUpIcon className="size-4" />
                            </span>
                            <span className="text-sm font-medium">
                                Tanggal kembali
                            </span>
                            <span className="text-xs text-muted-foreground">
                                ({STORE_PICKUP_TIME} - {STORE_RETURN_TIME})
                            </span>
                        </button>

                        <Popover open={returnOpen} onOpenChange={setReturnOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="ghost"
                                    disabled={!pickupDate}
                                    className={cn(
                                        'h-11 w-full justify-between px-0 text-base font-medium hover:bg-transparent',
                                        hasRange && 'text-primary',
                                    )}
                                >
                                    <span
                                        className={cn(
                                            !returnDate &&
                                                'text-muted-foreground',
                                        )}
                                    >
                                        {returnDate
                                            ? formatDateID(returnDate)
                                            : 'Pilih tanggal'}
                                    </span>
                                    <CalendarArrowUpIcon
                                        className={cn(
                                            'size-4 text-muted-foreground',
                                            hasRange && 'text-primary',
                                        )}
                                    />
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
                        className="h-14 w-full rounded-xl text-base md:h-15 md:w-auto md:min-w-40 md:px-8"
                        onClick={handleSearch}
                    >
                        <SearchIcon />
                        Cari
                    </Button>
                </div>

                {totalDays && billingStartDate && returnDate && (
                    <div className="col-span-full flex flex-wrap items-center gap-2 rounded-xl bg-muted/40 px-4 py-3 text-xs text-muted-foreground md:col-span-3 md:px-5">
                        <span className="inline-flex items-center gap-2 rounded-full bg-destructive/10 px-3 py-1 text-sm font-semibold text-destructive">
                            <span className="size-1.5 rounded-full bg-destructive" />
                            {totalDays} hari sewa
                        </span>
                        <span>
                            Kembali maksimal {formatDateID(returnDate)} pukul{' '}
                            {STORE_RETURN_TIME}
                        </span>
                    </div>
                )}
            </div>
        </Card>
    );
}
