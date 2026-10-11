<?php

use App\Models\Attribute;
use App\Models\User;
use App\UserRole;
use Inertia\Testing\AssertableInertia;

function createAttributeAdmin(): User
{
    return User::factory()->create(['role' => UserRole::Admin]);
}

test('guests are redirected to login when accessing attribute index', function () {
    $this->get(route('admin.attributes.index'))->assertRedirect(route('login'));
});

test('customers cannot access the attribute list', function () {
    $user = User::factory()->create(['role' => UserRole::Customer]);

    $this->actingAs($user)->get(route('admin.attributes.index'))->assertRedirect(route('home'));
});

test('admins can view the paginated attribute list', function () {
    Attribute::factory()->count(15)->sequence(fn ($sequence) => [
        'name' => "Atribut {$sequence->index}",
    ])->create();

    $this->actingAs(createAttributeAdmin())
        ->get(route('admin.attributes.index'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('attributes/index')
            ->has('attributes.data', 10)
            ->where('attributes.total', 15)
            ->where('attributes.current_page', 1)
            ->where('summary.total', 15)
            ->has('filters'));
});

test('admins can search attributes by name or description', function () {
    Attribute::create([
        'name' => 'Warna Khusus',
        'description' => 'Warna kamuflase dan army',
    ]);
    Attribute::create([
        'name' => 'Ukuran Frame',
        'description' => 'Diameter tiang tenda aluminium',
    ]);

    $admin = createAttributeAdmin();

    $this->actingAs($admin)
        ->get(route('admin.attributes.index', ['search' => 'Khusus']))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('attributes.total', 1)
            ->where('attributes.data.0.name', 'Warna Khusus')
            ->where('filters.search', 'Khusus'));

    $this->actingAs($admin)
        ->get(route('admin.attributes.index', ['search' => 'aluminium']))
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('attributes.total', 1)
            ->where('attributes.data.0.name', 'Ukuran Frame'));
});

test('admins can sort attributes by name or created_at', function () {
    Attribute::create(['name' => 'Atribut A']);
    Attribute::create(['name' => 'Atribut B']);

    $admin = createAttributeAdmin();

    $this->actingAs($admin)
        ->get(route('admin.attributes.index', ['sort_by' => 'name', 'sort_dir' => 'asc']))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('attributes.data.0.name', 'Atribut A')
            ->where('attributes.data.1.name', 'Atribut B'));

    $this->actingAs($admin)
        ->get(route('admin.attributes.index', ['sort_by' => 'name', 'sort_dir' => 'desc']))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('attributes.data.0.name', 'Atribut B')
            ->where('attributes.data.1.name', 'Atribut A'));
});

