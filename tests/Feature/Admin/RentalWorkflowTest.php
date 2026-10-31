<?php

use App\Models\Customer;
use App\Models\Rental;
use App\Models\User;
use App\UserRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia;

uses(RefreshDatabase::class);

function actingAsAdmin(): User
{
    $admin = User::factory()->create(['role' => UserRole::Admin]);
    test()->actingAs($admin);

    return $admin;
}

function rentalWithProof(string $paymentType = 'full', array $attributes = []): Rental
{
    $customer = Customer::factory()->create();

    $rental = Rental::factory()->create(array_merge([
        'customer_id' => $customer->id,
        'payment_type' => $paymentType,
        'status' => 'waiting_confirmation',
        'late_fee_per_day' => 50000,
    ], $attributes));

    $rental->payments()->create([
        'amount' => 100000,
        'proof_path' => 'rental-payments/proof.jpg',
        'status' => 'waiting',
    ]);

    return $rental;
}

test('admin dapat mengonfirmasi pembayaran lunas', function () {
    actingAsAdmin();
    $rental = rentalWithProof('full');

    $this->post(route('admin.rentals.confirm-payment', ['rental' => $rental->rental_code]))
        ->assertRedirect();

    $rental->refresh();

    expect($rental->status)->toBe('fully_paid')
        ->and($rental->payments->first()->status)->toBe('approved')
        ->and($rental->payments->first()->reviewed_at)->not()->toBeNull();
});

test('admin dapat mengonfirmasi pembayaran DP', function () {
    actingAsAdmin();
    $rental = rentalWithProof('down_payment');

    $this->post(route('admin.rentals.confirm-payment', ['rental' => $rental->rental_code]))
        ->assertRedirect();

    expect($rental->fresh()->status)->toBe('dp_paid');
});

test('customer tidak dapat mengonfirmasi pembayaran rental', function () {
    $user = User::factory()->create(['role' => UserRole::Customer]);
    Customer::factory()->create(['user_id' => $user->id]);
    $this->actingAs($user);

    $rental = rentalWithProof();

    // Penolakan otorisasi sengaja diarahkan balik (bukan 403) agar
    // path admin tidak terungkap ke customer.
    $this->post(route('admin.rentals.confirm-payment', ['rental' => $rental->rental_code]))
        ->assertRedirect();

    expect($rental->fresh()->status)->toBe('waiting_confirmation');
});

test('konfirmasi pembayaran ditolak jika bukti belum diunggah', function () {
    actingAsAdmin();

    $rental = Rental::factory()->create([
        'customer_id' => Customer::factory()->create()->id,
        'status' => 'waiting_confirmation',
    ]);

    $this->post(route('admin.rentals.confirm-payment', ['rental' => $rental->rental_code]))
        ->assertSessionHasErrors(['rental']);

    expect($rental->fresh()->status)->toBe('waiting_confirmation');
});

test('admin mencatat pengembalian tepat waktu tanpa denda', function () {
    actingAsAdmin();

    $endDate = today();
    $rental = rentalWithProof('full', ['status' => 'fully_paid', 'end_date' => $endDate]);

    $this->post(route('admin.rentals.confirm-return', ['rental' => $rental->rental_code]))
        ->assertRedirect();

    $rental->refresh();

    expect($rental->status)->toBe('returned')
        ->and($rental->returned_at)->not()->toBeNull()
        ->and($rental->return_confirmed_by)->toBe('admin')
        ->and($rental->late_days)->toBe(0)
        ->and((float) $rental->late_fee_amount)->toBe(0.0)
        // Stok ready jam 00:00 dua hari setelah tanggal kembali (buffer 1 hari).
        ->and($rental->stock_release_at->format('Y-m-d H:i'))->toBe(today()->addDays(2)->format('Y-m-d').' 00:00');
});

test('admin mencatat pengembalian terlambat beserta denda', function () {
    actingAsAdmin();

    $endDate = today()->subDays(3);
    $rental = rentalWithProof('full', ['status' => 'fully_paid', 'end_date' => $endDate]);

    $this->post(route('admin.rentals.confirm-return', ['rental' => $rental->rental_code]))
        ->assertRedirect();

    $rental->refresh();

    expect($rental->late_days)->toBe(3)
        ->and((float) $rental->late_fee_amount)->toBe(150000.0);
});

test('konfirmasi pengembalian ditolak untuk rental yang belum dibayar', function () {
    actingAsAdmin();

    $rental = rentalWithProof('full', ['status' => 'waiting_confirmation']);

    $this->post(route('admin.rentals.confirm-return', ['rental' => $rental->rental_code]))
        ->assertSessionHasErrors(['rental']);

    expect($rental->fresh()->status)->toBe('waiting_confirmation');
});

test('admin dapat menolak bukti pembayaran beserta alasannya', function () {
    actingAsAdmin();
    $rental = rentalWithProof('full');

    $this->post(route('admin.rentals.reject-payment', ['rental' => $rental->rental_code]), [
        'reason' => 'Bukti tidak sesuai nominal.',
    ])->assertRedirect();

    $rental->refresh();

    expect($rental->status)->toBe('cancelled')
        ->and($rental->cancel_reason)->toBe('Bukti tidak sesuai nominal.')
        ->and($rental->payments->first()->status)->toBe('rejected')
        ->and($rental->payments->first()->reviewed_at)->not()->toBeNull();
});

test('penolakan bukti pembayaran wajib menyertakan alasan', function () {
    actingAsAdmin();
    $rental = rentalWithProof('full');

    $this->post(route('admin.rentals.reject-payment', ['rental' => $rental->rental_code]), [
        'reason' => '',
    ])->assertSessionHasErrors(['reason']);

    expect($rental->fresh()->status)->toBe('waiting_confirmation')
        ->and($rental->payments->first()->status)->toBe('waiting');
});

test('penolakan ditolak untuk rental yang tidak menunggu konfirmasi', function () {
    actingAsAdmin();

    $rental = Rental::factory()->create([
        'customer_id' => Customer::factory()->create()->id,
        'status' => 'pending_payment',
    ]);

    $this->post(route('admin.rentals.reject-payment', ['rental' => $rental->rental_code]), [
        'reason' => 'Sembarang alasan.',
    ])->assertSessionHasErrors(['rental']);

    expect($rental->fresh()->status)->toBe('pending_payment');
});

test('admin dapat melihat daftar rental', function () {
    actingAsAdmin();
    rentalWithProof();

    $this->get(route('admin.rentals.index'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('rentals/index')
            ->has('rentals.data')
            ->has('summary')
            ->has('filters'));
});

test('admin dapat melihat detail rental', function () {
    actingAsAdmin();
    $rental = rentalWithProof();

    $this->get(route('admin.rentals.show', ['rental' => $rental->rental_code]))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('rentals/show')
            ->has('rental')
            ->where('rental.rental_code', $rental->rental_code));
});

test('admin dapat membatalkan rental secara manual', function () {
    actingAsAdmin();
    $rental = rentalWithProof();

    $this->post(route('admin.rentals.cancel', ['rental' => $rental->rental_code]), [
        'reason' => 'Dibatalkan atas permintaan customer.',
    ])->assertRedirect();

    expect($rental->fresh()->status)->toBe('cancelled')
        ->and($rental->fresh()->cancel_reason)->toBe('Dibatalkan atas permintaan customer.');
});

test('pembatalan manual gagal jika rental sudah returned', function () {
    actingAsAdmin();
    $rental = rentalWithProof('full', ['status' => 'returned']);

    $this->post(route('admin.rentals.cancel', ['rental' => $rental->rental_code]), [
        'reason' => 'Coba batalkan',
    ])->assertSessionHasErrors(['rental']);

    expect($rental->fresh()->status)->toBe('returned');
});

test('admin dapat melihat bukti pembayaran privat', function () {
    actingAsAdmin();
    Storage::fake('local');
    Storage::disk('local')->put('rental-payments/test-proof.jpg', 'dummy-image-content');

    $rental = rentalWithProof();
    $rental->payments()->update(['proof_path' => 'rental-payments/test-proof.jpg']);

    $this->get(route('admin.rentals.payment-proof', ['rental' => $rental->rental_code]))
        ->assertOk();
});

