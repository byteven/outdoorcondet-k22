<?php

use App\Http\Requests\Admin\StoreAttributeRequest;
use App\Http\Requests\Admin\UpdateAttributeRequest;
use App\Models\Attribute;
use Illuminate\Database\Eloquent\SoftDeletes;

test('attribute model strictly guards mass assignment attributes in memory', function () {
    $attribute = new Attribute();

    expect($attribute->isFillable('name'))->toBeTrue()
        ->and($attribute->isFillable('description'))->toBeTrue()
        ->and($attribute->isFillable('id'))->toBeFalse()
        ->and($attribute->isFillable('created_at'))->toBeFalse();
});

test('attribute model implements soft deletes trait', function () {
    expect(class_uses_recursive(Attribute::class))
        ->toContain(SoftDeletes::class);
});

test('store attribute request defines validation rules and custom indonesian messages', function () {
    $request = new StoreAttributeRequest();
    $rules = $request->rules();
    $messages = $request->messages();

    expect($rules)->toHaveKeys(['name', 'description'])
        ->and($rules['name'])->toContain('required')
        ->and($rules['name'])->toContain('max:50')
        ->and($messages)->toHaveKey('name.required')
        ->and($messages['name.required'])->toBe('Nama atribut wajib diisi.');
});

test('update attribute request defines custom indonesian messages', function () {
    $request = new UpdateAttributeRequest();
    $messages = $request->messages();

    expect($messages)->toHaveKeys([
        'name.required',
        'name.max',
        'name.unique',
        'description.max',
    ])->and($messages['name.unique'])->toBe('Nama atribut sudah terdaftar.');
});

