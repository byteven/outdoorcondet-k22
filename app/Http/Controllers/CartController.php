<?php

namespace App\Http\Controllers;

use App\Models\CartItem;
use App\Services\CartService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * CU-05 Keranjang. Halaman & aksi hanya untuk customer
 * (route dilindungi middleware auth + can:access-customer).
 */
class CartController extends Controller
{
    public function __construct(
        private readonly CartService $cartService,
    ) {}

    /**
     * Tampilkan halaman keranjang.
     */
    public function index(Request $request): Response
    {
        return Inertia::render('cart/index', [
            'cart' => $this->cartService->summaryFor($request->user()),
        ]);
    }

    /**
     * Tambah item ke keranjang dari halaman detail produk.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'rentable_type' => ['required', 'string', 'in:variant,package'],
            'rentable_id' => ['required', 'integer', 'min:1'],
            'quantity' => ['required', 'integer', 'min:1', 'max:100'],
            'pickup_date' => ['required', 'date_format:Y-m-d'],
            'return_date' => ['required', 'date_format:Y-m-d'],
        ]);

        $this->cartService->addItem(
            $request->user(),
            $validated['rentable_type'],
            (int) $validated['rentable_id'],
            (int) $validated['quantity'],
            $validated['pickup_date'],
            $validated['return_date'],
        );

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Item ditambahkan ke keranjang.',
        ]);

        return back();
    }

    /**
     * Ubah quantity satu item keranjang.
     */
    public function update(Request $request, CartItem $cartItem): RedirectResponse
    {
        $this->authorizeOwner($request, $cartItem);

        $validated = $request->validate([
            'quantity' => ['required', 'integer', 'max:100'],
        ]);

        $this->cartService->updateItem(
            $request->user(),
            $cartItem,
            (int) $validated['quantity'],
        );

        // Redirect, bukan render: render pada request mutasi membuat
        // Inertia menulis URL endpoint ke address bar sehingga reload
        // berikutnya mengenai route yang tidak mendukung GET.
        return redirect()->route('cart.index');
    }

    /**
     * Ubah rentang tanggal sewa untuk semua item keranjang.
     */
    public function updateDates(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'pickup_date' => ['required', 'date_format:Y-m-d'],
            'return_date' => ['required', 'date_format:Y-m-d'],
        ]);

        $hasClamped = $this->cartService->updateRange(
            $request->user(),
            $validated['pickup_date'],
            $validated['return_date'],
        );

        if ($hasClamped) {
            Inertia::flash('toast', [
                'type' => 'warning',
                'message' => 'Quantity disesuaikan dengan stok yang tersedia.',
            ]);
        }

        return redirect()->route('cart.index');
    }

    /**
     * Hapus satu item keranjang.
     */
    public function destroy(Request $request, CartItem $cartItem): RedirectResponse
    {
        $this->authorizeOwner($request, $cartItem);

        $this->cartService->removeItem($request->user(), $cartItem);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Item dihapus dari keranjang.',
        ]);

        return redirect()->route('cart.index');
    }

    /**
     * Cart item milik user lain dianggap tidak ada.
     */
    private function authorizeOwner(Request $request, CartItem $cartItem): void
    {
        abort_unless($cartItem->user_id === $request->user()->id, 404);
    }
}
