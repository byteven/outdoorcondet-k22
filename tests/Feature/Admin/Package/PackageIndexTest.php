<?php

use App\Models\Package;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use App\UserRole;
use Inertia\Testing\AssertableInertia;

beforeEach(function () {
    $this->admin = User::factory()->create(['role' => UserRole::Admin]);
});

test('guests are redirected to login when accessing package index', function () {
    $this->get(route('admin.packages.index'))->assertRedirect(route('login'));
});

test('customers cannot access the package list', function () {
    $user = User::factory()->create(['role' => UserRole::Customer]);

    $this->actingAs($user)
        ->get(route('admin.packages.index'))
        ->assertRedirect(route('home'));
});

test('admins can view the paginated package list', function () {
    Package::factory()->count(15)->create();

    $this->actingAs($this->admin)
        ->get(route('admin.packages.index'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('packages/index')
            ->has('packages.data', 10)
            ->where('packages.total', 15)
            ->where('packages.current_page', 1)
            ->where('summary.total', 15)
            ->has('products')
            ->has('filters'));
});

test('admins can search packages by name, slug, or description', function () {
    Package::factory()->create([
        'name' => 'Paket Camping Spesial',
        'slug' => 'paket-camping-spesial',
        'description' => 'Paket lengkap untuk keluarga',
    ]);
    Package::factory()->create([
        'name' => 'Paket Hiking Ringkas',
        'slug' => 'paket-hiking-ringkas',
        'description' => 'Paket ringan untuk pendakian',
    ]);

    $this->actingAs($this->admin)
        ->get(route('admin.packages.index', ['search' => 'Spesial']))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('packages.total', 1)
            ->where('packages.data.0.name', 'Paket Camping Spesial')
            ->where('filters.search', 'Spesial'));

    $this->actingAs($this->admin)
        ->get(route('admin.packages.index', ['search' => 'pendakian']))
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('packages.total', 1)
            ->where('packages.data.0.name', 'Paket Hiking Ringkas'));
});

test('admins can filter packages by status', function () {
    Package::factory()->create(['is_active' => true]);
    Package::factory()->create(['is_active' => false]);

    $this->actingAs($this->admin)
        ->get(route('admin.packages.index', ['status' => 'inactive']))
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('packages.total', 1)
            ->where('packages.data.0.is_active', false)
            ->where('summary.inactive', 1));
});

test('package availability uses the smallest item stock ratio', function () {
    $package = Package::factory()->create();
    $first = ProductVariant::factory()->create(['stock' => 5]);
    $second = ProductVariant::factory()->create(['stock' => 9]);

    $package->items()->create([
        'product_id' => $first->product_id,
        'product_variant_id' => $first->id,
        'quantity' => 2,
    ]);
    $package->items()->create([
        'product_id' => $second->product_id,
        'product_variant_id' => $second->id,
        'quantity' => 3,
    ]);

    $this->actingAs($this->admin)
        ->get(route('admin.packages.index'))
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('packages.data.0.available_stock', 2)
            ->has('packages.data.0.items', 2));
});

test('package availability adds up active variants for free selection items', function () {
    $package = Package::factory()->create();
    $product = Product::factory()->create();
    $otherProduct = Product::factory()->create();

    ProductVariant::factory()->create([
        'product_id' => $product->id,
        'stock' => 5,
        'is_active' => true,
    ]);
    ProductVariant::factory()->create([
        'product_id' => $product->id,
        'stock' => 9,
        'is_active' => true,
    ]);
    ProductVariant::factory()->create([
        'product_id' => $product->id,
        'stock' => 100,
        'is_active' => false,
    ]);

    $otherVariant = ProductVariant::factory()->create([
        'product_id' => $otherProduct->id,
        'stock' => 6,
    ]);

    $package->items()->create([
        'product_id' => $product->id,
        'allow_variant_selection' => true,
        'product_variant_id' => null,
        'quantity' => 2,
    ]);
    $package->items()->create([
        'product_id' => $otherProduct->id,
        'product_variant_id' => $otherVariant->id,
        'quantity' => 3,
    ]);

    $this->actingAs($this->admin)
        ->get(route('admin.packages.index'))
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('packages.data.0.available_stock', 2)
            ->where('packages.data.0.items.0.allow_variant_selection', true)
            ->where('packages.data.0.items.0.product_variant_id', null));
});
