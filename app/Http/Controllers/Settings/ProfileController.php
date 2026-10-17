<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\ProfileDeleteRequest;
use App\Http\Requests\Settings\ProfileUpdateRequest;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    /**
     * Show the customer's profile settings page (CU-02).
     * Khusus role customer, admin ditolak via middleware can:access-customer.
     */
    public function edit(Request $request): Response
    {
        $user = $request->user();
        $customer = $user->customer;

        return Inertia::render('settings/profile', [
            'mustVerifyEmail' => $user instanceof MustVerifyEmail,
            'status' => $request->session()->get('status'),
            'customer' => $customer ? [
                'phone_number' => $customer->phone_number,
                'emergency_contact' => $customer->emergency_contact,
                'address' => $customer->address,
                'social_media' => $customer->social_media,
                'is_verified' => $customer->is_verified,
            ] : null,
        ]);
    }

    /**
     * Update the customer's profile information (data diri + KYC).
     */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $user = $request->user();
        $validated = $request->validated();

        DB::transaction(function () use ($user, $validated): void {
            $user->fill([
                'name' => $validated['name'],
                'email' => $validated['email'],
            ]);

            if ($user->isDirty('email')) {
                $user->email_verified_at = null;
            }

            $user->save();

            $customer = $user->customer()->firstOrNew([]);

            $customer->phone_number = $validated['phone_number'];
            $customer->emergency_contact = $validated['emergency_contact'] ?? null;
            $customer->social_media = $validated['social_media'] ?? null;
            $customer->address = $validated['address'] ?? null;

            $customer->user()->associate($user);
            $customer->save();
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Profil berhasil diperbarui.']);

        return to_route('profile.edit');
    }

    /**
     * Delete the user's profile.
     */
    public function destroy(ProfileDeleteRequest $request): RedirectResponse
    {
        $user = $request->user();

        Auth::logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }
}
