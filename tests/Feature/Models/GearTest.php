<?php

use App\GearCondition;
use App\Models\Gear;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

test('gear casts its attributes to the expected types', function () {
    $gear = Gear::factory()->create([
        'condition' => GearCondition::Excellent,
        'daily_rate' => '25000',
        'deposit_amount' => '100000',
        'stock' => '4',
        'max_rental_days' => null,
        'is_active' => 1,
    ]);

    expect($gear->condition)->toBe(GearCondition::Excellent)
        ->and($gear->daily_rate)->toBe('25000.00')
        ->and($gear->deposit_amount)->toBe('100000.00')
        ->and($gear->stock)->toBe(4)
        ->and($gear->min_rental_days)->toBe(1)
        ->and($gear->max_rental_days)->toBeNull()
        ->and($gear->is_active)->toBeTrue();
});

test('active scope only returns gear that is available for rental', function () {
    $available = Gear::factory()->create();
    Gear::factory()->inactive()->create();

    expect(Gear::query()->active()->pluck('id')->all())->toBe([$available->id]);
});

test('searchable array exposes the indexed attributes with a typed id', function () {
    $gear = Gear::factory()->condition(GearCondition::Fair)->create([
        'name' => 'Tenda Dome 2 Orang',
        'brand' => 'Naturehike',
    ]);

    expect($gear->toSearchableArray())->toMatchArray([
        'id' => $gear->id,
        'name' => 'Tenda Dome 2 Orang',
        'slug' => $gear->slug,
        'brand' => 'Naturehike',
        'condition' => GearCondition::Fair->value,
    ])->and($gear->toSearchableArray()['id'])->toBeInt();
});

test('gear stores photos in the images collection', function () {
    Storage::fake('public');

    $gear = Gear::factory()->create();

    $gear->addMedia(UploadedFile::fake()->image('tent.jpg'))
        ->toMediaCollection(Gear::IMAGE_COLLECTION);

    expect($gear->refresh()->getMedia(Gear::IMAGE_COLLECTION))->toHaveCount(1);
});
