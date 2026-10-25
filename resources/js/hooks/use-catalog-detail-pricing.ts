import { useMemo } from 'react';
import {
    getBillingStartDate,
    getRentalDurationDays,
    STORE_PICKUP_TIME,
} from '@/lib/rental-date';
import {
    cheapestVariantForDuration,
    packageUnitPrice,
    type DurationPrice,
    type RentalVariant,
} from '@/lib/rental-pricing';
import type { RentalDates } from '@/hooks/use-rental-dates';

type ProductPricingDetail = {
    type: 'alat';
    variants: RentalVariant[];
};

type PackagePricingDetail = {
    type: 'bundle';
    daily_price: number;
    deposit_per_package: number;
    duration_prices: DurationPrice[];
};

export type CatalogDetailPricingInput =
    | ProductPricingDetail
    | PackagePricingDetail;

export function useCatalogDetailPricing(
    detail: CatalogDetailPricingInput,
    activeRental: RentalDates | null,
) {
    const pickupDate = activeRental?.pickupDate;
    const returnDate = activeRental?.returnDate;

    const totalDays = useMemo(() => {
        if (!pickupDate || !returnDate) {
            return null;
        }

        const billingStart = getBillingStartDate(pickupDate, STORE_PICKUP_TIME);

        return getRentalDurationDays(billingStart, returnDate);
    }, [pickupDate, returnDate]);

    const unitPrice = useMemo(() => {
        if (totalDays === null) {
            return null;
        }

        if (detail.type === 'bundle') {
            return packageUnitPrice(
                detail.daily_price,
                detail.duration_prices,
                totalDays,
            );
        }

        return (
            cheapestVariantForDuration(detail.variants, totalDays)?.unitPrice ??
            null
        );
    }, [detail, totalDays]);

    const depositPerUnit = useMemo(() => {
        if (detail.type === 'bundle') {
            return detail.deposit_per_package;
        }

        return (
            cheapestVariantForDuration(detail.variants, totalDays ?? 1)
                ?.depositPerUnit ?? 0
        );
    }, [detail, totalDays]);

    const dailyPrice = useMemo(() => {
        if (detail.type === 'bundle') {
            return detail.daily_price;
        }

        if (detail.variants.length === 0) {
            return 0;
        }

        const cheapest = cheapestVariantForDuration(detail.variants, 1);

        return (
            cheapest?.unitPrice ?? detail.variants[0]?.rental_price_per_day ?? 0
        );
    }, [detail]);

    return {
        pickupDate,
        returnDate,
        totalDays,
        unitPrice,
        depositPerUnit,
        dailyPrice,
    };
}
