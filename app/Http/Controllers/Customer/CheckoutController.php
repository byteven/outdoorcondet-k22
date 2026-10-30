<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Models\Package;
use App\Models\ProductVariant;
use App\Models\Rental;
use App\Models\RentalPayment;
use App\Services\CheckoutService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

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
     * Halaman riwayat pesanan customer: daftar semua rental milik customer.
     */
    public function index(Request $request): Response
    {
        $customer = $request->user()->customer;

        abort_if($customer === null, 404);

        $rentals = Rental::where('customer_id', $customer->id)
            ->orderByDesc('created_at')
            ->get();

        return Inertia::render('checkout/index', [
            'rentals' => $rentals->map(fn (Rental $rental): array => [
                'rental_code' => $rental->rental_code,
                'status' => $rental->status,
                'start_date' => $rental->start_date?->format('Y-m-d'),
                'end_date' => $rental->end_date?->format('Y-m-d'),
                'total_days' => $rental->total_days,
                'rental_amount' => (float) $rental->rental_amount,
                'payment_type' => $rental->payment_type,
                'created_at' => $rental->created_at?->toISOString(),
            ])->all(),
        ]);
    }

    /**
     * Buat rental dari keranjang lalu arahkan ke halaman detail transaksi.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'payment_type' => ['required', 'string', 'in:full,down_payment'],
        ]);

        $rental = $this->checkoutService->checkout($request->user(), $validated['payment_type']);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Pesanan berhasil dibuat. Silakan selesaikan pembayaran.',
        ]);

        return redirect()->route('checkout.show', ['rental' => $rental->rental_code]);
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

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Bukti pembayaran berhasil diunggah. Menunggu konfirmasi admin.',
        ]);

        return back();
    }

    /**
     * Tampilkan berkas bukti pembayaran milik rental (disk local,
     * tidak dapat diakses publik).
     */
    public function paymentProof(Request $request, Rental $rental): StreamedResponse
    {
        $this->authorizeRentalOwner($request, $rental);

        $payment = $rental->payments()
            ->whereNotNull('proof_path')
            ->latest()
            ->first();

        abort_if($payment === null, 404);

        return Storage::disk('local')->response($payment->proof_path);
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
                // Snapshot nama dari checkout; untuk data lama sebelum ada
                // snapshot, jatuhkan ke nama live atau teks pengganti agar
                // produk yang sudah dihapus tidak merusak halaman.
                'name' => $item->name
                    ?? ($rentable !== null ? $this->rentableName($rentable) : 'Alat ini telah dihapus oleh admin'),
                'type' => $rentable instanceof Package ? 'bundle' : 'alat',
                'image' => $rentable !== null ? $this->rentableImage($rentable) : null,
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
            'cancel_reason' => $rental->cancel_reason,
            'payment_type' => $rental->payment_type,
            'payment_method' => 'qris',
            'pickup_date' => $rental->start_date?->format('Y-m-d'),
            'return_date' => $rental->end_date?->format('Y-m-d'),
            'total_days' => $rental->total_days,
            'rental_amount' => (float) $rental->rental_amount,
            'deposit_amount' => (float) $rental->deposit_amount,
            'grand_total' => (float) $rental->grand_total,
            'down_payment_amount' => (float) $rental->down_payment_amount,
            'remaining_balance' => (float) $rental->remaining_balance,
            'amount_to_pay_now' => (float) ($rental->payment_type === 'down_payment'
                ? $rental->down_payment_amount
                : $rental->rental_amount),
            'payment_proof' => $this->paymentProofPayload($rental),
            'payment_deadline_at' => $rental->payment_deadline_at?->toISOString(),
            'items' => $items,
            'customer_name' => $rental->customer->user?->name ?? '-',
            'customer_phone' => $rental->customer->phone_number ?? '-',
        ];
    }

    /**
     * Nama tampilan rentable.
     */
    private function rentableName(ProductVariant|Package $rentable): string
    {
        if ($rentable instanceof ProductVariant) {
            return $rentable->product?->name ?? $rentable->sku;
        }

        return $rentable->name;
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

    /**
     * Info bukti pembayaran terunggah untuk kartu bukti di halaman detail.
     *
     * @return array{url: string, is_image: bool}|null
     */
    private function paymentProofPayload(Rental $rental): ?array
    {
        $payment = $rental->payments->firstWhere(
            fn (RentalPayment $payment): bool => $payment->proof_path !== null,
        );

        if ($payment === null) {
            return null;
        }

        $mimeType = (string) Storage::disk('local')->mimeType($payment->proof_path);

        return [
            'url' => route('checkout.payment.proof', ['rental' => $rental->rental_code]),
            'is_image' => str_starts_with($mimeType, 'image/'),
        ];
    }
}
