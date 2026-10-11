<?php

namespace App\Concerns;

trait NormalizesPhoneNumber
{
    /**
     * Normalize an Indonesian phone number to digits with a 62 prefix.
     */
    protected function normalizePhoneNumber(): void
    {
        if (! $this->has('phone_number')) {
            return;
        }

        $digits = (string) preg_replace('/\D/', '', (string) $this->input('phone_number'));
        $digits = ltrim($digits, '0');

        if ($digits !== '' && ! str_starts_with($digits, '62')) {
            $digits = '62'.$digits;
        }

        $this->merge(['phone_number' => $digits]);
    }
}
