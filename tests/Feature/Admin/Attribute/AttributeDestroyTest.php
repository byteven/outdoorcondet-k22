<?php

use App\Models\Attribute;
use App\Models\User;
use App\UserRole;
use Inertia\Testing\AssertableInertia;

beforeEach(function () {
    $this->admin = User::factory()->create(['role' => UserRole::Admin]);
});

test('guests cannot delete attributes', function () {
    $attribute = Attribute::create(['name' => 'Warna']);

    $this->delete(route('admin.attributes.destroy', $attribute))
        ->assertRedirect(route('login'));
});

test('customers cannot delete attributes', function () {
    $user = User::factory()->create(['role' => UserRole::Customer]);
    $attribute = Attribute::create(['name' => 'Warna']);

    $this->actingAs($user)
        ->delete(route('admin.attributes.destroy', $attribute))
        ->assertRedirect(route('home'));
});

test('admins can delete an attribute via soft delete', function () {
    $attribute = Attribute::create(['name' => 'Warna']);

    $this->actingAs($this->admin)
        ->delete(route('admin.attributes.destroy', $attribute))
        ->assertRedirect()
        ->assertSessionHas('inertia.flash_data.toast.type', 'success');

    $this->assertSoftDeleted('attributes', ['id' => $attribute->id]);
});

test('deleted attribute is excluded from standard attribute index', function () {
    $attribute = Attribute::create(['name' => 'Ukuran']);
    Attribute::create(['name' => 'Kapasitas']);

    $this->actingAs($this->admin)
        ->delete(route('admin.attributes.destroy', $attribute));

    $this->actingAs($this->admin)
        ->get(route('admin.attributes.index'))
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('attributes.total', 1)
            ->where('summary.total', 1)
            ->where('attributes.data.0.name', 'Kapasitas'));

    expect(Attribute::withTrashed()->count())->toBe(2);
});

