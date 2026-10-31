<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use App\Models\CartItem;
use App\Models\User;
use App\UserRole;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => $request->user(),
            ],
            'cart' => $this->sharedCart($request),
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
        ];
    }

    /**
     * Jumlah item di keranjang untuk badge header; hanya untuk customer.
     *
     * @return array{count: int}|null
     */
    private function sharedCart(Request $request): ?array
    {
        $user = $request->user();

        if (! $user || $user->role !== UserRole::Customer) {
            return null;
        }

        return [
            'count' => CartItem::query()->where('user_id', $user->id)->count(),
        ];
    }
}
