<?php

use App\Models\Customer;
use App\Models\Rental;
use App\Models\User;
use App\UserRole;

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

    $this->actingAs($admin)->get(route('profile.edit'))->assertRedirect(route('home'));
    $this->actingAs($admin)->from(route('home'))->patch(route('profile.update'), [
        'name' => 'Admin',
        'email' => 'admin@example.com',
        'phone_number' => '6281234567890',
    ])->assertRedirect(route('home'));
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
            'emergency_contact' => '6281234567890 (Orang Tua)',
            'social_media' => 'https://instagram.com/testuser',
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
    expect($user->customer->emergency_contact)->toBe('6281234567890 (Orang Tua)');
    expect($user->customer->social_media)->toBe('https://instagram.com/testuser');
    expect($user->customer->address)->toBe('Jl. Condet Raya No. 22');
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
            'emergency_contact' => '6281234567890 (Orang Tua)',
            'social_media' => 'https://instagram.com/testuser',
            'address' => 'Jl. Condet Raya No. 22',
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('profile.edit'));

    expect($user->refresh()->email_verified_at)->not->toBeNull();
});

test('emergency contact, social media and address are required', function (string $field) {
    $user = User::factory()->create(['role' => UserRole::Customer]);
    $customer = Customer::factory()->create(['user_id' => $user->id]);
    $originalValue = $customer->{$field};

    $payload = [
        'name' => 'Test User',
        'email' => $user->email,
        'phone_number' => '6281234567890',
        'emergency_contact' => '6281234567890 (Orang Tua)',
        'social_media' => 'https://instagram.com/testuser',
        'address' => 'Jl. Condet Raya No. 22',
        $field => '',
    ];

    $this->actingAs($user)
        ->from(route('profile.edit'))
        ->patch(route('profile.update'), $payload)
        ->assertSessionHasErrors($field)
        ->assertRedirect(route('profile.edit'));

    expect($customer->fresh()->{$field})->toBe($originalValue);
})->with(['emergency_contact', 'social_media', 'address']);

test('user without order history is fully deleted with their account', function () {
    $user = User::factory()->create(['role' => UserRole::Customer, 'password' => 'password']);
    $customer = Customer::factory()->create(['user_id' => $user->id]);

    $response = $this
        ->actingAs($user)
        ->delete(route('profile.destroy'), [
            'password' => 'password',
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('home'));

    $this->assertGuest();
    expect($user->fresh())->toBeNull()
        ->and(Customer::withTrashed()->find($customer->id))->toBeNull();
});

test('deleting an account keeps the order history', function () {
    $user = User::factory()->create(['role' => UserRole::Customer, 'password' => 'password']);
    $customer = Customer::factory()->create(['user_id' => $user->id]);
    $rental = Rental::factory()->create(['customer_id' => $customer->id, 'status' => 'returned']);

    $this->actingAs($user)
        ->delete(route('profile.destroy'), ['password' => 'password'])
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('home'));

    $this->assertGuest();
    expect($rental->fresh())->not->toBeNull()
        ->and($user->fresh())->not->toBeNull()
        ->and(Customer::withTrashed()->find($customer->id))
        ->is_active->toBeFalse()
        ->trashed()->toBeTrue();
});

test('account cannot be deleted while an order is still active', function (string $status) {
    $user = User::factory()->create(['role' => UserRole::Customer, 'password' => 'password']);
    $customer = Customer::factory()->create(['user_id' => $user->id]);
    Rental::factory()->create(['customer_id' => $customer->id, 'status' => $status]);

    $this->actingAs($user)
        ->from(route('profile.edit'))
        ->delete(route('profile.destroy'), ['password' => 'password'])
        ->assertSessionHasErrors('password')
        ->assertRedirect(route('profile.edit'));

    $this->assertAuthenticatedAs($user);
    expect($customer->fresh())->not->toBeNull()
        ->is_active->toBeTrue();
})->with(['pending_payment', 'waiting_confirmation', 'dp_paid', 'fully_paid']);

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
