<?php

use App\Models\Customer;
use App\Models\User;
use App\UserRole;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    $this->admin = User::factory()->create(['role' => UserRole::Admin]);
});

function validPayload(): array
{
    return [
        'name' => 'Udin Saputra',
        'email' => 'udin@example.com',
        'password' => 'Rahasia123',
        'phone_number' => '+6281234567890',
        'identity_number' => '3201010101010001',
        'address' => 'Jl. Condet Raya No. 1',
    ];
}

test('guests cannot store customers', function () {
    $this->post(route('admin.customers.store'), validPayload())->assertRedirect(route('login'));
});

test('customers cannot store new customers', function () {
    $user = User::factory()->create(['role' => UserRole::Customer]);

    $this->actingAs($user)->post(route('admin.customers.store'), validPayload())->assertForbidden();
});

test('admins can store a customer with its user account', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.customers.store'), validPayload())
        ->assertRedirect();

    $user = User::where('email', 'udin@example.com')->first();

    expect($user)->not->toBeNull()
        ->and($user->role)->toBe(UserRole::Customer);

    $customer = $user->customer;

    expect($customer)->not->toBeNull()
        ->and($customer->phone_number)->toBe('6281234567890')
        ->and($customer->identity_number)->toBe('3201010101010001')
        ->and($customer->is_verified)->toBeTrue()
        ->and($customer->is_active)->toBeTrue();
});

test('phone numbers are normalized to digits with a 62 prefix', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.customers.store'), [
            ...validPayload(),
            'email' => 'normal@example.com',
            'phone_number' => '0812-3456-789',
        ])
        ->assertRedirect();

    expect(Customer::whereHas('user', fn ($query) => $query->where('email', 'normal@example.com'))->firstOrFail()->phone_number)
        ->toBe('628123456789');
});

test('storing a customer flashes a success toast', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.customers.store'), validPayload())
        ->assertSessionHas('inertia.flash_data.toast.type', 'success');
});

test('storing a customer validates the input', function () {
    $existing = User::factory()->create();

    $this->actingAs($this->admin)
        ->post(route('admin.customers.store'), [
            'name' => '',
            'email' => $existing->email,
            'password' => 'pendek',
            'phone_number' => '',
        ])
        ->assertSessionHasErrors(['name', 'email', 'password', 'phone_number']);

    expect(Customer::count())->toBe(0);
});

test('admins can attach an identity card photo', function () {
    Storage::fake('public');

    $this->actingAs($this->admin)
        ->post(route('admin.customers.store'), [
            ...validPayload(),
            'email' => 'ktp@example.com',
            'identity_card' => UploadedFile::fake()->image('ktp.jpg'),
        ])
        ->assertRedirect();

    $path = Customer::whereHas('user', fn ($query) => $query->where('email', 'ktp@example.com'))
        ->firstOrFail()
        ->identity_card_path;

    expect($path)->not->toBeNull();
    Storage::disk('public')->assertExists($path);
});

test('identity card must be a small image', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.customers.store'), [
            ...validPayload(),
            'email' => 'dokumen@example.com',
            'identity_card' => UploadedFile::fake()->create('dokumen.pdf', 100),
        ])
        ->assertSessionHasErrors('identity_card');

    expect(User::where('email', 'dokumen@example.com')->exists())->toBeFalse();
});
