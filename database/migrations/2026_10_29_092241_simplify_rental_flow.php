<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Sederhanakan alur rental: tanpa pencatatan pickup (barang diambil
     * bebas setelah pembayaran dikonfirmasi) dan tanpa kolom yang tidak
     * dipakai alur mana pun. Admin hanya mencatat konfirmasi pembayaran
     * dan konfirmasi pengembalian.
     */
    public function up(): void
    {
        Schema::table('rentals', function (Blueprint $table) {
            $table->dropColumn([
                'billing_start_date',
                'return_due_at',
                'picked_up_at',
                'deposit_status',
                'deposit_received_at',
                'damage_deduction_amount',
                'deposit_refund_amount',
                'cancel_reason',
                'refund_amount',
                'is_self_order',
                'notes',
            ]);
        });

        Schema::table('rentals', function (Blueprint $table) {
            // picked_up & completed dihapus: setelah dibayar barang langsung
            // diambil (tanpa dicatat), status berakhir di returned.
            $table->enum('status', [
                'pending_payment',
                'waiting_confirmation',
                'dp_paid',
                'fully_paid',
                'returned',
                'cancelled',
            ])->default('pending_payment')->change();
        });
    }

    public function down(): void
    {
        Schema::table('rentals', function (Blueprint $table) {
            $table->enum('status', [
                'pending_payment',
                'waiting_confirmation',
                'dp_paid',
                'fully_paid',
                'picked_up',
                'returned',
                'completed',
                'cancelled',
            ])->default('pending_payment')->change();

            $table->date('billing_start_date')->after('start_date');
            $table->dateTime('return_due_at')->after('end_date');
            $table->dateTime('picked_up_at')->nullable()->after('return_due_at');
            $table->enum('deposit_status', ['pending', 'held', 'refunded', 'partially_refunded', 'forfeited'])->default('pending');
            $table->dateTime('deposit_received_at')->nullable();
            $table->decimal('damage_deduction_amount', 12, 2)->default(0);
            $table->decimal('deposit_refund_amount', 12, 2)->default(0);
            $table->text('cancel_reason')->nullable();
            $table->decimal('refund_amount', 12, 2)->default(0);
            $table->boolean('is_self_order')->default(false);
            $table->text('notes')->nullable();
        });
    }
};
