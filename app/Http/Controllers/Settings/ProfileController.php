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
use Illuminate\Support\Facades\Storage;
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
                'identity_number' => $customer->identity_number,
                'address' => $customer->address,
                'identity_card_url' => $customer->identity_card_url,
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

        DB::transaction(function () use ($user, $validated, $request): void {
            $user->fill([
                'name' => $validated['name'],
                'email' => $validated['email'],
            ]);

            if ($user->isDirty('email')) {
                $user->email_verified_at = null;
            }

            $user->save();

            $customer = $user->customer()->firstOrNew([]);

            $removeCard = (bool) ($validated['remove_identity_card'] ?? false);

            if ($request->hasFile('identity_card')) {
                if ($customer->exists && $customer->identity_card_path) {
                    Storage::disk('public')->delete($customer->identity_card_path);
                }

                $customer->identity_card_path = $request->file('identity_card')->store('identity-cards', 'public');
            } elseif ($removeCard) {
                if ($customer->exists && $customer->identity_card_path) {
                    Storage::disk('public')->delete($customer->identity_card_path);
                }

                $customer->identity_card_path = null;
            }

            $identityChanged = ($validated['identity_number'] ?? null) !== $customer->identity_number
                || $request->hasFile('identity_card')
                || $removeCard;

            $customer->phone_number = $validated['phone_number'];
            $customer->identity_number = $validated['identity_number'] ?? null;
            $customer->address = $validated['address'] ?? null;

            if ($identityChanged) {
                $customer->is_verified = false;
            }

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

        $identityCardPath = $user->customer?->identity_card_path;

        Auth::logout();

        $user->delete();

        if ($identityCardPath) {
            Storage::disk('public')->delete($identityCardPath);
        }

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }
}
