<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Package;
use App\Models\ProductVariant;
use App\Models\Rental;
use App\Services\RentalWorkflowService;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Aksi admin pada rental (CU-06, AD-07 tanpa pencatatan pickup):
 * daftar & detail rental, konfirmasi bukti pembayaran QRIS,
 * konfirmasi pengembalian barang, dan pembatalan manual.
 */
class RentalController extends Controller
{
    public function __construct(
        private readonly RentalWorkflowService $workflow,
    ) {}

    /**
     * Daftar rental dengan filter status, rentang tanggal, dan pencarian
     * kode/nama customer.
     */
    public function index(Request $request): Response
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', 'in:all,pending_payment,waiting_confirmation,dp_paid,fully_paid,returned,cancelled,late'],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date', 'after_or_equal:date_from'],
            'per_page' => ['nullable', 'integer', 'min:5', 'max:100'],
        ]);

        $status = $filters['status'] ?? 'all';
        $dateFrom = $filters['date_from'] ?? null;
        $dateTo = $filters['date_to'] ?? null;
        $perPage = (int) ($filters['per_page'] ?? 10);

        $query = Rental::query()
            ->with([
                'customer:id,user_id,phone_number',
                'customer.user:id,name,email',
                'payments',
            ])
            ->when(
                $filters['search'] ?? null,
                function ($query, string $search) {
                    $query->where(function ($q) use ($search) {
                        $q->where('rental_code', 'like', "%{$search}%")
                            ->orWhereHas('customer.user', function ($q) use ($search) {
                                $q->where('name', 'like', "%{$search}%")
                                    ->orWhere('email', 'like', "%{$search}%");
                            })
                            ->orWhereHas('customer', function ($q) use ($search) {
                                $q->where('phone_number', 'like', "%{$search}%");
                            });
                    });
                },
            )
            ->when(
                $status === 'late',
                fn ($query) => $query->whereIn('status', ['dp_paid', 'fully_paid'])
                    ->whereDate('end_date', '<', today()),
            )
            ->when(
                $status !== 'all' && $status !== 'late',
                fn ($query) => $query->where('status', $status),
            )
            ->when(
                $dateFrom,
                fn ($query, string $date) => $query->whereDate('start_date', '>=', $date),
            )
            ->when(
                $dateTo,
                fn ($query, string $date) => $query->whereDate('start_date', '<=', $date),
            )
            ->orderByDesc('created_at');

        $rentals = $query->paginate($perPage)->withQueryString();

        // Tambahkan flag "needs_confirmation", "is_late", dan late days per item.
        $rentals->getCollection()->transform(function (Rental $rental) {
            $isLate = in_array($rental->status, ['dp_paid', 'fully_paid'], true)
                && $rental->end_date->lt(CarbonImmutable::today());
            $lateDays = $isLate
                ? (int) $rental->end_date->startOfDay()->diffInDays(CarbonImmutable::today()->startOfDay())
                : (int) ($rental->late_days ?? 0);

            $rental->setAttribute('needs_confirmation', $rental->status === 'waiting_confirmation');
            $rental->setAttribute('is_late', $isLate);
            $rental->setAttribute('current_late_days', $lateDays);

            $latestProof = $rental->payments->firstWhere(fn ($p) => ! empty($p->proof_path));
            $rental->setAttribute('has_proof', $latestProof !== null);
            $rental->setAttribute('proof_url', $latestProof !== null
                ? route('admin.rentals.payment-proof', ['rental' => $rental->rental_code])
                : null);

            return $rental;
        });

        // Ringkasan global.
        $summary = [
            'total' => Rental::count(),
            'waiting_confirmation' => Rental::where('status', 'waiting_confirmation')->count(),
            'late' => Rental::whereIn('status', ['dp_paid', 'fully_paid'])
                ->whereDate('end_date', '<', today())
                ->count(),
            'returned' => Rental::where('status', 'returned')->count(),
        ];

        return Inertia::render('rentals/index', [
            'rentals' => $rentals,
            'summary' => $summary,
            'filters' => [
                'search' => $filters['search'] ?? '',
                'status' => $status,
                'date_from' => $dateFrom ?? '',
                'date_to' => $dateTo ?? '',
                'per_page' => $perPage,
            ],
        ]);
    }

    /**
     * Detail rental: item, pembayaran, bukti QRIS privat, rincian biaya.
     */
    public function show(Rental $rental): Response
    {
        $rental->load([
            'customer.user:id,name,email',
            'customer',
            'items.rentable',
            'payments',
        ]);

        $rental->items->loadMorph('rentable', [
            ProductVariant::class => ['product.images', 'values.attribute'],
            Package::class => [],
        ]);

        $isLate = in_array($rental->status, ['dp_paid', 'fully_paid'], true)
            && $rental->end_date->lt(CarbonImmutable::today());
        $lateDaysPreview = $isLate
            ? (int) $rental->end_date->startOfDay()->diffInDays(CarbonImmutable::today()->startOfDay())
            : (int) ($rental->late_days ?? 0);
        $lateFeePreview = $isLate
            ? $lateDaysPreview * (float) $rental->late_fee_per_day
            : (float) ($rental->late_fee_amount ?? 0);

        $latestPayment = $rental->payments->sortByDesc('id')->first();
        $proofPath = $latestPayment?->proof_path;
        $proofUrl = null;
        $proofIsImage = false;

        if ($proofPath && Storage::disk('local')->exists($proofPath)) {
            $proofUrl = route('admin.rentals.payment-proof', ['rental' => $rental->rental_code]);
            $mime = (string) File::mimeType(Storage::disk('local')->path($proofPath));
            $proofIsImage = str_starts_with($mime, 'image/');
        }

        $amountToPayOnline = (float) ($rental->payment_type === 'down_payment'
            ? $rental->down_payment_amount
            : $rental->rental_amount);
        $remainingToPayOutlet = (float) ($rental->remaining_balance + $rental->deposit_amount);

        $formattedItems = $rental->items->map(function ($item) {
            $rentable = $item->rentable;
            $image = null;

            if ($rentable instanceof ProductVariant) {
                $product = $rentable->product;
                $primary = $product?->images?->firstWhere('is_primary', true) ?? $product?->images?->first();
                $image = $primary?->image_path ? '/storage/'.$primary->image_path : null;
            } elseif ($rentable instanceof Package) {
                $image = $rentable->image_path ? '/storage/'.$rentable->image_path : null;
            }

            return [
                'id' => $item->id,
                'name' => $item->name ?? ($rentable?->name ?? 'Item rental'),
                'type' => $rentable instanceof Package ? 'bundle' : 'alat',
                'image' => $image,
                'quantity' => $item->quantity,
                'unit_price' => (float) $item->unit_price,
                'subtotal' => (float) $item->subtotal,
                'deposit_per_unit' => (float) $item->deposit_per_unit,
                'deposit_subtotal' => (float) $item->deposit_subtotal,
                'price_breakdown' => $item->price_breakdown,
            ];
        });

        return Inertia::render('rentals/show', [
            'rental' => array_merge($rental->toArray(), [
                'items' => $formattedItems,
                'needs_confirmation' => $rental->status === 'waiting_confirmation',
                'is_late' => $isLate,
                'late_days_preview' => $lateDaysPreview,
                'late_fee_preview' => $lateFeePreview,
                'amount_to_pay_online' => $amountToPayOnline,
                'remaining_to_pay_outlet' => $remainingToPayOutlet,
                'proof_url' => $proofUrl,
                'proof_is_image' => $proofIsImage,
                'latest_payment' => $latestPayment,
            ]),
        ]);
    }

    /**
     * Tampilkan berkas bukti pembayaran milik rental (disk privat local)
     * khusus untuk akses admin terverifikasi.
     */
    public function paymentProof(Rental $rental): StreamedResponse
    {
        $payment = $rental->payments()
            ->whereNotNull('proof_path')
            ->latest('id')
            ->first();

        abort_if($payment === null, 404);

        /** @var \Illuminate\Filesystem\FilesystemAdapter $disk */
        $disk = Storage::disk('local');

        abort_unless($disk->exists($payment->proof_path), 404);

        return $disk->response($payment->proof_path);
    }

    /**
     * Setujui bukti pembayaran: rental menjadi dp_paid / fully_paid.
     */
    public function confirmPayment(Rental $rental): RedirectResponse
    {
        try {
            $this->workflow->confirmPayment($rental);
        } catch (ValidationException $e) {
            return back()->withErrors($e->errors());
        }

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

        try {
            $this->workflow->rejectPayment($rental, $validated['reason']);
        } catch (ValidationException $e) {
            return back()->withErrors($e->errors());
        }

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
        try {
            $this->workflow->confirmReturn($rental);
        } catch (ValidationException $e) {
            return back()->withErrors($e->errors());
        }

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Pengembalian rental '.$rental->rental_code.' dicatat.',
        ]);

        return back();
    }

    /**
     * Batalkan rental secara manual (kapan pun sebelum returned).
     */
    public function cancel(Request $request, Rental $rental): RedirectResponse
    {
        $validated = $request->validate([
            'reason' => ['required', 'string', 'max:500'],
        ]);

        try {
            $this->workflow->cancel($rental, $validated['reason']);
        } catch (ValidationException $e) {
            return back()->withErrors($e->errors());
        }

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Rental '.$rental->rental_code.' dibatalkan.',
        ]);

        return back();
    }
}
