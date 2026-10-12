<?php

namespace Database\Factories;

use App\Models\Attribute;
use App\Models\ProductVariant;
use App\Models\ProductVariantValue;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ProductVariantValue>
 */
class ProductVariantValueFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'product_variant_id' => ProductVariant::factory(),
            'attribute_id' => Attribute::factory(),
            'value' => fake()->randomElement(['Merah', 'Biru', 'XL', '4 Orang', '60L']),
        ];
    }
}
