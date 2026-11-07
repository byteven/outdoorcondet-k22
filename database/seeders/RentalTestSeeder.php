<?php

namespace Database\Seeders;

use App\Models\Customer;
use App\Models\ProductVariant;
use App\Models\Rental;
use App\Models\RentalItem;
use App\Models\RentalPayment;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;

/**
 * Seeder untuk pengujian sistem availability dan order history.
 *
 * Produk yang dipesan: Tenda Tunnel (OC-TND-TUN) — semua unit (stock 4)
 * Periode rental    : 20 – 23 Januari 2027 (total_days = 3)
 * Customer         : vio@gmail.com
 *
 * Skenario:
 * 1. Rental pending_payment - untuk test availability (stok unavailable)
 * 2. Rental dengan semua status - untuk test order history
 *
 * Cara test:
 * - Set rental range 20-23 Jan → Tenda Tunnel harus unavailable (available = 0)
 * - Set rental range di luar tanggal tersebut → Tenda Tunnel kembali available
 * - Clear rental range → available = stock (4 unit)
 * - Order history menampilkan semua status untuk vio@gmail.com
 */
class RentalTestSeeder extends Seeder
{
    public function run(): void
    {
        // Ambil produk Tenda Tunnel yang sudah di-seed oleh ProductSeeder
        $tunnelVariant = ProductVariant::query()
            ->where('sku', 'OC-TND-TUN')
            ->firstOrFail();

        // Ambil customer vio@gmail.com
        $vioUser = User::query()->where('email', 'vio@gmail.com')->firstOrFail();
        $vioCustomer = $vioUser->customer;

        // Hapus rental test yang lama
        Rental::query()
            ->where('rental_code', 'LIKE', 'OC-TEST-%')
            ->delete();

        // Copy payment proof dari public seed ke private storage untuk testing
        $sourceProofPath = storage_path('app/public/seed/products/payment-proof.webp');
        $targetProofPath = 'rental-payments/seed-payment-proof.webp';
        
        if (File::isFile($sourceProofPath)) {
            Storage::disk('local')->put($targetProofPath, File::get($sourceProofPath));
        }

        // Hapus rental test yang lama
        Rental::query()
            ->where('rental_code', 'LIKE', 'OC-TEST-%')
            ->delete();

        // === 1. RENTAL PENDING PAYMENT (untuk test availability) ===
        $rental1 = Rental::create([
            'rental_code' => 'OC-TEST-JAN2027-001',
            'customer_id' => $vioCustomer->id,
            'start_date' => Carbon::create(2027, 1, 20),
            'end_date' => Carbon::create(2027, 1, 23),
            'total_days' => 3,
            'rental_amount' => 248000,
            'deposit_amount' => 240000,
            'grand_total' => 488000,
            'payment_type' => 'full',
            'down_payment_amount' => 0,
            'remaining_balance' => 0,
            'payment_deadline_at' => now()->addMinutes(30),
            'late_fee_per_day' => 75000,
            'status' => 'pending_payment',
        ]);

        RentalItem::create([
            'rental_id' => $rental1->id,
            'rentable_type' => ProductVariant::class,
            'rentable_id' => $tunnelVariant->id,
            'quantity' => $tunnelVariant->stock,
            'unit_price' => 62000,
            'subtotal' => 248000,
            'deposit_per_unit' => 60000,
            'deposit_subtotal' => 240000,
            'return_condition' => null,
        ]);

        // RentalPayment untuk pending_payment (status: waiting, tanpa proof_path)
        RentalPayment::create([
            'rental_id' => $rental1->id,
            'amount' => 488000, // full payment
            'proof_path' => null, // belum upload
            'status' => 'waiting',
        ]);

        // === 2. RENTAL WAITING CONFIRMATION ===
        $rental2 = Rental::create([
            'rental_code' => 'OC-TEST-JAN2027-002',
            'customer_id' => $vioCustomer->id,
            'start_date' => Carbon::create(2027, 1, 15),
            'end_date' => Carbon::create(2027, 1, 17),
            'total_days' => 2,
            'rental_amount' => 50000,
            'deposit_amount' => 60000,
            'grand_total' => 110000,
            'payment_type' => 'down_payment',
            'down_payment_amount' => 25000,
            'remaining_balance' => 25000,
            'payment_deadline_at' => now()->subHours(1),
            'late_fee_per_day' => 75000,
            'status' => 'waiting_confirmation',
        ]);

        RentalItem::create([
            'rental_id' => $rental2->id,
            'rentable_type' => ProductVariant::class,
            'rentable_id' => $tunnelVariant->id,
            'quantity' => 1,
            'unit_price' => 50000,
            'subtotal' => 50000,
            'deposit_per_unit' => 60000,
            'deposit_subtotal' => 60000,
            'return_condition' => null,
        ]);

        RentalPayment::create([
            'rental_id' => $rental2->id,
            'amount' => 25000,
            'proof_path' => $targetProofPath,
            'status' => 'waiting',
        ]);

        // === 3. RENTAL DP PAID (Siap diambil) ===
        $rental3 = Rental::create([
            'rental_code' => 'OC-TEST-JAN2027-003',
            'customer_id' => $vioCustomer->id,
            'start_date' => Carbon::create(2027, 1, 25),
            'end_date' => Carbon::create(2027, 1, 28),
            'total_days' => 3,
            'rental_amount' => 62000,
            'deposit_amount' => 60000,
            'grand_total' => 122000,
            'payment_type' => 'down_payment',
            'down_payment_amount' => 31000,
            'remaining_balance' => 31000,
            'payment_deadline_at' => now()->subHours(2),
            'late_fee_per_day' => 75000,
            'status' => 'dp_paid',
        ]);

        RentalItem::create([
            'rental_id' => $rental3->id,
            'rentable_type' => ProductVariant::class,
            'rentable_id' => $tunnelVariant->id,
            'quantity' => 1,
            'unit_price' => 62000,
            'subtotal' => 62000,
            'deposit_per_unit' => 60000,
            'deposit_subtotal' => 60000,
            'return_condition' => null,
        ]);

        RentalPayment::create([
            'rental_id' => $rental3->id,
            'amount' => 31000,
            'proof_path' => $targetProofPath,
            'status' => 'approved',
            'reviewed_at' => now()->subHours(1),
        ]);

        // === 4. RENTAL FULLY PAID (Siap diambil) ===
        $rental4 = Rental::create([
            'rental_code' => 'OC-TEST-JAN2027-004',
            'customer_id' => $vioCustomer->id,
            'start_date' => Carbon::create(2027, 1, 10),
            'end_date' => Carbon::create(2027, 1, 12),
            'total_days' => 2,
            'rental_amount' => 50000,
            'deposit_amount' => 60000,
            'grand_total' => 110000,
            'payment_type' => 'full',
            'down_payment_amount' => 0,
            'remaining_balance' => 0,
            'payment_deadline_at' => now()->subDays(1),
            'late_fee_per_day' => 75000,
            'status' => 'fully_paid',
        ]);

        RentalItem::create([
            'rental_id' => $rental4->id,
            'rentable_type' => ProductVariant::class,
            'rentable_id' => $tunnelVariant->id,
            'quantity' => 1,
            'unit_price' => 50000,
            'subtotal' => 50000,
            'deposit_per_unit' => 60000,
            'deposit_subtotal' => 60000,
            'return_condition' => null,
        ]);

        RentalPayment::create([
            'rental_id' => $rental4->id,
            'amount' => 50000,
            'proof_path' => $targetProofPath,
            'status' => 'approved',
            'reviewed_at' => now()->subDays(1),
        ]);

        // === 5. RENTAL RETURNED (Selesai) ===
        $rental5 = Rental::create([
            'rental_code' => 'OC-TEST-JAN2027-005',
            'customer_id' => $vioCustomer->id,
            'start_date' => Carbon::create(2027, 1, 5),
            'end_date' => Carbon::create(2027, 1, 7),
            'total_days' => 2,
            'rental_amount' => 50000,
            'deposit_amount' => 60000,
            'grand_total' => 110000,
            'payment_type' => 'full',
            'down_payment_amount' => 0,
            'remaining_balance' => 0,
            'payment_deadline_at' => Carbon::create(2027, 1, 4, 12, 30),
            'late_fee_per_day' => 75000,
            'late_days' => 0,
            'late_fee_amount' => 0,
            'status' => 'returned',
            'returned_at' => Carbon::create(2027, 1, 7, 22, 0),
            'stock_release_at' => Carbon::create(2027, 1, 9, 0, 0),
        ]);

        RentalItem::create([
            'rental_id' => $rental5->id,
            'rentable_type' => ProductVariant::class,
            'rentable_id' => $tunnelVariant->id,
            'quantity' => 1,
            'unit_price' => 50000,
            'subtotal' => 50000,
            'deposit_per_unit' => 60000,
            'deposit_subtotal' => 60000,
            'return_condition' => 'good',
        ]);

        RentalPayment::create([
            'rental_id' => $rental5->id,
            'amount' => 50000,
            'proof_path' => $targetProofPath,
            'status' => 'approved',
            'reviewed_at' => Carbon::create(2027, 1, 4, 12, 0),
        ]);

        // === 6. RENTAL CANCELLED (Dibatalkan karena timeout) ===
        $rental6 = Rental::create([
            'rental_code' => 'OC-TEST-JAN2027-006',
            'customer_id' => $vioCustomer->id,
            'start_date' => Carbon::create(2027, 1, 30),
            'end_date' => Carbon::create(2027, 1, 31),
            'total_days' => 1,
            'rental_amount' => 25000,
            'deposit_amount' => 60000,
            'grand_total' => 85000,
            'payment_type' => 'full',
            'down_payment_amount' => 0,
            'remaining_balance' => 0,
            'payment_deadline_at' => now()->subHours(5),
            'late_fee_per_day' => 75000,
            'status' => 'cancelled',
            'cancel_reason' => 'Batas waktu pembayaran 30 menit terlewat.',
        ]);

        RentalItem::create([
            'rental_id' => $rental6->id,
            'rentable_type' => ProductVariant::class,
            'rentable_id' => $tunnelVariant->id,
            'quantity' => 1,
            'unit_price' => 25000,
            'subtotal' => 25000,
            'deposit_per_unit' => 60000,
            'deposit_subtotal' => 60000,
            'return_condition' => null,
        ]);
    }
}
