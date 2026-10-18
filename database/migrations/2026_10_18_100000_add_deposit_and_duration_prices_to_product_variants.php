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
        Schema::table('product_variants', function (Blueprint $table) {
            $table->decimal('deposit_per_unit', 12, 2)->default(0)->after('rental_price_per_day');
        });

        Schema::create('variant_duration_prices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_variant_id')->constrained('product_variants')->cascadeOnDelete();
            $table->unsignedInteger('duration_days');
            $table->decimal('price', 12, 2);
            $table->timestamps();

            $table->unique(['product_variant_id', 'duration_days']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('variant_duration_prices');

        Schema::table('product_variants', function (Blueprint $table) {
            $table->dropColumn('deposit_per_unit');
        });
    }
};
