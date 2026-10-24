<?php

namespace Database\Seeders;

use App\Models\Attribute;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class ProductSeeder extends Seeder
{
    /**
     * Seed products with their variants and duration prices.
     */
    public function run(): void
    {
        $categories = Category::query()->pluck('id', 'slug');
        $attributes = Attribute::query()->pluck('id', 'name');

        foreach ($this->products() as $row) {
            $categoryId = $categories->get(Str::slug($row['category']));

            if ($categoryId === null) {
                continue;
            }

            $product = Product::query()->updateOrCreate(
                ['slug' => Str::slug($row['name'])],
                [
                    'category_id' => $categoryId,
                    'name' => $row['name'],
                    'description' => $row['description'],
                    'is_active' => true,
                ],
            );

            $variant = ProductVariant::query()->updateOrCreate(
                ['sku' => $row['sku']],
                [
                    'product_id' => $product->id,
                    'stock' => $row['stock'],
                    'rental_price_per_day' => $row['daily_price'],
                    'deposit_per_unit' => $row['deposit'],
                    'weight_grams' => $row['weight'],
                    'is_active' => true,
                ],
            );

            foreach ($row['durations'] as $days => $price) {
                $variant->durationPrices()->updateOrCreate(
                    ['duration_days' => $days],
                    ['price' => $price],
                );
            }

            [$attributeName, $value] = $row['attribute'];
            $attributeId = $attributes->get($attributeName);

            if ($attributeId !== null) {
                $variant->values()->updateOrCreate(
                    ['attribute_id' => $attributeId],
                    ['value' => $value],
                );
            }
        }
    }

    /**
     * Catalog seed data.
     *
     * @return array<int, array<string, mixed>>
     */
    private function products(): array
    {
        return [
            [
                'name' => 'Tenda Dome 4P',
                'category' => 'Tenda & Shelter',
                'description' => 'Tenda dome double layer berkapasitas 4 orang, cocok untuk camping keluarga.',
                'sku' => 'OC-TND-4P',
                'stock' => 6,
                'daily_price' => 20000,
                'deposit' => 50000,
                'weight' => 3200,
                'attribute' => ['Kapasitas', '4 Orang'],
                'durations' => [3 => 50000, 7 => 100000],
            ],
            [
                'name' => 'Tenda Dome 2P',
                'category' => 'Tenda & Shelter',
                'description' => 'Tenda ringkas untuk dua orang dengan frame ringan dan mudah dipasang.',
                'sku' => 'OC-TND-2P',
                'stock' => 8,
                'daily_price' => 18000,
                'deposit' => 40000,
                'weight' => 2400,
                'attribute' => ['Kapasitas', '2 Orang'],
                'durations' => [3 => 45000, 7 => 90000],
            ],
            [
                'name' => 'Flysheet 3x3',
                'category' => 'Tenda & Shelter',
                'description' => 'Flysheet kedap air untuk melindungi area duduk dari hujan dan terik matahari.',
                'sku' => 'OC-FLY-3X3',
                'stock' => 5,
                'daily_price' => 12000,
                'deposit' => 25000,
                'weight' => 1100,
                'attribute' => ['Ukuran', '3 x 3 Meter'],
                'durations' => [3 => 30000, 7 => 65000],
            ],
            [
                'name' => 'Carrier 60L',
                'category' => 'Tas & Carrier',
                'description' => 'Carrier 60 liter dengan rangka punggung yang nyaman untuk pendakian 3-5 hari.',
                'sku' => 'OC-CRR-60L',
                'stock' => 4,
                'daily_price' => 15000,
                'deposit' => 30000,
                'weight' => 1800,
                'attribute' => ['Kapasitas', '60 Liter'],
                'durations' => [3 => 40000, 7 => 85000],
            ],
            [
                'name' => 'Sleeping Bag Artic',
                'category' => 'Sleeping Bag & Matras',
                'description' => 'Sleeping bag hangat dengan bahan polar, nyaman untuk suhu dingin pegunungan.',
                'sku' => 'OC-SBG-ART',
                'stock' => 12,
                'daily_price' => 10000,
                'deposit' => 20000,
                'weight' => 1300,
                'attribute' => ['Bahan Material', 'Polar'],
                'durations' => [3 => 25000, 7 => 55000],
            ],
            [
                'name' => 'Matras Inflatable',
                'category' => 'Sleeping Bag & Matras',
                'description' => 'Matras tiup dengan permukaan empuk agar tidur di tenda lebih nyaman.',
                'sku' => 'OC-MTR-INFL',
                'stock' => 10,
                'daily_price' => 8000,
                'deposit' => 15000,
                'weight' => 900,
                'attribute' => ['Ukuran', '190 x 60 cm'],
                'durations' => [3 => 20000, 7 => 45000],
            ],
            [
                'name' => 'Kompor Portable',
                'category' => 'Peralatan Masak Camping',
                'description' => 'Kompor gas portabel ringkas untuk memasak cepat saat camping.',
                'sku' => 'OC-KMP-PRT',
                'stock' => 9,
                'daily_price' => 7000,
                'deposit' => 15000,
                'weight' => 700,
                'attribute' => ['Bahan Material', 'Stainless Steel'],
                'durations' => [3 => 18000, 7 => 40000],
            ],
            [
                'name' => 'Lampu Tenda LED',
                'category' => 'Penerangan & Elektronik',
                'description' => 'Lampu LED hemat daya dengan pengait, menerangi tenda sepanjang malam.',
                'sku' => 'OC-LMP-LED',
                'stock' => 15,
                'daily_price' => 5000,
                'deposit' => 10000,
                'weight' => 250,
                'attribute' => ['Daya Listrik', '5 Watt'],
                'durations' => [3 => 12000, 7 => 28000],
            ],
            [
                'name' => 'Meja Lipat',
                'category' => 'Meja & Kursi Lipat',
                'description' => 'Meja lipat aluminium yang ringan dan kokoh untuk area makan di outdoor.',
                'sku' => 'OC-MJA-LPT',
                'stock' => 4,
                'daily_price' => 10000,
                'deposit' => 20000,
                'weight' => 2100,
                'attribute' => ['Ukuran', '70 x 70 cm'],
                'durations' => [3 => 25000, 7 => 55000],
            ],
            [
                'name' => 'Kursi Lipat',
                'category' => 'Meja & Kursi Lipat',
                'description' => 'Kursi lipat dengan rangka besi dan sandaran nyaman untuk bersantai.',
                'sku' => 'OC-KRS-LPT',
                'stock' => 8,
                'daily_price' => 7000,
                'deposit' => 12000,
                'weight' => 1600,
                'attribute' => ['Bahan Material', 'Besi Ringan'],
                'durations' => [3 => 18000, 7 => 40000],
            ],
        ];
    }
}
