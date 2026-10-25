<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $name
 * @property string $slug
 * @property string|null $description
 * @property string $daily_price
 * @property string $deposit_per_package
 * @property string|null $image_path
 * @property bool $is_active
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['name', 'slug', 'description', 'daily_price', 'deposit_per_package', 'image_path', 'is_active'])]
class Package extends Model
{
    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'daily_price' => 'decimal:2',
            'deposit_per_package' => 'decimal:2',
            'is_active' => 'boolean',
        ];
    }

    /**
     * @return HasMany<PackageItem, $this>
     */
    public function items(): HasMany
    {
        return $this->hasMany(PackageItem::class);
    }

    /**
     * @return HasMany<PackageDurationPrice, $this>
     */
    public function durationPrices(): HasMany
    {
        return $this->hasMany(PackageDurationPrice::class);
    }

    /**
     * Scope a query to only include active packages.
     *
     * @param  Builder<Package>  $query
     * @return Builder<Package>
     */
    #[Scope]
    protected function active(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }
}
