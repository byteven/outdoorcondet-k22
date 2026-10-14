<?php

use App\Models\Customer;
use App\Models\User;
use App\UserRole;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

test('profile page is displayed', function () {
    $user = User::factory()->create(['role' => UserRole::Customer]);
    Customer::factory()->create(['user_id' => $user->id]);

    $response = $this
        ->actingAs($user)
        ->get(route('profile.edit'));

    $response->assertOk();
});

test('profile page is forbidden for admins', function () {
    $admin = User::factory()->create(['role' => UserRole::Admin]);

    $this->actingAs($admin)->get(route('profile.edit'))->assertForbidden();
    $this->actingAs($admin)->patch(route('profile.update'), [
        'name' => 'Admin',
        'email' => 'admin@example.com',
        'phone_number' => '6281234567890',
    ])->assertForbidden();
});

test('profile information can be updated', function () {
    $user = User::factory()->create(['role' => UserRole::Customer]);
    Customer::factory()->create(['user_id' => $user->id]);

    $response = $this
        ->actingAs($user)
        ->patch(route('profile.update'), [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'phone_number' => '6281234567890',
            'identity_number' => '3275010101900001',
            'address' => 'Jl. Condet Raya No. 22',
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('profile.edit'));

    $user->refresh();

    expect($user->name)->toBe('Test User');
    expect($user->email)->toBe('test@example.com');
    expect($user->email_verified_at)->toBeNull();
    expect($user->customer->phone_number)->toBe('6281234567890');
    expect($user->customer->identity_number)->toBe('3275010101900001');
    expect($user->customer->address)->toBe('Jl. Condet Raya No. 22');
});

test('profile identity card can be uploaded', function () {
    Storage::fake('public');

    $user = User::factory()->create(['role' => UserRole::Customer]);
    Customer::factory()->create(['user_id' => $user->id]);

    $response = $this
        ->actingAs($user)
        ->patch(route('profile.update'), [
            'name' => $user->name,
            'email' => $user->email,
            'phone_number' => '6281234567890',
            'identity_card' => UploadedFile::fake()->image('ktp.jpg'),
        ]);

    $response->assertSessionHasNoErrors()->assertRedirect(route('profile.edit'));

    $path = $user->refresh()->customer->identity_card_path;

    expect($path)->not->toBeNull();
    Storage::disk('public')->assertExists($path);
});

test('profile identity card can be removed', function () {
    Storage::fake('public');

    $user = User::factory()->create(['role' => UserRole::Customer]);
    $path = UploadedFile::fake()->image('ktp.jpg')->store('identity-cards', 'public');
    Customer::factory()->create([
        'user_id' => $user->id,
        'identity_card_path' => $path,
        'is_verified' => true,
    ]);

    $response = $this
        ->actingAs($user)
        ->patch(route('profile.update'), [
            'name' => $user->name,
            'email' => $user->email,
            'phone_number' => '6281234567890',
            'remove_identity_card' => true,
        ]);

    $response->assertSessionHasNoErrors()->assertRedirect(route('profile.edit'));

    $customer = $user->refresh()->customer;

    expect($customer->identity_card_path)->toBeNull();
    expect($customer->is_verified)->toBeFalse();
    Storage::disk('public')->assertMissing($path);
});

test('email verification status is unchanged when the email address is unchanged', function () {
    $user = User::factory()->create(['role' => UserRole::Customer]);
    Customer::factory()->create(['user_id' => $user->id]);

    $response = $this
        ->actingAs($user)
        ->patch(route('profile.update'), [
            'name' => 'Test User',
            'email' => $user->email,
            'phone_number' => '6281234567890',
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('profile.edit'));

    expect($user->refresh()->email_verified_at)->not->toBeNull();
});

test('user can delete their account', function () {
    $user = User::factory()->create(['role' => UserRole::Customer]);
    Customer::factory()->create(['user_id' => $user->id]);

    $response = $this
        ->actingAs($user)
        ->delete(route('profile.destroy'), [
            'password' => 'password',
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('home'));

    $this->assertGuest();
    expect($user->fresh())->toBeNull();
});

test('correct password must be provided to delete account', function () {
    $user = User::factory()->create(['role' => UserRole::Customer]);
    Customer::factory()->create(['user_id' => $user->id]);

    $response = $this
        ->actingAs($user)
        ->from(route('profile.edit'))
        ->delete(route('profile.destroy'), [
            'password' => 'wrong-password',
        ]);

    $response
        ->assertSessionHasErrors('password')
        ->assertRedirect(route('profile.edit'));

    expect($user->fresh())->not->toBeNull();
});
