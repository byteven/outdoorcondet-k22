<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class RentalItem extends Model
{
    protected $fillable = [
        'rental_id',
        'rentable_type',
        'rentable_id',
        'name',
        'quantity',
        'unit_price',
        'price_breakdown',
        'subtotal',
        'deposit_per_unit',
        'deposit_subtotal',
        'return_condition',
        'needs_maintenance',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'unit_price' => 'decimal:2',
        'price_breakdown' => 'json',
        'subtotal' => 'decimal:2',
        'deposit_per_unit' => 'decimal:2',
        'deposit_subtotal' => 'decimal:2',
        'needs_maintenance' => 'boolean',
    ];

    public function rental(): BelongsTo
    {
        return $this->belongsTo(Rental::class);
    }

    public function rentable(): MorphTo
    {
        return $this->morphTo();
    }

    public function maintenances(): HasMany
    {
        return $this->hasMany(VariantMaintenance::class);
    }
}
