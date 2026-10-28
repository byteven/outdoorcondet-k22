<?php

namespace Database\Factories;

use App\Models\Customer;
use App\Models\Rental;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Rental>
 */
class RentalFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $pickup = today()->addDays(7);
        $return = $pickup->copy()->addDays(2);
        $amount = fake()->numberBetween(50, 500) * 1000;

        return [
            'rental_code' => 'OC-'.strtoupper(fake()->unique()->lexify('??????')),
            'customer_id' => Customer::factory(),
            'start_date' => $pickup,
            'billing_start_date' => $pickup->copy()->addDay(),
            'end_date' => $return,
            'return_due_at' => $return->copy()->endOfDay(),
            'total_days' => 2,
            'rental_amount' => $amount,
            'deposit_amount' => 0,
            'grand_total' => $amount,
            'payment_type' => 'full',
            'down_payment_amount' => 0,
            'remaining_balance' => 0,
            'payment_deadline_at' => now()->addDay(),
            'status' => 'pending_payment',
        ];
    }
}
