<?php

namespace Database\Factories;

use App\Models\CartItem;
use App\Models\ProductVariant;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Carbon;

/**
 * @extends Factory<CartItem>
 */
class CartItemFactory extends Factory
{
    protected $model = CartItem::class;

    public function definition(): array
    {
        $variant = ProductVariant::factory()->create();

        return [
            'user_id' => User::factory(),
            'rentable_type' => ProductVariant::class,
            'rentable_id' => $variant->id,
            'quantity' => 1,
            'pickup_date' => today()->addDay(),
            'return_date' => today()->addDays(3),
        ];
    }
}
