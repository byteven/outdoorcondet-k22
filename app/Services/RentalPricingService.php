<?php

namespace App\Services;

use App\Models\Package;
use App\Models\ProductVariant;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;

/**
 * Pricing engine per PRD 4.2 — port server-side dari aturan yang sama
 * dengan frontend (`resources/js/lib/rental-pricing.ts`).
 *
 * Harga per unit untuk durasi `n` hari = kombinasi termurah untuk customer:
 *  1. exact(n)   : kombinasi tier + harga 1 hari yang jumlah harinya tepat `n`
 *                  (tier boleh dipakai berulang).
 *  2. rounded(n) : harga tier terkecil dengan durasi lebih besar dari `n`.
 *  3. unit_price = min(exact, rounded).
 *
 * Deposit tidak dipengaruhi durasi: `deposit_per_unit x quantity`.
 */
class RentalPricingService
{
    private const MAX_TIER_DURATION_DAYS = 365;

    /**
     * Total hari sewa per PRD 4.3. Toko beroperasi 18:00-23:59 sehingga
     * pengambilan selalu dihitung mulai tanggal berikutnya
     * (pickup time efektif = 18:00, lihat STORE_PICKUP_TIME di frontend).
     */
    public function totalDays(CarbonInterface $pickupDate, CarbonInterface $returnDate): int
    {
        $billingStartDate = $pickupDate->copy()->addDay()->startOfDay();
        $returnStartDate = $returnDate->copy()->startOfDay();

        $days = (int) $billingStartDate->diffInDays($returnStartDate) + 1;

        return max(0, $days);
    }

    /**
     * Harga sewa per unit untuk satu varian pada durasi tertentu.
     */
    public function unitPriceForVariant(ProductVariant $variant, int $days): ?float
    {
        return $this->unitPriceForDuration(
            (float) $variant->rental_price_per_day,
            $variant->relationLoaded('durationPrices')
                ? $variant->durationPrices
                : $variant->durationPrices()->get(),
            $days,
        );
    }

    /**
     * Harga sewa per unit untuk satu paket pada durasi tertentu.
     */
    public function unitPriceForPackage(Package $package, int $days): ?float
    {
        return $this->unitPriceForDuration(
            (float) $package->daily_price,
            $package->relationLoaded('durationPrices')
                ? $package->durationPrices
                : $package->durationPrices()->get(),
            $days,
        );
    }

    /**
     * Harga appendix per unit untuk `days` hari mengikuti aturan PRD 4.2.
     *
     * @param  Collection<int, VariantDurationPrice|PackageDurationPrice>  $tiers
     */
    public function unitPriceForDuration(
        float $dailyPrice,
        Collection $tiers,
        int $days,
    ): ?float {
        if ($days < 1) {
            return null;
        }

        $candidates = array_filter([
            $this->exactCombinationPrice($dailyPrice, $tiers, $days),
            $this->smallestLargerTierPrice($tiers, $days),
        ], fn (mixed $price): bool => $price !== null && is_finite($price));

        return $candidates === []
            ? null
            : min($candidates);
    }

    /**
     * Biaya minimum kombinasi tier + harga 1 hari yang jumlah harinya
     * tepat `days` (tier boleh dipakai berulang) — pemrograman dinamis
     * seperti exactCombinationPrice() di frontend.
     *
     * @param  Collection<int, VariantDurationPrice|PackageDurationPrice>  $tiers
     */
    private function exactCombinationPrice(
        float $dailyPrice,
        Collection $tiers,
        int $days,
    ): ?float {
        /** @var array<int, float|float> $costs */
        $costs = array_fill(0, $days + 1, INF);
        $costs[0] = 0.0;

        for ($day = 1; $day <= $days; $day++) {
            $costs[$day] = min($costs[$day], $costs[$day - 1] + $dailyPrice);

            foreach ($tiers as $tier) {
                $tierDays = (int) $tier->duration_days;

                if ($tierDays < 2 || $tierDays > $day) {
                    continue;
                }

                $costs[$day] = min(
                    $costs[$day],
                    $costs[$day - $tierDays] + (float) $tier->price,
                );
            }
        }

        return is_finite($costs[$days]) ? $costs[$days] : null;
    }

    /**
     * Harga tier terkecil dengan durasi lebih besar dari `days`.
     *
     * @param  Collection<int, VariantDurationPrice|PackageDurationPrice>  $tiers
     */
    private function smallestLargerTierPrice(Collection $tiers, int $days): ?float
    {
        $best = null;

        foreach ($tiers as $tier) {
            $tierDays = (int) $tier->duration_days;

            if ($tierDays <= $days || $tierDays > self::MAX_TIER_DURATION_DAYS) {
                continue;
            }

            $price = (float) $tier->price;

            if ($best === null || $price < $best) {
                $best = $price;
            }
        }

        return $best;
    }
}
