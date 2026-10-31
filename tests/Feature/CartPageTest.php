<?php

use App\Models\User;
use App\UserRole;
use Inertia\Testing\AssertableInertia;

test('guests are redirected to login when opening the cart page', function () {
    $this->get(route('cart.index'))
        ->assertRedirect(route('login'));
});

test('customers can open the cart page', function () {
    $this->actingAs(User::factory()->create(['role' => UserRole::Customer]));

    $this->get(route('cart.index'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('cart/index'));
});
