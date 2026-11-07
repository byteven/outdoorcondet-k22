<?php

namespace Database\Seeders;

use App\Models\Attribute;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\ProductVariant;
use Illuminate\Database\Seeder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ProductSeeder extends Seeder
{
    /**
     * Sumber gambar dummy yang ikut git (`storage/app/public/seed/products`).
     * Saat seed, file disalin ke disk public agar URL `/storage/...` tetap sama.
     */
    private const SOURCE_FOLDER = 'seed/products';

    /**
     * Folder relatif (dari storage/app/public) tempat gambar seed disimpan.
     */
    private const IMAGE_FOLDER = 'seed/products';

    /**
     * Seed products with their variants, duration prices, and placeholder images.
     */
    public function run(): void
    {
        $categories = Category::query()->pluck('id', 'slug');
        $attributes = Attribute::query()->pluck('id', 'name');

        foreach ($this->products() as $index => $row) {
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

            $this->seedImage($product, $index + 1);

            if (array_key_exists('variants', $row)) {
                $this->seedVariants($product, $row['variants'], $attributes);

                continue;
            }

            // Produk dengan satu varian tunggal
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
     * Sisipkan gambar per produk.
     * - File primary: produk-{number}.webp
     * - File secondary (opsional): produk-{number}{number}.webp (contoh: produk-0101.webp untuk produk 1)
     * File sumber di-commit di storage/app/public/seed/products.
     */
    private function seedImage(Product $product, int $number): void
    {
        $filename = sprintf('produk-%02d.webp', $number);
        $secondaryFilename = sprintf('produk-%02d%02d.webp', $number, $number);
        
        $sourcePath = storage_path('app/public/' . self::SOURCE_FOLDER . '/' . $filename);
        $secondarySourcePath = storage_path('app/public/' . self::SOURCE_FOLDER . '/' . $secondaryFilename);
        
        $imagePath = self::IMAGE_FOLDER . '/' . $filename;
        $secondaryImagePath = self::IMAGE_FOLDER . '/' . $secondaryFilename;

        // Primary image
        if (File::isFile($sourcePath)) {
            Storage::disk('public')->put($imagePath, File::get($sourcePath));
            
            ProductImage::query()->updateOrCreate(
                ['product_id' => $product->id, 'is_primary' => true],
                ['image_path' => $imagePath],
            );
        }

        // Secondary image (jika ada)
        if (File::isFile($secondarySourcePath)) {
            Storage::disk('public')->put($secondaryImagePath, File::get($secondarySourcePath));
            
            ProductImage::query()->updateOrCreate(
                ['product_id' => $product->id, 'image_path' => $secondaryImagePath],
                ['is_primary' => false],
            );
        }
    }

    /**
     * Seed produk yang punya beberapa varian (mis. kapasitas / warna berbeda).
     *
     * @param  array<int, array<string, mixed>>  $rows
     * @param  Collection<int, int>  $attributes
     */
    private function seedVariants(Product $product, array $rows, Collection $attributes): void
    {
        foreach ($rows as $row) {
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

            foreach ($row['values'] as [$attributeName, $value]) {
                $attributeId = $attributes->get($attributeName);

                if ($attributeId !== null) {
                    $variant->values()->updateOrCreate(
                        ['attribute_id' => $attributeId],
                        ['value' => $value],
                    );
                }
            }
        }
    }

    /**
     * Data produk catalog (15 produk).
     *
     * Aturan penamaan:
     * - Nama produk = nama generik (tanpa kapasitas/ukuran di nama).
     * - Kapasitas / ukuran dimasukkan sebagai atribut varian.
     *
     * Produk ke-15 (Tenda Tunnel) sengaja dipakai di RentalTestSeeder
     * untuk simulasi rental tanggal 20-23 Januari 2027 (stok kosong di rentang ini).
     *
     * @return array<int, array<string, mixed>>
     */
    private function products(): array
    {
        return [
            // ── 1. Tenda Dome (MULTI-VARIAN: 2P / 4P) ─────────────────────────
            [
                'name' => 'Tenda Dome',
                'category' => 'Tenda & Shelter',
                'description' => 'Tenda dome double layer dengan frame fiberglass ringan. Tersedia dalam kapasitas 2 orang dan 4 orang.',
                'variants' => [
                    [
                        'sku' => 'OC-TND-2P',
                        'stock' => 8,
                        'daily_price' => 18000,
                        'deposit' => 40000,
                        'weight' => 2400,
                        'values' => [['Kapasitas', '2 Orang']],
                        'durations' => [3 => 45000, 7 => 90000],
                    ],
                    [
                        'sku' => 'OC-TND-4P',
                        'stock' => 6,
                        'daily_price' => 22000,
                        'deposit' => 55000,
                        'weight' => 3200,
                        'values' => [['Kapasitas', '4 Orang']],
                        'durations' => [3 => 55000, 7 => 110000],
                    ],
                ],
            ],

            // ── 2. Flysheet (MULTI-VARIAN: 3x3 / 4x6) ────────────────────────
            [
                'name' => 'Flysheet',
                'category' => 'Tenda & Shelter',
                'description' => 'Flysheet kedap air ringan untuk berlindung dari hujan dan sinar matahari. Tersedia ukuran 3×3 dan 4×6 meter.',
                'variants' => [
                    [
                        'sku' => 'OC-FLY-3X3',
                        'stock' => 7,
                        'daily_price' => 10000,
                        'deposit' => 20000,
                        'weight' => 900,
                        'values' => [['Ukuran', '3×3 Meter']],
                        'durations' => [3 => 25000, 7 => 55000],
                    ],
                    [
                        'sku' => 'OC-FLY-4X6',
                        'stock' => 4,
                        'daily_price' => 15000,
                        'deposit' => 30000,
                        'weight' => 1600,
                        'values' => [['Ukuran', '4×6 Meter']],
                        'durations' => [3 => 38000, 7 => 80000],
                    ],
                ],
            ],

            // ── 3. Bivak Ultralight (1 varian) ────────────────────────────────
            [
                'name' => 'Bivak Ultralight',
                'category' => 'Tenda & Shelter',
                'description' => 'Bivak satu lapisan ultralight untuk shelter darurat saat pendakian solo atau dua orang.',
                'sku' => 'OC-BVK-UL1',
                'stock' => 5,
                'daily_price' => 8000,
                'deposit' => 15000,
                'weight' => 450,
                'attribute' => ['Kapasitas', '2 Orang'],
                'durations' => [3 => 20000, 7 => 40000],
            ],

            // ── 4. Carrier (MULTI-VARIAN: 40L / 60L / 80L) ───────────────────
            [
                'name' => 'Carrier',
                'category' => 'Tas & Carrier',
                'description' => 'Carrier ransel gunung dengan internal frame ergonomis dan tali pinggang empuk. Tersedia 40, 60, dan 80 liter.',
                'variants' => [
                    [
                        'sku' => 'OC-CRR-40L',
                        'stock' => 4,
                        'daily_price' => 12000,
                        'deposit' => 30000,
                        'weight' => 1400,
                        'values' => [['Kapasitas', '40 Liter']],
                        'durations' => [3 => 30000, 7 => 65000],
                    ],
                    [
                        'sku' => 'OC-CRR-60L',
                        'stock' => 6,
                        'daily_price' => 15000,
                        'deposit' => 35000,
                        'weight' => 1800,
                        'values' => [['Kapasitas', '60 Liter']],
                        'durations' => [3 => 38000, 7 => 80000],
                    ],
                    [
                        'sku' => 'OC-CRR-80L',
                        'stock' => 3,
                        'daily_price' => 20000,
                        'deposit' => 45000,
                        'weight' => 2300,
                        'values' => [['Kapasitas', '80 Liter']],
                        'durations' => [3 => 50000, 7 => 105000],
                    ],
                ],
            ],

            // ── 5. Daypack (1 varian) ──────────────────────────────────────────
            [
                'name' => 'Daypack',
                'category' => 'Tas & Carrier',
                'description' => 'Tas harian ringan untuk day hike atau pendakian santai dengan kapasitas 25 liter.',
                'sku' => 'OC-DPK-25L',
                'stock' => 10,
                'daily_price' => 7000,
                'deposit' => 15000,
                'weight' => 700,
                'attribute' => ['Kapasitas', '25 Liter'],
                'durations' => [3 => 18000, 7 => 38000],
            ],

            // ── 6. Sleeping Bag (MULTI-VARIAN: Polar / Dacron) ────────────────
            [
                'name' => 'Sleeping Bag',
                'category' => 'Sleeping Bag & Matras',
                'description' => 'Sleeping bag hangat untuk camping di pegunungan. Tersedia bahan polar (lebih hangat) dan dacron (lebih ringan).',
                'variants' => [
                    [
                        'sku' => 'OC-SBG-POL',
                        'stock' => 12,
                        'daily_price' => 10000,
                        'deposit' => 20000,
                        'weight' => 1300,
                        'values' => [['Bahan Material', 'Polar']],
                        'durations' => [3 => 25000, 7 => 55000],
                    ],
                    [
                        'sku' => 'OC-SBG-DCR',
                        'stock' => 8,
                        'daily_price' => 8000,
                        'deposit' => 15000,
                        'weight' => 900,
                        'values' => [['Bahan Material', 'Dacron']],
                        'durations' => [3 => 20000, 7 => 42000],
                    ],
                ],
            ],

            // ── 7. Matras Sleeping (MULTI-VARIAN: Foam / Inflatable) ──────────
            [
                'name' => 'Matras Sleeping',
                'category' => 'Sleeping Bag & Matras',
                'description' => 'Matras tidur untuk tenda, tersedia tipe foam lipat dan inflatable tiup.',
                'variants' => [
                    [
                        'sku' => 'OC-MTR-FOAM',
                        'stock' => 12,
                        'daily_price' => 5000,
                        'deposit' => 10000,
                        'weight' => 600,
                        'values' => [['Bahan Material', 'Foam Lipat']],
                        'durations' => [3 => 12000, 7 => 25000],
                    ],
                    [
                        'sku' => 'OC-MTR-INF',
                        'stock' => 8,
                        'daily_price' => 8000,
                        'deposit' => 15000,
                        'weight' => 900,
                        'values' => [['Bahan Material', 'Inflatable']],
                        'durations' => [3 => 20000, 7 => 42000],
                    ],
                ],
            ],

            // ── 8. Kompor Portable (1 varian) ────────────────────────────────
            [
                'name' => 'Kompor Portable',
                'category' => 'Peralatan Masak Camping',
                'description' => 'Kompor gas portabel stainless steel ringkas, cocok untuk memasak cepat di alam terbuka.',
                'sku' => 'OC-KMP-SS',
                'stock' => 9,
                'daily_price' => 7000,
                'deposit' => 15000,
                'weight' => 700,
                'attribute' => ['Bahan Material', 'Stainless Steel'],
                'durations' => [3 => 17000, 7 => 38000],
            ],

            // ── 9. Nesting Cookset (1 varian) ────────────────────────────────
            [
                'name' => 'Nesting Cookset',
                'category' => 'Peralatan Masak Camping',
                'description' => 'Set peralatan masak serbaguna: panci, wajan, piring, dan sendok yang bisa ditumpuk kompak.',
                'sku' => 'OC-NST-ALU',
                'stock' => 7,
                'daily_price' => 8000,
                'deposit' => 15000,
                'weight' => 500,
                'attribute' => ['Bahan Material', 'Aluminium'],
                'durations' => [3 => 20000, 7 => 42000],
            ],

            // ── 10. Lampu Tenda (MULTI-VARIAN: LED Mini / Lentern) ───────────
            [
                'name' => 'Lampu Tenda',
                'category' => 'Penerangan & Elektronik',
                'description' => 'Lampu penerangan tenda hemat daya. Tersedia LED mini dengan pengait dan lentera lipat yang lebih terang.',
                'variants' => [
                    [
                        'sku' => 'OC-LMP-LED',
                        'stock' => 15,
                        'daily_price' => 5000,
                        'deposit' => 10000,
                        'weight' => 250,
                        'values' => [['Daya Listrik', '5 Watt LED']],
                        'durations' => [3 => 12000, 7 => 25000],
                    ],
                    [
                        'sku' => 'OC-LMP-LNT',
                        'stock' => 8,
                        'daily_price' => 8000,
                        'deposit' => 15000,
                        'weight' => 500,
                        'values' => [['Daya Listrik', '15 Watt Lentern']],
                        'durations' => [3 => 20000, 7 => 42000],
                    ],
                ],
            ],

            // ── 11. Headlamp (1 varian) ───────────────────────────────────────
            [
                'name' => 'Headlamp',
                'category' => 'Penerangan & Elektronik',
                'description' => 'Senter kepala tahan air dengan tali elastis, bebas tangan saat pendakian malam hari.',
                'sku' => 'OC-HLP-200',
                'stock' => 10,
                'daily_price' => 5000,
                'deposit' => 10000,
                'weight' => 150,
                'attribute' => ['Daya Listrik', '200 Lumen'],
                'durations' => [3 => 12000, 7 => 25000],
            ],

            // ── 12. Meja Lipat (1 varian) ─────────────────────────────────────
            [
                'name' => 'Meja Lipat',
                'category' => 'Meja & Kursi Lipat',
                'description' => 'Meja lipat aluminium ringan dan kokoh untuk area makan atau memasak di luar ruangan.',
                'sku' => 'OC-MJA-ALU',
                'stock' => 4,
                'daily_price' => 10000,
                'deposit' => 20000,
                'weight' => 2100,
                'attribute' => ['Ukuran', '70×70 cm'],
                'durations' => [3 => 25000, 7 => 52000],
            ],

            // ── 13. Kursi Lipat (1 varian) ────────────────────────────────────
            [
                'name' => 'Kursi Lipat',
                'category' => 'Meja & Kursi Lipat',
                'description' => 'Kursi lipat ringan dengan sandaran dan pipa besi kokoh, nyaman untuk bersantai di camp.',
                'sku' => 'OC-KRS-PDG',
                'stock' => 8,
                'daily_price' => 7000,
                'deposit' => 12000,
                'weight' => 1600,
                'attribute' => ['Bahan Material', 'Besi Ringan'],
                'durations' => [3 => 17000, 7 => 38000],
            ],

            // ── 14. Trekking Pole (MULTI-VARIAN: 1 pcs / 2 pcs) ─────────────
            [
                'name' => 'Trekking Pole',
                'category' => 'Perlengkapan Survival & Navigasi',
                'description' => 'Tongkat trekking aluminium adjustable untuk keseimbangan di medan berbatu. Tersedia satuan dan sepasang.',
                'variants' => [
                    [
                        'sku' => 'OC-TRP-1PC',
                        'stock' => 8,
                        'daily_price' => 5000,
                        'deposit' => 10000,
                        'weight' => 280,
                        'values' => [['Kapasitas', '1 Batang']],
                        'durations' => [3 => 12000, 7 => 25000],
                    ],
                    [
                        'sku' => 'OC-TRP-2PC',
                        'stock' => 6,
                        'daily_price' => 9000,
                        'deposit' => 18000,
                        'weight' => 560,
                        'values' => [['Kapasitas', '2 Batang (Sepasang)']],
                        'durations' => [3 => 22000, 7 => 48000],
                    ],
                ],
            ],

            // ── 15. Tenda Tunnel ─ RESERVED untuk RentalTestSeeder ──────────
            // SKU varian: OC-TND-TUN (dipakai di RentalTestSeeder Jan 20-23)
            [
                'name' => 'Tenda Tunnel',
                'category' => 'Tenda & Shelter',
                'description' => 'Tenda tunnel 3-season dengan dua pintu dan luas interior yang lebih besar dari dome standar.',
                'sku' => 'OC-TND-TUN',
                'stock' => 4,
                'daily_price' => 25000,
                'deposit' => 60000,
                'weight' => 3800,
                'attribute' => ['Kapasitas', '3 Orang'],
                'durations' => [3 => 62000, 7 => 130000],
            ],
        ];
    }
}
