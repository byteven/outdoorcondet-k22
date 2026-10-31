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
        'emergency_contact' => '6281234567890 (Orang Tua)',
        'address' => 'Jl. Condet Raya No. 22',
        'social_media' => 'https://instagram.com/testuser',
        'terms' => true,
    ]);

    $this->assertAuthenticated();
    $response->assertRedirect(route('home'));
});

test('new users cannot register without accepting the policy and privacy', function () {
    $response = $this->post(route('register.store'), [
        'name' => 'Test User',
        'email' => 'test@example.com',
        'phone_number' => '+6281234567890',
        'password' => 'password',
        'password_confirmation' => 'password',
    ]);

    $response->assertSessionHasErrors('terms');
    $this->assertGuest();
});

test('new customers are redirected away from the admin dashboard', function () {
    $this->post(route('register.store'), [
        'name' => 'Test User',
        'email' => 'test@example.com',
        'phone_number' => '+6281234567890',
        'password' => 'password',
        'password_confirmation' => 'password',
        'emergency_contact' => '6281234567890 (Orang Tua)',
        'address' => 'Jl. Condet Raya No. 22',
        'social_media' => 'https://instagram.com/testuser',
        'terms' => true,
    ]);

    $this->assertAuthenticated();

    $this->get(route('admin.dashboard'))->assertRedirect(route('home'));
});

test('new registration creates an active and verified customer profile', function () {
    $this->post(route('register.store'), [
        'name' => 'Udin Saputra',
        'email' => 'udin@example.com',
        'phone_number' => '081234567890',
        'password' => 'password',
        'password_confirmation' => 'password',
        'emergency_contact' => '6281234567890 (Orang Tua)',
        'address' => 'Jl. Condet Raya No. 22',
        'social_media' => 'https://instagram.com/udinsaputra',
        'terms' => true,
    ]);

    $customer = Customer::whereHas('user', fn ($query) => $query->where('email', 'udin@example.com'))->firstOrFail();

    expect($customer->phone_number)->toBe('6281234567890')
        ->and($customer->is_verified)->toBeTrue()
        ->and($customer->is_active)->toBeTrue();
});

test('new users cannot register without required supporting profile data', function (string $field, string $message) {
    $payload = [
        'name' => 'Test User',
        'email' => 'test@example.com',
        'phone_number' => '+6281234567890',
        'password' => 'password',
        'password_confirmation' => 'password',
        'emergency_contact' => '6281234567890 (Orang Tua)',
        'address' => 'Jl. Condet Raya No. 22',
        'social_media' => 'https://instagram.com/testuser',
        'terms' => true,
    ];

    unset($payload[$field]);

    $response = $this->post(route('register.store'), $payload);

    $response->assertSessionHasErrors([$field => $message]);
    $this->assertGuest();
})->with([
    'emergency contact' => ['emergency_contact', 'Kontak darurat wajib diisi.'],
    'address' => ['address', 'Alamat wajib diisi.'],
    'social media' => ['social_media', 'Sosial media wajib diisi.'],
]);

test('new users can register with supporting profile data', function () {
    $response = $this->post(route('register.store'), [
        'name' => 'Udin Saputra',
        'email' => 'udin@example.com',
        'phone_number' => '081234567890',
        'password' => 'password',
        'password_confirmation' => 'password',
        'emergency_contact' => '6281234567890 (Orang Tua)',
        'address' => 'Jl. Condet Raya No. 22',
        'social_media' => 'https://instagram.com/udinsaputra',
        'terms' => true,
    ]);

    $this->assertAuthenticated();
    $response->assertRedirect(route('home'));

    $customer = Customer::whereHas('user', fn ($query) => $query->where('email', 'udin@example.com'))->firstOrFail();

    expect($customer->phone_number)->toBe('6281234567890')
        ->and($customer->emergency_contact)->toBe('6281234567890 (Orang Tua)')
        ->and($customer->address)->toBe('Jl. Condet Raya No. 22')
        ->and($customer->social_media)->toBe('https://instagram.com/udinsaputra');
});

test('registration rejects an invalid phone number', function () {
    $response = $this->post(route('register.store'), [
        'name' => 'Test User',
        'email' => 'test@example.com',
        'phone_number' => 'abc',
        'password' => 'password',
        'password_confirmation' => 'password',
        'terms' => true,
    ]);

    $response->assertSessionHasErrors('phone_number');
    $this->assertGuest();
});
