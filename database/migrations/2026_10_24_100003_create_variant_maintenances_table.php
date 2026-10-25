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
        Schema::create('variant_maintenances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_variant_id')->constrained('product_variants')->cascadeOnDelete();
            $table->foreignId('rental_item_id')->nullable()->constrained('rental_items')->cascadeOnDelete();
            
            $table->integer('quantity'); // Berapa unit dalam maintenance
            $table->enum('reason', ['cleaning', 'repair', 'inspection']);
            $table->enum('status', ['in_maintenance', 'ready'])->default('in_maintenance');
            
            $table->text('notes')->nullable();
            $table->dateTime('completed_at')->nullable();
            
            $table->timestamps();
            
            // Indexes
            $table->index('product_variant_id');
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('variant_maintenances');
    }
};
