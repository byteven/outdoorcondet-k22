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

function seededPackageForUpdate(): Package
{
    $package = Package::factory()->create(['slug' => 'paket-camping-dasar']);
    $variant = ProductVariant::factory()->create(['stock' => 5]);

    $package->items()->create([
        'product_id' => $variant->product_id,
        'product_variant_id' => $variant->id,
        'quantity' => 1,
    ]);
    $package->durationPrices()->create([
        'duration_days' => 3,
        'price' => 140000,
    ]);

    return $package->fresh(['items', 'durationPrices']);
}

function updatePackagePayload(Package $package, array $overrides = []): array
{
    return array_merge([
        'name' => 'Paket Camping Update',
        'slug' => $package->slug,
        'description' => 'Deskripsi diperbarui',
        'daily_price' => 60000,
        'deposit_per_package' => 175000,
        'is_active' => true,
        'items' => [
            [
                'product_id' => $package->items->first()->product_id,
                'allow_variant_selection' => false,
                'product_variant_id' => $package->items->first()->product_variant_id,
                'quantity' => 3,
            ],
        ],
        'duration_prices' => [
            ['duration_days' => 5, 'price' => 250000],
        ],
    ], $overrides);
}

test('guests cannot update packages', function () {
    $package = seededPackageForUpdate();

    $this->put(route('admin.packages.update', $package), updatePackagePayload($package))
        ->assertRedirect(route('login'));
});

test('customers cannot update packages', function () {
    $user = User::factory()->create(['role' => UserRole::Customer]);
    $package = seededPackageForUpdate();

    $this->actingAs($user)
        ->put(route('admin.packages.update', $package), updatePackagePayload($package))
        ->assertRedirect(route('home'));
});

test('admins can update a package with its items and duration prices', function () {
    $package = seededPackageForUpdate();

    $this->actingAs($this->admin)
        ->put(route('admin.packages.update', $package), updatePackagePayload($package))
        ->assertRedirect()
        ->assertSessionHas('inertia.flash_data.toast.type', 'success');

    $package->refresh();

    expect($package->name)->toBe('Paket Camping Update')
        ->and((float) $package->daily_price)->toBe(60000.0)
        ->and((float) $package->deposit_per_package)->toBe(175000.0)
        ->and($package->items)->toHaveCount(1)
        ->and($package->items->first()->quantity)->toBe(3)
        ->and($package->durationPrices)->toHaveCount(1)
        ->and($package->durationPrices->first()->duration_days)->toBe(5)
        ->and($package->durationPrices->first()->price)->toBe('250000.00');
});

test('updating a package allows keeping the same slug', function () {
    $package = seededPackageForUpdate();

    $this->actingAs($this->admin)
        ->put(route('admin.packages.update', $package), updatePackagePayload($package))
        ->assertRedirect()
        ->assertSessionHasNoErrors();
});

test('updating a package rejects a duplicate slug', function () {
    Package::factory()->create(['slug' => 'paket-lain']);
    $package = seededPackageForUpdate();

    $this->actingAs($this->admin)
        ->put(
            route('admin.packages.update', $package),
            updatePackagePayload($package, ['slug' => 'paket-lain']),
        )
        ->assertSessionHasErrors(['slug']);
});

test('updating a package replaces removed items', function () {
    $package = seededPackageForUpdate();
    $replacement = ProductVariant::factory()->create(['stock' => 4]);

    $this->actingAs($this->admin)
        ->put(
            route('admin.packages.update', $package),
            updatePackagePayload($package, [
                'items' => [
                    [
                        'product_id' => $replacement->product_id,
                        'allow_variant_selection' => false,
                        'product_variant_id' => $replacement->id,
                        'quantity' => 2,
                    ],
                ],
            ]),
        )
        ->assertRedirect();

    $package->refresh();

    expect($package->items)->toHaveCount(1)
        ->and($package->items->first()->product_variant_id)->toBe($replacement->id);
});

test('updating a package rejects duplicate item products', function () {
    $package = seededPackageForUpdate();
    $product = Product::factory()->create();
    $first = ProductVariant::factory()->create(['product_id' => $product->id]);
    $second = ProductVariant::factory()->create(['product_id' => $product->id]);

    $this->actingAs($this->admin)
        ->put(
            route('admin.packages.update', $package),
            updatePackagePayload($package, [
                'items' => [
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
                ],
            ]),
        )
        ->assertSessionHasErrors(['items.1.product_id']);
});

test('updating a package supports free variant selection', function () {
    $package = seededPackageForUpdate();
    $product = Product::factory()->create();

    $this->actingAs($this->admin)
        ->put(
            route('admin.packages.update', $package),
            updatePackagePayload($package, [
                'items' => [
                    [
                        'product_id' => $product->id,
                        'allow_variant_selection' => true,
                        'product_variant_id' => null,
                        'quantity' => 2,
                    ],
                ],
            ]),
        )
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $item = $package->fresh()->items()->firstOrFail();

    expect($item->product_id)->toBe($product->id)
        ->and($item->allow_variant_selection)->toBeTrue()
        ->and($item->product_variant_id)->toBeNull();
});

test('updating a package can replace or remove its image', function () {
    $package = seededPackageForUpdate();
    $oldPath = UploadedFile::fake()->image('lama.jpg')->store('packages', 'public');
    $package->update(['image_path' => $oldPath]);

    $payload = updatePackagePayload($package);
    $payload['image'] = UploadedFile::fake()->image('baru.jpg');

    $this->actingAs($this->admin)
        ->put(route('admin.packages.update', $package), $payload)
        ->assertRedirect();

    $package->refresh();

    expect($package->image_path)->not->toBe($oldPath);
    Storage::disk('public')->assertMissing($oldPath);
    Storage::disk('public')->assertExists($package->image_path);

    $newPath = $package->image_path;
    $removePayload = updatePackagePayload($package, ['remove_image' => true]);

    $this->actingAs($this->admin)
        ->put(route('admin.packages.update', $package), $removePayload)
        ->assertRedirect();

    expect($package->fresh()->image_path)->toBeNull();
    Storage::disk('public')->assertMissing($newPath);
});
