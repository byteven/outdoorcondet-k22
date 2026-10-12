<?php

namespace Database\Factories;

use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ProductVariant>
 */
class ProductVariantFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'product_id' => Product::factory(),
            'sku' => 'SKU-'.strtoupper(fake()->unique()->lexify('??????').fake()->unique()->numberBetween(100, 999)),
            'stock' => fake()->numberBetween(1, 10),
            'rental_price_per_day' => fake()->randomElement([15000, 25000, 35000, 50000, 75000]),
            'weight_grams' => fake()->numberBetween(500, 5000),
            'is_active' => true,
        ];
    }
}
