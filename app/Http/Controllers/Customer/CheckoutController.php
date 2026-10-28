<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Models\Package;
use App\Models\ProductVariant;
use App\Models\Rental;
use App\Services\CheckoutService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * CU-06 Checkout: halaman detail transaksi & pembayaran online.
 * Hanya untuk customer. Semua pembayaran online lewat QRIS.
 */
class CheckoutController extends Controller
{
    public function __construct(
        private readonly CheckoutService $checkoutService,
    ) {}

    /**
     * Buat rental dari keranjang lalu arahkan ke halaman detail transaksi.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'payment_type' => ['required', 'string', 'in:full,down_payment'],
        ]);

        $rental = $this->checkoutService->checkout($request->user(), $validated['payment_type']);

        return redirect()->route('checkout.show', ['rental' => $rental->id]);
    }

    /**
     * Halaman "Detail Transaksi": hitung mundur pembayaran, detail pesanan,
     * nominal yang harus dibayar, dan CTA pembayaran.
     */
    public function show(Request $request, Rental $rental): Response
    {
        $this->authorizeRentalOwner($request, $rental);

        $rental->load(['items.rentable', 'customer.user', 'payments']);

        return Inertia::render('checkout/show', [
            'rental' => $this->rentalPayload($rental),
        ]);
    }

    /**
     * Unggah bukti pembayaran (QRIS) lalu tandai rental menunggu konfirmasi admin.
     */
    public function storePayment(Request $request, Rental $rental): RedirectResponse
    {
        $this->authorizeRentalOwner($request, $rental);

        $validated = $request->validate([
            'proof' => ['required', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:5120'],
        ]);

        $path = $validated['proof']->store('rental-payments', 'local');

        $this->checkoutService->recordPayment($rental, $path);

        return back()->with([
            'toast' => [
                'type' => 'success',
                'message' => 'Bukti pembayaran berhasil diunggah. Menunggu konfirmasi admin.',
            ],
        ]);
    }

    /**
     * Payload rental untuk halaman detail transaksi (Inertia).
     *
     * @return array<string, mixed>
     */
    private function rentalPayload(Rental $rental): array
    {
        $items = [];

        foreach ($rental->items as $item) {
            $rentable = $item->rentable;

            $items[] = [
                'id' => $item->id,
                'name' => $rentable instanceof ProductVariant
                    ? ($rentable->product?->name ?? $rentable->sku)
                    : $rentable->name,
                'type' => $rentable instanceof ProductVariant ? 'alat' : 'bundle',
                'image' => $this->rentableImage($rentable),
                'quantity' => $item->quantity,
                'unit_price' => $item->unit_price,
                'subtotal' => $item->subtotal,
                'deposit_per_unit' => $item->deposit_per_unit,
                'deposit_subtotal' => $item->deposit_subtotal,
            ];
        }

        return [
            'id' => $rental->id,
            'rental_code' => $rental->rental_code,
            'status' => $rental->status,
            'payment_type' => $rental->payment_type,
            'payment_method' => 'qris',
            'pickup_date' => $rental->start_date?->format('Y-m-d'),
            'return_date' => $rental->end_date?->format('Y-m-d'),
            'billing_start_date' => $rental->billing_start_date?->format('Y-m-d'),
            'total_days' => $rental->total_days,
            'rental_amount' => (float) $rental->rental_amount,
            'deposit_amount' => (float) $rental->deposit_amount,
            'grand_total' => (float) $rental->grand_total,
            'down_payment_amount' => (float) $rental->down_payment_amount,
            'remaining_balance' => (float) $rental->remaining_balance,
            'amount_to_pay_now' => (float) ($rental->payment_type === 'down_payment'
                ? $rental->down_payment_amount
                : $rental->rental_amount),
            'payment_deadline_at' => $rental->payment_deadline_at?->format('Y-m-d\TH:i:s'),
            'items' => $items,
            'customer_name' => $rental->customer->user?->name ?? '-',
            'customer_phone' => $rental->customer->phone_number ?? '-',
        ];
    }

    /**
     * Path gambar rentable (fallback placeholder jika tidak ada).
     */
    private function rentableImage(ProductVariant|Package $rentable): ?string
    {
        if ($rentable instanceof ProductVariant) {
            $product = $rentable->product;

            if ($product === null) {
                return null;
            }

            $image = ($product->images?->firstWhere('is_primary', true) ?? $product->images->first());

            return $image?->image_path ? '/storage/'.$image->image_path : null;
        }

        return $rentable->image_path ? '/storage/'.$rentable->image_path : null;
    }

    /**
     * Rental milik user lain dianggap tidak ada.
     */
    private function authorizeRentalOwner(Request $request, Rental $rental): void
    {
        $customer = $request->user()->customer;

        abort_unless(
            $customer !== null && $rental->customer_id === $customer->id,
            403,
        );
    }
}
