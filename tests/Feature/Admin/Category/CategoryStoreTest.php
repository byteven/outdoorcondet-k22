<?php

use App\Models\Category;
use App\Models\User;
use App\UserRole;

beforeEach(function () {
    $this->admin = User::factory()->create(['role' => UserRole::Admin]);
});

function validCategoryPayload(array $overrides = []): array
{
    return array_merge([
        'name' => 'Tenda & Shelter',
        'slug' => 'tenda-shelter',
        'description' => 'Peralatan tenda camping lengkap',
    ], $overrides);
}

test('guests cannot store categories', function () {
    $this->post(route('admin.categories.store'), validCategoryPayload())
        ->assertRedirect(route('login'));
});

test('customers cannot store categories', function () {
    $user = User::factory()->create(['role' => UserRole::Customer]);

    $this->actingAs($user)
        ->post(route('admin.categories.store'), validCategoryPayload())
        ->assertForbidden();
});

test('admins can store a category with full payload', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.categories.store'), validCategoryPayload())
        ->assertRedirect()
        ->assertSessionHas('inertia.flash_data.toast.type', 'success');

    $category = Category::where('slug', 'tenda-shelter')->first();

    expect($category)->not->toBeNull()
        ->and($category->name)->toBe('Tenda & Shelter')
        ->and($category->description)->toBe('Peralatan tenda camping lengkap');
});

test('category slug is automatically generated from name when empty', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.categories.store'), [
            'name' => 'Sepatu Gunung High Cut',
            'slug' => '',
            'description' => null,
        ])
        ->assertRedirect();

    $category = Category::where('name', 'Sepatu Gunung High Cut')->first();

    expect($category)->not->toBeNull()
        ->and($category->slug)->toBe('sepatu-gunung-high-cut');
});

test('storing a category requires a name', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.categories.store'), [
            'name' => '',
            'slug' => 'tanpa-nama',
        ])
        ->assertSessionHasErrors(['name']);
});

test('storing a category fails if slug is already taken', function () {
    Category::create([
        'name' => 'Tenda Dome',
        'slug' => 'tenda-dome',
    ]);

    $this->actingAs($this->admin)
        ->post(route('admin.categories.store'), [
            'name' => 'Tenda Dome Lainnya',
            'slug' => 'tenda-dome',
        ])
        ->assertSessionHasErrors(['slug']);
});

