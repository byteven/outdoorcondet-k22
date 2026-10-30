import { Head, Link, router } from "@inertiajs/react";
import { useState } from "react";
import {
    ArrowRightIcon,
    CalendarArrowDown,
    CalendarArrowUp,
    ClipboardListIcon,
    ListFilter,
    ClockIcon,
    ReceiptText,

} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { LandingHeader } from "@/components/landing/landing-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { formatRupiah } from "@/components/product-shared";
import { RentalStatusBadge } from "@/components/rental-status-badge";
import {
    index as checkoutIndex,
    show as showCheckout,
} from "@/routes/checkout";
import { home } from "@/routes";

type RentalSummary = {
    rental_code: string;
    status: string;
    start_date: string | null;
    end_date: string | null;
    total_days: number;
    rental_amount: number;
    payment_type: string;
    created_at: string | null;
};

type CheckoutFilters = {
    status: string;
};

type Props = {
    rentals: RentalSummary[];
    filters: CheckoutFilters;
};

const statusOptions = [
    { value: "all", label: "Semua status" },
    { value: "pending_payment", label: "Menunggu pembayaran" },
    { value: "waiting_confirmation", label: "Menunggu konfirmasi" },
    { value: "siap_diambil", label: "Siap diambil" },
    { value: "returned", label: "Selesai" },
    { value: "cancelled", label: "Dibatalkan" },
];

// Transaksi aktif: masih berjalan sampai barang dikembalikan.
// Sisanya (returned/cancelled) masuk ke bagian riwayat.
const activeStatuses = new Set([
    "pending_payment",
    "waiting_confirmation",
    "siap_diambil",
]);

export default function CheckoutIndex({ rentals, filters }: Props) {
    const [status, setStatus] = useState(filters.status);
    const [loading, setLoading] = useState(false);

    const reload = (params: Record<string, string>) => {
        router.get(
            checkoutIndex.url(),
            { status, ...params },
            {
                preserveState: true,
                replace: true,
                only: ["rentals", "filters"],
                onStart: () => setLoading(true),
                onFinish: () => setLoading(false),
            },
        );
    };

    const activeRentals = rentals.filter((rental) =>
        activeStatuses.has(rental.status),
    );
    const historyRentals = rentals.filter(
        (rental) => !activeStatuses.has(rental.status),
    );

    return (
        <>
            <Head title="Riwayat Pesanan - OutdoorCondet" />

            <div className="flex min-h-screen flex-col bg-white">
                <LandingHeader />

                <main className="flex-1 bg-white">
                    <section className="mx-auto w-full max-w-6xl px-4 pt-24 pb-16 md:px-6">
                        <div className="flex flex-col gap-1">
                            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                                Riwayat Pesanan
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                Semua transaksi sewa yang pernah kamu lakukan.
                            </p>
                        </div>

                        <div className="mt-6 flex flex-wrap items-center gap-3">
                            <Select
                                value={status}
                                onValueChange={(value) => {
                                    setStatus(value);
                                    reload({ status: value });
                                }}
                            >
                                <SelectTrigger aria-label="Filter status" className="w-fit">
                                    <ListFilter className="size-4 text-muted-foreground" />
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    {statusOptions.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="mt-6">
                            {loading ? (
                                <RentalListSkeleton />
                            ) : rentals.length > 0 ? (
                                <div className="flex flex-col gap-8">
                                    {activeRentals.length > 0 && (
                                        <RentalList rentals={activeRentals} />
                                    )}

                                    {historyRentals.length > 0 && (
                                        <section className="flex flex-col gap-3">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <ClockIcon className="text-muted-foreground/60 size-4" />
                                                    <h2 className="text-sm font-medium tracking-wide text-muted-foreground">
                                                        Riwayat
                                                    </h2>
                                                </div>
                                            </div>
                                            <RentalList rentals={historyRentals} />
                                        </section>
                                    )}
                                </div>
                            ) : (
                                <EmptyOrders />
                            )}
                        </div>
                    </section>
                </main>

                <SiteFooter />
            </div>
        </>
    );
}

function RentalList({ rentals }: { rentals: RentalSummary[] }) {
    return (
        <ul className="flex flex-col gap-3">
            {rentals.map((rental) => (
                <li key={rental.rental_code}>
                    <RentalCard rental={rental} />
                </li>
            ))}
        </ul>
    );
}

function RentalCard({ rental }: { rental: RentalSummary }) {
    return (
        <Link
            href={showCheckout.url({ rental: rental.rental_code })}
            className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 transition-opacity hover:opacity-75 md:gap-5 md:p-5"
        >
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted md:size-16">
                <ReceiptText
                    className="size-6 text-muted-foreground md:size-9"
                    strokeWidth={1.5}
                />
            </div>

            <div className="flex min-w-0 flex-1 justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-1.5">
                    <span className="block h-5 truncate text-xs leading-5 font-semibold text-foreground md:text-base">
                        {rental.rental_code}
                    </span>

                    {rental.start_date && rental.end_date ? (
                        <div className="mt-1 flex md:flex-row flex-col md:gap-2 gap-0 text-[10px] font-medium text-muted-foreground md:text-xs">
                            <div className="flex items-center gap-1.5">
                                <CalendarArrowDown
                                    className="size-2 shrink-0 text-muted-foreground md:size-4"
                                    strokeWidth={1.75}
                                    aria-hidden="true"
                                />
                                <span className="sr-only">Pengambilan:</span>
                                {formatDateShort(rental.start_date)}
                            </div>
                            <div className="flex items-center gap-1.5">
                                <CalendarArrowUp
                                    className="size-2 shrink-0 text-muted-foreground md:size-4"
                                    strokeWidth={1.75}
                                    aria-hidden="true"
                                />
                                <span className="sr-only">Pengembalian:</span>
                                {formatDateShort(rental.end_date)}
                            </div>
                        </div>
                    ) : null}
                </div>

                <div className="flex shrink-0 flex-col items-end justify-between gap-2">
                    <RentalStatusBadge status={rental.status} />

                    <p className="text-sm font-semibold text-foreground md:text-md">
                        {formatRupiah(rental.rental_amount)}
                    </p>
                </div>
            </div>
        </Link>
    );
}

function RentalListSkeleton() {
    return (
        <ul className="flex flex-col gap-3" role="status" aria-label="Memuat riwayat pesanan">
            {[0, 1, 2].map((index) => (
                <li
                    key={index}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 md:gap-5 md:p-5"
                >
                    <Skeleton className="size-11 shrink-0 rounded-xl md:size-16" />

                    <div className="flex min-w-0 flex-1 justify-between gap-3">
                        <div className="flex min-w-0 flex-col gap-1.5">
                            <Skeleton className="h-5 w-36 md:w-44" />
                            <Skeleton className="h-4 w-44 md:w-56" />
                        </div>

                        <div className="flex shrink-0 flex-col items-end gap-2">
                            <Skeleton className="h-5 w-24 rounded-full" />
                            <Skeleton className="h-4 w-20" />
                        </div>
                    </div>
                </li>
            ))}
        </ul>
    );
}

function EmptyOrders() {
    return (
        <div className="flex flex-col items-center gap-4 py-24 text-center">
            <span className="flex size-20 items-center justify-center rounded-full bg-muted">
                <ClipboardListIcon
                    className="size-9 text-muted-foreground/50"
                    strokeWidth={1.5}
                />
            </span>

            <div className="flex flex-col gap-1">
                <p className="text-lg font-semibold">Belum ada pesanan</p>
                <p className="text-sm text-muted-foreground">
                    Yuk, mulai sewa alat outdoor favoritmu!
                </p>
            </div>

            <Button asChild className="rounded-full">
                <Link href={home.url()}>
                    Lihat Katalog
                    <ArrowRightIcon />
                </Link>
            </Button>
        </div>
    );
}

function formatDateShort(dateString: string): string {
    return new Date(dateString).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}
