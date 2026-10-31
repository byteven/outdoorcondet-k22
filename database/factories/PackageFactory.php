<?php

namespace Database\Factories;

use App\Models\Package;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Package>
 */
class PackageFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = fake()->randomElement([
            'Paket Camping Dasar',
            'Paket Hiking Ringkas',
            'Paket Keluarga',
        ]).' '.fake()->unique()->numberBetween(1, 99999);

        return [
            'name' => $name,
            'slug' => Str::slug($name),
            'description' => fake()->sentence(8),
            'daily_price' => fake()->randomElement([30000, 55000, 95000]),
            'deposit_per_package' => fake()->randomElement([80000, 150000, 250000]),
            'is_active' => true,
        ];
    }
}
