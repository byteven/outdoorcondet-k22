<?php

namespace App\Http\Responses;

use App\UserRole;
use Laravel\Fortify\Contracts\LoginResponse as LoginResponseContract;
use Symfony\Component\HttpFoundation\Response;

class LoginResponse implements LoginResponseContract
{
    /**
     * Create an HTTP response that represents the object.
     */
    public function toResponse($request): Response
    {
        if ($request->wantsJson()) {
            return response()->json(['two_factor' => false]);
        }

        $home = $request->user()->role === UserRole::Admin
            ? route('admin.dashboard')
            : route('home');

        // Login dari modal (misal: tombol "Tambah ke Keranjang" saat guest)
        // mengirim redirect_to agar tetap berada di halaman semula.
        $redirectTo = $request->input('redirect_to');

        if (is_string($redirectTo) && $this->isSafeRedirect($redirectTo)) {
            return redirect()->to($redirectTo);
        }

        return redirect()->intended($home);
    }

    /**
     * Hanya izinkan redirect ke path lokal untuk mencegah open redirect.
     */
    private function isSafeRedirect(string $redirectTo): bool
    {
        return str_starts_with($redirectTo, '/')
            && ! str_starts_with($redirectTo, '//');
    }
}
