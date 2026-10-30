<?php

namespace Database\Seeders;

use App\Models\Customer;
use App\Models\ProductVariant;
use App\Models\Rental;
use App\Models\RentalItem;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

/**
 * Seeder untuk pengujian sistem availability.
 *
 * Produk yang dipesan: Tenda Tunnel (OC-TND-TUN) — semua unit (stock 4)
 * Periode rental    : 20 – 23 November 2026 (total_days = 3)
 *
 * Cara test:
 * - Set rental range 20-23 Nov → Tenda Tunnel harus unavailable (available = 0)
 * - Set rental range di luar tanggal tersebut → Tenda Tunnel kembali available
 * - Clear rental range → available = stock (4 unit)
 */
class RentalTestSeeder extends Seeder
{
    public function run(): void
    {
        // Ambil produk Tenda Tunnel yang sudah di-seed oleh ProductSeeder
        $tunnelVariant = ProductVariant::query()
            ->where('sku', 'OC-TND-TUN')
            ->firstOrFail();

        // Ambil sembarang customer untuk dijadikan pemesan
        $customer = Customer::query()->firstOrFail();

        Rental::query()->where('rental_code', 'OC-TEST-NOV2026-TUN')->delete();

        $rental = Rental::create([
            'rental_code' => 'OC-TEST-NOV2026-TUN',
            'customer_id' => $customer->id,
            'start_date' => Carbon::create(2026, 11, 20),
            'end_date' => Carbon::create(2026, 11, 23),
            'total_days' => 3,
            'rental_amount' => 248000,      // 4 unit × 62.000 (harga promo 3 hari)
            'deposit_amount' => 240000,     // 4 unit × 60.000
            'grand_total' => 488000,
            'payment_type' => 'full',
            'down_payment_amount' => 0,
            'remaining_balance' => 0,
            'payment_deadline_at' => now()->addMinutes(30),
            'late_fee_per_day' => 75000,
            'status' => 'pending_payment',
        ]);

        RentalItem::create([
            'rental_id' => $rental->id,
            'rentable_type' => ProductVariant::class,
            'rentable_id' => $tunnelVariant->id,
            'quantity' => $tunnelVariant->stock,          // semua unit = 4
            'unit_price' => 62000,
            'subtotal' => 62000 * $tunnelVariant->stock,
            'deposit_per_unit' => 60000,
            'deposit_subtotal' => 60000 * $tunnelVariant->stock,
            'return_condition' => null,
        ]);
    }
}
