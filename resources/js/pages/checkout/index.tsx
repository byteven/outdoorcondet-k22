import { Head, Link } from "@inertiajs/react";
import { ArrowRightIcon, ChevronRightIcon, ClipboardListIcon, ReceiptText } from "lucide-react";
import { LandingHeader } from "@/components/landing/landing-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { formatRupiah } from "@/components/product-shared";
import { cn } from "@/lib/utils";
import { show as showCheckout } from "@/routes/checkout";
import { home } from "@/routes";

type RentalSummary = {
    rental_code: string;
    status: string;
    start_date: string | null;
    end_date: string | null;
    total_days: number;
    grand_total: number;
    payment_type: string;
    created_at: string | null;
};

type Props = {
    rentals: RentalSummary[];
};

export default function CheckoutIndex({ rentals }: Props) {
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

                        <div className="mt-6">
                            {rentals.length > 0 ? (
                                <RentalList rentals={rentals} />
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

            {/* Dua kolom: kiri (kode + tanggal), kanan (status atas, total bawah) */}
            <div className="flex min-w-0 flex-1 justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-1.5">
                    <span className="flex h-5 items-center truncate text-xs font-semibold text-foreground md:text-base">
                        {rental.rental_code}
                    </span>

                    {rental.start_date && rental.end_date ? (
                        <div className="grid grid-cols-[auto_1fr] gap-2 mt-1 text-[10px] md:text-xs">

                            <div className="font-medium text-muted-foreground">
                                {formatDateShort(rental.start_date)}
                            </div>
                            <div className="font-medium text-muted-foreground">
                                {formatDateShort(rental.end_date)}
                            </div>
                        </div>
                    ) : null}
                </div>

                <div className="flex shrink-0 flex-col items-end justify-between gap-2">
                    <StatusBadge status={rental.status} />

                    <div className="flex flex-col items-end">
                        <p className="text-[11px] font-semibold text-foreground md:text-sm">
                            {formatRupiah(rental.grand_total)}
                        </p>
                        {rental.payment_type === "down_payment" && (
                            <p className="text-xs text-muted-foreground">
                                (DP 50%)
                            </p>
                        )}
                    </div>
                </div>
            </div>

            <ChevronRightIcon className="size-4 shrink-0 text-primary md:size-5" />
        </Link>
    );
}
function StatusBadge({ status }: { status: string }) {
    return (
        <span
            className={cn(
                "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold md:px-2.5 md:text-xs",
                statusBadgeClass(status),
            )}
        >
            <span className="size-1.5 rounded-full bg-current" />
            {statusLabel(status)}
        </span>
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

function statusBadgeClass(status: string): string {
    const classes: Record<string, string> = {
        pending_payment: "bg-muted text-muted-foreground",
        waiting_confirmation: "bg-warning-muted text-warning",
        dp_paid: "bg-success-muted text-success",
        fully_paid: "bg-success-muted text-success",
        returned: "bg-success-muted text-success",
        cancelled: "bg-destructive/10 text-destructive",
    };

    return classes[status] ?? "bg-muted text-muted-foreground";
}

function statusLabel(status: string): string {
    const labels: Record<string, string> = {
        pending_payment: "Menunggu pembayaran",
        waiting_confirmation: "Menunggu konfirmasi",
        dp_paid: "Siap diambil",
        fully_paid: "Siap diambil",
        returned: "Selesai",
        cancelled: "Dibatalkan",
    };

    return labels[status] ?? status;
}
