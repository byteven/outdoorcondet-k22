<?php

use App\Models\Customer;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Rental;
use App\Models\User;
use App\Models\VariantMaintenance;
use App\Services\AvailabilityService;
use App\UserRole;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function actingAdmin(): User
{
    $admin = User::factory()->create(['role' => UserRole::Admin]);
    test()->actingAs($admin);

    return $admin;
}

test('admin dapat melihat halaman antrean perawatan alat', function () {
    actingAdmin();

    $this->get(route('admin.maintenances.index'))
        ->assertOk();
});

test('customer tidak dapat mengakses halaman antrean perawatan', function () {
    $customerUser = User::factory()->create(['role' => UserRole::Customer]);
    $this->actingAs($customerUser);

    $this->get(route('admin.maintenances.index'))
        ->assertRedirect();
});

test('return inspector mencatat item baik, rusak, dan hilang dengan benar', function () {
    actingAdmin();

    $customer = Customer::factory()->create();
    $product = Product::factory()->create(['name' => 'Tenda Dome 4P']);
    $variant = ProductVariant::factory()->create([
        'product_id' => $product->id,
        'stock' => 10,
        'rental_price_per_day' => 50000,
        'deposit_per_unit' => 100000,
    ]);

    $rental = Rental::factory()->create([
        'customer_id' => $customer->id,
        'status' => 'fully_paid',
        'start_date' => today()->subDays(3),
        'end_date' => today(),
    ]);

    $rentalItem = $rental->items()->create([
        'rentable_type' => ProductVariant::class,
        'rentable_id' => $variant->id,
        'name' => 'Tenda Dome 4P',
        'quantity' => 3,
        'unit_price' => 50000,
        'subtotal' => 150000,
        'deposit_per_unit' => 100000,
        'deposit_subtotal' => 300000,
    ]);

    // Konfirmasi return dengan 1 rusak (perlu repair)
    $payload = [
        'inspections' => [
            [
                'rental_item_id' => $rentalItem->id,
                'condition' => 'damaged',
                'needs_maintenance' => true,
                'maintenance_qty' => 1,
                'maintenance_reason' => 'repair',
                'notes' => 'Ritsleting pintu sobek',
            ],
        ],
    ];

    $this->post(route('admin.rentals.confirm-return', ['rental' => $rental->rental_code]), $payload)
        ->assertRedirect();

    $rental->refresh();
    $rentalItem->refresh();

    expect($rental->status)->toBe('returned')
        ->and($rentalItem->return_condition)->toBe('damaged')
        ->and($rentalItem->needs_maintenance)->toBeTrue();

    // Pastikan VariantMaintenance terbuat
    $maintenance = VariantMaintenance::where('rental_item_id', $rentalItem->id)->first();
    expect($maintenance)->not()->toBeNull()
        ->and($maintenance->product_variant_id)->toBe($variant->id)
        ->and($maintenance->quantity)->toBe(1)
        ->and($maintenance->reason)->toBe('repair')
        ->and($maintenance->status)->toBe('in_maintenance')
        ->and($maintenance->notes)->toBe('Ritsleting pintu sobek');

    // Cek bahwa AvailabilityService memblokir 1 unit ini
    $availability = app(AvailabilityService::class);
    $availableStock = $availability->availableStock($variant->id, today()->addDays(5), today()->addDays(7));
    // Total stok 10 - 1 unit maintenance = 9 unit
    expect($availableStock)->toBe(9);
});

test('item yang hilang mengurangi stok master varian secara permanen', function () {
    actingAdmin();

    $customer = Customer::factory()->create();
    $product = Product::factory()->create(['name' => 'Cooking Set']);
    $variant = ProductVariant::factory()->create([
        'product_id' => $product->id,
        'stock' => 5,
        'rental_price_per_day' => 25000,
        'deposit_per_unit' => 50000,
    ]);

    $rental = Rental::factory()->create([
        'customer_id' => $customer->id,
        'status' => 'fully_paid',
        'start_date' => today()->subDays(2),
        'end_date' => today(),
    ]);

    $rentalItem = $rental->items()->create([
        'rentable_type' => ProductVariant::class,
        'rentable_id' => $variant->id,
        'name' => 'Cooking Set DS-308',
        'quantity' => 2,
        'unit_price' => 25000,
        'subtotal' => 50000,
        'deposit_per_unit' => 50000,
        'deposit_subtotal' => 100000,
    ]);

    // Konfirmasi return dengan 1 hilang
    $payload = [
        'inspections' => [
            [
                'rental_item_id' => $rentalItem->id,
                'condition' => 'lost',
                'lost_qty' => 1,
                'notes' => 'Panci hilang saat kemping',
            ],
        ],
    ];

    $this->post(route('admin.rentals.confirm-return', ['rental' => $rental->rental_code]), $payload)
        ->assertRedirect();

    $rentalItem->refresh();
    $variant->refresh();

    expect($rentalItem->return_condition)->toBe('lost')
        // Stok berkurang dari 5 menjadi 4
        ->and($variant->stock)->toBe(4);
});

test('admin dapat menandai unit siap dan stok otomatis kembali ke pool', function () {
    actingAdmin();

    $product = Product::factory()->create(['name' => 'Flysheet 3x4']);
    $variant = ProductVariant::factory()->create([
        'product_id' => $product->id,
        'stock' => 8,
    ]);

    $maintenance = VariantMaintenance::create([
        'product_variant_id' => $variant->id,
        'rental_item_id' => null,
        'quantity' => 2,
        'reason' => 'cleaning',
        'status' => 'in_maintenance',
        'notes' => 'Cuci lumpur',
    ]);

    $availability = app(AvailabilityService::class);
    // Stok sebelum siap: 8 - 2 = 6
    expect($availability->availableStock($variant->id, today()->addDays(5), today()->addDays(7)))->toBe(6);

    // Tandai siap
    $this->post(route('admin.maintenances.mark-ready', ['maintenance' => $maintenance->id]))
        ->assertRedirect();

    $maintenance->refresh();

    expect($maintenance->status)->toBe('ready')
        ->and($maintenance->completed_at)->not()->toBeNull();

    // Stok setelah siap: kembali menjadi 8
    expect($availability->availableStock($variant->id, today()->addDays(5), today()->addDays(7)))->toBe(8);
});

test('admin dapat menambahkan perawatan alat secara manual', function () {
    actingAdmin();

    $product = Product::factory()->create();
    $variant = ProductVariant::factory()->create([
        'product_id' => $product->id,
        'stock' => 10,
    ]);

    $payload = [
        'product_variant_id' => $variant->id,
        'quantity' => 2,
        'reason' => 'inspection',
        'notes' => 'Pengecekan berkala inventaris gudang',
    ];

    $this->post(route('admin.maintenances.store'), $payload)
        ->assertRedirect();

    $maintenance = VariantMaintenance::where('product_variant_id', $variant->id)->latest('id')->first();

    expect($maintenance)->not()->toBeNull()
        ->and($maintenance->quantity)->toBe(2)
        ->and($maintenance->reason)->toBe('inspection')
        ->and($maintenance->status)->toBe('in_maintenance')
        ->and($maintenance->notes)->toBe('Pengecekan berkala inventaris gudang');
});

