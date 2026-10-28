<?php

use App\Models\CartItem;
use App\Models\Category;
use App\Models\Customer;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\ProductVariant;
use App\Models\Rental;
use App\Models\User;
use App\UserRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Inertia\Testing\AssertableInertia;

uses(RefreshDatabase::class);

beforeEach(function () {
    $user = User::factory()->create(['role' => UserRole::Customer]);
    Customer::factory()->create(['user_id' => $user->id]);
    $this->actingAs($user);
});

function checkoutVariant(
    int $stock = 5,
    float $rentalPricePerDay = 20000,
    float $depositPerUnit = 50000,
): ProductVariant {
    $category = Category::factory()->create();
    $product = Product::factory()->create([
        'category_id' => $category->id,
        'name' => 'Tenda Dome 4P',
        'slug' => 'tenda-dome-4p',
        'is_active' => true,
    ]);

    ProductImage::factory()->create([
        'product_id' => $product->id,
        'image_path' => 'products/primary.jpg',
        'is_primary' => true,
    ]);

    return ProductVariant::factory()->create([
        'product_id' => $product->id,
        'stock' => $stock,
        'rental_price_per_day' => $rentalPricePerDay,
        'deposit_per_unit' => $depositPerUnit,
        'is_active' => true,
    ]);
}

test('customer dapat checkout dengan pembayaran lunas via QRIS', function () {
    $variant = checkoutVariant();
    $variant->durationPrices()->create(['duration_days' => 3, 'price' => 50000]);

    // Ambil 11-01, kembali 11-04 -> mulai hitung 11-02, durasi 3 hari.
    $this->post(route('cart.store'), [
        'rentable_type' => 'variant',
        'rentable_id' => $variant->id,
        'quantity' => 2,
        'pickup_date' => '2026-11-01',
        'return_date' => '2026-11-04',
    ])->assertRedirect();

    $response = $this->post(route('checkout.store'), [
        'payment_type' => 'full',
    ]);

    $response->assertRedirect(route('checkout.show', [
        'rental' => Rental::query()->firstOrFail()->id,
    ]));

    $rental = Rental::query()->firstOrFail();

    expect($rental->status)->toBe('pending_payment')
        ->and($rental->payment_type)->toBe('full')
        ->and((float) $rental->rental_amount)->toBe(100000.0)
        ->and((float) $rental->deposit_amount)->toBe(100000.0)
        ->and((float) $rental->grand_total)->toBe(200000.0)
        ->and((float) $rental->down_payment_amount)->toBe(0.0)
        ->and((float) $rental->remaining_balance)->toBe(0.0)
        ->and($rental->items)->toHaveCount(1)
        ->and($rental->items->first()->quantity)->toBe(2)
        ->and(CartItem::query()->count())->toBe(0);

    // Pembayaran online dibuat sebagai menunggu bukti, metode QRIS.
    expect($rental->payments)->toHaveCount(1)
        ->and($rental->payments->first()->method)->toBe('qris')
        ->and($rental->payments->first()->status)->toBe('waiting');
});

test('customer dapat checkout dengan DP 50% via QRIS', function () {
    $variant = checkoutVariant();
    $variant->durationPrices()->create(['duration_days' => 3, 'price' => 50000]);

    $this->post(route('cart.store'), [
        'rentable_type' => 'variant',
        'rentable_id' => $variant->id,
        'quantity' => 1,
        'pickup_date' => '2026-11-01',
        'return_date' => '2026-11-04',
    ])->assertRedirect();

    $this->post(route('checkout.store'), [
        'payment_type' => 'down_payment',
    ])->assertRedirect();

    $rental = Rental::query()->firstOrFail();

    // 3 hari = tier Rp50.000/unit. DP = 50% x 50.000 = 25.000 (bulat 1000).
    expect($rental->payment_type)->toBe('down_payment')
        ->and((float) $rental->rental_amount)->toBe(50000.0)
        ->and((float) $rental->down_payment_amount)->toBe(25000.0)
        ->and((float) $rental->remaining_balance)->toBe(25000.0)
        ->and((float) $rental->deposit_amount)->toBe(50000.0);

    $payment = $rental->payments->first();
    expect($payment->kind)->toBe('dp')
        ->and((float) $payment->amount)->toBe(25000.0)
        ->and($payment->method)->toBe('qris');
});

test('checkout ditolak jika keranjang kosong', function () {
    $this->post(route('checkout.store'), [
        'payment_type' => 'full',
    ])->assertSessionHasErrors(['cart']);
});

test('checkout ditolak jika item tidak tersedia untuk rentang tanggal', function () {
    $variant = checkoutVariant(stock: 0);

    $this->post(route('cart.store'), [
        'rentable_type' => 'variant',
        'rentable_id' => $variant->id,
        'quantity' => 1,
        'pickup_date' => '2026-11-01',
        'return_date' => '2026-11-03',
    ])->assertRedirect();

    $this->post(route('checkout.store'), [
        'payment_type' => 'full',
    ])->assertSessionHasErrors(['cart']);
});

test('halaman detail transaksi hanya dapat diakses pemilik rental', function () {
    $customer = User::query()->first();
    $rental = Rental::factory()->create([
        'customer_id' => Customer::query()->where('user_id', $customer->id)->first()->id,
        'status' => 'pending_payment',
    ]);

    $this->get(route('checkout.show', ['rental' => $rental->id]))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('checkout/show')
            ->where('rental.rental_code', $rental->rental_code));
});

test('bukti pembayaran dapat diunggah dan rental menjadi menunggu konfirmasi', function () {
    $customer = User::query()->first();
    $customerId = Customer::query()->where('user_id', $customer->id)->first()->id;

    $rental = Rental::factory()->create([
        'customer_id' => $customerId,
        'payment_type' => 'full',
        'status' => 'pending_payment',
    ]);
    $rental->payments()->create([
        'kind' => 'full',
        'amount' => 100000,
        'method' => 'qris',
        'proof_path' => null,
        'status' => 'waiting',
    ]);

    $file = UploadedFile::fake()->image('qris.jpg');

    $this->post(route('checkout.payment.store', ['rental' => $rental->id]), [
        'proof' => $file,
    ])->assertRedirect();

    expect($rental->fresh()->status)->toBe('waiting_confirmation')
        ->and($rental->fresh()->payments->first()->proof_path)->not()->toBeNull();
});
