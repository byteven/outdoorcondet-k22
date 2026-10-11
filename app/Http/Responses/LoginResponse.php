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

        return redirect()->intended($home);
    }
}
