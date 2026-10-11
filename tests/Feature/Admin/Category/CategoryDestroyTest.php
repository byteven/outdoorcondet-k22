<?php

use App\Models\Category;
use App\Models\User;
use App\UserRole;
use Inertia\Testing\AssertableInertia;

beforeEach(function () {
    $this->admin = User::factory()->create(['role' => UserRole::Admin]);
});

test('guests cannot delete categories', function () {
    $category = Category::create(['name' => 'Flysheet', 'slug' => 'flysheet']);

    $this->delete(route('admin.categories.destroy', $category))
        ->assertRedirect(route('login'));
});

test('customers cannot delete categories', function () {
    $user = User::factory()->create(['role' => UserRole::Customer]);
    $category = Category::create(['name' => 'Flysheet', 'slug' => 'flysheet']);

    $this->actingAs($user)
        ->delete(route('admin.categories.destroy', $category))
        ->assertRedirect(route('home'));
});

test('admins can delete a category via soft delete', function () {
    $category = Category::create(['name' => 'Flysheet Waterproof', 'slug' => 'flysheet-waterproof']);

    $this->actingAs($this->admin)
        ->delete(route('admin.categories.destroy', $category))
        ->assertRedirect()
        ->assertSessionHas('inertia.flash_data.toast.type', 'success');

    $this->assertSoftDeleted('categories', ['id' => $category->id]);
});

test('deleted category is excluded from standard category index', function () {
    $category = Category::create(['name' => 'Hammock Single', 'slug' => 'hammock-single']);
    Category::create(['name' => 'Hammock Double', 'slug' => 'hammock-double']);

    $this->actingAs($this->admin)
        ->delete(route('admin.categories.destroy', $category));

    $this->actingAs($this->admin)
        ->get(route('admin.categories.index'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('categories.total', 1)
            ->where('summary.total', 1)
            ->where('categories.data.0.name', 'Hammock Double'));

    expect(Category::withTrashed()->count())->toBe(2);
});

