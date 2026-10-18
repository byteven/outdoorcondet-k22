<?php

use App\Models\Attribute;
use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use App\UserRole;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    $this->admin = User::factory()->create(['role' => UserRole::Admin]);
    Storage::fake('public');
});

function validProductPayload(array $overrides = []): array
{
    $category = Category::factory()->create();
    $attribute = Attribute::where('name', 'Warna')->first()
        ?? Attribute::factory()->create(['name' => 'Warna']);

    return array_merge([
        'category_id' => $category->id,
        'name' => 'Tenda Dome 4 Orang',
        'slug' => 'tenda-dome-4-orang',
        'description' => 'Tenda kapasitas 4 orang double layer',
        'is_active' => true,
        'primary_image' => 0,
        'variants' => [
            [
                'sku' => 'TND-DOME4-MRH',
                'stock' => 5,
                'rental_price_per_day' => 50000,
                'weight_grams' => 3500,
                'is_active' => true,
                'values' => [
                    ['attribute_id' => $attribute->id, 'value' => 'Merah'],
                ],
            ],
            [
                'sku' => 'TND-DOME4-BRU',
                'stock' => 3,
                'rental_price_per_day' => 55000,
                'weight_grams' => 3600,
                'values' => [
                    ['attribute_id' => $attribute->id, 'value' => 'Biru'],
                ],
            ],
        ],
    ], $overrides);
}

test('guests cannot store products', function () {
    $this->post(route('admin.products.store'), validProductPayload())
        ->assertRedirect(route('login'));
});

test('customers cannot store products', function () {
    $user = User::factory()->create(['role' => UserRole::Customer]);

    $this->actingAs($user)
        ->post(route('admin.products.store'), validProductPayload())
        ->assertRedirect(route('home'));
});

test('admins can store a product with variants, values, and images', function () {
    $payload = validProductPayload();
    $payload['images'] = [
        UploadedFile::fake()->image('tenda-1.jpg'),
        UploadedFile::fake()->image('tenda-2.jpg'),
    ];

    $this->actingAs($this->admin)
        ->post(route('admin.products.store'), $payload)
        ->assertRedirect()
        ->assertSessionHas('inertia.flash_data.toast.type', 'success');

    $product = Product::where('slug', 'tenda-dome-4-orang')->first();

    expect($product)->not->toBeNull()
        ->and($product->variants)->toHaveCount(2)
        ->and($product->images)->toHaveCount(2)
        ->and($product->images->where('is_primary', true))->toHaveCount(1)
        ->and($product->variants->firstWhere('sku', 'TND-DOME4-MRH')->values->first()->value)->toBe('Merah')
        ->and((int) $product->variants->sum('stock'))->toBe(8);

    foreach ($product->images as $image) {
        Storage::disk('public')->assertExists($image->image_path);
    }
});

test('product slug is automatically generated from name when empty', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.products.store'), validProductPayload([
            'name' => 'Carrier Gunung 60 Liter',
            'slug' => '',
        ]))
        ->assertRedirect();

    expect(Product::where('name', 'Carrier Gunung 60 Liter')->first()?->slug)
        ->toBe('carrier-gunung-60-liter');
});

test('storing a product requires a name, category, and at least one variant', function () {
    $payload = validProductPayload(['name' => '', 'category_id' => '', 'variants' => []]);

    $this->actingAs($this->admin)
        ->post(route('admin.products.store'), $payload)
        ->assertSessionHasErrors(['name', 'category_id', 'variants']);
});

test('storing a product fails if slug or sku is already taken', function () {
    $existing = validProductPayload();
    unset($existing['images']);

    $this->actingAs($this->admin)->post(route('admin.products.store'), $existing)->assertRedirect();

    $this->actingAs($this->admin)
        ->post(route('admin.products.store'), validProductPayload(['slug' => 'tenda-dome-4-orang']))
        ->assertSessionHasErrors(['slug']);

    $this->actingAs($this->admin)
        ->post(route('admin.products.store'), validProductPayload([
            'name' => 'Tenda Lain',
            'slug' => 'tenda-lain',
        ]))
        ->assertSessionHasErrors(['variants.0.sku']);
});

test('storing a product rejects invalid image format', function () {
    $payload = validProductPayload();
    $payload['images'] = [UploadedFile::fake()->create('dokumen.pdf', 100, 'application/pdf')];

    $this->actingAs($this->admin)
        ->post(route('admin.products.store'), $payload)
        ->assertSessionHasErrors(['images.0']);
});

test('admins can store product with deposit per unit and duration prices', function () {
    $payload = validProductPayload();
    $payload['variants'][0]['deposit_per_unit'] = 50000;
    $payload['variants'][0]['duration_prices'] = [
        ['duration_days' => 3, 'price' => 120000],
        ['duration_days' => 7, 'price' => 250000],
    ];

    $this->actingAs($this->admin)
        ->post(route('admin.products.store'), $payload)
        ->assertRedirect();

    $product = Product::where('slug', 'tenda-dome-4-orang')->first();
    $firstVariant = $product?->variants->firstWhere('sku', 'TND-DOME4-MRH');

    expect($firstVariant)->not->toBeNull()
        ->and((float) $firstVariant->deposit_per_unit)->toBe(50000.0)
        ->and($firstVariant->durationPrices)->toHaveCount(2)
        ->and($firstVariant->durationPrices->firstWhere('duration_days', 3)?->price)->toBe('120000.00');
});
