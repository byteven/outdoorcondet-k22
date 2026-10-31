export type RentalCustomer = {
    id: number;
    user_id: number;
    phone_number: string;
    emergency_contact?: string | null;
    social_media?: string | null;
    address?: string | null;
    user?: {
        id: number;
        name: string;
        email: string;
    };
};

export type RentalPayment = {
    id: number;
    amount: number | string;
    proof_path: string | null;
    status: 'waiting' | 'approved' | 'rejected';
    reviewed_at: string | null;
    created_at: string;
};

export type RentalItemDetail = {
    id: number;
    name: string;
    type: 'alat' | 'bundle';
    image: string | null;
    quantity: number;
    unit_price: number;
    subtotal: number;
    deposit_per_unit: number;
    deposit_subtotal: number;
    price_breakdown?: Record<string, unknown> | null;
};

export type RentalRow = {
    id: number;
    rental_code: string;
    status: string;
    customer_id: number;
    start_date: string;
    end_date: string;
    total_days: number;
    rental_amount: number | string;
    deposit_amount: number | string;
    grand_total: number | string;
    payment_type: 'full' | 'down_payment';
    down_payment_amount: number | string;
    remaining_balance: number | string;
    payment_deadline_at: string | null;
    late_fee_per_day: number | string;
    late_days: number;
    late_fee_amount: number | string;
    returned_at: string | null;
    return_confirmed_by: string | null;
    return_confirmed_at: string | null;
    stock_release_at: string | null;
    cancel_reason: string | null;
    created_at: string;
    needs_confirmation: boolean;
    is_late: boolean;
    current_late_days: number;
    has_proof: boolean;
    proof_url: string | null;
    customer?: RentalCustomer;
    payments?: RentalPayment[];
};

export type RentalDetail = RentalRow & {
    items: RentalItemDetail[];
    late_days_preview: number;
    late_fee_preview: number;
    amount_to_pay_online: number;
    remaining_to_pay_outlet: number;
    proof_url: string | null;
    proof_is_image: boolean;
    latest_payment?: RentalPayment | null;
};

export type RentalSummary = {
    total: number;
    waiting_confirmation: number;
    late: number;
    returned: number;
};

export type RentalFilters = {
    search: string;
    status: string;
    date_from: string;
    date_to: string;
    per_page: number;
};

export const STATUS_OPTIONS = [
    { value: 'all', label: 'Semua Status' },
    { value: 'waiting_confirmation', label: 'Butuh Konfirmasi' },
    { value: 'late', label: 'Terlambat Pengembalian' },
    { value: 'pending_payment', label: 'Menunggu Pembayaran' },
    { value: 'dp_paid', label: 'DP Dibayar' },
    { value: 'fully_paid', label: 'Lunas' },
    { value: 'returned', label: 'Selesai (Dikembalikan)' },
    { value: 'cancelled', label: 'Dibatalkan' },
] as const;

const rupiahFormatter = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
});

export function formatRupiah(
    value: number | string | null | undefined,
): string {
    const num = Number(value);
    if (isNaN(num)) return 'Rp 0';
    return rupiahFormatter.format(num);
}

const dateFormatter = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
});

const dateTimeFormatter = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
});

export function formatDate(value: string | null | undefined): string {
    if (!value) return '-';
    try {
        return dateFormatter.format(new Date(value));
    } catch {
        return value;
    }
}

export function formatDateTime(value: string | null | undefined): string {
    if (!value) return '-';
    try {
        return dateTimeFormatter.format(new Date(value));
    } catch {
        return value;
    }
}
