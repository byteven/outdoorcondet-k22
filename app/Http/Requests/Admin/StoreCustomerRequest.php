<?php

namespace App\Http\Requests\Admin;

use App\Concerns\NormalizesPhoneNumber;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;

class StoreCustomerRequest extends FormRequest
{
    use NormalizesPhoneNumber;

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
        $this->normalizePhoneNumber();
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                function (string $attribute, string $value, callable $fail): void {
                    $existing = User::where('email', $value)->first();

                    if (! $existing) {
                        return;
                    }

                    $customer = $existing->customer()->withTrashed()->first();
                    $reusable = $customer && ($customer->trashed() || ! $customer->is_active);

                    if (! $reusable) {
                        $fail('Email sudah terdaftar.');
                    }
                },
            ],
            'password' => ['required', 'string', 'min:8', 'max:100'],
            'phone_number' => ['required', 'string', 'regex:/^[0-9]+$/', 'min:9', 'max:20'],
            'identity_number' => ['nullable', 'string', 'max:32'],
            'identity_card' => ['nullable', 'image', 'mimes:jpeg,png,jpg,webp', 'max:2048'],
            'address' => ['nullable', 'string', 'max:2000'],
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
            'password.required' => 'Password wajib diisi.',
            'password.min' => 'Password minimal 8 karakter.',
            'phone_number.required' => 'Nomor telepon wajib diisi.',
            'phone_number.regex' => 'Nomor telepon hanya boleh berisi angka.',
            'phone_number.min' => 'Nomor telepon minimal 9 digit.',
            'identity_card.image' => 'Foto KTP harus berupa gambar.',
            'identity_card.mimes' => 'Format foto KTP harus JPG, PNG, atau WebP.',
            'identity_card.max' => 'Ukuran foto KTP maksimal 2 MB.',
        ];
    }
}
