<?php

namespace App\Models;

use App\GearCondition;
use Database\Factories\GearFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;
use Laravel\Scout\Searchable;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;

/**
 * @property int $id
 * @property string $name
 * @property string $slug
 * @property string|null $brand
 * @property string|null $description
 * @property GearCondition $condition
 * @property string $daily_rate
 * @property string $deposit_amount
 * @property int $stock
 * @property int $min_rental_days
 * @property int|null $max_rental_days
 * @property bool $is_active
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable([
    'name',
    'slug',
    'brand',
    'description',
    'condition',
    'daily_rate',
    'deposit_amount',
    'stock',
    'min_rental_days',
    'max_rental_days',
    'is_active',
])]
class Gear extends Model implements HasMedia
{
    /** @use HasFactory<GearFactory> */
    use HasFactory, InteractsWithMedia, Searchable;

    /**
     * The media collection that holds gear photos.
     */
    public const IMAGE_COLLECTION = 'images';

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'condition' => GearCondition::class,
            'daily_rate' => 'decimal:2',
            'deposit_amount' => 'decimal:2',
            'stock' => 'integer',
            'min_rental_days' => 'integer',
            'max_rental_days' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    /**
     * Register the media collections available to the model.
     */
    public function registerMediaCollections(): void
    {
        $this->addMediaCollection(self::IMAGE_COLLECTION);
    }

    /**
     * Get the attributes that should be indexed for search.
     *
     * @return array<string, mixed>
     */
    public function toSearchableArray(): array
    {
        return [
            'id' => (int) $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'brand' => $this->brand,
            'description' => $this->description,
            'condition' => $this->condition->value,
        ];
    }

    /**
     * Scope a query to only include gear that is available for rental.
     *
     * @param  Builder<Gear>  $query
     * @return Builder<Gear>
     */
    #[Scope]
    protected function active(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }
}
