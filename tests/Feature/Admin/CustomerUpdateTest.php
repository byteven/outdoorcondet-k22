<?php

use App\Models\Customer;
use App\Models\User;
use App\UserRole;

beforeEach(function () {
    $this->admin = User::factory()->create(['role' => UserRole::Admin]);
});

function updatePayload(array $overrides = []): array
{
    return [
        'name' => 'Udin Baru',
        'email' => 'udin.baru@example.com',
        'phone_number' => '+6289876543210',
        'identity_number' => '3201010101010002',
        'address' => 'Jl. Baru No. 2',
        'is_active' => true,
        ...$overrides,
    ];
}

test('guests cannot update customers', function () {
    $customer = Customer::factory()->create();

    $this->put(route('admin.customers.update', $customer), updatePayload())
        ->assertRedirect(route('login'));
});

test('customers cannot update other customers', function () {
    $user = User::factory()->create(['role' => UserRole::Customer]);
    $customer = Customer::factory()->create();

    $this->actingAs($user)->put(route('admin.customers.update', $customer), updatePayload())
        ->assertRedirect(route('home'));
});

test('admins can update a customer and its user account', function () {
    $customer = Customer::factory()->create();

    $this->actingAs($this->admin)
        ->put(route('admin.customers.update', $customer), updatePayload())
        ->assertRedirect();

    $customer->refresh();
    $customer->user->refresh();

    expect($customer->user->name)->toBe('Udin Baru')
        ->and($customer->user->email)->toBe('udin.baru@example.com')
        ->and($customer->phone_number)->toBe('6289876543210')
        ->and($customer->identity_number)->toBe('3201010101010002')
        ->and($customer->address)->toBe('Jl. Baru No. 2');
});

test('updating a customer flashes a success toast', function () {
    $customer = Customer::factory()->create();

    $this->actingAs($this->admin)
        ->put(route('admin.customers.update', $customer), updatePayload())
        ->assertSessionHas('inertia.flash_data.toast.type', 'success');
});

test('admins can deactivate a customer who then cannot login', function () {
    $customer = Customer::factory()->create();

    $this->actingAs($this->admin)
        ->put(route('admin.customers.update', $customer), updatePayload(['is_active' => false]))
        ->assertRedirect();

    expect($customer->fresh()->is_active)->toBeFalse();

    $this->post(route('logout'));

    $response = $this->post(route('login.store'), [
        'email' => $customer->user->email,
        'password' => 'password',
    ]);

    $response->assertSessionHasErrors('email');
    $this->assertGuest();
});

test('updating a customer validates the input in its own error bag', function () {
    $customer = Customer::factory()->create();
    $existing = User::factory()->create();

    $this->actingAs($this->admin)
        ->put(route('admin.customers.update', $customer), updatePayload([
            'name' => '',
            'email' => $existing->email,
        ]))
        ->assertSessionHasErrorsIn('updateCustomer', ['name', 'email']);
});

test('password cannot be changed through the customer update', function () {
    $customer = Customer::factory()->create();
    $originalHash = $customer->user->password;

    $this->actingAs($this->admin)
        ->put(route('admin.customers.update', $customer), [
            ...updatePayload(),
            'password' => 'diganti-penuh-123',
        ])
        ->assertRedirect();

    expect($customer->user->fresh()->password)->toBe($originalHash);
});
