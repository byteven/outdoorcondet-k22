import { Head, Link, router, usePage } from "@inertiajs/react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
    AlertCircleIcon,
    CheckIcon,
    ChevronDownIcon,
    ChevronLeftIcon,
    CopyIcon,
    DownloadIcon,
    FileTextIcon,
    Loader,
    Maximize2Icon,
    PackageIcon,
    QrCodeIcon,
    XIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { LandingHeader } from "@/components/landing/landing-header";
import { SiteFooter } from "@/components/site-footer";
import { formatRupiah } from "@/components/product-shared";
import { QrisLogo } from "@/components/qris-logo";
import { PaymentProofDialog } from "@/components/checkout/payment-proof-dialog";
import { PaymentCardSkeleton } from "@/components/checkout/payment-card-skeleton";
import { RentalStatusBadge } from "@/components/rental-status-badge";
import { index as checkoutIndex } from "@/routes/checkout";
import { cn } from "@/lib/utils";
import { STORE_PICKUP_TIME, STORE_RETURN_TIME } from "@/lib/rental-date";
import { store as checkoutPaymentStoreRoute } from "@/routes/checkout/payment";
import { home } from "@/routes";

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

type PaymentProof = {
    url: string;
    is_image: boolean;
};

type RentalPayload = {
    id: number | string;
    rental_code: string;
    status: string;
    cancel_reason: string | null;
    payment_type: string;
    payment_method: string;
    pickup_date: string | null;
    return_date: string | null;
    total_days: number;
    rental_amount: number;
    deposit_amount: number;
    grand_total: number;
    down_payment_amount: number;
    remaining_balance: number;
    amount_to_pay_now: number;
    payment_proof: PaymentProof | null;
    payment_deadline_at: string | null;
    items: RentalItem[];
    customer_name: string;
    customer_phone: string;
};

type Props = {
    rental: RentalPayload;
};

export default function CheckoutShow({ rental }: Props) {
    const [isPayDialogOpen, setIsPayDialogOpen] = useState(false);
    const [isItemsOpen, setIsItemsOpen] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
    const [expired, setExpired] = useState(false);
    const [isCountdownReady, setIsCountdownReady] = useState(false);
    const [isStepsOpen, setIsStepsOpen] = useState(true);
    const [isCopied, setIsCopied] = useState(false);
    const hasReloadedAfterExpiry = useRef(false);

    useEffect(() => {
        if (!rental.payment_deadline_at) {
            setExpired(true);
            setIsCountdownReady(true);

            return;
        }

        const deadline = new Date(rental.payment_deadline_at).getTime();

        const tick = (): void => {
            const now = Date.now();
            const diff = Math.max(0, deadline - now);

            setIsCountdownReady(true);

            if (diff <= 0) {
                setSecondsRemaining(0);
                setExpired(true);

                // Minta status terbaru: backend membatalkan rental yang
                // melewati batas waktu pembayaran, lalu kartu berganti
                // jadi status dibatalkan.
                if (!hasReloadedAfterExpiry.current) {
                    hasReloadedAfterExpiry.current = true;
                    router.reload({ only: ["rental"] });
                }

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

    const { props } = usePage();
    const flashShownRef = useRef(false);

    useEffect(() => {
        if (flashShownRef.current) {
            return;
        }

        const flashToast = (
            props as { flash?: { toast?: { type: string; message: string } } }
        ).flash?.toast;

        if (!flashToast) {
            return;
        }

        flashShownRef.current = true;

        if (flashToast.type === "success") {
            toast.success(flashToast.message);
        } else if (flashToast.type === "warning") {
            toast.warning(flashToast.message);
        } else if (flashToast.type === "error") {
            toast.error(flashToast.message);
        }
    }, [props]);

    const handleCopyRentalCode = (): void => {
        navigator.clipboard
            .writeText(rental.rental_code)
            .then(() => {
                setIsCopied(true);
                toast.success("Nomor transaksi telah disalin");
            })
            .catch(() => {
                toast.error("Gagal menyalin nomor transaksi");
            });
    };

    useEffect(() => {
        if (!isCopied) {
            return;
        }

        const timer = setTimeout(() => setIsCopied(false), 2000);

        return () => clearTimeout(timer);
    }, [isCopied]);

    const handleUpload = (file: File): void => {
        setIsUploading(true);

        const formData = new FormData();
        formData.append("proof", file);

        router.post(
            checkoutPaymentStoreRoute.url({ rental: rental.rental_code }),
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
                    const message =
                        errors.payment ??
                        errors.proof ??
                        Object.values(errors)[0];

                    if (typeof message === "string") {
                        toast.error(message);
                    }
                },
            },
        );
    };

    return (
        <>
            <Head
                title={`Detail Transaksi ${rental.rental_code} - OutdoorCondet`}
            />

            <div className="flex min-h-screen flex-col bg-white">
                <LandingHeader />

                <main className="flex-1 bg-white">
                    <section className="mx-auto w-full max-w-6xl px-4 pt-24 pb-16 md:px-6">
                        <Link
                            href={checkoutIndex.url()}
                            className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3.5 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/70"
                        >
                            <ChevronLeftIcon
                                className="size-4"
                                aria-hidden="true"
                            />
                            Kembali
                        </Link>

                        <div className="mt-4 flex flex-col gap-1">
                            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                                Detail Pesanan
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                Informasi pesanan & pembayaran.
                            </p>
                        </div>

                        <div className="mt-6 rounded-2xl border border-border bg-card p-4 md:p-5">
                            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                <div className="relative w-full overflow-hidden rounded-xl bg-muted text-foreground/80 md:w-auto md:min-w-72">
                                    <span
                                        aria-hidden="true"
                                        className="absolute top-1/2 -left-2.5 size-5 -translate-y-1/2 rounded-full bg-card"
                                    />
                                    <span
                                        aria-hidden="true"
                                        className="absolute top-1/2 -right-2.5 size-5 -translate-y-1/2 rounded-full bg-card"
                                    />
                                    <img
                                        src="/images/logo-circle.webp"
                                        alt=""
                                        aria-hidden="true"
                                        className="pointer-events-none absolute -right-3 -bottom-4 h-16 w-auto -rotate-12 opacity-60"
                                    />
                                    <div className="relative px-4 py-3">
                                        <div className="mt-1 flex items-center gap-1.5">
                                            <button
                                                type="button"
                                                onClick={handleCopyRentalCode}
                                                aria-label="Salin nomor transaksi"
                                                className="inline-flex size-6 cursor-pointer items-center justify-center rounded-md text-muted-foreground/70    "
                                            >
                                                {isCopied ? (
                                                    <CheckIcon className="size-3.5" />
                                                ) : (
                                                    <CopyIcon className="size-3.5" />
                                                )}
                                            </button>
                                            <span className="text-sm font-semibold tracking-wide">
                                                {rental.rental_code}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">
                                        Status pesanan
                                    </p>
                                    <RentalStatusBadge
                                        status={rental.status}
                                        className="mt-1.5 px-3 py-1 text-xs"
                                    />
                                </div>
                            </div>
                        </div>

                        {rental.status === "pending_payment" &&
                            !isCountdownReady ? (
                            <PaymentCardSkeleton />
                        ) : rental.status === "pending_payment" ? (
                            !expired ? (
                                <PaymentSection
                                    minutes={minutes}
                                    secs={secs}
                                    isDownPayment={isDownPayment}
                                    amountToPayNow={amountToPayNow}
                                    isUploading={isUploading}
                                    onPay={() => setIsPayDialogOpen(true)}
                                />
                            ) : (
                                <ExpiredPaymentSection />
                            )
                        ) : rental.status === "cancelled" ? (
                            <RejectedPaymentCard
                                reason={rental.cancel_reason}
                            />
                        ) : rental.payment_proof ? (
                            <PaymentProofCard
                                status={rental.status}
                                proof={rental.payment_proof}
                                isDownPayment={isDownPayment}
                                amountToPayNow={amountToPayNow}
                            />
                        ) : null}

                        <section className="mt-6">
                            <div className="overflow-hidden rounded-2xl border border-border bg-card">
                                <Collapsible
                                    open={isStepsOpen}
                                    onOpenChange={setIsStepsOpen}
                                >
                                    <CollapsibleTrigger className="flex w-full cursor-pointer items-center justify-between gap-3 px-5 py-4 text-left text-lg font-semibold transition-colors hover:text-primary">
                                        Step Sewa
                                        <ChevronDownIcon
                                            className={cn(
                                                "size-4 shrink-0 text-muted-foreground transition-transform",
                                                isStepsOpen && "rotate-180",
                                            )}
                                        />
                                    </CollapsibleTrigger>
                                    <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                                        <div className="px-5 pb-5">
                                            <RentalSteps />
                                        </div>
                                    </CollapsibleContent>
                                </Collapsible>
                            </div>
                        </section>

                        <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
                            <div className="lg:col-span-2 space-y-4">
                                <OrderInfoCard
                                    title="Jadwal sewa"
                                    rows={[
                                        {
                                            label: "Tanggal ambil",
                                            value: rental.pickup_date
                                                ? `${formatDateID(rental.pickup_date)} (${STORE_PICKUP_TIME} - ${STORE_RETURN_TIME})`
                                                : "-",
                                        },
                                        {
                                            label: "Tanggal kembali",
                                            value: rental.return_date
                                                ? `${formatDateID(rental.return_date)} (maks. ${STORE_RETURN_TIME})`
                                                : "-",
                                        },
                                        {
                                            label: "Durasi",
                                            value: `${rental.total_days} hari`,
                                        },
                                    ]}
                                />

                                <PaymentSummaryCard
                                    rental={rental}
                                    isDownPayment={isDownPayment}
                                    amountToPayNow={amountToPayNow}
                                />
                            </div>

                            <div className="lg:col-span-1">
                                <StoreLocationCard />
                            </div>
                        </section>

                        <section className="mt-8">
                            <div className="overflow-hidden rounded-2xl border border-border bg-card">
                                <Collapsible
                                    open={isItemsOpen}
                                    onOpenChange={setIsItemsOpen}
                                >
                                    <CollapsibleTrigger className="flex w-full cursor-pointer items-center justify-between gap-3 px-5 py-4 text-left text-lg font-semibold transition-colors hover:text-primary">
                                        Alat yang disewa
                                        <ChevronDownIcon
                                            className={cn(
                                                "size-4 shrink-0 text-muted-foreground transition-transform",
                                                isItemsOpen && "rotate-180",
                                            )}
                                        />
                                    </CollapsibleTrigger>
                                    <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                                        <div className="flex flex-col px-5 pb-5 text-sm leading-relaxed text-muted-foreground">
                                            <div className="divide-y divide-border/60">
                                                {rental.items.map((item) => (
                                                    <OrderItemRow
                                                        key={item.id}
                                                        item={item}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </CollapsibleContent>
                                </Collapsible>
                            </div>
                        </section>
                    </section>
                </main>

                <SiteFooter />
            </div>

            <PaymentProofDialog
                open={isPayDialogOpen}
                onOpenChange={setIsPayDialogOpen}
                amount={amountToPayNow}
                onUpload={handleUpload}
                uploading={isUploading}
            />
        </>
    );
}

type PaymentSectionProps = {
    minutes: number;
    secs: number;
    isDownPayment: boolean;
    amountToPayNow: number;
    isUploading: boolean;
    onPay: () => void;
};

function PaymentSection({
    minutes,
    secs,
    isDownPayment,
    amountToPayNow,
    isUploading,
    onPay,
}: PaymentSectionProps) {
    const minuteDigits = String(minutes).padStart(2, "0").split("");
    const secondDigits = String(secs).padStart(2, "0").split("");

    return (
        <section className="relative mt-6 overflow-hidden rounded-2xl border border-border bg-card p-6 md:p-8">
            <CardAccent src="/images/accent-1.webp" />

            <div className="relative flex flex-col items-center text-center">
                <h2 className="flex items-center justify-center gap-2 text-lg font-semibold tracking-tight">
                    <QrisLogo className="h-5 md:h-6" />
                </h2>

                <div className="mt-4">
                    <p className="text-xs text-muted-foreground">
                        Batas waktu pembayaran
                    </p>
                    <div className="mt-2 flex items-center justify-center gap-1.5">
                        {minuteDigits.map((digit, index) => (
                            <CountdownDigit key={`m-${index}`} value={digit} />
                        ))}
                        <span className="px-0.5 text-2xl font-bold text-muted-foreground md:text-3xl">
                            :
                        </span>
                        {secondDigits.map((digit, index) => (
                            <CountdownDigit key={`s-${index}`} value={digit} />
                        ))}
                    </div>
                </div>

                <div className="mt-8 flex justify-center">
                    <div className="flex flex-col items-center gap-3 rounded-lg border border-border p-4">
                        <img
                            src="/images/qris.webp"
                            alt="Kode QRIS pembayaran OutdoorCondet"
                            className="w-44 object-contain md:w-52"
                            loading="lazy"
                        />
                        <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="rounded-full"
                        >
                            <a
                                href="/images/qris.webp"
                                download="qris-outdoorcondet.webp"
                            >
                                <DownloadIcon />
                                Simpan Gambar
                            </a>
                        </Button>
                    </div>
                </div>

                <div className="mt-8 text-center">
                    <p className="text-xs text-muted-foreground">
                        Perlu dibayar {isDownPayment ? " (DP 50%)" : ""}
                    </p>
                    <p className="mt-1 text-2xl font-bold text-primary md:text-3xl">
                        {formatRupiah(amountToPayNow)}
                    </p>
                </div>

                <Button
                    type="button"
                    className="mt-5 min-w-48 md:min-w-56 rounded-full"
                    onClick={onPay}
                    disabled={isUploading}
                >
                    <QrCodeIcon />
                    Unggah Bukti
                </Button>
            </div>
        </section>
    );
}

function CountdownDigit({ value }: { value: string }) {
    return (
        <span className="flex h-12 w-10 items-center justify-center rounded-lg bg-muted text-2xl font-bold tabular-nums text-foreground md:h-14 md:w-12 md:text-3xl">
            {value}
        </span>
    );
}

function CardAccent({
    src,
    grayscale = false,
}: {
    src: string;
    grayscale?: boolean;
}) {
    const filter = grayscale ? "grayscale opacity-20" : "opacity-84";

    return (
        <>
            <div
                aria-hidden="true"
                className="pointer-events-none absolute top-0 left-0 h-36 w-48 overflow-hidden sm:h-48 sm:w-64 md:hidden"
            >
                <img
                    src={src}
                    alt=""
                    className={cn("h-[200%] w-[200%] max-w-none", filter)}
                />
            </div>
            <div
                aria-hidden="true"
                className="pointer-events-none absolute right-0 bottom-0 h-36 w-48 rotate-180 overflow-hidden sm:h-48 sm:w-64 md:hidden"
            >
                <img
                    src={src}
                    alt=""
                    className={cn("h-[200%] w-[200%] max-w-none", filter)}
                />
            </div>
            <img
                src={src}
                alt=""
                aria-hidden="true"
                className={cn(
                    "pointer-events-none absolute inset-0 hidden h-full w-full select-none md:block",
                    filter,
                )}
            />
        </>
    );
}

function ExpiredPaymentSection() {
    return (
        <section className="mt-6">
            <div className="rounded-2xl border border-border p-6 md:p-8 text-center">
                <AlertCircleIcon className="mx-auto size-6 text-primary" />
                <h2 className="mt-3 text-xl font-bold text-primary">
                    Waktu pembayaran habis!
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                    Pesanan ini telah kedaluwarsa. Silakan buat pesanan kembali
                    dari keranjang.
                </p>
                <Button
                    type="button"
                    className="mt-4 w-full sm:w-auto rounded-full"
                    asChild
                >
                    <Link href={home.url()}>Kembali ke beranda</Link>
                </Button>
            </div>
        </section>
    );
}

function RejectedPaymentCard({ reason }: { reason: string | null }) {
    return (
        <section className="mt-6">
            <div className="rounded-2xl border border-border p-6 md:p-8 text-center">
                <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-destructive">
                    <XIcon className="size-7 text-destructive-foreground" />
                </div>
                <h2 className="mt-4 text-xl font-bold text-destructive">
                    Pesanan dibatalkan admin
                </h2>

                {reason && (
                    <div className="mx-auto mt-4 max-w-md rounded-lg bg-muted p-3 text-left">
                        <p className="text-xs font-medium text-muted-foreground">
                            Pesan dari Admin:
                        </p>
                        <p className="mt-1 text-sm text-foreground">{reason}</p>
                    </div>
                )}
            </div>
        </section>
    );
}

function PaymentProofCard({
    status,
    proof,
    isDownPayment,
    amountToPayNow,
}: {
    status: string;
    proof: PaymentProof;
    isDownPayment: boolean;
    amountToPayNow: number;
}) {
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    const isConfirmed =
        status === "dp_paid" ||
        status === "fully_paid" ||
        status === "returned";

    const title =
        status === "waiting_confirmation"
            ? "Menunggu Konfirmasi Admin"
            : "Pembayaran terkonfirmasi";

    const message =
        status === "waiting_confirmation"
            ? "Pembayaran terkirim, mohon tunggu konfirmasi admin."
            : status === "dp_paid"
                ? "Sisa pembayaran dan deposit dibayar di outlet saat pengambilan alat."
                : "Tunjukkan halaman ini atau nomor transaksi saat pengambilan alat.";

    return (
        <section className="relative mt-6 overflow-hidden rounded-2xl border border-border bg-card p-6 md:p-8">
            <CardAccent
                src="/images/accent-1-success.webp"
                grayscale={!isConfirmed}
            />

            <div className="relative flex flex-col items-center text-center">
                {isConfirmed ? (
                    <div className="flex size-14 items-center justify-center rounded-full bg-success">
                        <CheckIcon className="size-7 text-success-foreground" />
                    </div>
                ) : (
                    <div className="flex size-14 items-center justify-center rounded-full bg-muted-foreground/20">
                        <Loader className="size-7 text-foreground" />
                    </div>
                )}
                <h2 className="mt-4 text-lg font-semibold tracking-tight">
                    {title}
                </h2>
                <p className="mt-2 max-w-md text-sm text-muted-foreground">
                    {message}
                </p>

                <div className="mt-6 flex justify-center">
                    <div className="flex flex-col items-center gap-3 rounded-lg border border-border p-4">
                        {proof.is_image ? (
                            <button
                                type="button"
                                onClick={() => setIsPreviewOpen(true)}
                                aria-label="Perbesar bukti pembayaran"
                                className="group relative cursor-pointer overflow-hidden rounded-lg"
                            >
                                <img
                                    src={proof.url}
                                    alt="Bukti pembayaran terunggah"
                                    className="max-h-56 w-auto object-contain"
                                    loading="lazy"
                                />
                                <span className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-full opacity-75 bg-black/80 text-white transition-colors group-hover:opacity-50">
                                    <Maximize2Icon className="size-3.5" />
                                </span>
                            </button>
                        ) : (
                            <Button
                                asChild
                                variant="outline"
                                size="sm"
                                className="rounded-full"
                            >
                                <a
                                    href={proof.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <FileTextIcon />
                                    Buka bukti (PDF)
                                </a>
                            </Button>
                        )}
                    </div>
                </div>

                <div className="mt-6 text-center">
                    <p className="text-xs text-muted-foreground">
                        {isDownPayment ? "Dibayar (DP 50%)" : "Dibayar (Lunas)"}
                    </p>
                    <p className="mt-1 text-2xl font-bold text-primary md:text-3xl">
                        {formatRupiah(amountToPayNow)}
                    </p>
                </div>
            </div>

            {proof.is_image && (
                <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                    <DialogContent className="max-w-md bg-white">
                        <DialogHeader>
                            <DialogTitle>Preview transaksi</DialogTitle>
                        </DialogHeader>

                        <img
                            src={proof.url}
                            alt="Bukti pembayaran terunggah"
                            className="max-h-[60vh] w-full rounded-lg border border-border object-contain"
                        />

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsPreviewOpen(false)}
                            >
                                Tutup
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </section>
    );
}

function RentalSteps() {
    const steps = [
        `Pengambilan Alat Pukul ${STORE_PICKUP_TIME} - ${STORE_RETURN_TIME}`,
        "Bawa Identitas KTP/SIM/kartu pelajar/KK",
        "Bayar sisa sewa & deposit di outlet",
        `Pengembalian barang maks. pukul ${STORE_RETURN_TIME}`,
    ];

    return (
        <ol className="grid grid-cols-1 gap-4 sm:grid-cols-4 sm:gap-2">
            {steps.map((step, index) => (
                <li
                    key={step}
                    className="relative flex flex-row items-start gap-3 text-left sm:flex-col sm:items-center sm:gap-2 sm:text-center"
                >
                    {index < steps.length - 1 && (
                        <span
                            aria-hidden="true"
                            className="absolute top-7 bottom-[-1rem] left-[0.8125rem] w-0.5 bg-primary/25 sm:hidden"
                        />
                    )}
                    {index > 0 && (
                        <span
                            aria-hidden="true"
                            className="absolute top-4 right-[calc(50%+1.5rem)] left-[calc(-50%+1.5rem)] hidden h-0.5 bg-primary/25 sm:block"
                        />
                    )}
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-primary bg-primary text-xs font-semibold text-primary-foreground sm:size-8 sm:text-sm">
                        {index + 1}
                    </span>
                    <span className="text-xs leading-relaxed text-muted-foreground">
                        {step}
                    </span>
                </li>
            ))}
        </ol>
    );
}

const STORE_MAPS_URL =
    "https://www.google.com/maps/place/Sewa+Alat+Outdoor+%26+Camping+Condet/@-6.2793228,106.8513913,17z/data=!3m1!4b1!4m6!3m5!1s0x2e69f3002ee50f17:0x7fade8d30da99f7a!8m2!3d-6.2793228!4d106.8513913!16s%2Fg%2F11y50wzhp2";

function StoreLocationCard() {
    return (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
            <iframe
                title="Lokasi outlet OutdoorCondet"
                src="https://maps.google.com/maps?q=-6.2793228,106.8513913&hl=id&z=17&output=embed"
                className="h-44 w-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
            />
            <div className="p-4">
                <h2 className="font-semibold tracking-tight">Lokasi outlet</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                    Sewa Alat Outdoor & Camping Condet
                </p>
                <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="mt-3 w-full rounded-full"
                >
                    <a
                        href={STORE_MAPS_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Buka di Google Maps
                    </a>
                </Button>
            </div>
        </div>
    );
}

function OrderInfoCard({
    title,
    rows,
}: {
    title: string;
    rows: { label: string; value: ReactNode }[];
}) {
    return (
        <div className="rounded-xl border border-border bg-background p-4">
            <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
            <div className="mt-3 space-y-2">
                {rows.map((row) => (
                    <div
                        key={row.label}
                        className="flex flex-col items-start gap-0.5 text-sm sm:flex-row sm:items-baseline sm:justify-between sm:gap-2"
                    >
                        <span className="text-muted-foreground">
                            {row.label}
                        </span>
                        <span className="font-medium text-foreground sm:text-right">
                            {row.value}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function PaymentSummaryCard({
    rental,
    isDownPayment,
    amountToPayNow,
}: {
    rental: RentalPayload;
    isDownPayment: boolean;
    amountToPayNow: number;
}) {
    return (
        <div className="rounded-xl border border-border bg-background p-4">
            <h2 className="text-lg font-semibold tracking-tight">
                Ringkasan pembayaran
            </h2>

            <div className="mt-3 flex flex-col gap-2">
                <div className="flex items-baseline justify-between gap-2 pb-2 border-b border-border">
                    <span className="text-sm font-medium">Total sewa</span>
                    <span className="text-lg font-semibold text-primary">
                        {formatRupiah(rental.rental_amount)}
                    </span>
                </div>

                <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm text-muted-foreground">
                        Total deposit
                    </span>
                    <span className="text-sm text-muted-foreground">
                        {formatRupiah(rental.deposit_amount)}
                    </span>
                </div>

                <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="text-muted-foreground">Metode</span>
                    <span className="font-medium text-foreground">
                        <QrisLogo className="h-4" />
                    </span>
                </div>

                <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="text-muted-foreground">Tipe</span>
                    <span className="font-medium text-foreground">
                        {isDownPayment ? "DP 50%" : "Lunas"}
                    </span>
                </div>

                <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="text-muted-foreground">
                        Bayar sekarang{isDownPayment ? " (50%)" : ""}
                    </span>
                    <span className="font-medium text-foreground">
                        {formatRupiah(amountToPayNow)}
                    </span>
                </div>
            </div>
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
                <p
                    className="font-semibold text-foreground truncate"
                    title={item.name}
                >
                    {item.name}
                </p>
                <p className="text-xs text-muted-foreground">
                    {item.quantity} unit × {formatRupiah(item.unit_price)}
                </p>
            </div>

            <div className="ml-auto flex flex-col items-end gap-1 text-right">
                <p className="font-semibold text-foreground">
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
    const date = new Date(dateString);

    return date.toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}
