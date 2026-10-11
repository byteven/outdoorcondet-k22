<?php

use App\Http\Requests\Admin\StoreCategoryRequest;
use App\Http\Requests\Admin\UpdateCategoryRequest;
use App\Models\Category;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

test('slug generator cleanses and formats category names properly', function () {
    $slug1 = Str::slug('Tenda & Shelter Camping');
    $slug2 = Str::slug('Carrier 60L (Tas Gunung)');
    $slug3 = Str::slug('   Peralatan Masak / Cooking Gear!   ');

    expect($slug1)->toBe('tenda-shelter-camping')
        ->and($slug2)->toBe('carrier-60l-tas-gunung')
        ->and($slug3)->toBe('peralatan-masak-cooking-gear');
});

test('category model strictly guards mass assignment attributes in memory', function () {
    $category = new Category();

    expect($category->isFillable('name'))->toBeTrue()
        ->and($category->isFillable('slug'))->toBeTrue()
        ->and($category->isFillable('description'))->toBeTrue()
        ->and($category->isFillable('id'))->toBeFalse()
        ->and($category->isFillable('created_at'))->toBeFalse();
});

test('category model implements soft deletes trait', function () {
    expect(class_uses_recursive(Category::class))
        ->toContain(SoftDeletes::class);
});

test('store category request defines validation rules and custom indonesian messages', function () {
    $request = new StoreCategoryRequest();
    $rules = $request->rules();
    $messages = $request->messages();

    expect($rules)->toHaveKeys(['name', 'slug', 'description'])
        ->and($rules['name'])->toContain('required')
        ->and($rules['name'])->toContain('max:100')
        ->and($messages)->toHaveKey('name.required')
        ->and($messages['name.required'])->toBe('Nama kategori wajib diisi.');
});

test('update category request defines custom indonesian messages', function () {
    $request = new UpdateCategoryRequest();
    $messages = $request->messages();

    expect($messages)->toHaveKeys([
        'name.required',
        'name.max',
        'slug.required',
        'slug.max',
        'slug.unique',
        'description.max',
    ])->and($messages['slug.unique'])->toBe('Slug sudah digunakan oleh kategori lain.');
});

