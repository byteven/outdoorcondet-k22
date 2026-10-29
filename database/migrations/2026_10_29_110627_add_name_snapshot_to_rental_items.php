<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Snapshot nama item saat checkout: tampilan rental tidak lagi
     * bergantung pada keberadaan produk di master data.
     */
    public function up(): void
    {
        Schema::table('rental_items', function (Blueprint $table) {
            $table->string('name')->nullable()->after('rentable_id');
        });
    }

    public function down(): void
    {
        Schema::table('rental_items', function (Blueprint $table) {
            $table->dropColumn('name');
        });
    }
};
