<?php

use App\Models\Attribute;

test('attribute fills mass assignable attributes correctly', function () {
    $attribute = Attribute::create([
        'name' => 'Kapasitas Tenda',
        'description' => 'Jumlah daya tampung orang dalam satu unit tenda.',
    ]);

    expect($attribute->name)->toBe('Kapasitas Tenda')
        ->and($attribute->description)->toBe('Jumlah daya tampung orang dalam satu unit tenda.');
});

test('attribute search scope matches name or description', function () {
    $a1 = Attribute::create(['name' => 'Warna', 'description' => 'Pilihan kelir alat']);
    $a2 = Attribute::create(['name' => 'Ukuran', 'description' => 'Dimensi fisik']);
    $a3 = Attribute::create(['name' => 'Daya', 'description' => 'Kapasitas baterai mAh']);

    expect(Attribute::query()->search('Warna')->pluck('id')->all())->toBe([$a1->id])
        ->and(Attribute::query()->search('Dimensi')->pluck('id')->all())->toBe([$a2->id])
        ->and(Attribute::query()->search('baterai')->pluck('id')->all())->toBe([$a3->id]);
});
