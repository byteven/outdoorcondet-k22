<?php

use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use App\UserRole;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    $this->admin = User::factory()->create(['role' => UserRole::Admin]);
});

test('guests cannot delete products', function () {
    $product = Product::factory()->create();

    $this->delete(route('admin.products.destroy', $product))
        ->assertRedirect(route('login'));
});

test('customers cannot delete products', function () {
    $user = User::factory()->create(['role' => UserRole::Customer]);
    $product = Product::factory()->create();

    $this->actingAs($user)
        ->delete(route('admin.products.destroy', $product))
        ->assertRedirect(route('home'));
});

test('admins can soft delete a product with its variants', function () {
    $product = Product::factory()->create(['name' => 'Tenda Hapus']);
    ProductVariant::factory()->create(['product_id' => $product->id]);

    $this->actingAs($this->admin)
        ->delete(route('admin.products.destroy', $product))
        ->assertRedirect()
        ->assertSessionHas('inertia.flash_data.toast.type', 'success');

    expect(Product::find($product->id))->toBeNull()
        ->and(Product::withTrashed()->find($product->id))->not->toBeNull()
        ->and(Product::withTrashed()->find($product->id)->name)->toBe('Tenda Hapus');
});

test('deleting a product removes its stored images', function () {
    Storage::fake('public');

    $product = Product::factory()->create();
    $path = 'products/lama.jpg';
    Storage::disk('public')->put($path, 'fake-image');
    $product->images()->create(['image_path' => $path, 'is_primary' => true]);

    $this->actingAs($this->admin)
        ->delete(route('admin.products.destroy', $product))
        ->assertRedirect();

    Storage::disk('public')->assertMissing($path);
});
