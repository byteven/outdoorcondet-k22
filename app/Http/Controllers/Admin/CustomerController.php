<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreCustomerRequest;
use App\Http\Requests\Admin\UpdateCustomerRequest;
use App\Models\Customer;
use App\Models\User;
use App\UserRole;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class CustomerController extends Controller
{
    /**
     * Show a paginated list of customers for admins.
     */
    public function index(Request $request): Response
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', 'in:all,active,inactive'],
            'per_page' => ['nullable', 'integer', 'min:5', 'max:100'],
            'sort_by' => ['nullable', 'in:name,email,created_at'],
            'sort_dir' => ['nullable', 'in:asc,desc'],
        ]);

        $status = $filters['status'] ?? 'all';
        $sortBy = $filters['sort_by'] ?? 'created_at';
        $sortDir = $filters['sort_dir'] ?? 'desc';

        $sortColumn = match ($sortBy) {
            'name' => 'users.name',
            'email' => 'users.email',
            default => 'customers.created_at',
        };

        $customers = Customer::query()
            ->when(
                in_array($sortBy, ['name', 'email'], true),
                fn ($query) => $query
                    ->select('customers.*')
                    ->join('users', 'users.id', '=', 'customers.user_id'),
            )
            ->with(['user:id,name,email'])
            ->when(
                $filters['search'] ?? null,
                fn ($query, string $search) => $query->search($search),
            )
            ->when(
                $status !== 'all',
                fn ($query) => $query->where('is_active', $status === 'active'),
            )
            ->orderBy($sortColumn, $sortDir)
            ->paginate($filters['per_page'] ?? 10)
            ->withQueryString();

        // Ringkasan global, tidak mengikuti filter tabel.
        $summaryRow = Customer::query()
            ->selectRaw('COUNT(*) AS total, COALESCE(SUM(is_active), 0) AS active')
            ->first();

        $summary = [
            'total' => (int) $summaryRow->total,
            'active' => (int) $summaryRow->active,
            'inactive' => (int) $summaryRow->total - (int) $summaryRow->active,
        ];

        return Inertia::render('customers/index', [
            'customers' => $customers,
            'summary' => $summary,
            'filters' => [
                'search' => $filters['search'] ?? '',
                'status' => $status,
                'per_page' => (int) ($filters['per_page'] ?? 10),
                'sort_by' => $sortBy,
                'sort_dir' => $sortDir,
            ],
        ]);
    }

    /**
     * Store a newly created customer with its user account.
     *
     * An email owned by a deactivated or deleted customer is restored
     * and overwritten instead of rejected.
     */
    public function store(StoreCustomerRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $restored = false;

        DB::transaction(function () use ($validated, &$restored): void {
            $existingUser = User::where('email', $validated['email'])->first();

            if ($existingUser) {
                $existingUser->update([
                    'name' => $validated['name'],
                    'password' => $validated['password'],
                ]);

                $existingCustomer = $existingUser->customer()->withTrashed()->first();

                if ($existingCustomer) {
                    if ($existingCustomer->trashed()) {
                        $existingCustomer->restore();
                    }

                    $existingCustomer->update([
                        'phone_number' => $validated['phone_number'],
                        'emergency_contact' => $validated['emergency_contact'],
                        'social_media' => $validated['social_media'],
                        'address' => $validated['address'],
                        'is_active' => true,
                    ]);

                    $restored = true;

                    return;
                }

                $existingUser->customer()->create([
                    'phone_number' => $validated['phone_number'],
                    'emergency_contact' => $validated['emergency_contact'],
                    'social_media' => $validated['social_media'],
                    'address' => $validated['address'],
                ]);

                $restored = true;

                return;
            }

            $user = User::create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'password' => $validated['password'],
                'role' => UserRole::Customer,
            ]);

            $user->customer()->create([
                'phone_number' => $validated['phone_number'],
                'emergency_contact' => $validated['emergency_contact'],
                'social_media' => $validated['social_media'],
                'address' => $validated['address'],
            ]);
        });

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => $restored
                ? "Pelanggan {$validated['name']} berhasil dipulihkan dan diaktifkan kembali."
                : "Pelanggan {$validated['name']} berhasil ditambahkan.",
        ]);

        return back();
    }

    /**
     * Update the given customer and its user account.
     */
    public function update(UpdateCustomerRequest $request, Customer $customer): RedirectResponse
    {
        $validated = $request->validated();

        DB::transaction(function () use ($validated, $customer): void {
            $customer->user->update([
                'name' => $validated['name'],
                'email' => $validated['email'],
            ]);

            $customer->update([
                'phone_number' => $validated['phone_number'],
                'emergency_contact' => $validated['emergency_contact'] ?? null,
                'social_media' => $validated['social_media'] ?? null,
                'address' => $validated['address'] ?? null,
                'is_active' => $validated['is_active'],
            ]);
        });

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => "Perubahan pelanggan {$validated['name']} berhasil disimpan.",
        ]);

        return back();
    }

    /**
     * Soft delete the given customer and deactivate its account.
     */
    public function destroy(Customer $customer): RedirectResponse
    {
        $name = $customer->user->name;

        DB::transaction(function () use ($customer): void {
            $customer->update(['is_active' => false]);
            $customer->delete();
        });

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => "Pelanggan {$name} dinonaktifkan dan dihapus.",
        ]);

        return back();
    }
}
