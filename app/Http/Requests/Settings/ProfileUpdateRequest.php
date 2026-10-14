<?php

namespace App\Http\Requests\Settings;

use App\Concerns\NormalizesPhoneNumber;
use App\Concerns\ProfileValidationRules;
use App\UserRole;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class ProfileUpdateRequest extends FormRequest
{
    use NormalizesPhoneNumber, ProfileValidationRules;

    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->role === UserRole::Customer;
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        $this->normalizePhoneNumber();
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            ...$this->profileRules($this->user()->id),
            'phone_number' => ['required', 'string', 'regex:/^[0-9]+$/', 'min:9', 'max:20'],
            'identity_number' => ['nullable', 'string', 'max:32'],
            'address' => ['nullable', 'string', 'max:2000'],
            'identity_card' => ['nullable', 'image', 'mimes:jpeg,png,jpg,webp', 'max:2048'],
            'remove_identity_card' => ['nullable', 'boolean'],
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
            'name.required' => 'Nama wajib diisi.',
            'email.required' => 'Email wajib diisi.',
            'email.email' => 'Format email tidak valid.',
            'email.unique' => 'Email sudah terdaftar.',
            'phone_number.required' => 'Nomor telepon wajib diisi.',
            'phone_number.regex' => 'Nomor telepon hanya boleh berisi angka.',
            'phone_number.min' => 'Nomor telepon minimal 9 digit.',
            'identity_card.image' => 'Foto KTP harus berupa gambar.',
            'identity_card.mimes' => 'Format foto KTP harus JPG, PNG, atau WebP.',
            'identity_card.max' => 'Ukuran foto KTP maksimal 2 MB.',
        ];
    }
}
