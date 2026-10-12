<?php

namespace Database\Factories;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Product>
 */
class ProductFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = fake()->randomElement([
            'Tenda Dome 2 Orang',
            'Tenda Dome 4 Orang',
            'Carrier 60L',
            'Sleeping Bag Artic',
            'Kompor Portable',
            'Matras Inflatable',
        ]).' '.fake()->unique()->numberBetween(1, 99999);

        return [
            'category_id' => Category::factory(),
            'name' => $name,
            'slug' => Str::slug($name),
            'description' => fake()->sentence(8),
            'is_active' => true,
        ];
    }
}
