<?php

namespace Database\Seeders;

use App\Models\Package;
use App\Models\ProductVariant;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class PackageSeeder extends Seeder
{
    /**
     * Sumber gambar bundle dari folder seed.
     */
    private const SOURCE_FOLDER = 'seed/products';
    private const IMAGE_FOLDER = 'seed/products';

    /**
     * Seed bundle packages with their items, duration prices, and images.
     */
    public function run(): void
    {
        $variants = ProductVariant::query()
            ->get(['id', 'product_id', 'sku'])
            ->keyBy('sku');

        foreach ($this->packages() as $index => $row) {
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

            // Seed image
            $this->seedImage($package, $index + 1);

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
     * Seed gambar untuk package dari storage/app/public/seed/products/bundle-{number}.webp
     */
    private function seedImage(\App\Models\Package $package, int $number): void
    {
        $filename = sprintf('bundle-%02d.webp', $number);
        $sourcePath = storage_path('app/public/' . self::SOURCE_FOLDER . '/' . $filename);
        $imagePath = self::IMAGE_FOLDER . '/' . $filename;

        if (\Illuminate\Support\Facades\File::isFile($sourcePath)) {
            \Illuminate\Support\Facades\Storage::disk('public')->put($imagePath, \Illuminate\Support\Facades\File::get($sourcePath));
            
            $package->update(['image_path' => $imagePath]);
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
                'description' => 'Perlengkapan inti untuk camping dua orang: tenda dome, sleeping bag, matras, dan lampu tenda.',
                'daily_price' => 55000,
                'deposit' => 150000,
                'items' => [
                    'OC-TND-2P' => 1,
                    'OC-SBG-POL' => 2,
                    'OC-MTR-INF' => 2,
                    'OC-LMP-LED' => 1,
                ],
                'durations' => [2 => 100000, 3 => 140000],
            ],
            [
                'name' => 'Paket Hiking Ringkas',
                'description' => 'Paket ringan untuk pendakian singkat: carrier, kompor portable, dan matras.',
                'daily_price' => 30000,
                'deposit' => 80000,
                'items' => [
                    'OC-CRR-60L' => 1,
                    'OC-KMP-SS' => 1,
                    'OC-MTR-FOAM' => 1,
                ],
                'durations' => [2 => 55000, 3 => 75000],
            ],
            [
                'name' => 'Paket Keluarga',
                'description' => 'Satu paket lengkap untuk camping keluarga: tenda dome 4P, sleeping bag, matras, meja, dan kursi.',
                'daily_price' => 95000,
                'deposit' => 250000,
                'items' => [
                    'OC-TND-4P' => 1,
                    'OC-SBG-POL' => 4,
                    'OC-MTR-INF' => 4,
                    'OC-MJA-ALU' => 1,
                    'OC-KRS-PDG' => 4,
                ],
                'durations' => [2 => 175000, 3 => 250000],
            ],
        ];
    }
}
