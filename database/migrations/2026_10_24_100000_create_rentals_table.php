<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('rentals', function (Blueprint $table) {
            $table->id();
            $table->string('rental_code')->unique();
            $table->foreignId('customer_id')->nullable()->constrained('customers')->cascadeOnDelete();
            
            // Tanggal sewa (date range saja, jam ambil tidak di-track)
            $table->date('start_date'); // Tanggal ambil fisik
            $table->date('billing_start_date'); // Tanggal mulai hitung (sama dengan start_date untuk shop 18:00-23:59)
            $table->date('end_date'); // Tanggal kembali
            $table->dateTime('return_due_at'); // end_date pukul 23:59
            
            // Waktu konfirmasi (tidak ada pickup_at karena jam ambil tidak di-track)
            $table->dateTime('picked_up_at')->nullable(); // Confirmasi ambil oleh admin (tanpa jam spesifik)
            $table->dateTime('returned_at')->nullable(); // Confirmasi kembali oleh admin
            $table->enum('return_confirmed_by', ['admin', 'system'])->nullable();
            $table->dateTime('return_confirmed_at')->nullable();
            $table->dateTime('stock_release_at')->nullable(); // Kapan stok ready (= returned_at + buffer + 1 hari jam 00:00)
            
            // Durasi & total hari
            $table->integer('total_days');
            
            // Nilai finansial
            $table->decimal('rental_amount', 12, 2); // Biaya sewa (tanpa deposit)
            $table->decimal('deposit_amount', 12, 2)->default(0); // Deposit
            $table->decimal('grand_total', 12, 2); // Total keseluruhan (rental + deposit)
            
            // Pembayaran
            $table->enum('payment_type', ['full', 'down_payment'])->default('full');
            $table->decimal('down_payment_amount', 12, 2)->default(0);
            $table->decimal('remaining_balance', 12, 2)->default(0); // Sisa biaya sewa (tidak termasuk deposit)
            $table->dateTime('payment_deadline_at');
            
            // Denda keterlambatan
            $table->decimal('late_fee_per_day', 12, 2)->default(0); // Snapshot dari config
            $table->integer('late_days')->default(0);
            $table->decimal('late_fee_amount', 12, 2)->default(0);
            
            // Deposit handling
            $table->enum('deposit_status', ['pending', 'held', 'refunded', 'partially_refunded', 'forfeited'])->default('pending');
            $table->dateTime('deposit_received_at')->nullable();
            $table->decimal('damage_deduction_amount', 12, 2)->default(0);
            $table->decimal('deposit_refund_amount', 12, 2)->default(0);
            
            // Pembatalan & refund
            $table->text('cancel_reason')->nullable();
            $table->decimal('refund_amount', 12, 2)->default(0);
            
            // Status & metadata
            $table->enum('status', [
                'pending_payment',
                'waiting_confirmation',
                'dp_paid',
                'fully_paid',
                'picked_up',
                'returned',
                'completed',
                'cancelled'
            ])->default('pending_payment');
            $table->boolean('is_self_order')->default(false);
            $table->text('notes')->nullable();
            
            $table->timestamps();
            
            // Indexes
            $table->index('customer_id');
            $table->index('status');
            $table->index('start_date');
            $table->index('end_date');
            $table->index('payment_deadline_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('rentals');
    }
};
