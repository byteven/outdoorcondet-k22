import { Head, Link, router, usePage } from "@inertiajs/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AlertCircleIcon, ClockIcon, PackageIcon, QrCodeIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatRupiah } from "@/components/product-shared";
import { cn } from "@/lib/utils";
import { store as checkoutPaymentStoreRoute } from "@/routes/checkout/payment";
import { home } from "@/routes";
import { PaymentProofDialog } from "@/components/checkout/payment-proof-dialog";

type RentalItem = {
    id: number;
    name: string;
    type: "alat" | "bundle";
    image: string | null;
    quantity: number;
    unit_price: number;
    subtotal: number;
    deposit_per_unit: number;
    deposit_subtotal: number;
};

type RentalPayload = {
    id: number | string;
    rental_code: string;
    status: string;
    payment_type: string;
    payment_method: string;
    pickup_date: string | null;
    return_date: string | null;
    billing_start_date: string | null;
    total_days: number;
    rental_amount: number;
    deposit_amount: number;
    grand_total: number;
    down_payment_amount: number;
    remaining_balance: number;
    amount_to_pay_now: number;
    payment_deadline_at: string | null;
    items: RentalItem[];
    customer_name: string;
    customer_phone: string;
};

type Props = {
    rental: RentalPayload;
};

const COUNTDOWN_MINUTES = 30;

export default function CheckoutShow({ rental }: Props) {
    const [isPayDialogOpen, setIsPayDialogOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
    const [expired, setExpired] = useState(false);

    useEffect(() => {
        if (!rental.payment_deadline_at) {
            setExpired(true);

            return;
        }

        const deadline = new Date(rental.payment_deadline_at).getTime();

        const tick = (): void => {
            const now = Date.now();
            const diff = Math.max(0, deadline - now);

            if (diff <= 0) {
                setSecondsRemaining(0);
                setExpired(true);

                return;
            }

            setSecondsRemaining(Math.floor(diff / 1000));
        };

        tick();
        const interval = setInterval(tick, 1000);

        return () => clearInterval(interval);
    }, [rental.payment_deadline_at]);

    const minutes = Math.floor(secondsRemaining / 60);
    const secs = secondsRemaining % 60;

    const isDownPayment = rental.payment_type === "down_payment";
    const amountToPayNow = rental.amount_to_pay_now;

    const flash = (usePage().props as { flash?: { toast?: unknown } }).flash;

    if (flash?.toast) {
        const { type, message } = flash.toast as {
            type: string;
            message: string;
        };

        if (type === "success") {
            toast.success(message);
        } else if (type === "warning") {
            toast.warning(message);
        } else if (type === "error") {
            toast.error(message);
        }
    }

    const handleUpload = (file: File): void => {
        setIsUploading(true);

        const formData = new FormData();
        formData.append("proof", file);

        router.post(
            checkoutPaymentStoreRoute.url({ rental: Number(rental.id) }),
            formData,
            {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
                preserveScroll: true,
                onFinish: () => {
                    setIsUploading(false);
                    setIsPayDialogOpen(false);
                },
                onError: (errors) => {
                    setIsUploading(false);
                    const message =
                        errors.payment ?? errors.proof ?? Object.values(errors)[0];

                    if (typeof message === "string") {
                        toast.error(message);
                    }
                },
            },
        );
    };

    return (
        <>
            <Head title={`Detail Transaksi ${rental.rental_code} - OutdoorCondet`} />

            <div className="min-h-screen bg-[#fbfbfc]">
                <header className="border-b border-border bg-background sticky top-0 z-10">
                    <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-6 px-4 md:px-6">
                        <div className="flex items-center gap-2">
                            <ClockIcon className="size-5 text-muted-foreground" />
                            <span className="text-sm font-semibold text-foreground">
                                Detail Transaksi
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Nomor Pesanan
                            </span>
                            <span className="text-sm font-mono font-semibold text-foreground">
                                {rental.rental_code}
                            </span>
                        </div>
                    </div>
                </header>

                <main className="mx-auto w-full max-w-6xl px-4 pt-6 pb-16 md:px-6">
                    <div className="flex flex-col gap-1">
                        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                            Detail Pesanan
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Rangkuman pesanan sewa dan informasi pembayaran.
                        </p>
                    </div>

                    {/* Status & hitung mundur */}
                    <div className="mt-6 rounded-2xl border border-border bg-card p-4 md:p-5">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <p className="text-sm text-muted-foreground">
                                    Status Pesanan
                                </p>
                                <span className={cn(
                                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold",
                                    rental.status === "waiting_confirmation"
                                        ? "border-amber-200 bg-amber-50 text-amber-800"
                                        : "border-neutral-200 bg-neutral-100 text-neutral-600",
                                )}>
                                    {statusLabel(rental.status)}
                                </span>
                            </div>

                            <div className="flex flex-col md:flex-row items-end justify-end gap-4">
                                <div className="text-right">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider">
                                        Waktu tersisa bayar
                                    </p>
                                    <div className={cn(
                                        "flex items-baseline gap-1 monospace font-bold",
                                        expired
                                            ? "text-destructive"
                                            : "text-primary",
                                    )}>
                                        {expired ? (
                                            <span>00:00</span>
                                        ) : (
                                            <>
                                                <span>{String(minutes).padStart(2, "0")}</span>
                                                <span>:</span>
                                                <span>{String(secs).padStart(2, "0")}</span>
                                            </>
                                        )}
                                    </div>
                                    {expired && (
                                        <p className="mt-1 text-xs text-destructive">
                                            Waktu pembayaran telah habis.
                                        </p>
                                    )}
                                </div>
                                {!expired && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setIsPayDialogOpen(true)}
                                        disabled={isUploading}
                                    >
                                        <QrCodeIcon className="size-4 shrink-0" />
                                        Bayar Sekarang
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Informasi pesanan */}
                    <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
                        <div className="lg:col-span-2 space-y-4">
                            <OrderInfoCard
                                title="Jadwal Sewa"
                                rows={[
                                    {
                                        label: "Tanggal Ambil",
                                        value: rental.pickup_date
                                            ? formatDateID(rental.pickup_date)
                                            : "-",
                                    },
                                    {
                                        label: "Tanggal Kembali",
                                        value: rental.return_date
                                            ? formatDateID(rental.return_date)
                                            : "-",
                                    },
                                    {
                                        label: "Mulai Dihitung",
                                        value: rental.billing_start_date
                                            ? formatDateID(rental.billing_start_date)
                                            : "-",
                                    },
                                    {
                                        label: "Durasi",
                                        value: `${rental.total_days} hari`,
                                    },
                                ]}
                            />

                            <OrderInfoCard
                                title="Pembayaran"
                                rows={[
                                    {
                                        label: "Metode",
                                        value: "QRIS",
                                    },
                                    {
                                        label: "Tipe",
                                        value:
                                            isDownPayment ? "DP 50%" : "Lunas",
                                    },
                                    {
                                        label: "Bayar Sekarang",
                                        value: formatRupiah(amountToPayNow),
                                    },
                                ]}
                            />
                        </div>

                        <aside className="lg:col-span-1">
                            <PriceSummaryCard
                                rental={rental}
                                isDownPayment={isDownPayment}
                                amountToPayNow={amountToPayNow}
                            />
                        </aside>
                    </section>

                    {/* Detail barang (accordion) */}
                    <section className="mt-8">
                        <div className="rounded-2xl border border-border bg-card overflow-hidden">
                            <Collapsible defaultOpen>
                                <CollapsibleTrigger className="flex w-full cursor-pointer items-center justify-between gap-3 px-5 py-4 text-left text-lg font-semibold transition-colors hover:text-primary bg-muted/30">
                                    Detail Barang yang Disewa
                                    <span className="text-xs text-muted-foreground">
                                        {rental.items.length} item
                                    </span>
                                </CollapsibleTrigger>
                                <CollapsibleContent className="border-b border-t border-border/60">
                                    <div className="divide-y divide-border/60">
                                        {rental.items.map((item) => (
                                            <OrderItemRow
                                                key={item.id}
                                                item={item}
                                            />
                                        ))}
                                    </div>
                                </CollapsibleContent>
                            </Collapsible>
                        </div>
                    </section>

                    {/* CTA bayar */}
                    {!expired && (
                        <section className="mt-8">
                            <div className="rounded-2xl border border-border bg-card p-6 md:p-8 text-center">
                                <p className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">
                                    Langkah Berikutnya
                                </p>
                                <h2 className="mt-1 text-2xl font-bold tracking-tight text-foreground">
                                    Segera Selesaikan Pembayaran
                                </h2>
                                <p className="mt-3 text-sm text-muted-foreground">
                                    Unggah bukti transfer QRIS agar pesanan
                                    kamu segera dikonfirmasi admin.
                                </p>

                                <Button
                                    type="button"
                                    className="mt-6 w-full sm:w-auto"
                                    onClick={() => setIsPayDialogOpen(true)}
                                    disabled={isUploading}
                                >
                                    <QrCodeIcon className="size-5 shrink-0" />
                                    {isUploading ? "Mengunggah..." : "Bayar Sekarang"}
                                </Button>
                            </div>
                        </section>
                    )}

                    {expired && (
                        <section className="mt-8">
                            <div className="rounded-2xl border border-destructive/50 bg-destructive/5 p-6 md:p-8 text-center">
                                <AlertCircleIcon className="mx-auto size-6 text-destructive mb-3" />
                                <h2 className="text-xl font-bold text-destructive">
                                    Waktu Pembayaran Habis
                                </h2>
                                <p className="mt-3 text-sm text-muted-foreground">
                                    Pesanan ini telah expired. Silakan buat
                                    pesanan kembali dari keranjang.
                                </p>
                                <Button
                                    type="button"
                                    className="mt-4 w-full sm:w-auto"
                                    asChild
                                >
                                    <Link href={home.url()}>
                                        Kembali ke Beranda
                                    </Link>
                                </Button>
                            </div>
                        </section>
                    )}
                </main>
            </div>

            <PaymentProofDialog
                open={isPayDialogOpen}
                onOpenChange={setIsPayDialogOpen}
                rentalId={rental.id}
                amount={amountToPayNow}
                onUpload={handleUpload}
                uploading={isUploading}
            />
        </>
    );
}

function OrderInfoCard({
    title,
    rows,
}: {
    title: string;
    rows: { label: string; value: string }[];
}) {
    return (
        <div className="rounded-xl border border-border bg-background p-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                {title}
            </h3>
            <div className="mt-3 space-y-2">
                {rows.map((row) => (
                    <div
                        key={row.label}
                        className="flex items-baseline justify-between gap-2 text-sm"
                    >
                        <span className="text-muted-foreground">
                            {row.label}
                        </span>
                        <span className="font-medium text-foreground">
                            {row.value}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function PriceSummaryCard({
    rental,
    isDownPayment,
    amountToPayNow,
}: {
    rental: RentalPayload;
    isDownPayment: boolean;
    amountToPayNow: number;
}) {
    return (
        <div className="rounded-2xl border border-border bg-card p-4 md:p-5 sticky md:top-24">
            <h2 className="font-semibold tracking-tight">Ringkasan Pembayaran</h2>

            <div className="mt-4 flex flex-col gap-2.5">
                <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-medium">Total Sewa</span>
                    <span className="text-lg font-semibold text-primary tabular-nums">
                        {formatRupiah(rental.rental_amount)}
                    </span>
                </div>

                {isDownPayment && (
                    <>
                        <div className="flex items-baseline justify-between gap-2 border-t border-border pt-3">
                            <span className="text-sm text-muted-foreground">
                                DP 50% (bayar sekarang)
                            </span>
                            <span className="text-sm font-semibold text-amber-800 tabular-nums">
                                {formatRupiah(rental.down_payment_amount)}
                            </span>
                        </div>

                        <div className="flex items-baseline justify-between gap-2">
                            <span className="text-sm text-muted-foreground">
                                Sisa sewa (di outlet)
                            </span>
                            <span className="text-sm font-semibold text-foreground tabular-nums">
                                {formatRupiah(rental.remaining_balance)}
                            </span>
                        </div>
                    </>
                )}

                <div className="flex items-baseline justify-between gap-2 border-t border-border pt-3">
                    <span className="text-sm text-muted-foreground">
                        Total Deposit (di outlet)
                    </span>
                    <span className="text-sm font-semibold text-foreground tabular-nums">
                        {formatRupiah(rental.deposit_amount)}
                    </span>
                </div>

                <div className="flex items-baseline justify-between gap-2 border-t border-t-2 border-border pt-3">
                    <span className="text-sm font-medium text-foreground">
                        Total Bayar Sekarang
                    </span>
                    <span className="text-xl font-bold text-primary tabular-nums">
                        {formatRupiah(amountToPayNow)}
                    </span>
                </div>
            </div>

            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                Deposit sebesar {formatRupiah(rental.deposit_amount)}
                disetor langsung di outlet saat pengambilan barang, bukan
                lewat pembayaran online.
            </p>
        </div>
    );
}

function OrderItemRow({ item }: { item: RentalItem }) {
    return (
        <div className="flex gap-3 p-4">
            <div className="shrink-0">
                {item.image ? (
                    <img
                        src={item.image}
                        alt={item.name}
                        className="size-16 rounded-xl border border-border/20 object-cover"
                    />
                ) : (
                    <div className="flex size-16 items-center justify-center rounded-xl border border-border/20 bg-muted">
                        <PackageIcon
                            className="size-6 text-muted-foreground/40"
                            strokeWidth={1.5}
                        />
                    </div>
                )}
            </div>

            <div className="flex min-w-0 flex-col gap-1">
                <p className="font-semibold text-foreground truncate">
                    {item.name}
                </p>
                <p className="text-xs text-muted-foreground">
                    {item.quantity} unit × {formatRupiah(item.unit_price)}
                </p>
            </div>

            <div className="ml-auto flex flex-col items-end gap-1 text-right">
                <p className="font-semibold text-foreground tabular-nums">
                    {formatRupiah(item.subtotal)}
                </p>
                <p className="text-xs text-muted-foreground">
                    Deposit {formatRupiah(item.deposit_subtotal)}
                </p>
            </div>
        </div>
    );
}

function formatDateID(dateString: string): string {
    const date = new Date(dateString + "T00:00:00");

    return date.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

function statusLabel(status: string): string {
    const labels: Record<string, string> = {
        pending_payment: "Menunggu Pembayaran",
        waiting_confirmation: "Menunggu Konfirmasi Admin",
        dp_paid: "DP Terbayar",
        fully_paid: "Lunas",
        picked_up: "Diambil",
        returned: "Dikembalikan",
        completed: "Selesai",
        cancelled: "Dibatalkan",
    };

    return labels[status] ?? status;
}
