<?php

use App\Models\Package;
use App\Models\User;
use App\UserRole;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    $this->admin = User::factory()->create(['role' => UserRole::Admin]);
});

test('guests cannot delete packages', function () {
    $package = Package::factory()->create();

    $this->delete(route('admin.packages.destroy', $package))
        ->assertRedirect(route('login'));
});

test('customers cannot delete packages', function () {
    $user = User::factory()->create(['role' => UserRole::Customer]);
    $package = Package::factory()->create();

    $this->actingAs($user)
        ->delete(route('admin.packages.destroy', $package))
        ->assertRedirect(route('home'));
});

test('admins can soft delete a package', function () {
    $package = Package::factory()->create(['name' => 'Paket Hapus']);

    $this->actingAs($this->admin)
        ->delete(route('admin.packages.destroy', $package))
        ->assertRedirect()
        ->assertSessionHas('inertia.flash_data.toast.type', 'success');

    expect(Package::find($package->id))->toBeNull()
        ->and(Package::withTrashed()->find($package->id))->not->toBeNull()
        ->and(Package::withTrashed()->find($package->id)->name)->toBe('Paket Hapus');
});

test('deleting a package removes its stored image', function () {
    Storage::fake('public');

    $package = Package::factory()->create();
    $path = 'packages/paket.jpg';
    Storage::disk('public')->put($path, 'fake-image');
    $package->update(['image_path' => $path]);

    $this->actingAs($this->admin)
        ->delete(route('admin.packages.destroy', $package))
        ->assertRedirect();

    Storage::disk('public')->assertMissing($path);
});
