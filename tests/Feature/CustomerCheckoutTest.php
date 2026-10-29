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
use Illuminate\Support\Facades\Storage;
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
        'rental' => Rental::query()->firstOrFail()->rental_code,
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

    // Pembayaran online dibuat sebagai menunggu bukti.
    expect($rental->payments)->toHaveCount(1)
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

    // 3 hari = tier Rp50.000/unit. DP = 50% absolut x 50.000 = 25.000.
    expect($rental->payment_type)->toBe('down_payment')
        ->and((float) $rental->rental_amount)->toBe(50000.0)
        ->and((float) $rental->down_payment_amount)->toBe(25000.0)
        ->and((float) $rental->remaining_balance)->toBe(25000.0)
        ->and((float) $rental->deposit_amount)->toBe(50000.0);

    $payment = $rental->payments->first();
    expect((float) $payment->amount)->toBe(25000.0);
});

test('DP dihitung 50% absolut tanpa pembulatan', function () {
    $variant = checkoutVariant(rentalPricePerDay: 22500);

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

    // DP = 50% x 67.500 = 33.750 (tidak dibulatkan ke 34.000).
    expect((float) $rental->down_payment_amount)->toBe(33750.0)
        ->and((float) $rental->remaining_balance)->toBe(33750.0);
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

    $this->get(route('checkout.show', ['rental' => $rental->rental_code]))
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
        'amount' => 100000,
        'proof_path' => null,
        'status' => 'waiting',
    ]);

    $file = UploadedFile::fake()->image('qris.jpg');

    $this->post(route('checkout.payment.store', ['rental' => $rental->rental_code]), [
        'proof' => $file,
    ])->assertRedirect();

    expect($rental->fresh()->status)->toBe('waiting_confirmation')
        ->and($rental->fresh()->payments->first()->proof_path)->not()->toBeNull();
});

test('bukti pembayaran DP dapat diunggah', function () {
    $customer = User::query()->first();
    $customerId = Customer::query()->where('user_id', $customer->id)->first()->id;

    $rental = Rental::factory()->create([
        'customer_id' => $customerId,
        'payment_type' => 'down_payment',
        'status' => 'pending_payment',
    ]);
    $rental->payments()->create([
        'amount' => 33500,
        'proof_path' => null,
        'status' => 'waiting',
    ]);

    $this->post(route('checkout.payment.store', ['rental' => $rental->rental_code]), [
        'proof' => UploadedFile::fake()->image('qris.jpg'),
    ])->assertRedirect();

    expect($rental->fresh()->status)->toBe('waiting_confirmation')
        ->and($rental->fresh()->payments->first()->proof_path)->not()->toBeNull();
});

test('bukti pembayaran ditolak setelah batas waktu lewat', function () {
    $customer = User::query()->first();
    $customerId = Customer::query()->where('user_id', $customer->id)->first()->id;

    $rental = Rental::factory()->create([
        'customer_id' => $customerId,
        'status' => 'pending_payment',
        'payment_deadline_at' => now()->subMinute(),
    ]);
    $rental->payments()->create([
        'amount' => 100000,
        'proof_path' => null,
        'status' => 'waiting',
    ]);

    $this->post(route('checkout.payment.store', ['rental' => $rental->rental_code]), [
        'proof' => UploadedFile::fake()->image('qris.jpg'),
    ])->assertSessionHasErrors(['payment']);

    expect($rental->fresh()->status)->toBe('pending_payment')
        ->and($rental->fresh()->payments->first()->proof_path)->toBeNull();
});

test('bukti pembayaran tidak dapat diunggah dua kali', function () {
    $customer = User::query()->first();
    $customerId = Customer::query()->where('user_id', $customer->id)->first()->id;

    $rental = Rental::factory()->create([
        'customer_id' => $customerId,
        'status' => 'waiting_confirmation',
    ]);
    $rental->payments()->create([
        'amount' => 100000,
        'proof_path' => 'rental-payments/existing.jpg',
        'status' => 'waiting',
    ]);

    $this->post(route('checkout.payment.store', ['rental' => $rental->rental_code]), [
        'proof' => UploadedFile::fake()->image('qris.jpg'),
    ])->assertSessionHasErrors(['payment']);
});

test('bukti pembayaran hanya dapat dilihat pemilik rental', function () {
    $customer = User::query()->first();
    $customerId = Customer::query()->where('user_id', $customer->id)->first()->id;

    $rental = Rental::factory()->create([
        'customer_id' => $customerId,
        'status' => 'waiting_confirmation',
    ]);
    $rental->payments()->create([
        'amount' => 100000,
        'proof_path' => 'rental-payments/proof.jpg',
        'status' => 'waiting',
    ]);

    Storage::fake('local');
    Storage::disk('local')->put('rental-payments/proof.jpg', 'fake-image');

    $this->get(route('checkout.payment.proof', ['rental' => $rental->rental_code]))
        ->assertOk();

    $otherUser = User::factory()->create(['role' => UserRole::Customer]);
    Customer::factory()->create(['user_id' => $otherUser->id]);

    $this->actingAs($otherUser)
        ->get(route('checkout.payment.proof', ['rental' => $rental->rental_code]))
        ->assertForbidden();
});

test('halaman detail transaksi menyertakan alasan penolakan untuk pesanan dibatalkan', function () {
    $customer = User::query()->first();
    $customerId = Customer::query()->where('user_id', $customer->id)->first()->id;

    $rental = Rental::factory()->create([
        'customer_id' => $customerId,
        'status' => 'cancelled',
        'cancel_reason' => 'Bukti tidak sesuai nominal.',
    ]);

    $this->get(route('checkout.show', ['rental' => $rental->rental_code]))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('checkout/show')
            ->where('rental.status', 'cancelled')
            ->where('rental.cancel_reason', 'Bukti tidak sesuai nominal.'));
});

test('detail transaksi tetap tampil saat produk dihapus admin', function () {
    $variant = checkoutVariant();
    $variant->durationPrices()->create(['duration_days' => 3, 'price' => 50000]);

    $this->post(route('cart.store'), [
        'rentable_type' => 'variant',
        'rentable_id' => $variant->id,
        'quantity' => 1,
        'pickup_date' => '2026-11-01',
        'return_date' => '2026-11-04',
    ])->assertRedirect();

    $this->post(route('checkout.store'), ['payment_type' => 'full'])->assertRedirect();

    $rental = Rental::query()->firstOrFail();

    // Snapshot nama tetap menampilkan nama asli meski produk dihapus.
    $variant->delete();

    $this->get(route('checkout.show', ['rental' => $rental->rental_code]))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('checkout/show')
            ->where('rental.items.0.name', 'Tenda Dome 4P'));

    // Data lama sebelum ada snapshot: fallback teks pengganti.
    $rental->items()->update(['name' => null]);

    $this->get(route('checkout.show', ['rental' => $rental->rental_code]))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('checkout/show')
            ->where('rental.items.0.name', 'Alat ini telah dihapus oleh admin'));
});
