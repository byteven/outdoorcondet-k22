import { useEffect, useMemo, useState } from "react";
import {
    getBillingStartDate,
    getRentalDurationDays,
    STORE_PICKUP_TIME,
} from "@/lib/rental-date";

const STORAGE_KEY = "rental_dates";
const RENTAL_DATES_CHANGED = "outdoorcondet:rental-dates-changed";

export type RentalDates = {
    pickupDate: Date;
    returnDate?: Date;
};

export type RentalDateSelection = RentalDates & {
    totalDays: number;
};

function readStoredDates(): RentalDates | null {
    if (typeof window === "undefined") {
        return null;
    }

    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) {
            return null;
        }

        const parsed = JSON.parse(stored) as {
            pickupDate?: string;
            returnDate?: string;
        };

        if (!parsed.pickupDate) {
            return null;
        }

        const pickupDate = new Date(parsed.pickupDate);

        if (Number.isNaN(pickupDate.getTime())) {
            return null;
        }

        if (!parsed.returnDate) {
            return { pickupDate };
        }

        const returnDate = new Date(parsed.returnDate);

        if (Number.isNaN(returnDate.getTime())) {
            return { pickupDate };
        }

        return { pickupDate, returnDate };
    } catch {
        return null;
    }
}

function writeStoredDates(dates: RentalDates | null): void {
    try {
        if (!dates) {
            localStorage.removeItem(STORAGE_KEY);
        } else {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify({
                    pickupDate: dates.pickupDate.toISOString(),
                    ...(dates.returnDate
                        ? { returnDate: dates.returnDate.toISOString() }
                        : {}),
                }),
            );
        }

        window.dispatchEvent(new CustomEvent(RENTAL_DATES_CHANGED));
    } catch {
        return;
    }
}

export function toRentalQueryDate(date: Date): string {
    return date.toLocaleDateString("en-CA");
}

export function parseRentalQueryDate(value?: string): Date | undefined {
    if (!value) {
        return undefined;
    }

    const [year, month, day] = value.split("-").map(Number);

    if (!year || !month || !day) {
        return undefined;
    }

    return new Date(year, month - 1, day);
}

export function buildRentalSelection(
    pickupDate: Date,
    returnDate: Date,
): RentalDateSelection {
    const billingStartDate = getBillingStartDate(pickupDate, STORE_PICKUP_TIME);

    return {
        pickupDate,
        returnDate,
        totalDays: getRentalDurationDays(billingStartDate, returnDate),
    };
}

export function resolveRentalDates(
    stored: RentalDates | null,
    pickupFromUrl?: string,
    returnFromUrl?: string,
): RentalDates | null {
    if (stored?.pickupDate) {
        return stored.returnDate
            ? { pickupDate: stored.pickupDate, returnDate: stored.returnDate }
            : { pickupDate: stored.pickupDate };
    }

    const pickupDate = parseRentalQueryDate(pickupFromUrl);
    const returnDate = parseRentalQueryDate(returnFromUrl);

    if (!pickupDate) {
        return null;
    }

    return returnDate ? { pickupDate, returnDate } : { pickupDate };
}

export function useRentalDates() {
    const [dates, setDates] = useState<RentalDates | null>(() =>
        readStoredDates(),
    );

    useEffect(() => {
        const syncFromStorage = (): void => {
            setDates(readStoredDates());
        };

        window.addEventListener(RENTAL_DATES_CHANGED, syncFromStorage);
        window.addEventListener("storage", syncFromStorage);

        return () => {
            window.removeEventListener(RENTAL_DATES_CHANGED, syncFromStorage);
            window.removeEventListener("storage", syncFromStorage);
        };
    }, []);

    const saveDates = (pickupDate: Date, returnDate?: Date): void => {
        const rentalDates = returnDate
            ? { pickupDate, returnDate }
            : { pickupDate };
        setDates(rentalDates);
        writeStoredDates(rentalDates);
    };

    const clearDates = (): void => {
        setDates(null);
        writeStoredDates(null);
    };

    return { dates, saveDates, clearDates };
}

export type RentalDateFilters = {
    pickup_date?: string;
    return_date?: string;
};

export function syncRentalRangePersistence(
    pickupDate: Date | undefined,
    returnDate: Date | undefined,
    saveDates: (pickup: Date, returnDate?: Date) => void,
    clearDates: () => void,
): void {
    if (pickupDate && returnDate) {
        saveDates(pickupDate, returnDate);
    } else if (pickupDate) {
        saveDates(pickupDate);
    } else {
        clearDates();
    }
}

export function buildRentalRangeQuery(
    pickupDate: Date | undefined,
    returnDate: Date | undefined,
): { pickup_date: string; return_date: string } {
    return {
        pickup_date: pickupDate ? toRentalQueryDate(pickupDate) : "",
        return_date: returnDate ? toRentalQueryDate(returnDate) : "",
    };
}

export function useActiveRental(filters: RentalDateFilters) {
    const { dates: storedDates, saveDates, clearDates } = useRentalDates();

    const activeRental = useMemo(
        () =>
            resolveRentalDates(
                storedDates,
                filters.pickup_date,
                filters.return_date,
            ),
        [storedDates, filters.pickup_date, filters.return_date],
    );

    const selection = useMemo((): RentalDateSelection | null => {
        if (!activeRental?.returnDate) {
            return null;
        }

        return buildRentalSelection(
            activeRental.pickupDate,
            activeRental.returnDate,
        );
    }, [activeRental]);

    return {
        storedDates,
        saveDates,
        clearDates,
        activeRental,
        selection,
    };
}
