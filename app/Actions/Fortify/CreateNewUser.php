<?php

namespace App\Actions\Fortify;

use App\Concerns\PasswordValidationRules;
use App\Concerns\ProfileValidationRules;
use App\Models\User;
use App\UserRole;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Laravel\Fortify\Contracts\CreatesNewUsers;

class CreateNewUser implements CreatesNewUsers
{
    use PasswordValidationRules, ProfileValidationRules;

    /**
     * Validate and create a newly registered user.
     *
     * Aturan validasi disamakan dengan StoreCustomerRequest agar konsisten
     * dengan dialog tambah pelanggan di panel admin.
     *
     * @param  array<string, mixed>  $input
     */
    public function create(array $input): User
    {
        $input['phone_number'] = self::normalizePhoneNumber($input['phone_number'] ?? '');

        Validator::make($input, [
            ...$this->profileRules(),
            'phone_number' => ['required', 'string', 'regex:/^[0-9]+$/', 'min:9', 'max:20'],
            'password' => $this->passwordRules(),
            'emergency_contact' => ['nullable', 'string', 'max:255'],
            'social_media' => ['nullable', 'string', 'max:255'],
            'address' => ['nullable', 'string', 'max:2000'],
        ], [
            'phone_number.required' => 'Nomor telepon wajib diisi.',
            'phone_number.regex' => 'Nomor telepon hanya boleh berisi angka.',
            'phone_number.min' => 'Nomor telepon minimal 9 digit.',
        ])->validate();

        return DB::transaction(function () use ($input): User {
            $user = User::create([
                'name' => $input['name'],
                'email' => $input['email'],
                'password' => $input['password'],
                'role' => UserRole::Customer,
            ]);

            $user->customer()->create([
                'phone_number' => $input['phone_number'],
                'emergency_contact' => $input['emergency_contact'] ?? null,
                'social_media' => $input['social_media'] ?? null,
                'address' => $input['address'] ?? null,
            ]);

            return $user;
        });
    }

    /**
     * Normalize an Indonesian phone number to digits with a 62 prefix.
     */
    private static function normalizePhoneNumber(mixed $value): string
    {
        $digits = (string) preg_replace('/\D/', '', (string) $value);
        $digits = ltrim($digits, '0');

        if ($digits !== '' && ! str_starts_with($digits, '62')) {
            $digits = '62'.$digits;
        }

        return $digits;
    }
}
