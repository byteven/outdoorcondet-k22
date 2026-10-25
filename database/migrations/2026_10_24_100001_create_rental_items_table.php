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
        Schema::create('rental_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('rental_id')->constrained('rentals')->cascadeOnDelete();
            
            // Polymorphic: ProductVariant atau Package
            $table->string('rentable_type'); // 'App\Models\ProductVariant' atau 'App\Models\Package'
            $table->unsignedBigInteger('rentable_id');
            
            $table->integer('quantity');
            $table->decimal('unit_price', 12, 2); // Harga per unit untuk durasi total
            $table->json('price_breakdown')->nullable(); // Snapshot rincian tier yang dipakai
            $table->decimal('subtotal', 12, 2); // quantity × unit_price
            
            // Deposit
            $table->decimal('deposit_per_unit', 12, 2)->default(0);
            $table->decimal('deposit_subtotal', 12, 2)->default(0); // quantity × deposit_per_unit
            
            // Return condition (untuk return inspector)
            $table->enum('return_condition', ['good', 'damaged', 'lost'])->nullable();
            $table->boolean('needs_maintenance')->default(false);
            
            $table->timestamps();
            
            // Indexes
            $table->index('rental_id');
            $table->index(['rentable_type', 'rentable_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('rental_items');
    }
};
