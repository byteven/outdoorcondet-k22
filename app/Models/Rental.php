<?php

namespace App\Models;

use Database\Factories\RentalFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Rental extends Model
{
    /** @use HasFactory<RentalFactory> */
    use HasFactory;

    protected $fillable = [
        'rental_code',
        'customer_id',
        'start_date',
        'billing_start_date',
        'end_date',
        'return_due_at',
        'picked_up_at',
        'returned_at',
        'return_confirmed_by',
        'return_confirmed_at',
        'stock_release_at',
        'total_days',
        'rental_amount',
        'deposit_amount',
        'grand_total',
        'payment_type',
        'down_payment_amount',
        'remaining_balance',
        'payment_deadline_at',
        'late_fee_per_day',
        'late_days',
        'late_fee_amount',
        'deposit_status',
        'deposit_received_at',
        'damage_deduction_amount',
        'deposit_refund_amount',
        'cancel_reason',
        'refund_amount',
        'status',
        'is_self_order',
        'notes',
    ];

    protected $casts = [
        'start_date' => 'date',
        'billing_start_date' => 'date',
        'end_date' => 'date',
        'return_due_at' => 'datetime',
        'picked_up_at' => 'datetime',
        'returned_at' => 'datetime',
        'return_confirmed_at' => 'datetime',
        'stock_release_at' => 'datetime',
        'payment_deadline_at' => 'datetime',
        'deposit_received_at' => 'datetime',
        'rental_amount' => 'decimal:2',
        'deposit_amount' => 'decimal:2',
        'grand_total' => 'decimal:2',
        'down_payment_amount' => 'decimal:2',
        'remaining_balance' => 'decimal:2',
        'late_fee_per_day' => 'decimal:2',
        'late_fee_amount' => 'decimal:2',
        'damage_deduction_amount' => 'decimal:2',
        'deposit_refund_amount' => 'decimal:2',
        'refund_amount' => 'decimal:2',
        'is_self_order' => 'boolean',
    ];

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(RentalItem::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(RentalPayment::class);
    }
}
