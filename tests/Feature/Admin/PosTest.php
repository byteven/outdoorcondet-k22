<?php

use App\Models\Category;
use App\Models\Customer;
use App\Models\Package;
use App\Models\PackageItem;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Rental;
use App\Models\RentalPayment;
use App\Models\User;
use App\UserRole;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

function actingPosAdmin(): User
{
    $admin = User::factory()->create(['role' => UserRole::Admin]);
    test()->actingAs($admin);

    return $admin;
}

test('admin dapat mengakses halaman pos register', function () {
    actingPosAdmin();

    $this->get(route('admin.pos.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('pos/index')
            ->has('categories')
            ->has('products')
            ->has('packages')
            ->has('customers')
            ->has('initialDates')
            ->has('initialAvailability')
        );
});

test('customer tidak dapat mengakses halaman pos register', function () {
    $customerUser = User::factory()->create(['role' => UserRole::Customer]);
    $this->actingAs($customerUser);

    $this->get(route('admin.pos.index'))
        ->assertRedirect();
});

test('pos endpoint dapat memeriksa ketersediaan stok live untuk rentang tanggal', function () {
    actingPosAdmin();

    $category = Category::factory()->create();
    $product = Product::factory()->create(['category_id' => $category->id]);
    $variant = ProductVariant::factory()->create([
        'product_id' => $product->id,
        'stock' => 8,
        'rental_price_per_day' => 25000,
        'deposit_per_unit' => 50000,
    ]);

    $startDate = CarbonImmutable::today()->toDateString();
    $endDate = CarbonImmutable::today()->addDays(2)->toDateString();

    $response = $this->postJson(route('admin.pos.availability'), [
        'start_date' => $startDate,
        'end_date' => $endDate,
    ]);

    $response->assertOk()
        ->assertJsonStructure([
            'variants',
            'packages',
            'total_days',
        ]);

    $data = $response->json();
    expect($data['variants'][$variant->id])->toBe(8);
    expect($data['total_days'])->toBe(2);
});

test('admin dapat mendaftarkan pelanggan walk-in secara cepat dari pos', function () {
    actingPosAdmin();

    $response = $this->postJson(route('admin.pos.customers.store'), [
        'name' => 'Pelanggan Toko Baru',
        'phone_number' => '081299990000',
        'email' => 'walkin@example.com',
        'address' => 'Jl. Condet Raya No. 12',
    ]);

    $response->assertOk()
        ->assertJson([
            'success' => true,
        ]);

    $this->assertDatabaseHas('users', [
        'name' => 'Pelanggan Toko Baru',
        'email' => 'walkin@example.com',
        'role' => UserRole::Customer->value,
    ]);

    $this->assertDatabaseHas('customers', [
        'phone_number' => '081299990000',
        'address' => 'Jl. Condet Raya No. 12',
        'is_active' => true,
    ]);
});

test('admin dapat memproses checkout transaksi sewa lunas via tunai', function () {
    actingPosAdmin();

    $customer = Customer::factory()->create();
    $category = Category::factory()->create();
    $product = Product::factory()->create(['category_id' => $category->id]);
    $variant = ProductVariant::factory()->create([
        'product_id' => $product->id,
        'stock' => 5,
        'rental_price_per_day' => 50000,
        'deposit_per_unit' => 100000,
    ]);

    $startDate = CarbonImmutable::today()->toDateString();
    $endDate = CarbonImmutable::today()->addDays(1)->toDateString();

    $response = $this->postJson(route('admin.pos.checkout'), [
        'customer_id' => $customer->id,
        'start_date' => $startDate,
        'end_date' => $endDate,
        'payment_type' => 'full',
        'payment_method' => 'cash',
        'cash_tendered' => 200000,
        'notes' => 'Pembayaran tunai lunas di meja kasir',
        'items' => [
            [
                'type' => 'variant',
                'id' => $variant->id,
                'quantity' => 1,
            ],
        ],
    ]);

    $response->assertOk()
        ->assertJson([
            'success' => true,
            'payment_method' => 'cash',
        ]);

    $rental = Rental::where('customer_id', $customer->id)->latest()->first();
    expect($rental)->not->toBeNull();
    expect($rental->status)->toBe('fully_paid');
    expect($rental->total_days)->toBe(1);
    expect((float) $rental->rental_amount)->toBe(50000.0);
    expect((float) $rental->deposit_amount)->toBe(100000.0);
    expect((float) $rental->grand_total)->toBe(150000.0);
    expect((float) $rental->remaining_balance)->toBe(0.0);

    // Rental item snapshot
    expect($rental->items)->toHaveCount(1);
    expect($rental->items->first()->quantity)->toBe(1);

    // Payment record approved immediately
    $payment = $rental->payments->first();
    expect($payment)->not->toBeNull();
    expect($payment->status)->toBe('approved');
    expect((float) $payment->amount)->toBe(50000.0);
});

test('admin dapat memproses checkout transaksi sewa DP 50% via qris', function () {
    actingPosAdmin();

    $customer = Customer::factory()->create();
    $category = Category::factory()->create();
    $product = Product::factory()->create(['category_id' => $category->id]);
    $variant = ProductVariant::factory()->create([
        'product_id' => $product->id,
        'stock' => 5,
        'rental_price_per_day' => 100000,
        'deposit_per_unit' => 50000,
    ]);

    $startDate = CarbonImmutable::today()->toDateString();
    $endDate = CarbonImmutable::today()->addDays(2)->toDateString();

    $response = $this->postJson(route('admin.pos.checkout'), [
        'customer_id' => $customer->id,
        'start_date' => $startDate,
        'end_date' => $endDate,
        'payment_type' => 'down_payment',
        'payment_method' => 'qris',
        'items' => [
            [
                'type' => 'variant',
                'id' => $variant->id,
                'quantity' => 2,
            ],
        ],
    ]);

    $response->assertOk()
        ->assertJson([
            'success' => true,
            'payment_method' => 'qris',
        ]);

    $rental = Rental::where('customer_id', $customer->id)->latest()->first();
    expect($rental)->not->toBeNull();
    expect($rental->status)->toBe('dp_paid');
    // 2 days * 100k * 2 qty = 400k sewa. DP 50% = 200k.
    expect((float) $rental->rental_amount)->toBe(400000.0);
    expect((float) $rental->down_payment_amount)->toBe(200000.0);
    expect((float) $rental->remaining_balance)->toBe(200000.0);

    $payment = $rental->payments->first();
    expect($payment)->not->toBeNull();
    expect($payment->status)->toBe('approved');
    expect((float) $payment->amount)->toBe(200000.0);
});

test('pos checkout gagal jika stok tidak mencukupi', function () {
    actingPosAdmin();

    $customer = Customer::factory()->create();
    $category = Category::factory()->create();
    $product = Product::factory()->create(['category_id' => $category->id]);
    $variant = ProductVariant::factory()->create([
        'product_id' => $product->id,
        'stock' => 2,
        'rental_price_per_day' => 50000,
        'deposit_per_unit' => 50000,
    ]);

    $startDate = CarbonImmutable::today()->toDateString();
    $endDate = CarbonImmutable::today()->addDays(1)->toDateString();

    $response = $this->postJson(route('admin.pos.checkout'), [
        'customer_id' => $customer->id,
        'start_date' => $startDate,
        'end_date' => $endDate,
        'payment_type' => 'full',
        'payment_method' => 'cash',
        'cash_tendered' => 500000,
        'items' => [
            [
                'type' => 'variant',
                'id' => $variant->id,
                'quantity' => 10, // Exceeds stock 2
            ],
        ],
    ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['items']);
});

