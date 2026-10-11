<?php

use App\Models\Category;

test('category fills mass assignable attributes correctly', function () {
    $category = Category::create([
        'name' => 'Tenda & Shelter',
        'slug' => 'tenda-shelter',
        'description' => 'Peralatan perlindungan dan berkemah.',
    ]);

    expect($category->name)->toBe('Tenda & Shelter')
        ->and($category->slug)->toBe('tenda-shelter')
        ->and($category->description)->toBe('Peralatan perlindungan dan berkemah.');
});

test('category search scope matches name, slug, or description', function () {
    $c1 = Category::create(['name' => 'Cooking Gear', 'slug' => 'cooking-gear', 'description' => 'Kompor dan nesting']);
    $c2 = Category::create(['name' => 'Carrier Bag', 'slug' => 'carrier-bag', 'description' => 'Tas ransel gunung']);
    $c3 = Category::create(['name' => 'Sleeping Bag', 'slug' => 'sleeping-bag', 'description' => 'Kantung tidur hangat']);

    expect(Category::query()->search('Cooking')->pluck('id')->all())->toBe([$c1->id])
        ->and(Category::query()->search('carrier-bag')->pluck('id')->all())->toBe([$c2->id])
        ->and(Category::query()->search('hangat')->pluck('id')->all())->toBe([$c3->id]);
});
