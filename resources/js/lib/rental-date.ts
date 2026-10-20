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
export const RETURN_DEADLINE_TIME = '00:00';
export const RETURN_BUFFER_DAYS = 1;

export const STORE_PICKUP_TIME = '18:00';

export const STORE_RETURN_TIME = '00:00';

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
