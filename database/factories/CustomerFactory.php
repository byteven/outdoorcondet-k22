<?php

namespace Database\Factories;

use App\Models\Customer;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Customer>
 */
class CustomerFactory extends Factory
{
    /**
     * Nama Indonesia untuk data seed.
     *
     * @var list<string>
     */
    public const INDONESIAN_NAMES = [
        'Udin Saputra',
        'Ibnu Hajar',
        'Budi Santoso',
        'Siti Aminah',
        'Agus Wijaya',
        'Dewi Lestari',
        'Rina Marlina',
        'Joko Prasetyo',
        'Slamet Riyadi',
        'Wahyu Hidayat',
        'Fitri Handayani',
        'Andi Nugraha',
        'Maya Putri',
        'Rizky Ramadhan',
        'Dian Puspita',
        'Hendra Gunawan',
        'Yuni Astuti',
        'Tono Supriadi',
        'Ratna Sari',
        'Dedi Kurniawan',
        'Eko Saputra',
        'Nur Halimah',
        'Fajar Setiawan',
        'Intan Permata',
        'Bambang Sutrisno',
    ];

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory()->state([
                'name' => fake()->randomElement(self::INDONESIAN_NAMES),
            ]),
            'identity_number' => fake()->optional()->numerify('################'),
            'identity_card_path' => null,
            'phone_number' => '62'.fake()->numerify('8##########'),
            'address' => fake()->optional()->address(),
            'is_verified' => true,
            'is_active' => true,
        ];
    }

    /**
     * Indicate that the customer has passed identity verification.
     */
    public function verified(): static
    {
        return $this->state(fn (array $attributes) => [
            'identity_number' => $attributes['identity_number'] ?? fake()->numerify('################'),
            'is_verified' => true,
        ]);
    }

    /**
     * Indicate that the customer account is deactivated.
     */
    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
        ]);
    }
}
