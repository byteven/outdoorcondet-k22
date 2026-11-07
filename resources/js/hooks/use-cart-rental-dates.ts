import { useEffect } from "react";
import { router } from "@inertiajs/react";
import { toast } from "sonner";
import type { RentalRangeParams } from "@/components/rental-range";
import {
    parseRentalQueryDate,
    syncRentalRangePersistence,
    toRentalQueryDate,
    useActiveRental,
} from "@/hooks/use-rental-dates";
import { dates as cartDates } from "@/routes/cart";

type UseCartRentalDatesParams = {
    serverPickupDate?: string;
    serverReturnDate?: string;
};

export function useCartRentalDates({
    serverPickupDate,
    serverReturnDate,
}: UseCartRentalDatesParams) {
    const { saveDates, clearDates, activeRental } = useActiveRental({});

    const pushRentalDates = (pickupDate: string, returnDate: string) => {
        router.put(
            cartDates.url(),
            { pickup_date: pickupDate, return_date: returnDate },
            {
                preserveState: true,
                preserveScroll: true,
                onError: (errors) => {
                    const message =
                        errors.pickup_date ??
                        errors.return_date ??
                        Object.values(errors)[0];

                    if (typeof message === "string") {
                        toast.error(message);
                    }
                },
            },
        );
    };

    useEffect(() => {
        if (!activeRental) {
            const pickup = parseRentalQueryDate(serverPickupDate);
            const returnDate = parseRentalQueryDate(serverReturnDate);

            if (pickup && returnDate) {
                saveDates(pickup, returnDate);
            }

            return;
        }

        if (!activeRental.returnDate) {
            return;
        }

        const pickupKey = toRentalQueryDate(activeRental.pickupDate);
        const returnKey = toRentalQueryDate(activeRental.returnDate);

        if (!serverPickupDate || !serverReturnDate) {
            return;
        }

        if (pickupKey === serverPickupDate && returnKey === serverReturnDate) {
            return;
        }

        pushRentalDates(pickupKey, returnKey);
    }, [
        activeRental,
        serverPickupDate,
        serverReturnDate,
        saveDates,
        pushRentalDates,
    ]);

    const handleRangeChange = ({
        pickupDate,
        returnDate,
    }: RentalRangeParams) => {
        if (!pickupDate || !returnDate) {
            syncRentalRangePersistence(
                pickupDate,
                returnDate,
                saveDates,
                clearDates,
            );

            return;
        }

        syncRentalRangePersistence(
            pickupDate,
            returnDate,
            saveDates,
            clearDates,
        );

        pushRentalDates(
            toRentalQueryDate(pickupDate),
            toRentalQueryDate(returnDate),
        );
    };

    return { activeRental, handleRangeChange };
}
