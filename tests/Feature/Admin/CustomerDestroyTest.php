<?php

use App\Models\Customer;
use App\Models\User;
use App\UserRole;
use Inertia\Testing\AssertableInertia;

beforeEach(function () {
    $this->admin = User::factory()->create(['role' => UserRole::Admin]);
});

test('guests cannot delete customers', function () {
    $customer = Customer::factory()->create();

    $this->delete(route('admin.customers.destroy', $customer))->assertRedirect(route('login'));
});

test('customers cannot delete other customers', function () {
    $user = User::factory()->create(['role' => UserRole::Customer]);
    $customer = Customer::factory()->create();

    $this->actingAs($user)->delete(route('admin.customers.destroy', $customer))->assertRedirect(route('home'));
});

test('admins soft delete a customer and deactivate its account', function () {
    $customer = Customer::factory()->create();

    $this->actingAs($this->admin)
        ->delete(route('admin.customers.destroy', $customer))
        ->assertRedirect()
        ->assertSessionHas('inertia.flash_data.toast.type', 'success');

    $this->assertSoftDeleted('customers', ['id' => $customer->id]);

    expect($customer->fresh()->is_active)->toBeFalse();
    expect(User::find($customer->user_id))->not->toBeNull();
});

test('deleted customers disappear from the list but stay in the database', function () {
    $customer = Customer::factory()->create();
    Customer::factory()->count(2)->create();

    $this->actingAs($this->admin)->delete(route('admin.customers.destroy', $customer));

    $this->actingAs($this->admin)
        ->get(route('admin.customers.index', ['per_page' => 50]))
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('customers.total', 2)
            ->where('summary.total', 2));

    expect(Customer::withTrashed()->count())->toBe(3);
});

test('deleted customers cannot login', function () {
    $customer = Customer::factory()->create();
    $email = $customer->user->email;

    $this->actingAs($this->admin)->delete(route('admin.customers.destroy', $customer));
    $this->post(route('logout'));

    $response = $this->post(route('login.store'), [
        'email' => $email,
        'password' => 'password',
    ]);

    $response->assertSessionHasErrors('email');
    $this->assertGuest();
});

test('an inactive email can be reused and restores the account', function () {
    $customer = Customer::factory()->inactive()->create();
    $email = $customer->user->email;
    $userId = $customer->user_id;

    $this->actingAs($this->admin)
        ->post(route('admin.customers.store'), [
            'name' => 'Udin Kembali',
            'email' => $email,
            'password' => 'Baru12345',
            'phone_number' => '0812999888777',
        ])
        ->assertRedirect();

    $restored = Customer::where('user_id', $userId)->firstOrFail();

    expect($restored->id)->toBe($customer->id)
        ->and($restored->trashed())->toBeFalse()
        ->and($restored->is_active)->toBeTrue()
        ->and($restored->phone_number)->toBe('62812999888777')
        ->and($restored->user->name)->toBe('Udin Kembali');
});

test('an active email cannot be reused', function () {
    $customer = Customer::factory()->create();

    $this->actingAs($this->admin)
        ->post(route('admin.customers.store'), [
            'name' => 'Udin Ganda',
            'email' => $customer->user->email,
            'password' => 'Baru12345',
            'phone_number' => '0812999888777',
        ])
        ->assertSessionHasErrors('email');
});
