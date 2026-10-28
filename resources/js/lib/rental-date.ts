import {
    addDays,
    differenceInCalendarDays,
    format,
    parse,
    startOfDay,
} from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

export const PICKUP_EARLIEST_TIME = '06:00';
export const PICKUP_LATEST_TIME = '23:30';
export const EVENING_CUTOFF_TIME = '18:00';
export const RETURN_DEADLINE_TIME = '23:59';
export const RETURN_BUFFER_DAYS = 1;

export const STORE_PICKUP_TIME = '18:00';

export const STORE_RETURN_TIME = '23:59';

export function buildPickupTimeSlots(): string[] {
    const slots: string[] = [];
    const [startHour, startMinute] =
        PICKUP_EARLIEST_TIME.split(':').map(Number);
    const [endHour, endMinute] = PICKUP_LATEST_TIME.split(':').map(Number);

    let current = startHour * 60 + startMinute;
    const end = endHour * 60 + endMinute;

    while (current <= end) {
        const hour = Math.floor(current / 60);
        const minute = current % 60;
        slots.push(
            `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
        );
        current += 30;
    }

    return slots;
}

export function getBillingStartDate(
    pickupDate: Date,
    pickupTime: string,
): Date {
    const cutoff = parse(EVENING_CUTOFF_TIME, 'HH:mm', pickupDate);
    const time = parse(pickupTime, 'HH:mm', pickupDate);

    return time >= cutoff
        ? addDays(startOfDay(pickupDate), 1)
        : startOfDay(pickupDate);
}

export function getRentalDurationDays(
    billingStartDate: Date,
    endDate: Date,
): number {
    return differenceInCalendarDays(endDate, billingStartDate) + 1;
}

export function formatDateID(date?: Date | null): string {
    if (!date) {
        return '-';
    }

    return format(date, 'd MMM yyyy', { locale: idLocale });
}

export function formatDateIDLong(date?: Date | null): string {
    if (!date) {
        return '-';
    }

    return format(date, 'EEEE, d MMMM yyyy', { locale: idLocale });
}

export function parseDateOnly(dateString?: string | null): Date | null {
    if (!dateString) {
        return null;
    }

    try {
        const date = new Date(dateString);
        if (Number.isNaN(date.getTime())) {
            return null;
        }
        return date;
    } catch {
        return null;
    }
}

export const RENTAL_SEARCH_STORAGE_KEY = 'outdoorcondet:rental-search';

export type RentalRange = {
    from?: Date | null;
    to?: Date | null;
};

function toStorageDateKey(date?: Date | null): string | null {
    if (!date) {
        return null;
    }

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
        return null;
    }

    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

function fromStorageDateKey(value?: string | null): Date | undefined {
    if (!value) {
        return undefined;
    }

    const [year, month, day] = value.split('-').map(Number);

    if (!year || !month || !day) {
        return undefined;
    }

    const date = new Date(year, month - 1, day);

    return Number.isNaN(date.getTime()) ? undefined : date;
}

export function loadStoredRentalRange(): RentalRange | undefined {
    if (typeof window === 'undefined') {
        return undefined;
    }

    try {
        const raw = window.localStorage.getItem(RENTAL_SEARCH_STORAGE_KEY);

        if (!raw) {
            return undefined;
        }

        const parsed = JSON.parse(raw) as {
            from?: string | null;
            to?: string | null;
        };
        const from = fromStorageDateKey(parsed.from);
        const to = fromStorageDateKey(parsed.to);

        if (!from && !to) {
            return undefined;
        }

        return { from, to };
    } catch {
        return undefined;
    }
}

export function saveStoredRentalRange(range?: RentalRange | null): void {
    if (typeof window === 'undefined') {
        return;
    }

    const from = toStorageDateKey(range?.from);
    const to = toStorageDateKey(range?.to);

    if (!from && !to) {
        window.localStorage.removeItem(RENTAL_SEARCH_STORAGE_KEY);

        return;
    }

    window.localStorage.setItem(
        RENTAL_SEARCH_STORAGE_KEY,
        JSON.stringify({ from, to }),
    );
}
