<?php

use App\Models\Attribute;
use App\Models\Category;
use App\Models\Product;
use Database\Factories\AttributeFactory;
use Database\Factories\CategoryFactory;
use Database\Seeders\ProductSeeder;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

test('product seeder copies committed dummy images onto the public disk', function () {
    Storage::fake('public');

    foreach (CategoryFactory::CATEGORY_NAMES as $categoryName) {
        Category::query()->firstOrCreate(
            ['slug' => Str::slug($categoryName)],
            [
                'name' => $categoryName,
                'description' => "Koleksi {$categoryName}.",
            ],
        );
    }

    foreach (AttributeFactory::ATTRIBUTE_NAMES as $attributeName) {
        Attribute::query()->firstOrCreate(
            ['name' => $attributeName],
            ['description' => "Master atribut {$attributeName}."],
        );
    }

    $this->seed(ProductSeeder::class);

    $product = Product::query()->where('slug', 'tenda-dome')->first();

    expect($product)->not->toBeNull();

    $this->assertDatabaseHas('product_images', [
        'product_id' => $product->id,
        'image_path' => 'seed/products/produk-01.webp',
        'is_primary' => true,
    ]);

    Storage::disk('public')->assertExists('seed/products/produk-01.webp');
    Storage::disk('public')->assertExists('seed/products/produk-15.webp');
});
