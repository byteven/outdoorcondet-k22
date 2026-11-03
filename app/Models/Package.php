<?php

namespace App\Models;

use Database\Factories\PackageFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;

/**
 * @property int $id
 * @property string $name
 * @property string $slug
 * @property string|null $description
 * @property string $daily_price
 * @property string $deposit_per_package
 * @property string|null $image_path
 * @property bool $is_active
 * @property Carbon|null $deleted_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['name', 'slug', 'description', 'daily_price', 'deposit_per_package', 'image_path', 'is_active'])]
class Package extends Model
{
    /** @use HasFactory<PackageFactory> */
    use HasFactory, SoftDeletes;

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
     * Scope a query to search packages by name, slug, or description.
     *
     * @param  Builder<Package>  $query
     * @return Builder<Package>
     */
    #[Scope]
    protected function search(Builder $query, string $search): Builder
    {
        return $query->where(function (Builder $builder) use ($search): void {
            $builder->where('name', 'like', "%{$search}%")
                ->orWhere('slug', 'like', "%{$search}%")
                ->orWhere('description', 'like', "%{$search}%");
        });
    }

    /**
     * Pilihan varian untuk item "bebas pilih varian" di paket ini.
     *
     * Key hasil = package item id, value = id varian aktif terpilih.
     * Id yang tidak valid diabaikan dan item tanpa pilihan memakai varian
     * aktif pertama produknya. Saat $strict, entry yang tidak valid memicu
     * ValidationException (mis. saat customer mengubah pilihan di keranjang).
     *
     * @param  array<array-key, mixed>  $requested
     * @return array<int, int>
     */
    public function resolveVariantSelections(
        array $requested,
        bool $strict = false,
    ): array {
        $resolved = [];

        foreach ($this->items as $item) {
            if (! $item->allow_variant_selection) {
                continue;
            }

            $variants = $item->product?->variants
                ->where('is_active', true)
                ->sortBy('id')
                ->values();

            if ($variants->isEmpty()) {
                continue;
            }

            $requestedId = is_numeric($requested[$item->id] ?? null)
                ? (int) $requested[$item->id]
                : null;

            $chosen = $variants->firstWhere('id', $requestedId);

            if ($chosen === null) {
                if ($strict) {
                    throw ValidationException::withMessages([
                        'selected_variants' => 'Pilihan varian tidak valid.',
                    ]);
                }

                $chosen = $variants->first();
            }

            $resolved[$item->id] = $chosen->id;
        }

        return $resolved;
    }

    /**
     * Available packages based on the smallest item stock ratio.
     *
     * For items with free variant selection, every active variant can satisfy
     * the item, so each variant's capacity is added together.
     */
    public function availableStock(): int
    {
        if ($this->items->isEmpty()) {
            return 0;
        }

        return (int) $this->items->reduce(function (int $carry, PackageItem $item): int {
            if ($item->allow_variant_selection) {
                $fit = $item->product?->variants
                    ->where('is_active', true)
                    ->sum(fn (ProductVariant $variant): int => $item->quantity > 0
                        ? intdiv((int) $variant->stock, $item->quantity)
                        : 0) ?? 0;
            } else {
                $stock = (int) ($item->variant?->stock ?? 0);
                $fit = $item->quantity > 0 ? intdiv($stock, $item->quantity) : 0;
            }

            return min($carry, (int) $fit);
        }, PHP_INT_MAX);
    }
}
