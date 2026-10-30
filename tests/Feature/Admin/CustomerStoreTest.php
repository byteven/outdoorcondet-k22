<?php

use App\Models\Customer;
use App\Models\User;
use App\UserRole;

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
        'emergency_contact' => '6281234567890 (Orang Tua)',
        'social_media' => 'https://instagram.com/udinsaputra',
        'address' => 'Jl. Condet Raya No. 1',
    ];
}

test('guests cannot store customers', function () {
    $this->post(route('admin.customers.store'), validPayload())->assertRedirect(route('login'));
});

test('customers cannot store new customers', function () {
    $user = User::factory()->create(['role' => UserRole::Customer]);

    $this->actingAs($user)->post(route('admin.customers.store'), validPayload())->assertRedirect(route('home'));
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
        ->and($customer->emergency_contact)->toBe('6281234567890 (Orang Tua)')
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
        ->assertSessionHasErrors([
            'name',
            'email',
            'password',
            'phone_number',
            'emergency_contact',
            'social_media',
            'address',
        ]);

    expect(Customer::count())->toBe(0);
});

test('admins can attach social media to customer', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.customers.store'), [
            ...validPayload(),
            'email' => 'social@example.com',
            'social_media' => 'https://instagram.com/udinsaputra',
        ])
        ->assertRedirect();

    $customer = Customer::whereHas('user', fn ($query) => $query->where('email', 'social@example.com'))
        ->firstOrFail();

    expect($customer->social_media)->toBe('https://instagram.com/udinsaputra');
});
