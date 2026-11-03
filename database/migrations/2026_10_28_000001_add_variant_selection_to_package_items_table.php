<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('package_items', function (Blueprint $table) {
            $table->foreignId('product_id')
                ->nullable()
                ->after('package_id')
                ->constrained()
                ->cascadeOnDelete();
            $table->boolean('allow_variant_selection')
                ->default(false)
                ->after('quantity');
        });

        // Backfill product_id from the fixed variant before requiring it.
        DB::table('package_items')->update([
            'product_id' => DB::raw(
                '(SELECT product_id FROM product_variants WHERE product_variants.id = package_items.product_variant_id)'
            ),
        ]);

        // MySQL keeps the composite unique index as the index backing the
        // package_id foreign key, so a dedicated index must exist before
        // the unique index can be dropped.
        Schema::table('package_items', function (Blueprint $table) {
            $table->index('package_id');
        });

        Schema::table('package_items', function (Blueprint $table) {
            $table->dropUnique(['package_id', 'product_variant_id']);
        });

        Schema::table('package_items', function (Blueprint $table) {
            $table->unsignedBigInteger('product_id')->nullable(false)->change();
            $table->unsignedBigInteger('product_variant_id')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('package_items', function (Blueprint $table) {
            $table->unsignedBigInteger('product_variant_id')->nullable(false)->change();
            $table->unique(['package_id', 'product_variant_id']);
        });

        Schema::table('package_items', function (Blueprint $table) {
            $table->dropIndex(['package_id']);
            $table->dropConstrainedForeignId('product_id');
            $table->dropColumn('allow_variant_selection');
        });
    }
};
