export type DurationPrice = {
    duration_days: number;
    price: number;
};

export type RentalVariant = {
    id: number;
    stock: number;
    rental_price_per_day: number;
    deposit_per_unit: number;
    duration_prices: DurationPrice[];
};

export type RentalUnitPricing = {
    unitPrice: number;
    depositPerUnit: number;
};

export type DurationUnitPricing = RentalUnitPricing & {
    variantId: number | null;
};

const MAX_TIER_DURATION_DAYS = 365;

/**
 * Harga appendix per unit untuk `days` hari mengikuti aturan PRD 4.2:
 * kombinasi termurah antara gabungan harga harian + tier:
 * - exact  : kombinasi tier + harga 1 hari yang jumlah harinya tepat `days`.
 * - rounded: harga tier terkecil dengan durasi lebih besar dari `days`.
 */
export function unitPriceForDuration(
    dailyPrice: number,
    tiers: DurationPrice[],
    days: number,
): number | null {
    if (days < 1) {
        return null;
    }

    const exact = exactCombinationPrice(dailyPrice, tiers, days);
    const rounded = smallestLargerTierPrice(tiers, days);

    const candidates = [exact, rounded].filter(
        (price): price is number => price !== null && Number.isFinite(price),
    );

    return candidates.length > 0 ? Math.min(...candidates) : null;
}

function exactCombinationPrice(
    dailyPrice: number,
    tiers: DurationPrice[],
    days: number,
): number | null {
    const costs: number[] = new Array(days + 1).fill(Number.POSITIVE_INFINITY);
    costs[0] = 0;

    for (let day = 1; day <= days; day++) {
        costs[day] = Math.min(costs[day], costs[day - 1] + dailyPrice);

        for (const tier of tiers) {
            if (tier.duration_days < 2 || tier.duration_days > day) {
                continue;
            }

            costs[day] = Math.min(
                costs[day],
                costs[day - tier.duration_days] + tier.price,
            );
        }
    }

    return Number.isFinite(costs[days]) ? costs[days] : null;
}

function smallestLargerTierPrice(
    tiers: DurationPrice[],
    days: number,
): number | null {
    let best: number | null = null;

    for (const tier of tiers) {
        if (
            tier.duration_days <= days ||
            tier.duration_days > MAX_TIER_DURATION_DAYS
        ) {
            continue;
        }

        if (best === null || tier.price < best) {
            best = tier.price;
        }
    }

    return best;
}

/**
 * Varian termurah untuk durasi tertentu; dipakai karena varian selection
 * belum berdiri sendiri pada halaman detail.
 */
export function cheapestVariantForDuration(
    variants: RentalVariant[],
    days: number,
): DurationUnitPricing | null {
    let best: DurationUnitPricing | null = null;

    for (const variant of variants) {
        const price = unitPriceForDuration(
            variant.rental_price_per_day,
            variant.duration_prices,
            days,
        );

        if (price === null) {
            continue;
        }

        const pricing: DurationUnitPricing = {
            unitPrice: price,
            depositPerUnit: variant.deposit_per_unit,
            variantId: variant.id,
        };

        if (!best || pricing.unitPrice < best.unitPrice) {
            best = pricing;
        }
    }

    return best;
}

export function packageUnitPrice(
    dailyPrice: number,
    tiers: DurationPrice[],
    days: number,
): number | null {
    return unitPriceForDuration(dailyPrice, tiers, days);
}
