<?php

namespace Database\Seeders;

use App\Models\Attribute;
use App\Models\Category;
use App\Models\Customer;
use App\Models\Gear;
use App\Models\User;
use App\UserRole;
use Database\Factories\AttributeFactory;
use Database\Factories\CategoryFactory;
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

        User::factory()->create([
            'name' => 'Admin OutdoorCondet',
            'email' => 'admin@outdoorcondet.test',
            'role' => UserRole::Admin,
        ]);

        User::factory()->create([
            'name' => 'Admin',
            'email' => 'admin@gmail.com',
            'password' => 'Admin123321@',
            'role' => UserRole::Admin,
        ]);

        Customer::factory()->count(18)->create();
        Customer::factory()->count(5)->verified()->create();
        Customer::factory()->count(2)->inactive()->create();

        foreach (GearFactory::NAMES as $name) {
            Gear::factory()->create([
                'name' => $name,
                'slug' => Str::slug($name),
            ]);
        }

        foreach (CategoryFactory::CATEGORY_NAMES as $categoryName) {
            Category::firstOrCreate(
                ['slug' => Str::slug($categoryName)],
                [
                    'name' => $categoryName,
                    'description' => "Koleksi {$categoryName} berkualitas untuk kegiatan camping & outdoor.",
                ],
            );
        }

        foreach (AttributeFactory::ATTRIBUTE_NAMES as $attributeName) {
            Attribute::firstOrCreate(
                ['name' => $attributeName],
                [
                    'description' => "Master atribut varian {$attributeName} untuk produk rental.",
                ],
            );
        }

        $this->call([
            ProductSeeder::class,
            PackageSeeder::class,
        ]);
    }
}
