<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Customer;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\ProductVariant;
use App\Models\Rental;
use App\Models\RentalItem;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

/**
 * Seeder untuk test availability system.
 * 
 * Membuat:
 * 1. Kategori "Tenda" dan "Tas"
 * 2. Produk: Tenda 2P, Tenda 4P, Tas Outdoor
 * 3. Variants dengan stok initial
 * 4. Customer demo
 * 5. Rental F: Tenda 2P untuk tanggal 26-28 Oktober 2026
 * 
 * Untuk testing:
 * - Set rental range 26-28 Okt → Tenda 2P harus unavailable (available=0)
 * - Set rental range lain → Tenda 2P harus available
 * - Clear rental range → Tenda 2P kembali available = stock
 */
class RentalTestSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Create categories
        $categoryTenda = Category::firstOrCreate(
            ['name' => 'Tenda'],
            ['slug' => 'tenda']
        );

        $categoryTas = Category::firstOrCreate(
            ['name' => 'Tas'],
            ['slug' => 'tas']
        );

        // 2. Create Tenda 2P product
        $tenda2p = Product::firstOrCreate(
            ['name' => 'Tenda 2P'],
            [
                'category_id' => $categoryTenda->id,
                'slug' => 'tenda-2p',
                'description' => 'Tenda camping untuk 2 orang dengan material tahan cuaca',
                'is_active' => true,
            ]
        );

        // Create variant for Tenda 2P
        $tenda2pVariant = ProductVariant::firstOrCreate(
            ['sku' => 'OC-TND-2P-001'],
            [
                'product_id' => $tenda2p->id,
                'stock' => 5,
                'rental_price_per_day' => 20000,
                'deposit_per_unit' => 50000,
                'is_active' => true,
            ]
        );

        // 3. Create Tenda 4P product
        $tenda4p = Product::firstOrCreate(
            ['name' => 'Tenda 4P'],
            [
                'category_id' => $categoryTenda->id,
                'slug' => 'tenda-4p',
                'description' => 'Tenda camping untuk 4 orang dengan material tahan cuaca',
                'is_active' => true,
            ]
        );

        $tenda4pVariant = ProductVariant::firstOrCreate(
            ['sku' => 'OC-TND-4P-001'],
            [
                'product_id' => $tenda4p->id,
                'stock' => 3,
                'rental_price_per_day' => 35000,
                'deposit_per_unit' => 75000,
                'is_active' => true,
            ]
        );

        // 4. Create Tas Outdoor product
        $tasOutdoor = Product::firstOrCreate(
            ['name' => 'Tas Outdoor 60L'],
            [
                'category_id' => $categoryTas->id,
                'slug' => 'tas-outdoor-60l',
                'description' => 'Tas gunung 60L dengan sistem penyangga ergonomis',
                'is_active' => true,
            ]
        );

        $tasOutdoorVariant = ProductVariant::firstOrCreate(
            ['sku' => 'OC-TAS-60L-001'],
            [
                'product_id' => $tasOutdoor->id,
                'stock' => 8,
                'rental_price_per_day' => 15000,
                'deposit_per_unit' => 30000,
                'is_active' => true,
            ]
        );

        // 5. Create demo customer
        $user = User::firstOrCreate(
            ['email' => 'demo@outdoorcondet.test'],
            [
                'name' => 'Demo Customer',
                'password' => bcrypt('password123'),
                'role' => 'customer',
            ]
        );

        $customer = Customer::firstOrCreate(
            ['user_id' => $user->id],
            [
                'phone_number' => '6281234567890',
                'address' => 'Jl. Demo No. 123, Jakarta',
                'is_active' => true,
            ]
        );

        // 6. Create Rental F: Tenda 2P untuk 26-28 Oktober 2026
        $rentalF = Rental::create([
            'rental_code' => 'OC-SEED-F-QRRM',
            'customer_id' => $customer->id,
            'start_date' => Carbon::create(2026, 10, 26),
            'billing_start_date' => Carbon::create(2026, 10, 26),
            'end_date' => Carbon::create(2026, 10, 28),
            'return_due_at' => Carbon::create(2026, 10, 28, 23, 59, 59),
            'total_days' => 3,
            'rental_amount' => 300000, // 3 hari x 20000/hari x 5 units
            'deposit_amount' => 250000,
            'grand_total' => 550000,
            'payment_type' => 'full',
            'down_payment_amount' => 0,
            'remaining_balance' => 0,
            'payment_deadline_at' => now()->addHours(24),
            'late_fee_per_day' => 50000,
            'deposit_status' => 'held',
            'status' => 'fully_paid',
            'is_self_order' => false,
            'notes' => 'Test rental untuk availability testing - Tenda 2P 26-28 Oct (ALL 5 UNITS)',
        ]);

        // 7. Create rental item: 5x Tenda 2P variant (all units)
        RentalItem::create([
            'rental_id' => $rentalF->id,
            'rentable_type' => ProductVariant::class,
            'rentable_id' => $tenda2pVariant->id,
            'quantity' => 5,
            'unit_price' => 20000,
            'subtotal' => 100000,
            'deposit_per_unit' => 50000,
            'deposit_subtotal' => 250000,
            'return_condition' => null,
        ]);

        // 8. Optional: Create another rental (Tas Outdoor) untuk tanggal overlap
        $rentalG = Rental::create([
            'rental_code' => 'OC-SEED-G-WXYZ',
            'customer_id' => $customer->id,
            'start_date' => Carbon::create(2026, 10, 27),
            'billing_start_date' => Carbon::create(2026, 10, 27),
            'end_date' => Carbon::create(2026, 10, 29),
            'return_due_at' => Carbon::create(2026, 10, 29, 23, 59, 59),
            'total_days' => 3,
            'rental_amount' => 45000, // 3 hari x 15000/hari x 1 unit
            'deposit_amount' => 30000,
            'grand_total' => 75000,
            'payment_type' => 'full',
            'down_payment_amount' => 0,
            'remaining_balance' => 0,
            'payment_deadline_at' => now()->addHours(24),
            'late_fee_per_day' => 50000,
            'deposit_status' => 'held',
            'status' => 'fully_paid',
            'is_self_order' => false,
            'notes' => 'Test rental untuk testing overlap - Tas Outdoor 27-29 Oct',
        ]);

        RentalItem::create([
            'rental_id' => $rentalG->id,
            'rentable_type' => ProductVariant::class,
            'rentable_id' => $tasOutdoorVariant->id,
            'quantity' => 2,
            'unit_price' => 15000,
            'subtotal' => 30000,
            'deposit_per_unit' => 30000,
            'deposit_subtotal' => 60000,
            'return_condition' => null,
        ]);
    }
}
