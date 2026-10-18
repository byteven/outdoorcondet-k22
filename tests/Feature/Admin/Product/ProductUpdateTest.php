<?php

use App\Models\Attribute;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use App\UserRole;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    $this->admin = User::factory()->create(['role' => UserRole::Admin]);
    Storage::fake('public');
});

function updateVariantPayload(Product $product, array $overrides = []): array
{
    $attribute = Attribute::where('name', 'Ukuran')->first()
        ?? Attribute::factory()->create(['name' => 'Ukuran']);
    $variant = $product->variants->first();

    return array_merge([
        'category_id' => $product->category_id,
        'name' => 'Tenda Dome 4 Orang Update',
        'slug' => 'tenda-dome-4-orang',
        'description' => 'Deskripsi diperbarui',
        'is_active' => true,
        'primary_image' => 0,
        'keep_images' => [],
        'variants' => [
            [
                'id' => $variant->id,
                'sku' => $variant->sku,
                'stock' => 10,
                'rental_price_per_day' => 60000,
                'weight_grams' => 3500,
                'is_active' => true,
                'values' => [
                    ['attribute_id' => $attribute->id, 'value' => 'XL'],
                ],
            ],
        ],
    ], $overrides);
}

function seededProduct(): Product
{
    $product = Product::factory()->create(['slug' => 'tenda-dome-4-orang']);
    $variant = ProductVariant::factory()->create(['product_id' => $product->id, 'sku' => 'TND-001', 'stock' => 2]);

    return $product->fresh(['variants']);
}

test('guests cannot update products', function () {
    $product = seededProduct();

    $this->put(route('admin.products.update', $product), updateVariantPayload($product))
        ->assertRedirect(route('login'));
});

test('customers cannot update products', function () {
    $user = User::factory()->create(['role' => UserRole::Customer]);
    $product = seededProduct();

    $this->actingAs($user)
        ->put(route('admin.products.update', $product), updateVariantPayload($product))
        ->assertRedirect(route('home'));
});

test('admins can update a product with its variants', function () {
    $product = seededProduct();

    $this->actingAs($this->admin)
        ->put(route('admin.products.update', $product), updateVariantPayload($product))
        ->assertRedirect()
        ->assertSessionHas('inertia.flash_data.toast.type', 'success');

    $product->refresh();

    expect($product->name)->toBe('Tenda Dome 4 Orang Update')
        ->and($product->variants)->toHaveCount(1)
        ->and($product->variants->first()->stock)->toBe(10)
        ->and((string) $product->variants->first()->rental_price_per_day)->toBe('60000.00')
        ->and($product->variants->first()->values->first()->value)->toBe('XL');
});

test('updating a product allows keeping the same slug and sku', function () {
    $product = seededProduct();

    $this->actingAs($this->admin)
        ->put(route('admin.products.update', $product), updateVariantPayload($product))
        ->assertRedirect()
        ->assertSessionHasNoErrors();
});

test('updating a product replaces removed variants', function () {
    $product = seededProduct();
    $attribute = Attribute::where('name', 'Warna')->first()
        ?? Attribute::factory()->create(['name' => 'Warna']);

    $payload = updateVariantPayload($product, [
        'variants' => [
            [
                'sku' => 'TND-BARU-001',
                'stock' => 7,
                'rental_price_per_day' => 45000,
                'weight_grams' => 3000,
                'values' => [
                    ['attribute_id' => $attribute->id, 'value' => 'Hijau'],
                ],
            ],
        ],
    ]);

    $this->actingAs($this->admin)
        ->put(route('admin.products.update', $product), $payload)
        ->assertRedirect();

    $product->refresh();

    expect($product->variants)->toHaveCount(1)
        ->and($product->variants->first()->sku)->toBe('TND-BARU-001')
        ->and(ProductVariant::where('sku', 'TND-001')->exists())->toBeFalse();
});

test('updating a product rejects duplicate slug or duplicate sku in payload', function () {
    Product::factory()->create(['slug' => 'kompor-portabel']);
    $product = seededProduct();

    $this->actingAs($this->admin)
        ->put(route('admin.products.update', $product), updateVariantPayload($product, ['slug' => 'kompor-portabel']))
        ->assertSessionHasErrors(['slug']);

    $attribute = Attribute::where('name', 'Warna')->first()
        ?? Attribute::factory()->create(['name' => 'Warna']);
    $payload = updateVariantPayload($product, [
        'variants' => [
            ['sku' => 'TND-SAMA', 'stock' => 1, 'rental_price_per_day' => 10000, 'values' => []],
            ['sku' => 'TND-SAMA', 'stock' => 2, 'rental_price_per_day' => 20000, 'values' => []],
        ],
    ]);

    $this->actingAs($this->admin)
        ->put(route('admin.products.update', $product), $payload)
        ->assertSessionHasErrors(['variants.1.sku']);
});

test('updating a product can append new images and keep old ones', function () {
    Storage::fake('public');
    $product = Product::factory()->create();
    ProductVariant::factory()->create(['product_id' => $product->id]);
    $product->refresh(['variants']);

    $oldPath = UploadedFile::fake()->image('lama.jpg')->store('products', 'public');
    $oldImage = $product->images()->create(['image_path' => $oldPath, 'is_primary' => true]);

    $payload = updateVariantPayload($product);
    $payload['keep_images'] = [$oldImage->id];
    $payload['primary_image'] = 1;
    $payload['images'] = [UploadedFile::fake()->image('baru.jpg')];

    $this->actingAs($this->admin)
        ->put(route('admin.products.update', $product), $payload)
        ->assertRedirect();

    $product->refresh();

    expect($product->images)->toHaveCount(2)
        ->and($product->images->where('is_primary', true))->toHaveCount(1)
        ->and($product->images->where('is_primary', true)->first()->id)->not->toBe($oldImage->id);
});

test('admins can update product variant deposit and duration prices', function () {
    $product = Product::factory()->create();
    $variant = ProductVariant::factory()->create([
        'product_id' => $product->id,
        'deposit_per_unit' => 20000,
    ]);
    $price1 = $variant->durationPrices()->create(['duration_days' => 3, 'price' => 70000]);

    $payload = updateVariantPayload($product);
    $payload['variants'][0]['deposit_per_unit'] = 40000;
    $payload['variants'][0]['duration_prices'] = [
        ['id' => $price1->id, 'duration_days' => 3, 'price' => 75000],
        ['duration_days' => 5, 'price' => 110000],
    ];

    $this->actingAs($this->admin)
        ->put(route('admin.products.update', $product), $payload)
        ->assertRedirect();

    $variant->refresh();

    expect((float) $variant->deposit_per_unit)->toBe(40000.0)
        ->and($variant->durationPrices)->toHaveCount(2)
        ->and($variant->durationPrices->firstWhere('duration_days', 3)?->price)->toBe('75000.00')
        ->and($variant->durationPrices->firstWhere('duration_days', 5)?->price)->toBe('110000.00');
});
