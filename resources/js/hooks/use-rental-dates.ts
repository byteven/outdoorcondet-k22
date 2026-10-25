import { useState, useEffect } from 'react';

const STORAGE_KEY = 'rental_dates';

export type RentalDates = {
    pickupDate: Date;
    returnDate: Date;
};

export function useRentalDates() {
    const [dates, setDates] = useState<RentalDates | null>(() => {
        if (typeof window === 'undefined') {
            return null;
        }

        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (!stored) {
                return null;
            }

            const parsed = JSON.parse(stored);
            return {
                pickupDate: new Date(parsed.pickupDate),
                returnDate: new Date(parsed.returnDate),
            };
        } catch {
            return null;
        }
    });

    const saveDates = (pickupDate: Date, returnDate: Date) => {
        const rentalDates = { pickupDate, returnDate };
        setDates(rentalDates);

        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify({
                    pickupDate: pickupDate.toISOString(),
                    returnDate: returnDate.toISOString(),
                }),
            );
        } catch {
            // Silent fail if localStorage is not available
        }
    };

    const clearDates = () => {
        setDates(null);
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch {
            // Silent fail
        }
    };

    return { dates, saveDates, clearDates };
}
