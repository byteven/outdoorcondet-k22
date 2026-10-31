<?php

use App\Models\Package;
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

function validPackagePayload(array $overrides = []): array
{
    $first = ProductVariant::factory()->create(['stock' => 5]);
    $second = ProductVariant::factory()->create(['stock' => 3]);

    return array_merge([
        'name' => 'Paket Camping Dasar',
        'slug' => 'paket-camping-dasar',
        'description' => 'Paket lengkap untuk camping dua orang.',
        'daily_price' => 55000,
        'deposit_per_package' => 150000,
        'is_active' => true,
        'items' => [
            [
                'product_id' => $first->product_id,
                'allow_variant_selection' => false,
                'product_variant_id' => $first->id,
                'quantity' => 1,
            ],
            [
                'product_id' => $second->product_id,
                'allow_variant_selection' => false,
                'product_variant_id' => $second->id,
                'quantity' => 2,
            ],
        ],
        'duration_prices' => [
            ['duration_days' => 3, 'price' => 140000],
            ['duration_days' => 7, 'price' => 300000],
        ],
    ], $overrides);
}

test('guests cannot store packages', function () {
    $this->post(route('admin.packages.store'), validPackagePayload())
        ->assertRedirect(route('login'));
});

test('customers cannot store packages', function () {
    $user = User::factory()->create(['role' => UserRole::Customer]);

    $this->actingAs($user)
        ->post(route('admin.packages.store'), validPackagePayload())
        ->assertRedirect(route('home'));
});

test('admins can store a package with items, durations, and an image', function () {
    $payload = validPackagePayload();
    $payload['image'] = UploadedFile::fake()->image('paket.jpg');

    $this->actingAs($this->admin)
        ->post(route('admin.packages.store'), $payload)
        ->assertRedirect()
        ->assertSessionHas('inertia.flash_data.toast.type', 'success');

    $package = Package::where('slug', 'paket-camping-dasar')->first();

    expect($package)->not->toBeNull()
        ->and($package->items)->toHaveCount(2)
        ->and($package->durationPrices)->toHaveCount(2)
        ->and((float) $package->daily_price)->toBe(55000.0)
        ->and((float) $package->deposit_per_package)->toBe(150000.0)
        ->and($package->image_path)->not->toBeNull();

    Storage::disk('public')->assertExists($package->image_path);
});

test('package slug is automatically generated from name when empty', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.packages.store'), validPackagePayload([
            'name' => 'Paket Liburan Keluarga',
            'slug' => '',
        ]))
        ->assertRedirect();

    expect(Package::where('name', 'Paket Liburan Keluarga')->first()?->slug)
        ->toBe('paket-liburan-keluarga');
});

test('storing a package requires a name, daily price, and at least one item', function () {
    $payload = validPackagePayload([
        'name' => '',
        'daily_price' => '',
        'items' => [],
    ]);

    $this->actingAs($this->admin)
        ->post(route('admin.packages.store'), $payload)
        ->assertSessionHasErrors(['name', 'daily_price', 'items']);
});

test('storing a package rejects duplicate slug and duplicate item products', function () {
    $payload = validPackagePayload();
    unset($payload['image']);

    $this->actingAs($this->admin)
        ->post(route('admin.packages.store'), $payload)
        ->assertRedirect();

    $duplicateSlug = validPackagePayload(['slug' => 'paket-camping-dasar']);

    $this->actingAs($this->admin)
        ->post(route('admin.packages.store'), $duplicateSlug)
        ->assertSessionHasErrors(['slug']);

    $product = Product::factory()->create();
    $first = ProductVariant::factory()->create(['product_id' => $product->id]);
    $second = ProductVariant::factory()->create(['product_id' => $product->id]);

    $duplicateItem = validPackagePayload();
    $duplicateItem['items'] = [
        [
            'product_id' => $product->id,
            'allow_variant_selection' => false,
            'product_variant_id' => $first->id,
            'quantity' => 1,
        ],
        [
            'product_id' => $product->id,
            'allow_variant_selection' => false,
            'product_variant_id' => $second->id,
            'quantity' => 2,
        ],
    ];

    $this->actingAs($this->admin)
        ->post(route('admin.packages.store'), $duplicateItem)
        ->assertSessionHasErrors(['items.1.product_id']);
});

test('storing a package supports free variant selection', function () {
    $product = Product::factory()->create();

    $this->actingAs($this->admin)
        ->post(route('admin.packages.store'), validPackagePayload([
            'items' => [
                [
                    'product_id' => $product->id,
                    'allow_variant_selection' => true,
                    'product_variant_id' => null,
                    'quantity' => 2,
                ],
            ],
        ]))
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $item = Package::where('slug', 'paket-camping-dasar')->firstOrFail()->items()->firstOrFail();

    expect($item->product_id)->toBe($product->id)
        ->and($item->allow_variant_selection)->toBeTrue()
        ->and($item->product_variant_id)->toBeNull();
});

test('storing a package requires a variant when selection is fixed', function () {
    $product = Product::factory()->create();

    $this->actingAs($this->admin)
        ->post(route('admin.packages.store'), validPackagePayload([
            'items' => [
                [
                    'product_id' => $product->id,
                    'allow_variant_selection' => false,
                    'product_variant_id' => null,
                    'quantity' => 1,
                ],
            ],
        ]))
        ->assertSessionHasErrors(['items.0.product_variant_id']);
});

test('storing a package rejects a zero daily price', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.packages.store'), validPackagePayload([
            'daily_price' => 0,
        ]))
        ->assertSessionHasErrors(['daily_price']);
});

test('storing a package rejects a fixed variant from another product', function () {
    $product = Product::factory()->create();
    $otherProduct = Product::factory()->create();
    $otherVariant = ProductVariant::factory()->create(['product_id' => $otherProduct->id]);

    $this->actingAs($this->admin)
        ->post(route('admin.packages.store'), validPackagePayload([
            'items' => [
                [
                    'product_id' => $product->id,
                    'allow_variant_selection' => false,
                    'product_variant_id' => $otherVariant->id,
                    'quantity' => 1,
                ],
            ],
        ]))
        ->assertSessionHasErrors(['items.0.product_variant_id']);
});

test('storing a package rejects a duration below two days and invalid images', function () {
    $payload = validPackagePayload([
        'duration_prices' => [
            ['duration_days' => 1, 'price' => 50000],
        ],
    ]);

    $this->actingAs($this->admin)
        ->post(route('admin.packages.store'), $payload)
        ->assertSessionHasErrors(['duration_prices.0.duration_days']);

    $payload = validPackagePayload();
    $payload['image'] = UploadedFile::fake()->create('dokumen.pdf', 100, 'application/pdf');

    $this->actingAs($this->admin)
        ->post(route('admin.packages.store'), $payload)
        ->assertSessionHasErrors(['image']);
});
