<?php

namespace Database\Seeders;

use App\Models\Package;
use App\Models\ProductVariant;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class PackageSeeder extends Seeder
{
    /**
     * Seed bundle packages with their items and duration prices.
     */
    public function run(): void
    {
        $variants = ProductVariant::query()
            ->get(['id', 'product_id', 'sku'])
            ->keyBy('sku');

        foreach ($this->packages() as $row) {
            $package = Package::query()->updateOrCreate(
                ['slug' => Str::slug($row['name'])],
                [
                    'name' => $row['name'],
                    'description' => $row['description'],
                    'daily_price' => $row['daily_price'],
                    'deposit_per_package' => $row['deposit'],
                    'is_active' => true,
                ],
            );

            $package->items()->delete();

            foreach ($row['items'] as $sku => $quantity) {
                $variant = $variants->get($sku);

                if ($variant === null) {
                    continue;
                }

                $package->items()->create([
                    'product_id' => $variant->product_id,
                    'product_variant_id' => $variant->id,
                    'quantity' => $quantity,
                ]);
            }

            foreach ($row['durations'] as $days => $price) {
                $package->durationPrices()->updateOrCreate(
                    ['duration_days' => $days],
                    ['price' => $price],
                );
            }
        }
    }

    /**
     * Bundle seed data.
     *
     * @return array<int, array<string, mixed>>
     */
    private function packages(): array
    {
        return [
            [
                'name' => 'Paket Camping Dasar',
                'description' => 'Perlengkapan inti untuk camping dua orang: tenda, sleeping bag, matras, dan lampu.',
                'daily_price' => 55000,
                'deposit' => 150000,
                'items' => [
                    'OC-TND-4P' => 1,
                    'OC-SBG-ART' => 2,
                    'OC-MTR-INFL' => 2,
                    'OC-LMP-LED' => 1,
                ],
                'durations' => [2 => 100000, 3 => 140000],
            ],
            [
                'name' => 'Paket Hiking Ringkas',
                'description' => 'Paket ringan untuk pendakian singkat: carrier, kompor, dan matras.',
                'daily_price' => 30000,
                'deposit' => 80000,
                'items' => [
                    'OC-CRR-60L' => 1,
                    'OC-KMP-PRT' => 1,
                    'OC-MTR-INFL' => 1,
                ],
                'durations' => [2 => 55000, 3 => 75000],
            ],
            [
                'name' => 'Paket Keluarga',
                'description' => 'Satu paket lengkap untuk camping keluarga: tenda, sleeping bag, matras, meja, dan kursi.',
                'daily_price' => 95000,
                'deposit' => 250000,
                'items' => [
                    'OC-TND-4P' => 1,
                    'OC-SBG-ART' => 4,
                    'OC-MTR-INFL' => 4,
                    'OC-MJA-LPT' => 1,
                    'OC-KRS-LPT' => 4,
                ],
                'durations' => [2 => 175000, 3 => 250000],
            ],
        ];
    }
}
