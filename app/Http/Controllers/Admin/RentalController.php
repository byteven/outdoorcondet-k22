<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Rental;
use App\Services\RentalWorkflowService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;

/**
 * Aksi admin pada rental (CU-06, tanpa pencatatan pickup):
 * konfirmasi bukti pembayaran QRIS dan konfirmasi pengembalian barang.
 */
class RentalController extends Controller
{
    public function __construct(
        private readonly RentalWorkflowService $workflow,
    ) {}

    /**
     * Setujui bukti pembayaran: rental menjadi dp_paid / fully_paid.
     */
    public function confirmPayment(Rental $rental): RedirectResponse
    {
        $this->workflow->confirmPayment($rental);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Pembayaran rental '.$rental->rental_code.' dikonfirmasi.',
        ]);

        return back();
    }

    /**
     * Tolak bukti pembayaran: rental batal beserta alasannya.
     */
    public function rejectPayment(Request $request, Rental $rental): RedirectResponse
    {
        $validated = $request->validate([
            'reason' => ['required', 'string', 'max:500'],
        ]);

        $this->workflow->rejectPayment($rental, $validated['reason']);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Rental '.$rental->rental_code.' dibatalkan.',
        ]);

        return back();
    }

    /**
     * Catat pengembalian barang: set returned_at, denda keterlambatan,
     * dan waktu pelepasan stok.
     */
    public function confirmReturn(Rental $rental): RedirectResponse
    {
        $this->workflow->confirmReturn($rental);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Pengembalian rental '.$rental->rental_code.' dicatat.',
        ]);

        return back();
    }
}
