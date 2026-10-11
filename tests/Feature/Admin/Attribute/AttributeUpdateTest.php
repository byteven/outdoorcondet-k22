<?php

use App\Models\Attribute;
use App\Models\User;
use App\UserRole;

beforeEach(function () {
    $this->admin = User::factory()->create(['role' => UserRole::Admin]);
});

test('guests cannot update attributes', function () {
    $attribute = Attribute::create(['name' => 'Ukuran']);

    $this->put(route('admin.attributes.update', $attribute), [
        'name' => 'Ukuran Update',
    ])->assertRedirect(route('login'));
});

test('customers cannot update attributes', function () {
    $user = User::factory()->create(['role' => UserRole::Customer]);
    $attribute = Attribute::create(['name' => 'Ukuran']);

    $this->actingAs($user)
        ->put(route('admin.attributes.update', $attribute), [
            'name' => 'Ukuran Update',
        ])->assertRedirect(route('home'));
});

test('admins can update an attribute', function () {
    $attribute = Attribute::create([
        'name' => 'Warna',
        'description' => 'Warna umum',
    ]);

    $this->actingAs($this->admin)
        ->put(route('admin.attributes.update', $attribute), [
            'name' => 'Warna Produk',
            'description' => 'Pilihan kelir dan corak perlengkapan',
        ])
        ->assertRedirect()
        ->assertSessionHas('inertia.flash_data.toast.type', 'success');

    $attribute->refresh();

    expect($attribute->name)->toBe('Warna Produk')
        ->and($attribute->description)->toBe('Pilihan kelir dan corak perlengkapan');
});

test('updating an attribute allows keeping the same name', function () {
    $attribute = Attribute::create([
        'name' => 'Kapasitas Orang',
        'description' => 'Lama',
    ]);

    $this->actingAs($this->admin)
        ->put(route('admin.attributes.update', $attribute), [
            'name' => 'Kapasitas Orang',
            'description' => 'Baru',
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    expect($attribute->fresh()->description)->toBe('Baru');
});

test('updating an attribute rejects duplicate name from another attribute', function () {
    Attribute::create(['name' => 'Bahan Material']);
    $other = Attribute::create(['name' => 'Ukuran Panjang']);

    $this->actingAs($this->admin)
        ->put(route('admin.attributes.update', $other), [
            'name' => 'Bahan Material',
        ])
        ->assertSessionHasErrors(['name']);
});
