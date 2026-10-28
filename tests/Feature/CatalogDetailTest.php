<?php

use App\Models\Category;
use App\Models\Package;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\ProductVariant;
use App\Models\VariantDurationPrice;
use Inertia\Testing\AssertableInertia;

test('product detail page renders the full product payload', function () {
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

    VariantDurationPrice::create([
        'product_variant_id' => $variant->id,
        'duration_days' => 3,
        'price' => 50000,
    ]);

    ProductImage::factory()->count(2)->create([
        'product_id' => $product->id,
        'is_primary' => false,
    ]);

    ProductImage::factory()->create([
        'product_id' => $product->id,
        'image_path' => 'products/primary.jpg',
        'is_primary' => true,
    ]);

    $this->get(route('products.show', ['productSlug' => 'tenda-dome-4p']))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('products/show')
            ->where('detail.type', 'alat')
            ->where('detail.id', $product->id)
            ->where('detail.name', 'Tenda Dome 4P')
            ->where('detail.category.name', 'Tenda & Shelter')
            ->has('detail.images', 3)
            ->where('detail.images.0', 'products/primary.jpg')
            ->has('detail.variants', 1)
            ->where('detail.variants.0.rental_price_per_day', 20000)
            ->where('detail.variants.0.duration_prices.0.duration_days', 3)
            ->where('availability', null)
            ->has('related', 0));
});

test('product detail page fills related products from the same category', function () {
    $category = Category::factory()->create();

    $product = Product::factory()->create([
        'category_id' => $category->id,
        'slug' => 'tenda-dome-4p',
    ]);

    $variant = ProductVariant::factory()->create([
        'product_id' => $product->id,
        'is_active' => true,
    ]);

    $sibling = Product::factory()->create([
        'category_id' => $category->id,
        'slug' => 'tenda-tunnel-2p',
    ]);

    ProductVariant::factory()->create([
        'product_id' => $sibling->id,
        'stock' => 1,
        'is_active' => true,
    ]);

    $this->get(route('products.show', ['productSlug' => 'tenda-dome-4p']))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->has('related', 1)
            ->where('related.0.slug', 'tenda-tunnel-2p')
            ->where('related.0.stock', 1));
});

test('package detail page renders the package payload', function () {
    $productName = 'Tenda Dome 4P';

    $variant = ProductVariant::factory()->for(
        Product::factory()->create(['name' => $productName]),
    )->create([
        'sku' => 'OC-TND-4P',
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

    VariantDurationPrice::create([
        'product_variant_id' => $variant->id,
        'duration_days' => 3,
        'price' => 50000,
    ]);

    $this->get(route('packages.show', ['packageSlug' => 'paket-camping-dasar']))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('products/show')
            ->where('detail.type', 'bundle')
            ->where('detail.id', $package->id)
            ->where('detail.name', 'Paket Camping Dasar')
            ->where('detail.daily_price', 55000)
            ->where('detail.deposit_per_package', 150000)
            ->has('detail.items', 1)
            ->where('detail.items.0.name', $productName)
            ->where('detail.items.0.quantity', 2)
            ->where('detail.items.0.allow_variant_selection', false)
            ->where('detail.items.0.variant_name', 'OC-TND-4P')
            ->where('availability', null));
});

test('package availability adds up active variants for free selection items', function () {
    $selectableProduct = Product::factory()->create();
    $fixedProduct = Product::factory()->create();

    ProductVariant::factory()->create([
        'product_id' => $selectableProduct->id,
        'stock' => 5,
        'is_active' => true,
    ]);
    ProductVariant::factory()->create([
        'product_id' => $selectableProduct->id,
        'stock' => 9,
        'is_active' => true,
    ]);
    ProductVariant::factory()->create([
        'product_id' => $selectableProduct->id,
        'stock' => 100,
        'is_active' => false,
    ]);
    $fixedVariant = ProductVariant::factory()->create([
        'product_id' => $fixedProduct->id,
        'stock' => 6,
    ]);

    $package = Package::create([
        'name' => 'Paket Fleksibel',
        'slug' => 'paket-fleksibel',
        'daily_price' => 55000,
        'deposit_per_package' => 150000,
        'is_active' => true,
    ]);

    $package->items()->create([
        'product_id' => $selectableProduct->id,
        'allow_variant_selection' => true,
        'product_variant_id' => null,
        'quantity' => 2,
    ]);
    $package->items()->create([
        'product_id' => $fixedProduct->id,
        'product_variant_id' => $fixedVariant->id,
        'quantity' => 3,
    ]);

    $this->get(route('packages.show', [
        'packageSlug' => 'paket-fleksibel',
        'pickup_date' => '2026-11-01',
        'return_date' => '2026-11-02',
    ]))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('availability', 2)
            ->where('detail.items.0.allow_variant_selection', true)
            ->where('detail.items.0.variant_name', null));
});

test('inactive products and unknown slugs return 404', function () {
    Product::factory()->create(['slug' => 'tenda-lama', 'is_active' => false]);
    Package::create([
        'name' => 'Paket Lama',
        'slug' => 'paket-lama',
        'daily_price' => 50000,
        'deposit_per_package' => 100000,
        'is_active' => false,
    ]);

    $this->get(route('products.show', ['productSlug' => 'tenda-lama']))->assertNotFound();
    $this->get(route('products.show', ['productSlug' => 'tidak-ada']))->assertNotFound();
    $this->get(route('packages.show', ['packageSlug' => 'paket-lama']))->assertNotFound();
});
