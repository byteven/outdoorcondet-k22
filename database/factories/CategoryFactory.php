<?php

namespace Database\Factories;

use App\Models\Category;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Category>
 */
class CategoryFactory extends Factory
{
    /**
     * Kategori peralatan outdoor & camping.
     *
     * @var list<string>
     */
    public const CATEGORY_NAMES = [
        'Tenda & Shelter',
        'Tas & Carrier',
        'Peralatan Masak Camping',
        'Sleeping Bag & Matras',
        'Penerangan & Elektronik',
        'Meja & Kursi Lipat',
        'Perlengkapan Survival & Navigasi',
        'Sepatu & Pakaian Outdoor',
    ];

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $baseName = fake()->randomElement(self::CATEGORY_NAMES);
        $name = $baseName . ' ' . fake()->unique()->numberBetween(1, 99999);

        return [
            'name' => $name,
            'slug' => Str::slug($name),
            'description' => fake()->sentence(8),
        ];
    }
}

