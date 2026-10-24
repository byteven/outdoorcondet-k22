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
        Schema::create('rental_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('rental_id')->constrained('rentals')->cascadeOnDelete();
            
            // Jenis pembayaran
            $table->enum('kind', ['dp', 'full', 'settlement', 'deposit', 'late_fee_topup']);
            $table->decimal('amount', 12, 2);
            $table->enum('method', ['transfer', 'qris', 'cash']);
            
            // Bukti pembayaran (opsional untuk tunai)
            $table->string('proof_path')->nullable();
            
            // Review status
            $table->enum('status', ['waiting', 'approved', 'rejected'])->default('waiting');
            $table->text('review_note')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users');
            $table->dateTime('reviewed_at')->nullable();
            
            $table->timestamps();
            
            // Indexes
            $table->index('rental_id');
            $table->index('status');
            $table->index('kind');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('rental_payments');
    }
};
