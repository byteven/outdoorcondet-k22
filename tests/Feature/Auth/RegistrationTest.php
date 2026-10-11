<?php

use App\Models\Customer;
use Laravel\Fortify\Features;

beforeEach(function () {
    $this->skipUnlessFortifyHas(Features::registration());
});

test('registration screen can be rendered', function () {
    $response = $this->get(route('register'));

    $response->assertOk();
});

test('new users can register', function () {
    $response = $this->post(route('register.store'), [
        'name' => 'Test User',
        'email' => 'test@example.com',
        'phone_number' => '+6281234567890',
        'password' => 'password',
        'password_confirmation' => 'password',
    ]);

    $this->assertAuthenticated();
    $response->assertRedirect(route('admin.dashboard', absolute: false));
});

test('registration creates a verified customer profile', function () {
    $this->post(route('register.store'), [
        'name' => 'Udin Saputra',
        'email' => 'udin@example.com',
        'phone_number' => '+6281234567890',
        'password' => 'password',
        'password_confirmation' => 'password',
    ]);

    $customer = Customer::whereHas('user', fn ($query) => $query->where('email', 'udin@example.com'))->firstOrFail();

    expect($customer->phone_number)->toBe('+6281234567890')
        ->and($customer->is_verified)->toBeTrue()
        ->and($customer->is_active)->toBeTrue();
});
