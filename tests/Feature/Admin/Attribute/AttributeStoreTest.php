<?php

use App\Models\Attribute;
use App\Models\User;
use App\UserRole;

beforeEach(function () {
    $this->admin = User::factory()->create(['role' => UserRole::Admin]);
});

function validAttributePayload(array $overrides = []): array
{
    return array_merge([
        'name' => 'Kapasitas',
        'description' => 'Kapasitas muatan atau orang',
    ], $overrides);
}

test('guests cannot store attributes', function () {
    $this->post(route('admin.attributes.store'), validAttributePayload())
        ->assertRedirect(route('login'));
});

test('customers cannot store attributes', function () {
    $user = User::factory()->create(['role' => UserRole::Customer]);

    $this->actingAs($user)
        ->post(route('admin.attributes.store'), validAttributePayload())
        ->assertRedirect(route('home'));
});

test('admins can store an attribute with full payload', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.attributes.store'), validAttributePayload())
        ->assertRedirect()
        ->assertSessionHas('inertia.flash_data.toast.type', 'success');

    $attribute = Attribute::where('name', 'Kapasitas')->first();

    expect($attribute)->not->toBeNull()
        ->and($attribute->description)->toBe('Kapasitas muatan atau orang');
});

test('storing an attribute requires a name', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.attributes.store'), [
            'name' => '',
            'description' => 'Deskripsi tanpa nama',
        ])
        ->assertSessionHasErrors(['name']);
});

test('storing an attribute fails if name is already taken', function () {
    Attribute::create([
        'name' => 'Warna',
    ]);

    $this->actingAs($this->admin)
        ->post(route('admin.attributes.store'), [
            'name' => 'Warna',
        ])
        ->assertSessionHasErrors(['name']);
});
