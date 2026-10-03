<?php

use App\GearCondition;
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
        Schema::create('gears', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('brand')->nullable();
            $table->text('description')->nullable();
            $table->enum('condition', GearCondition::cases())->default(GearCondition::Good->value);
            $table->decimal('daily_rate', 12, 2);
            $table->decimal('deposit_amount', 12, 2)->default(0);
            $table->unsignedSmallInteger('stock')->default(1);
            $table->unsignedSmallInteger('min_rental_days')->default(1);
            $table->unsignedSmallInteger('max_rental_days')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('gears');
    }
};
