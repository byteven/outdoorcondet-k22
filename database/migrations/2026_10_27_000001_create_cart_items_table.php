<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cart_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('rentable_type');
            $table->unsignedBigInteger('rentable_id');
            $table->unsignedInteger('quantity')->default(1);
            $table->date('pickup_date');
            $table->date('return_date');
            $table->timestamps();

            // Satu baris per item rentable; rentang tanggal + quantity
            // tersimpan di baris tersebut dan diperbarui lewat request.
            $table->unique(
                ['user_id', 'rentable_type', 'rentable_id'],
                'cart_items_unique_rentable',
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cart_items');
    }
};
