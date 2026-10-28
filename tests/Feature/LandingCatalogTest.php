<?php

use App\Models\Category;
use App\Models\Package;
use App\Models\Product;
use App\Models\ProductVariant;
use Inertia\Testing\AssertableInertia;

test('landing page exposes the deferred rental catalog', function () {
    $category = Category::factory()->create([
        'name' => 'Tenda & Shelter',
        'slug' => 'tenda-shelter',
    ]);

    $product = Product::factory()->create([
        'category_id' => $category->id,
        'name' => 'Tenda Dome 4P',
        'slug' => 'tenda-dome-4p',
        'description' => 'Tenda dome untuk empat orang.',
    ]);

    $variant = ProductVariant::factory()->create([
        'product_id' => $product->id,
        'sku' => 'OC-TND-4P',
        'stock' => 6,
        'rental_price_per_day' => 20000,
        'deposit_per_unit' => 50000,
        'is_active' => true,
    ]);

    $package = Package::create([
        'name' => 'Paket Camping Dasar',
        'slug' => 'paket-camping-dasar',
        'description' => 'Paket camping lengkap.',
        'daily_price' => 55000,
        'deposit_per_package' => 150000,
        'is_active' => true,
    ]);

    $package->items()->create([
        'product_id' => $variant->product_id,
        'product_variant_id' => $variant->id,
        'quantity' => 2,
    ]);

    $this->get(route('home'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('landing')
            ->loadDeferredProps(fn (AssertableInertia $page) => $page
                ->has('catalog.categories', 1)
                ->where('catalog.categories.0.name', 'Tenda & Shelter')
                ->has('catalog.products', 1)
                ->where('catalog.products.0.name', 'Tenda Dome 4P')
                ->where('catalog.products.0.stock', 6)
                ->has('catalog.packages', 1)
                ->where('catalog.packages.0.name', 'Paket Camping Dasar')
                ->has('catalog.packages.0.items', 1)
                ->where('catalog.packages.0.items.0.name', 'Tenda Dome 4P')
                ->where('catalog.packages.0.items.0.quantity', 2)));
});
