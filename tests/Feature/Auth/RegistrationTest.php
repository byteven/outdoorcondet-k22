<?php

use App\Models\Customer;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
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
    $response->assertRedirect(route('home'));
});

test('new customers are redirected away from the admin dashboard', function () {
    $this->post(route('register.store'), [
        'name' => 'Test User',
        'email' => 'test@example.com',
        'phone_number' => '+6281234567890',
        'password' => 'password',
        'password_confirmation' => 'password',
    ]);

    $this->assertAuthenticated();
    $this->get(route('admin.dashboard'))->assertRedirect(route('home'));
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

    expect($customer->phone_number)->toBe('6281234567890')
        ->and($customer->is_verified)->toBeTrue()
        ->and($customer->is_active)->toBeTrue();
});

test('new users can register with optional identity data', function () {
    Storage::fake('public');

    $response = $this->post(route('register.store'), [
        'name' => 'Udin Saputra',
        'email' => 'udin@example.com',
        'phone_number' => '081234567890',
        'password' => 'password',
        'password_confirmation' => 'password',
        'identity_number' => '3275010101900001',
        'address' => 'Jl. Condet Raya No. 22',
        'identity_card' => UploadedFile::fake()->image('ktp.jpg'),
    ]);

    $this->assertAuthenticated();
    $response->assertRedirect(route('home'));

    $customer = Customer::whereHas('user', fn ($query) => $query->where('email', 'udin@example.com'))->firstOrFail();

    expect($customer->phone_number)->toBe('6281234567890')
        ->and($customer->identity_number)->toBe('3275010101900001')
        ->and($customer->address)->toBe('Jl. Condet Raya No. 22')
        ->and($customer->identity_card_path)->not->toBeNull();

    Storage::disk('public')->assertExists($customer->identity_card_path);
});

test('registration rejects an invalid phone number', function () {
    $response = $this->post(route('register.store'), [
        'name' => 'Test User',
        'email' => 'test@example.com',
        'phone_number' => 'abc',
        'password' => 'password',
        'password_confirmation' => 'password',
    ]);

    $response->assertSessionHasErrors('phone_number');
    $this->assertGuest();
});

test('registration rejects an invalid identity card', function () {
    $response = $this->post(route('register.store'), [
        'name' => 'Test User',
        'email' => 'test@example.com',
        'phone_number' => '+6281234567890',
        'password' => 'password',
        'password_confirmation' => 'password',
        'identity_card' => UploadedFile::fake()->create('dokumen.pdf', 100),
    ]);

    $response->assertSessionHasErrors('identity_card');
    $this->assertGuest();
});
