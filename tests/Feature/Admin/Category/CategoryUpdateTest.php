<?php

use App\Models\Category;
use App\Models\User;
use App\UserRole;

beforeEach(function () {
    $this->admin = User::factory()->create(['role' => UserRole::Admin]);
});

test('guests cannot update categories', function () {
    $category = Category::create(['name' => 'Lampu Tenda', 'slug' => 'lampu-tenda']);

    $this->put(route('admin.categories.update', $category), [
        'name' => 'Lampu Tenda Update',
        'slug' => 'lampu-tenda-update',
    ])->assertRedirect(route('login'));
});

test('customers cannot update categories', function () {
    $user = User::factory()->create(['role' => UserRole::Customer]);
    $category = Category::create(['name' => 'Lampu Tenda', 'slug' => 'lampu-tenda']);

    $this->actingAs($user)
        ->put(route('admin.categories.update', $category), [
            'name' => 'Lampu Tenda Update',
            'slug' => 'lampu-tenda-update',
        ])->assertRedirect(route('home'));
});

test('admins can update a category', function () {
    $category = Category::create([
        'name' => 'Lampu Tenda',
        'slug' => 'lampu-tenda',
        'description' => 'Lampu tenda gantung',
    ]);

    $this->actingAs($this->admin)
        ->put(route('admin.categories.update', $category), [
            'name' => 'Lampu & Lentera Camping',
            'slug' => 'lampu-lentera-camping',
            'description' => 'Penerangan tenda dan senter outdoor',
        ])
        ->assertRedirect()
        ->assertSessionHas('inertia.flash_data.toast.type', 'success');

    $category->refresh();

    expect($category->name)->toBe('Lampu & Lentera Camping')
        ->and($category->slug)->toBe('lampu-lentera-camping')
        ->and($category->description)->toBe('Penerangan tenda dan senter outdoor');
});

test('updating a category allows keeping the same slug', function () {
    $category = Category::create([
        'name' => 'Matras Foil',
        'slug' => 'matras-foil',
    ]);

    $this->actingAs($this->admin)
        ->put(route('admin.categories.update', $category), [
            'name' => 'Matras Foil Alumunium',
            'slug' => 'matras-foil',
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    expect($category->fresh()->name)->toBe('Matras Foil Alumunium');
});

test('updating a category rejects duplicate slug from another category', function () {
    Category::create(['name' => 'Kompor Portabel', 'slug' => 'kompor-portabel']);
    $other = Category::create(['name' => 'Nesting Kastrol', 'slug' => 'nesting-kastrol']);

    $this->actingAs($this->admin)
        ->put(route('admin.categories.update', $other), [
            'name' => 'Nesting Baru',
            'slug' => 'kompor-portabel',
        ])
        ->assertSessionHasErrors(['slug']);
});

