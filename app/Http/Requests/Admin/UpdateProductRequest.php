<?php

namespace App\Http\Requests\Admin;

use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpdateProductRequest extends FormRequest
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
        ]);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        /** @var Product|int|string|null $product */
        $product = $this->route('product');
        $productId = $product instanceof Product ? $product->id : $product;

        /** @var array<int, array<string, mixed>> $rawVariants */
        $rawVariants = (array) $this->input('variants', []);
        $variantIds = collect($rawVariants)
            ->map(fn (array $variant) => $variant['id'] ?? null)
            ->filter()
            ->values()
            ->all();

        return [
            'category_id' => ['required', 'integer', 'exists:categories,id'],
            'name' => ['required', 'string', 'max:100'],
            'slug' => [
                'required',
                'string',
                'max:120',
                Rule::unique('products', 'slug')->ignore($productId),
            ],
            'description' => ['nullable', 'string', 'max:1000'],
            'is_active' => ['nullable', 'boolean'],
            'images' => ['nullable', 'array', 'max:5'],
            'images.*' => ['image', 'mimes:jpeg,png,jpg,webp', 'max:2048'],
            'primary_image' => ['nullable', 'integer', 'min:0'],
            'keep_images' => ['nullable', 'array'],
            'keep_images.*' => ['integer', 'exists:product_images,id'],
            'variants' => ['required', 'array', 'min:1', 'max:20'],
            'variants.*.id' => ['nullable', 'integer', 'exists:product_variants,id'],
            'variants.*.sku' => ['required', 'string', 'max:50'],
            'variants.*.stock' => ['required', 'integer', 'min:0', 'max:10000'],
            'variants.*.rental_price_per_day' => ['required', 'numeric', 'min:0', 'max:100000000'],
            'variants.*.deposit_per_unit' => ['nullable', 'numeric', 'min:0', 'max:100000000'],
            'variants.*.duration_prices' => ['nullable', 'array', 'max:20'],
            'variants.*.duration_prices.*.id' => ['nullable', 'integer'],
            'variants.*.duration_prices.*.duration_days' => ['required', 'integer', 'min:2', 'max:365'],
            'variants.*.duration_prices.*.price' => ['required', 'numeric', 'min:0', 'max:100000000'],
            'variants.*.weight_grams' => ['nullable', 'integer', 'min:0', 'max:1000000'],
            'variants.*.is_active' => ['nullable', 'boolean'],
            'variants.*.values' => ['required', 'array', 'min:1', 'max:10'],
            'variants.*.values.*.attribute_id' => ['required', 'integer', 'exists:attributes,id'],
            'variants.*.values.*.value' => ['required', 'string', 'max:100'],
        ];
    }

    /**
     * Get custom error messages for validator errors.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'category_id.required' => 'Kategori wajib dipilih.',
            'category_id.exists' => 'Kategori tidak ditemukan.',
            'name.required' => 'Nama produk wajib diisi.',
            'name.max' => 'Nama produk maksimal 100 karakter.',
            'slug.required' => 'Slug produk wajib diisi atau dihasilkan dari nama.',
            'slug.unique' => 'Slug sudah digunakan oleh produk lain.',
            'description.max' => 'Deskripsi maksimal 1000 karakter.',
            'images.max' => 'Maksimal 5 gambar per produk.',
            'images.*.image' => 'Berkas harus berupa gambar.',
            'images.*.mimes' => 'Format gambar harus JPG, PNG, atau WebP.',
            'images.*.max' => 'Ukuran gambar maksimal 2 MB.',
            'variants.required' => 'Minimal satu varian wajib diisi.',
            'variants.min' => 'Minimal satu varian wajib diisi.',
            'variants.*.sku.required' => 'SKU varian wajib diisi.',
            'variants.*.sku.unique' => 'SKU sudah digunakan oleh varian lain.',
            'variants.*.stock.required' => 'Stok varian wajib diisi.',
            'variants.*.rental_price_per_day.required' => 'Harga sewa per hari wajib diisi.',
            'variants.*.values.required' => 'Atribut varian wajib diisi.',
            'variants.*.values.min' => 'Minimal satu atribut wajib diisi untuk setiap varian.',
            'variants.*.values.*.attribute_id.exists' => 'Atribut tidak ditemukan.',
            'variants.*.values.*.value.required' => 'Nilai atribut wajib diisi.',
        ];
    }

    /**
     * Configure the validator instance.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            /** @var Product|null $product */
            $product = $this->route('product');
            $variants = $this->input('variants', []);

            if (! is_array($variants) || ! $product instanceof Product) {
                return;
            }

            $skus = [];
            foreach ($variants as $index => $variant) {
                $sku = $variant['sku'] ?? null;
                if ($sku === null) {
                    continue;
                }
                if (in_array($sku, $skus, true)) {
                    $validator->errors()->add("variants.{$index}.sku", 'SKU duplikat dalam satu produk.');

                    continue;
                }
                $skus[] = $sku;

                // SKU milik varian mana pun tetap ditolak kecuali id-nya sendiri.
                $taken = ProductVariant::where('sku', $sku)
                    ->when(isset($variant['id']), fn ($q) => $q->where('id', '!=', $variant['id']))
                    ->exists();
                if ($taken) {
                    $validator->errors()->add("variants.{$index}.sku", 'SKU sudah digunakan oleh varian lain.');
                }
            }
        });
    }
}
