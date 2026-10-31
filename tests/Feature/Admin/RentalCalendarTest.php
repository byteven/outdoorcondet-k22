<?php

use App\Models\Customer;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Rental;
use App\Models\User;
use App\Models\VariantMaintenance;
use App\UserRole;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

function actingCalendarAdmin(): User
{
    $admin = User::factory()->create(['role' => UserRole::Admin]);
    test()->actingAs($admin);

    return $admin;
}

test('admin dapat mengakses halaman kalender rental', function () {
    actingCalendarAdmin();

    $this->get(route('admin.calendar.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('calendar/index')
            ->has('booking_events')
            ->has('buffer_events')
            ->has('maintenance_events')
            ->has('daily_capacity')
            ->has('products')
            ->has('filters')
        );
});

test('customer tidak dapat mengakses halaman kalender rental admin', function () {
    $customerUser = User::factory()->create(['role' => UserRole::Customer]);
    $this->actingAs($customerUser);

    $this->get(route('admin.calendar.index'))
        ->assertRedirect();
});

test('kalender memuat booking dan buffer 1 hari secara akurat', function () {
    actingCalendarAdmin();

    $customer = Customer::factory()->create();
    $product = Product::factory()->create(['name' => 'Tenda Dome 4P']);
    $variant = ProductVariant::factory()->create([
        'product_id' => $product->id,
        'stock' => 5,
        'rental_price_per_day' => 50000,
        'deposit_per_unit' => 100000,
    ]);

    $now = CarbonImmutable::now();
    $startDate = $now->startOfMonth()->addDays(5)->toDateString();
    $endDate = $now->startOfMonth()->addDays(7)->toDateString();
    $expectedBufferDate = $now->startOfMonth()->addDays(8)->toDateString();

    $rental = Rental::factory()->create([
        'customer_id' => $customer->id,
        'status' => 'fully_paid',
        'start_date' => $startDate,
        'end_date' => $endDate,
        'total_price' => 150000,
        'deposit_total' => 100000,
    ]);

    $rental->items()->create([
        'rentable_type' => ProductVariant::class,
        'rentable_id' => $variant->id,
        'name' => 'Tenda Dome 4P',
        'quantity' => 2,
        'unit_price' => 50000,
        'subtotal' => 150000,
        'deposit_per_unit' => 50000,
        'deposit_subtotal' => 100000,
    ]);

    $response = $this->get(route('admin.calendar.index', [
        'month' => $now->month,
        'year' => $now->year,
    ]));

    $response->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('calendar/index')
            ->where('booking_events.0.rental_code', $rental->rental_code)
            ->where('booking_events.0.total_units', 2)
            ->where('buffer_events.0.rental_code', $rental->rental_code)
            ->where('buffer_events.0.date', $expectedBufferDate)
        );
});

test('kalender memuat antrean maintenance dengan benar', function () {
    actingCalendarAdmin();

    $product = Product::factory()->create(['name' => 'Flysheet 4x6']);
    $variant = ProductVariant::factory()->create([
        'product_id' => $product->id,
        'stock' => 10,
    ]);

    VariantMaintenance::create([
        'product_variant_id' => $variant->id,
        'rental_item_id' => null,
        'quantity' => 3,
        'reason' => 'cleaning',
        'custom_reason' => 'Dicuci lumpur',
        'status' => 'in_maintenance',
        'notes' => 'Perlu deterjen khusus',
    ]);

    $response = $this->get(route('admin.calendar.index'));

    $response->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('calendar/index')
            ->where('maintenance_events.0.product_name', 'Flysheet 4x6')
            ->where('maintenance_events.0.quantity', 3)
            ->where('maintenance_events.0.reason', 'Dicuci lumpur')
        );
});

