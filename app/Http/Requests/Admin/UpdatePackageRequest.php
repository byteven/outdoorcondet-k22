<?php

namespace App\Http\Requests\Admin;

use App\Models\Package;
use App\Models\ProductVariant;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpdatePackageRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->can('access-admin') ?? false;
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        $slug = $this->filled('slug')
            ? Str::slug((string) $this->input('slug'))
            : ($this->filled('name') ? Str::slug((string) $this->input('name')) : null);

        $this->merge([
            'slug' => $slug,
            'is_active' => filter_var($this->input('is_active', true), FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? true,
            'remove_image' => filter_var($this->input('remove_image', false), FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? false,
        ]);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        /** @var Package|int|string|null $package */
        $package = $this->route('package');
        $packageId = $package instanceof Package ? $package->id : $package;

        return [
            'name' => ['required', 'string', 'max:100'],
            'slug' => [
                'required',
                'string',
                'max:120',
                Rule::unique('packages', 'slug')->ignore($packageId),
            ],
            'description' => ['nullable', 'string', 'max:1000'],
            'daily_price' => ['required', 'numeric', 'gt:0', 'max:100000000'],
            'deposit_per_package' => ['nullable', 'numeric', 'min:0', 'max:100000000'],
            'is_active' => ['nullable', 'boolean'],
            'image' => ['nullable', 'image', 'mimes:jpeg,png,jpg,webp', 'max:2048'],
            'remove_image' => ['nullable', 'boolean'],
            'items' => ['required', 'array', 'min:1', 'max:50'],
            'items.*.product_id' => ['required', 'integer', 'exists:products,id', 'distinct'],
            'items.*.allow_variant_selection' => ['required', 'boolean'],
            'items.*.product_variant_id' => ['nullable', 'integer', 'exists:product_variants,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:10000'],
            'duration_prices' => ['nullable', 'array', 'max:20'],
            'duration_prices.*.duration_days' => ['required', 'integer', 'min:2', 'max:365', 'distinct'],
            'duration_prices.*.price' => ['required', 'numeric', 'gt:0', 'max:100000000'],
        ];
    }

    /**
     * Get custom validation messages in Indonesian.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.required' => 'Nama paket wajib diisi.',
            'name.max' => 'Nama paket maksimal 100 karakter.',
            'slug.required' => 'Slug paket wajib diisi atau dihasilkan dari nama.',
            'slug.unique' => 'Slug sudah digunakan oleh paket lain.',
            'description.max' => 'Deskripsi maksimal 1000 karakter.',
            'daily_price.required' => 'Harga 1 hari wajib diisi.',
            'daily_price.numeric' => 'Harga 1 hari harus berupa angka.',
            'daily_price.gt' => 'Harga 1 hari harus lebih dari 0.',
            'deposit_per_package.numeric' => 'Deposit harus berupa angka.',
            'image.image' => 'Berkas harus berupa gambar.',
            'image.mimes' => 'Format gambar harus JPG, PNG, atau WebP.',
            'image.max' => 'Ukuran gambar maksimal 2 MB.',
            'items.required' => 'Minimal satu item paket wajib diisi.',
            'items.min' => 'Minimal satu item paket wajib diisi.',
            'items.*.product_id.required' => 'Produk item wajib dipilih.',
            'items.*.product_id.exists' => 'Produk item tidak ditemukan.',
            'items.*.product_id.distinct' => 'Produk item tidak boleh duplikat.',
            'items.*.allow_variant_selection.required' => 'Opsi pemilihan varian wajib diisi.',
            'items.*.product_variant_id.exists' => 'Varian item tidak ditemukan.',
            'items.*.quantity.required' => 'Jumlah item wajib diisi.',
            'items.*.quantity.min' => 'Jumlah item minimal 1.',
            'duration_prices.*.duration_days.required' => 'Durasi wajib diisi.',
            'duration_prices.*.duration_days.min' => 'Durasi minimal 2 hari.',
            'duration_prices.*.duration_days.distinct' => 'Durasi tidak boleh duplikat.',
            'duration_prices.*.price.required' => 'Harga durasi wajib diisi.',
            'duration_prices.*.price.gt' => 'Harga durasi harus lebih dari 0.',
        ];
    }

    /**
     * Validate the variant choice against its product.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $items = $this->input('items', []);

            if (! is_array($items)) {
                return;
            }

            $variantProductIds = ProductVariant::query()
                ->whereIn('id', collect($items)->pluck('product_variant_id')->filter()->all())
                ->pluck('product_id', 'id');

            foreach ($items as $index => $item) {
                if (! is_array($item)) {
                    continue;
                }

                $allowSelection = filter_var(
                    $item['allow_variant_selection'] ?? false,
                    FILTER_VALIDATE_BOOLEAN,
                );
                $variantId = $item['product_variant_id'] ?? null;

                if (! $allowSelection && ! $variantId) {
                    $validator->errors()->add(
                        "items.{$index}.product_variant_id",
                        'Varian item wajib dipilih.',
                    );

                    continue;
                }

                if (! $allowSelection && $variantId && isset($variantProductIds[$variantId])
                    && (int) $variantProductIds[$variantId] !== (int) ($item['product_id'] ?? 0)) {
                    $validator->errors()->add(
                        "items.{$index}.product_variant_id",
                        'Varian tidak sesuai dengan produk item.',
                    );
                }
            }
        });
    }
}
