<?php

namespace Database\Factories;

use App\Models\Attribute;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Attribute>
 */
class AttributeFactory extends Factory
{
    /**
     * Master jenis atribut varian produk outdoor.
     *
     * @var list<string>
     */
    public const ATTRIBUTE_NAMES = [
        'Warna',
        'Ukuran',
        'Kapasitas',
        'Bahan Material',
        'Daya Listrik',
        'Panjang',
        'Berat Maksimal',
    ];

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $baseName = fake()->randomElement(self::ATTRIBUTE_NAMES);
        $name = $baseName . ' ' . fake()->unique()->numberBetween(1, 99999);

        return [
            'name' => $name,
            'description' => fake()->sentence(6),
        ];
    }
}

