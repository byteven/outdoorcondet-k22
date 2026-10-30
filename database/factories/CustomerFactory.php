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
            'emergency_contact' => '628'.fake()->numerify('########').' (Orang Tua)',
            'social_media' => 'https://instagram.com/'.fake()->unique()->bothify('user####'),
            'phone_number' => '62'.fake()->numerify('8##########'),
            'address' => 'Jl. '.fake()->randomElement([
                'Condet Raya',
                'Batu Ampar',
                'Kayu Manis',
                'Gedong',
                'Cililitan',
            ]).' No. '.fake()->numberBetween(1, 200).', Jakarta Timur',
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
            'emergency_contact' => $attributes['emergency_contact'] ?? ('628'.fake()->numerify('########').' (Orang Tua)'),
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
