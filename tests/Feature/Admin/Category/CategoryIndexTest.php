<?php

use App\Models\Category;
use App\Models\User;
use App\UserRole;
use Inertia\Testing\AssertableInertia;

function createCategoryAdmin(): User
{
    return User::factory()->create(['role' => UserRole::Admin]);
}

test('guests are redirected to login when accessing category index', function () {
    $this->get(route('admin.categories.index'))->assertRedirect(route('login'));
});

test('customers cannot access the category list', function () {
    $user = User::factory()->create(['role' => UserRole::Customer]);

    $this->actingAs($user)->get(route('admin.categories.index'))->assertRedirect(route('home'));
});

test('admins can view the paginated category list', function () {
    Category::factory()->count(15)->sequence(fn ($sequence) => [
        'name' => "Kategori {$sequence->index}",
        'slug' => "kategori-{$sequence->index}",
    ])->create();

    $this->actingAs(createCategoryAdmin())
        ->get(route('admin.categories.index'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('categories/index')
            ->has('categories.data', 10)
            ->where('categories.total', 15)
            ->where('categories.current_page', 1)
            ->where('summary.total', 15)
            ->has('filters'));
});

test('admins can search categories by name, slug, or description', function () {
    Category::create([
        'name' => 'Tenda Dome Spesial',
        'slug' => 'tenda-dome-spesial',
        'description' => 'Tenda kapasitas 4 orang',
    ]);
    Category::create([
        'name' => 'Carrier 60L',
        'slug' => 'carrier-60l',
        'description' => 'Tas gunung kapasitas besar',
    ]);

    $admin = createCategoryAdmin();

    $this->actingAs($admin)
        ->get(route('admin.categories.index', ['search' => 'Spesial']))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('categories.total', 1)
            ->where('categories.data.0.name', 'Tenda Dome Spesial')
            ->where('filters.search', 'Spesial'));

    $this->actingAs($admin)
        ->get(route('admin.categories.index', ['search' => 'carrier-60l']))
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('categories.total', 1)
            ->where('categories.data.0.name', 'Carrier 60L'));

    $this->actingAs($admin)
        ->get(route('admin.categories.index', ['search' => 'kapasitas besar']))
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('categories.total', 1)
            ->where('categories.data.0.name', 'Carrier 60L'));
});

test('admins can sort categories by name or slug', function () {
    Category::create(['name' => 'Alpha Gear', 'slug' => 'alpha-gear']);
    Category::create(['name' => 'Beta Gear', 'slug' => 'beta-gear']);

    $admin = createCategoryAdmin();

    $this->actingAs($admin)
        ->get(route('admin.categories.index', ['sort_by' => 'name', 'sort_dir' => 'asc']))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('categories.data.0.name', 'Alpha Gear')
            ->where('categories.data.1.name', 'Beta Gear'));

    $this->actingAs($admin)
        ->get(route('admin.categories.index', ['sort_by' => 'name', 'sort_dir' => 'desc']))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('categories.data.0.name', 'Beta Gear')
            ->where('categories.data.1.name', 'Alpha Gear'));
});
