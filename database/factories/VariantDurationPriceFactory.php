<?php

namespace Database\Factories;

use App\Models\ProductVariant;
use App\Models\VariantDurationPrice;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<VariantDurationPrice>
 */
class VariantDurationPriceFactory extends Factory
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
            'duration_days' => 3,
            'price' => 50000,
        ];
    }
}
