<?php

use App\Models\Category;
use App\Models\Customer;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Rental;
use App\Models\User;
use App\UserRole;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

function actingDashboardAdmin(): User
{
    $admin = User::factory()->create(['role' => UserRole::Admin]);
    test()->actingAs($admin);

    return $admin;
}

test('tamu dialihkan ke login ketika mengakses dashboard admin', function () {
    $this->get(route('admin.dashboard'))
        ->assertRedirect(route('login'));
});

test('customer dilarang mengakses dashboard admin', function () {
    $customerUser = User::factory()->create(['role' => UserRole::Customer]);
    $this->actingAs($customerUser);

    $this->get(route('admin.dashboard'))
        ->assertRedirect();
});

test('admin dapat mengakses dashboard dengan metrik lengkap', function () {
    actingDashboardAdmin();

    $category = Category::factory()->create();
    $product = Product::factory()->create(['category_id' => $category->id, 'is_active' => true]);
    $variant = ProductVariant::factory()->create([
        'product_id' => $product->id,
        'stock' => 1,
        'is_active' => true,
    ]);

    $customer = Customer::factory()->create();

    // Rental aktif
    Rental::factory()->create([
        'customer_id' => $customer->id,
        'status' => 'dp_paid',
        'rental_amount' => 150000,
        'remaining_balance' => 75000,
        'start_date' => Carbon::today(),
        'end_date' => Carbon::tomorrow(),
    ]);

    $this->get(route('admin.dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('dashboard')
            ->has('metrics')
            ->where('metrics.total_omzet', 150000)
            ->where('metrics.sisa_piutang', 75000)
            ->where('metrics.sewa_aktif', 1)
            ->has('low_stock_variants', 1)
            ->has('upcoming_returns', 1)
            ->has('monthly_stats', 12)
            ->has('selected_year')
            ->has('available_years')
            ->where('selected_period', 'all')
        );
});

test('admin dapat memfilter dashboard berdasarkan tahun', function () {
    actingDashboardAdmin();

    $this->get(route('admin.dashboard', ['year' => 2025]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('dashboard')
            ->where('selected_year', 2025)
            ->has('monthly_stats', 12)
        );
});

test('admin dapat memfilter dashboard berdasarkan periode waktu', function () {
    actingDashboardAdmin();

    $this->get(route('admin.dashboard', ['period' => 'today']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('dashboard')
            ->where('selected_period', 'today')
            ->has('metrics')
        );
});
