<?php

use App\Models\Customer;
use App\Models\User;
use App\UserRole;
use Inertia\Testing\AssertableInertia;

function createAdmin(): User
{
    return User::factory()->create(['role' => UserRole::Admin]);
}

test('guests are redirected to login', function () {
    $this->get(route('admin.customers.index'))->assertRedirect(route('login'));
});

test('customers cannot access the customer list', function () {
    $user = User::factory()->create(['role' => UserRole::Customer]);

    $this->actingAs($user)->get(route('admin.customers.index'))->assertRedirect(route('home'));
});

test('admins can view the paginated customer list', function () {
    Customer::factory()->count(15)->create();

    $this->actingAs(createAdmin())
        ->get(route('admin.customers.index'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('customers/index')
            ->has('customers.data', 10)
            ->where('customers.total', 15)
            ->where('customers.current_page', 1)
            ->where('summary.total', 15)
            ->where('summary.active', 15)
            ->where('summary.inactive', 0)
            ->has('filters'));
});

test('admins can search customers by name, email, or phone', function () {
    Customer::factory()->create([
        'phone_number' => '62812000111222',
        'user_id' => User::factory()->create(['name' => 'Budi Unik Sekali'])->id,
    ]);
    Customer::factory()->count(3)->create();

    $this->actingAs(createAdmin())
        ->get(route('admin.customers.index', ['search' => 'Unik Sekali']))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('customers.total', 1)
            ->where('customers.data.0.user.name', 'Budi Unik Sekali')
            ->where('filters.search', 'Unik Sekali'));

    $this->actingAs(createAdmin())
        ->get(route('admin.customers.index', ['search' => '62812000111222']))
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('customers.total', 1));
});

test('admins can filter customers by active status', function () {
    Customer::factory()->count(2)->inactive()->create();
    Customer::factory()->count(3)->create();

    $this->actingAs(createAdmin())
        ->get(route('admin.customers.index', ['status' => 'inactive', 'per_page' => 50]))
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('customers.total', 2)
            ->where('filters.status', 'inactive'));
});

test('admins can change the page size', function () {
    Customer::factory()->count(30)->create();

    $this->actingAs(createAdmin())
        ->get(route('admin.customers.index', ['per_page' => 25]))
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->has('customers.data', 25)
            ->where('customers.per_page', 25)
            ->where('filters.per_page', 25));
});

test('invalid filter values are rejected', function () {
    $this->actingAs(createAdmin())
        ->get(route('admin.customers.index', ['per_page' => 500]))
        ->assertRedirect()
        ->assertSessionHasErrors('per_page');

    $this->actingAs(createAdmin())
        ->get(route('admin.customers.index', ['sort_by' => 'hacked']))
        ->assertRedirect()
        ->assertSessionHasErrors('sort_by');
});

test('customer list exposes the identity card url', function () {
    Customer::factory()->create(['identity_card_path' => 'identity-cards/ktp.jpg']);

    $this->actingAs(createAdmin())
        ->get(route('admin.customers.index'))
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('customers.data.0.identity_card_url', '/storage/identity-cards/ktp.jpg'));
});

test('summary counts active and inactive customers', function () {
    Customer::factory()->count(4)->create();
    Customer::factory()->count(2)->inactive()->create();

    $this->actingAs(createAdmin())
        ->get(route('admin.customers.index'))
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('summary.total', 6)
            ->where('summary.active', 4)
            ->where('summary.inactive', 2));
});

test('admins can sort customers by name', function () {
    Customer::factory()->create([
        'user_id' => User::factory()->create(['name' => 'Zulkifli'])->id,
    ]);
    Customer::factory()->create([
        'user_id' => User::factory()->create(['name' => 'Andini'])->id,
    ]);

    $this->actingAs(createAdmin())
        ->get(route('admin.customers.index', ['sort_by' => 'name', 'sort_dir' => 'asc', 'per_page' => 50]))
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('customers.data.0.user.name', 'Andini')
            ->where('customers.data.1.user.name', 'Zulkifli')
            ->where('filters.sort_by', 'name')
            ->where('filters.sort_dir', 'asc'));
});
