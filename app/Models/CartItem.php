<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $user_id
 * @property class-string<Model> $rentable_type
 * @property int $rentable_id
 * @property int $quantity
 * @property Carbon $pickup_date
 * @property Carbon $return_date
 * @property array<string, int>|null $variant_selections
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property User $user
 * @property ProductVariant|Package $rentable
 */
#[Fillable(['user_id', 'rentable_type', 'rentable_id', 'quantity', 'pickup_date', 'return_date', 'variant_selections'])]
class CartItem extends Model
{
    /** @use HasFactory<CartItemFactory> */
    use HasFactory;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'quantity' => 'integer',
            'pickup_date' => 'date:Y-m-d',
            'return_date' => 'date:Y-m-d',
            'variant_selections' => 'array',
        ];
    }

    /**
     * The owner of this cart item.
     *
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * The rented unit: a product variant or a package.
     *
     * @return MorphTo<ProductVariant|Package, $this>
     */
    public function rentable(): MorphTo
    {
        return $this->morphTo();
    }
}
