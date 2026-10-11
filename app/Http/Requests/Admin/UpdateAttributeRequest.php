<?php

namespace App\Http\Requests\Admin;

use App\Models\Attribute;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateAttributeRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->can('access-admin') ?? false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        /** @var Attribute|int|string|null $attribute */
        $attribute = $this->route('attribute');
        $attributeId = $attribute instanceof Attribute ? $attribute->id : $attribute;

        return [
            'name' => [
                'required',
                'string',
                'max:50',
                Rule::unique('attributes', 'name')->ignore($attributeId),
            ],
            'description' => ['nullable', 'string', 'max:500'],
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
            'name.required' => 'Nama atribut wajib diisi.',
            'name.max' => 'Nama atribut maksimal 50 karakter.',
            'name.unique' => 'Nama atribut sudah terdaftar.',
            'description.max' => 'Deskripsi maksimal 500 karakter.',
        ];
    }
}

