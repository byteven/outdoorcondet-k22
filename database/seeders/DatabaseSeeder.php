<?php

namespace Database\Seeders;

use App\Models\Gear;
use App\Models\User;
use Database\Factories\GearFactory;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

        User::factory()->create([
            'name' => 'Test User',
            'email' => 'test@example.com',
        ]);

        foreach (GearFactory::NAMES as $name) {
            Gear::factory()->create([
                'name' => $name,
                'slug' => Str::slug($name),
            ]);
        }
    }
}
