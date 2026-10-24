<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $package_id
 * @property int $duration_days
 * @property string $price
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['package_id', 'duration_days', 'price'])]
class PackageDurationPrice extends Model
{
    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'duration_days' => 'integer',
            'price' => 'decimal:2',
        ];
    }

    /**
     * @return BelongsTo<Package, $this>
     */
    public function package(): BelongsTo
    {
        return $this->belongsTo(Package::class);
    }
}
