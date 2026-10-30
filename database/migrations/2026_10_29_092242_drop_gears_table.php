<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tabel gears tidak lagi dipakai (sistem katalog memakai
     * products + product_variants).
     */
    public function up(): void
    {
        Schema::dropIfExists('gears');
    }

    public function down(): void
    {
        // Tidak dibuat ulang: migration create gears sudah dihapus.
    }
};
