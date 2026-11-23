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
            'emergency_contact' => ['required', 'string', 'max:255'],
            'address' => ['required', 'string', 'max:2000'],
            'social_media' => ['required', 'string', 'max:255'],
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
            'emergency_contact.required' => 'Kontak darurat wajib diisi.',
            'social_media.required' => 'Sosial media wajib diisi.',
            'address.required' => 'Alamat wajib diisi.',
        ];
    }
}
