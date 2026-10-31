<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Customer;
use App\Models\Package;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Rental;
use App\Models\User;
use App\Services\AvailabilityService;
use App\Services\RentalPricingService;
use App\UserRole;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Cache\LockTimeoutException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class PosController extends Controller
{
    private const AVAILABILITY_LOCK = 'checkout:rental-availability';

    public function __construct(
        private readonly AvailabilityService $availability,
        private readonly RentalPricingService $pricing,
    ) {}

    /**
     * Tampilan register Point of Sale (Kasir Onsite).
     */
    public function index(Request $request): Response
    {
        $startDate = CarbonImmutable::today();
        $endDate = CarbonImmutable::tomorrow();

        $categories = Category::query()
            ->orderBy('name')
            ->get(['id', 'name', 'slug']);

        $products = Product::query()
            ->where('is_active', true)
            ->with([
                'category:id,name,slug',
                'images' => fn ($q) => $q->orderByDesc('is_primary')->orderBy('id'),
                'variants' => fn ($q) => $q->where('is_active', true)
                    ->with(['values.attribute:id,name', 'durationPrices']),
            ])
            ->orderBy('name')
            ->get();

        $packages = Package::query()
            ->where('is_active', true)
            ->with([
                'durationPrices',
                'items' => fn ($q) => $q->with([
                    'product:id,name',
                    'product.variants' => fn ($vq) => $vq->where('is_active', true),
                    'variant:id,sku,stock,rental_price_per_day',
                ]),
            ])
            ->orderBy('name')
            ->get();

        $customers = Customer::query()
            ->where('is_active', true)
            ->with('user:id,name,email')
            ->orderBy('id', 'desc')
            ->get(['id', 'user_id', 'phone_number', 'address', 'emergency_contact']);

        // Hitung ketersediaan awal
        $variantIds = $products->flatMap->variants->pluck('id')->all();
        $variantStocks = $this->availability->batchAvailableStock($variantIds, $startDate, $endDate);

        $packageStocks = [];
        foreach ($packages as $pkg) {
            $packageStocks[$pkg->id] = $this->availability->availablePackageStock($pkg->id, $startDate, $endDate);
        }

        return Inertia::render('pos/index', [
            'categories' => $categories,
            'products' => $products,
            'packages' => $packages,
            'customers' => $customers,
            'initialDates' => [
                'start_date' => $startDate->toDateString(),
                'end_date' => $endDate->toDateString(),
                'total_days' => $this->pricing->totalDays($startDate, $endDate),
            ],
            'initialAvailability' => [
                'variants' => $variantStocks,
                'packages' => $packageStocks,
            ],
        ]);
    }

    /**
     * Endpoint untuk memeriksa ketersediaan stok dinamis saat kasir mengubah tanggal sewa.
     */
    public function checkAvailability(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
        ]);

        $startDate = CarbonImmutable::parse($validated['start_date']);
        $endDate = CarbonImmutable::parse($validated['end_date']);
        $totalDays = $this->pricing->totalDays($startDate, $endDate);

        $variantIds = ProductVariant::query()
            ->where('is_active', true)
            ->pluck('id')
            ->all();

        $variantStocks = $this->availability->batchAvailableStock($variantIds, $startDate, $endDate);

        $packages = Package::query()
            ->where('is_active', true)
            ->get(['id']);

        $packageStocks = [];
        foreach ($packages as $pkg) {
            $packageStocks[$pkg->id] = $this->availability->availablePackageStock($pkg->id, $startDate, $endDate);
        }

        return response()->json([
            'variants' => $variantStocks,
            'packages' => $packageStocks,
            'total_days' => $totalDays,
        ]);
    }

    /**
     * Pendaftaran kilat pelanggan walk-in / onsite dari POS.
     */
    public function storeCustomer(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'phone_number' => ['required', 'string', 'max:20', 'unique:customers,phone_number'],
            'email' => ['nullable', 'string', 'email', 'max:255', 'unique:users,email'],
            'address' => ['nullable', 'string', 'max:500'],
            'emergency_contact' => ['nullable', 'string', 'max:20'],
        ]);

        $customer = DB::transaction(function () use ($validated) {
            $email = ! empty($validated['email'])
                ? $validated['email']
                : 'walkin_'.preg_replace('/\D/', '', $validated['phone_number']).'_'.Str::lower(Str::random(5)).'@pos.outdoorcondet.local';

            $user = User::create([
                'name' => $validated['name'],
                'email' => $email,
                'password' => Hash::make(Str::random(16)),
                'role' => UserRole::Customer,
            ]);

            return Customer::create([
                'user_id' => $user->id,
                'phone_number' => $validated['phone_number'],
                'address' => $validated['address'] ?? null,
                'emergency_contact' => $validated['emergency_contact'] ?? null,
                'is_verified' => true,
                'is_active' => true,
            ]);
        });

        return response()->json([
            'success' => true,
            'customer' => $customer->load('user:id,name,email'),
            'message' => 'Pelanggan berhasil didaftarkan.',
        ]);
    }

    /**
     * Proses transaksi onsite checkout kasir POS.
     */
    public function checkout(Request $request): JsonResponse|RedirectResponse
    {
        $validated = $request->validate([
            'customer_id' => ['required', 'integer', 'exists:customers,id'],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.type' => ['required', 'in:variant,package'],
            'items.*.id' => ['required', 'integer'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.selected_variants' => ['nullable', 'array'],
            'payment_type' => ['required', 'in:full,down_payment'],
            'payment_method' => ['required', 'in:cash,qris'],
            'cash_tendered' => ['nullable', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $lock = Cache::lock(self::AVAILABILITY_LOCK, 10);

        try {
            $lock->block(5);
        } catch (LockTimeoutException) {
            throw ValidationException::withMessages([
                'pos' => 'Sistem sedang sibuk memproses transaksi lain. Coba beberapa saat lagi.',
            ]);
        }

        try {
            $result = DB::transaction(function () use ($validated, $request): array {
                $pickupDate = CarbonImmutable::parse($validated['start_date']);
                $returnDate = CarbonImmutable::parse($validated['end_date']);
                $totalDays = $this->pricing->totalDays($pickupDate, $returnDate);

                if ($totalDays < 1) {
                    throw ValidationException::withMessages([
                        'dates' => 'Durasi sewa minimal adalah 1 hari.',
                    ]);
                }

                // 1. Agregasi kebutuhan stok varian
                $demand = [];
                $itemsData = [];

                foreach ($validated['items'] as $item) {
                    $qty = (int) $item['quantity'];

                    if ($item['type'] === 'variant') {
                        $variant = ProductVariant::with(['product', 'durationPrices'])
                            ->where('id', $item['id'])
                            ->where('is_active', true)
                            ->first();

                        if (! $variant) {
                            throw ValidationException::withMessages([
                                'items' => "Salah satu produk varian (ID: {$item['id']}) tidak ditemukan atau tidak aktif.",
                            ]);
                        }

                        $demand[$variant->id] = ($demand[$variant->id] ?? 0) + $qty;
                        $itemsData[] = [
                            'type' => 'variant',
                            'model' => $variant,
                            'quantity' => $qty,
                            'selected_variants' => [],
                        ];
                    } else {
                        $package = Package::with(['items', 'durationPrices'])
                            ->where('id', $item['id'])
                            ->where('is_active', true)
                            ->first();

                        if (! $package) {
                            throw ValidationException::withMessages([
                                'items' => "Salah satu paket (ID: {$item['id']}) tidak ditemukan atau tidak aktif.",
                            ]);
                        }

                        $selectedVariants = $item['selected_variants'] ?? [];
                        foreach ($package->items as $pkgItem) {
                            $vId = $pkgItem->product_variant_id;
                            if ($pkgItem->allow_variant_selection && ! empty($selectedVariants[$pkgItem->id])) {
                                $vId = (int) $selectedVariants[$pkgItem->id];
                            }

                            if ($vId !== null) {
                                $demand[$vId] = ($demand[$vId] ?? 0) + ($pkgItem->quantity * $qty);
                            }
                        }

                        $itemsData[] = [
                            'type' => 'package',
                            'model' => $package,
                            'quantity' => $qty,
                            'selected_variants' => $selectedVariants,
                        ];
                    }
                }

                // 2. Validasi stok ketersediaan per varian
                foreach ($demand as $variantId => $needed) {
                    $available = $this->availability->availableStock($variantId, $pickupDate, $returnDate);
                    if ($needed > $available) {
                        $variantName = ProductVariant::find($variantId)?->sku ?? "Varian #{$variantId}";
                        throw ValidationException::withMessages([
                            'items' => "Stok untuk {$variantName} tidak mencukupi untuk rentang tanggal ini (Dibutuhkan: {$needed}, Tersedia: {$available}).",
                        ]);
                    }
                }

                // 3. Kalkulasi biaya sewa & deposit
                $rentalAmount = 0.0;
                $depositAmount = 0.0;
                $rentalItemRows = [];

                foreach ($itemsData as $entry) {
                    $qty = $entry['quantity'];

                    if ($entry['type'] === 'variant') {
                        /** @var ProductVariant $variant */
                        $variant = $entry['model'];
                        $unitPrice = $this->pricing->unitPriceForVariant($variant, $totalDays);

                        if ($unitPrice === null) {
                            throw ValidationException::withMessages([
                                'items' => "Harga sewa tidak valid untuk {$variant->sku}.",
                            ]);
                        }

                        $subtotal = $unitPrice * $qty;
                        $depositPerUnit = (float) $variant->deposit_per_unit;
                        $depositSubtotal = $depositPerUnit * $qty;

                        $rentalAmount += $subtotal;
                        $depositAmount += $depositSubtotal;

                        $rentalItemRows[] = [
                            'rentable_type' => ProductVariant::class,
                            'rentable_id' => $variant->id,
                            'name' => ($variant->product?->name ?? 'Produk').' ('.$variant->sku.')',
                            'quantity' => $qty,
                            'unit_price' => $unitPrice,
                            'price_breakdown' => [
                                'basis' => 'variant',
                                'variant_id' => $variant->id,
                                'sku' => $variant->sku,
                                'duration_days' => $totalDays,
                                'rental_price_per_day' => (float) $variant->rental_price_per_day,
                                'deposit_per_unit' => $depositPerUnit,
                            ],
                            'subtotal' => $subtotal,
                            'deposit_per_unit' => $depositPerUnit,
                            'deposit_subtotal' => $depositSubtotal,
                        ];
                    } else {
                        /** @var Package $package */
                        $package = $entry['model'];
                        $unitPrice = $this->pricing->unitPriceForPackage($package, $totalDays);

                        if ($unitPrice === null) {
                            throw ValidationException::withMessages([
                                'items' => "Harga sewa tidak valid untuk paket {$package->name}.",
                            ]);
                        }

                        $subtotal = $unitPrice * $qty;
                        $depositPerUnit = (float) $package->deposit_per_package;
                        $depositSubtotal = $depositPerUnit * $qty;

                        $rentalAmount += $subtotal;
                        $depositAmount += $depositSubtotal;

                        $rentalItemRows[] = [
                            'rentable_type' => Package::class,
                            'rentable_id' => $package->id,
                            'name' => $package->name,
                            'quantity' => $qty,
                            'unit_price' => $unitPrice,
                            'price_breakdown' => [
                                'basis' => 'package',
                                'package_id' => $package->id,
                                'duration_days' => $totalDays,
                                'daily_price' => (float) $package->daily_price,
                                'deposit_per_package' => $depositPerUnit,
                            ],
                            'subtotal' => $subtotal,
                            'deposit_per_unit' => $depositPerUnit,
                            'deposit_subtotal' => $depositSubtotal,
                        ];
                    }
                }

                $grandTotal = $rentalAmount + $depositAmount;
                $paymentType = $validated['payment_type'];

                if ($paymentType === 'down_payment') {
                    $downPaymentAmount = $rentalAmount * 0.5;
                    $remainingBalance = max(0.0, $rentalAmount - $downPaymentAmount);
                    $rentalStatus = 'dp_paid';
                    $paidAmount = $downPaymentAmount;
                } else {
                    $downPaymentAmount = 0.0;
                    $remainingBalance = 0.0;
                    $rentalStatus = 'fully_paid';
                    $paidAmount = $rentalAmount;
                }

                $rentalCode = $this->generateRentalCode();

                $rental = Rental::create([
                    'rental_code' => $rentalCode,
                    'customer_id' => $validated['customer_id'],
                    'start_date' => $pickupDate,
                    'end_date' => $returnDate,
                    'total_days' => $totalDays,
                    'rental_amount' => $rentalAmount,
                    'deposit_amount' => $depositAmount,
                    'grand_total' => $grandTotal,
                    'payment_type' => $paymentType,
                    'down_payment_amount' => $downPaymentAmount,
                    'remaining_balance' => $remainingBalance,
                    'payment_deadline_at' => CarbonImmutable::now(),
                    'late_fee_per_day' => config('rental.late_fee_per_day', 50000),
                    'status' => $rentalStatus,
                ]);

                foreach ($rentalItemRows as $itemRow) {
                    $rental->items()->create($itemRow);
                }

                $paymentMethod = $validated['payment_method'];
                $rental->payments()->create([
                    'amount' => $paidAmount,
                    'proof_path' => 'onsite_'.$paymentMethod,
                    'status' => 'approved',
                    'reviewed_at' => CarbonImmutable::now(),
                ]);

                $cashTendered = isset($validated['cash_tendered']) ? (float) $validated['cash_tendered'] : null;
                $change = ($cashTendered !== null && $cashTendered >= $paidAmount) ? ($cashTendered - $paidAmount) : 0.0;

                return [
                    'rental' => $rental->load(['customer.user', 'items', 'payments']),
                    'cash_tendered' => $cashTendered,
                    'change' => $change,
                    'payment_method' => $paymentMethod,
                    'paid_amount' => $paidAmount,
                ];
            });
        } finally {
            $lock->release();
        }

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'rental' => $result['rental'],
                'cash_tendered' => $result['cash_tendered'],
                'change' => $result['change'],
                'payment_method' => $result['payment_method'],
                'paid_amount' => $result['paid_amount'],
                'message' => "Transaksi {$result['rental']->rental_code} berhasil diproses.",
            ]);
        }

        return redirect()->back()->with('pos_receipt', $result);
    }

    /**
     * Kode rental: OC-YYYYMMDD-001 (berurutan per hari).
     */
    private function generateRentalCode(): string
    {
        $datePart = CarbonImmutable::now()->format('Ymd');
        $prefix = 'OC-'.$datePart.'-';

        $last = Rental::where('rental_code', 'like', $prefix.'%')
            ->max('rental_code');

        $sequence = 1;

        if ($last !== null) {
            $lastPart = (string) Str::after($last, $prefix);
            $sequence = ((int) $lastPart) + 1;
        }

        return $prefix.str_pad((string) $sequence, 3, '0', STR_PAD_LEFT);
    }
}

