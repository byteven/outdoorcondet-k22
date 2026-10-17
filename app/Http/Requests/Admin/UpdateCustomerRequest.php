<?php

namespace App\Http\Requests\Admin;

use App\Concerns\NormalizesPhoneNumber;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCustomerRequest extends FormRequest
{
    use NormalizesPhoneNumber;

    /**
     * The error bag for update failures, kept separate from the create form.
     */
    protected $errorBag = 'updateCustomer';

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
                Rule::unique('users', 'email')->ignore($this->route('customer')->user_id),
            ],
            'phone_number' => ['required', 'string', 'regex:/^[0-9]+$/', 'min:9', 'max:20'],
            'emergency_contact' => ['nullable', 'string', 'max:255'],
            'social_media' => ['nullable', 'string', 'max:255'],
            'address' => ['nullable', 'string', 'max:2000'],
            'is_active' => ['required', 'boolean'],
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
            'is_active.required' => 'Status akun wajib diisi.',
        ];
    }
}
