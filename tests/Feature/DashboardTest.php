<?php

use App\Models\User;
use App\UserRole;

test('guests are redirected to the login page', function () {
    $response = $this->get(route('admin.dashboard'));
    $response->assertRedirect(route('login'));
});

test('admins can visit the dashboard', function () {
    $this->actingAs(User::factory()->create(['role' => UserRole::Admin]));

    $response = $this->get(route('admin.dashboard'));
    $response->assertOk();
});

test('customers are redirected away from the dashboard', function () {
    $this->actingAs(User::factory()->create(['role' => UserRole::Customer]));

    $response = $this->get(route('admin.dashboard'));
    $response->assertRedirect(route('home'));
});
