import { useMemo } from "react";
import {
    getBillingStartDate,
    getRentalDurationDays,
    STORE_PICKUP_TIME,
} from "@/lib/rental-date";
import {
    cheapestDailyVariant,
    cheapestVariantForDuration,
    packageUnitPrice,
    variantPricingForDuration,
    type DurationPrice,
    type RentalVariant,
} from "@/lib/rental-pricing";
import type { RentalDates } from "@/hooks/use-rental-dates";

type ProductPricingDetail = {
    type: "alat";
    variants: RentalVariant[];
};

type PackagePricingDetail = {
    type: "bundle";
    daily_price: number;
    deposit_per_package: number;
    duration_prices: DurationPrice[];
};

export type CatalogDetailPricingInput =
    ProductPricingDetail | PackagePricingDetail;

export function useCatalogDetailPricing(
    detail: CatalogDetailPricingInput,
    activeRental: RentalDates | null,
    selectedVariantId?: number | null,
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

    // Varian yang menentukan harga: pilihan user, fallback ke termurah.
    const variant = useMemo(() => {
        if (detail.type === "bundle") {
            return null;
        }

        return (
            detail.variants.find((item) => item.id === selectedVariantId) ??
            cheapestDailyVariant(detail.variants)
        );
    }, [detail, selectedVariantId]);

    const unitPrice = useMemo(() => {
        if (totalDays === null) {
            return null;
        }

        if (detail.type === "bundle") {
            return packageUnitPrice(
                detail.daily_price,
                detail.duration_prices,
                totalDays,
            );
        }

        if (!variant) {
            return null;
        }

        return variantPricingForDuration(variant, totalDays)?.unitPrice ?? null;
    }, [detail, variant, totalDays]);

    const depositPerUnit = useMemo(() => {
        if (detail.type === "bundle") {
            return detail.deposit_per_package;
        }

        return variant?.deposit_per_unit ?? 0;
    }, [detail, variant]);

    const dailyPrice = useMemo(() => {
        if (detail.type === "bundle") {
            return detail.daily_price;
        }

        return variant?.rental_price_per_day ?? 0;
    }, [detail, variant]);

    return {
        pickupDate,
        returnDate,
        totalDays,
        unitPrice,
        depositPerUnit,
        dailyPrice,
    };
}
