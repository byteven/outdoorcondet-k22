<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Alur penolakan rental (cancel_reason) dan pelangsingan
     * rental_payments: kind derivable dari rentals.payment_type,
     * method selalu qris, alasan penolakan pindah ke rentals,
     * pencatat review cukup reviewed_at tanpa reviewed_by.
     */
    public function up(): void
    {
        Schema::table('rentals', function (Blueprint $table) {
            $table->text('cancel_reason')->nullable()->after('status');
        });

        Schema::table('rental_payments', function (Blueprint $table) {
            $table->dropForeign(['reviewed_by']);
            $table->dropIndex('rental_payments_kind_index');
        });

        Schema::table('rental_payments', function (Blueprint $table) {
            $table->dropColumn(['kind', 'method', 'review_note', 'reviewed_by']);
        });
    }

    public function down(): void
    {
        Schema::table('rental_payments', function (Blueprint $table) {
            $table->enum('kind', ['dp', 'full', 'settlement', 'deposit', 'late_fee_topup'])->after('rental_id');
            $table->enum('method', ['transfer', 'qris', 'cash'])->after('amount');
            $table->text('review_note')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users');
        });

        Schema::table('rentals', function (Blueprint $table) {
            $table->dropColumn('cancel_reason');
        });
    }
};
