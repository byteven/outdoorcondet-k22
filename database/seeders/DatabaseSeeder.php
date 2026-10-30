<?php

namespace Database\Seeders;

use App\Models\Attribute;
use App\Models\Category;
use App\Models\Customer;
use App\Models\User;
use App\UserRole;
use Database\Factories\AttributeFactory;
use Database\Factories\CategoryFactory;
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

        // Akun customer milik pemilik (Vio Salman)
        $vio = User::factory()->create([
            'name' => 'Vio Salman',
            'email' => 'vio@gmail.com',
            'password' => 'Password123321@',
            'role' => UserRole::Customer,
        ]);

        Customer::factory()->create([
            'user_id' => $vio->id,
            'phone_number' => '088225842413',
            'is_verified' => true,
            'is_active' => true,
        ]);

        Customer::factory()->count(18)->create();
        Customer::factory()->count(5)->verified()->create();
        Customer::factory()->count(2)->inactive()->create();

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
            RentalTestSeeder::class,
        ]);
    }
}
