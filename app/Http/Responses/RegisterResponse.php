<?php

namespace App\Http\Responses;

use App\UserRole;
use Laravel\Fortify\Contracts\RegisterResponse as RegisterResponseContract;
use Symfony\Component\HttpFoundation\Response;

class RegisterResponse implements RegisterResponseContract
{
    /**
     * Create an HTTP response that represents the object.
     */
    public function toResponse($request): Response
    {
        if ($request->wantsJson()) {
            return response()->json(status: Response::HTTP_CREATED);
        }

        $home = $request->user()->role === UserRole::Admin
            ? route('admin.dashboard')
            : route('home');

        return redirect()->intended($home);
    }
}
