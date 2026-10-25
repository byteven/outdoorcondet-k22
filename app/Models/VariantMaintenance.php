<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VariantMaintenance extends Model
{
    protected $table = 'variant_maintenances';

    protected $fillable = [
        'product_variant_id',
        'rental_item_id',
        'quantity',
        'reason',
        'status',
        'notes',
        'completed_at',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'completed_at' => 'datetime',
    ];

    public function variant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class, 'product_variant_id');
    }

    public function rentalItem(): BelongsTo
    {
        return $this->belongsTo(RentalItem::class);
    }
}
