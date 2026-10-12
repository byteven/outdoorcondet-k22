<?php

use App\Models\Category;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use App\UserRole;
use Inertia\Testing\AssertableInertia;

beforeEach(function () {
    $this->admin = User::factory()->create(['role' => UserRole::Admin]);
});

test('guests are redirected to login when accessing product index', function () {
    $this->get(route('admin.products.index'))->assertRedirect(route('login'));
});

test('customers cannot access the product list', function () {
    $user = User::factory()->create(['role' => UserRole::Customer]);

    $this->actingAs($user)->get(route('admin.products.index'))->assertRedirect(route('home'));
});

test('admins can view the paginated product list', function () {
    Product::factory()->count(15)->sequence(fn ($sequence) => [
        'name' => "Tenda Dome {$sequence->index}",
        'slug' => "tenda-dome-{$sequence->index}",
    ])->create();

    $this->actingAs($this->admin)
        ->get(route('admin.products.index'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('products/index')
            ->has('products.data', 10)
            ->where('products.total', 15)
            ->where('products.current_page', 1)
            ->where('summary.total', 15)
            ->has('categories')
            ->has('attributes')
            ->has('filters'));
});

test('admins can search products by name, slug, or description', function () {
    Product::factory()->create([
        'name' => 'Tenda Dome Spesial',
        'slug' => 'tenda-dome-spesial',
        'description' => 'Tenda kapasitas 4 orang',
    ]);
    Product::factory()->create([
        'name' => 'Carrier 60L',
        'slug' => 'carrier-60l',
        'description' => 'Tas gunung kapasitas besar',
    ]);

    $this->actingAs($this->admin)
        ->get(route('admin.products.index', ['search' => 'Spesial']))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('products.total', 1)
            ->where('products.data.0.name', 'Tenda Dome Spesial')
            ->where('filters.search', 'Spesial'));

    $this->actingAs($this->admin)
        ->get(route('admin.products.index', ['search' => 'kapasitas besar']))
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('products.total', 1)
            ->where('products.data.0.name', 'Carrier 60L'));
});

test('admins can filter products by category and status', function () {
    $tenda = Category::factory()->create(['name' => 'Tenda', 'slug' => 'tenda']);
    $tas = Category::factory()->create(['name' => 'Tas', 'slug' => 'tas']);

    Product::factory()->create(['category_id' => $tenda->id, 'is_active' => true]);
    Product::factory()->create(['category_id' => $tas->id, 'is_active' => false]);

    $this->actingAs($this->admin)
        ->get(route('admin.products.index', ['category_id' => $tenda->id]))
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('products.total', 1)
            ->where('products.data.0.category_id', $tenda->id));

    $this->actingAs($this->admin)
        ->get(route('admin.products.index', ['status' => 'inactive']))
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('products.total', 1)
            ->where('products.data.0.is_active', false));
});

test('product index summary counts stock across variants', function () {
    $product = Product::factory()->create();
    ProductVariant::factory()->create(['product_id' => $product->id, 'stock' => 4]);
    ProductVariant::factory()->create(['product_id' => $product->id, 'stock' => 6]);

    $this->actingAs($this->admin)
        ->get(route('admin.products.index'))
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('summary.total_stock', 10));
});
