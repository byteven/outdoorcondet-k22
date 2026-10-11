<?php

namespace App\Models;

use Database\Factories\CustomerFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;

/**
 * @property int $id
 * @property int $user_id
 * @property string|null $identity_number
 * @property string|null $identity_card_path
 * @property string $phone_number
 * @property string|null $address
 * @property bool $is_verified
 * @property bool $is_active
 * @property string|null $identity_card_url
 * @property Carbon|null $deleted_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable([
    'user_id',
    'identity_number',
    'identity_card_path',
    'phone_number',
    'address',
    'is_verified',
    'is_active',
])]
class Customer extends Model
{
    /** @use HasFactory<CustomerFactory> */
    use HasFactory, SoftDeletes;

    /**
     * The accessors to append to the model's array form.
     *
     * @var list<string>
     */
    protected $appends = ['identity_card_url'];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_verified' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    /**
     * The user account that owns this customer profile.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Public URL of the identity card photo, if any.
     */
    protected function identityCardUrl(): Attribute
    {
        return Attribute::get(
            fn (): ?string => $this->identity_card_path ? Storage::url($this->identity_card_path) : null,
        );
    }

    /**
     * Scope a query to only include verified customers.
     *
     * @param  Builder<Customer>  $query
     * @return Builder<Customer>
     */
    #[Scope]
    protected function verified(Builder $query): Builder
    {
        return $query->where('is_verified', true);
    }

    /**
     * Scope a query to only include active customers.
     *
     * @param  Builder<Customer>  $query
     * @return Builder<Customer>
     */
    #[Scope]
    protected function active(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope a query to search by name, email, or phone number.
     *
     * @param  Builder<Customer>  $query
     * @return Builder<Customer>
     */
    #[Scope]
    protected function search(Builder $query, string $term): Builder
    {
        return $query->where(function (Builder $query) use ($term): void {
            $query->where('phone_number', 'like', "%{$term}%")
                ->orWhereHas('user', function (Builder $query) use ($term): void {
                    $query->where('name', 'like', "%{$term}%")
                        ->orWhere('email', 'like', "%{$term}%");
                });
        });
    }
}
