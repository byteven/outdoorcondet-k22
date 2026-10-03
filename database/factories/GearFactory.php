<?php

namespace Database\Factories;

use App\GearCondition;
use App\Models\Gear;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Gear>
 */
class GearFactory extends Factory
{
    /**
     * Realistic gear names, shared with the database seeder.
     *
     * @var list<string>
     */
    public const NAMES = [
        'Tenda Dome 2 Orang',
        'Tenda Dome 4 Orang',
        'Sleeping Bag Artic Minus 5C',
        'Sleeping Bag Comfort 10C',
        'Matras Inflatable',
        'Backpack 40L',
        'Backpack 60L',
        'Kompor Reisbuatan',
        'Kotak Pimpanan Food Box',
        'Trekking Pole Karbon',
        'Headlamp Rechargeable',
        'Raincoat Shell',
        'Sepatu Gunung Waterproof',
        'Celana Outdoor',
        'Meja Kursi Lipat',
        'Filter Air Minum',
        'Powerbank 10000mAh',
    ];

    /**
     * Gear brands commonly sold for hiking in Indonesia.
     *
     * @var list<string>
     */
    public const BRANDS = [
        'Deuter',
        'Osprey',
        'Naturehike',
        'EIGER',
        'Black Diamond',
        'Petrom',
        'Arete',
    ];

    /**
     * Daily rental rates in Indonesian rupiah.
     *
     * @var list<int>
     */
    public const DAILY_RATES = [15000, 20000, 25000, 35000, 50000, 75000, 100000];

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = fake()->randomElement(self::NAMES);

        return [
            'name' => $name,
            'slug' => Str::slug($name).'-'.Str::lower(Str::random(6)),
            'brand' => fake()->randomElement(self::BRANDS),
            'description' => fake()->sentence(12),
            'condition' => fake()->randomElement(GearCondition::cases()),
            'daily_rate' => fake()->randomElement(self::DAILY_RATES),
            'deposit_amount' => fake()->randomElement([50000, 100000, 150000, 200000]),
            'stock' => fake()->numberBetween(1, 10),
            'min_rental_days' => 1,
            'max_rental_days' => fake()->randomElement([7, 14, 30]),
            'is_active' => true,
        ];
    }

    /**
     * Indicate that the gear is hidden from the public catalog.
     */
    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
        ]);
    }

    /**
     * Indicate that the gear is in the given condition.
     */
    public function condition(GearCondition $condition): static
    {
        return $this->state(fn (array $attributes) => [
            'condition' => $condition,
        ]);
    }
}
