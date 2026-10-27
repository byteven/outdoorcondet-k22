<?php

namespace Database\Factories;

use App\Models\CartItem;
use App\Models\ProductVariant;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CartItem>
 */
class CartItemFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $pickup = today()->addDays(7);

        return [
            'user_id' => User::factory(),
            'rentable_type' => ProductVariant::class,
            'rentable_id' => ProductVariant::factory(),
            'quantity' => 1,
            'pickup_date' => $pickup,
            'return_date' => $pickup->copy()->addDays(2),
        ];
    }
}
