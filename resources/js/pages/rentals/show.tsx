import { Head, Link } from '@inertiajs/react';
import {
    AlertCircle,
    AlertTriangle,
    ArrowLeft,
    Calendar,
    CheckCircle2,
    Clock,
    Copy,
    ExternalLink,
    FileText,
    Maximize2,
    MessageCircle,
    Package,
    ReceiptText,
    User,
    X,
    XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import {
    CancelRentalDialog,
    ConfirmPaymentDialog,
    ConfirmReturnDialog,
    PaymentProofModal,
    RejectPaymentDialog,
} from '@/components/rental-action-dialogs';
import {
    formatDate,
    formatDateTime,
    formatRupiah,
    type RentalDetail,
} from '@/components/rental-shared';
import { RentalStatusBadge } from '@/components/rental-status-badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { index as rentalsIndex } from '@/routes/admin/rentals';

type Props = {
    rental: RentalDetail;
};

export default function RentalShow({ rental }: Props) {
    const [showConfirmPayment, setShowConfirmPayment] = useState(false);
    const [showRejectPayment, setShowRejectPayment] = useState(false);
    const [showConfirmReturn, setShowConfirmReturn] = useState(false);
    const [showCancelRental, setShowCancelRental] = useState(false);
    const [showProofModal, setShowProofModal] = useState(false);

    const customerUser = rental.customer?.user;
    const isWaitingConfirmation = rental.status === 'waiting_confirmation';
    const isDp = rental.payment_type === 'down_payment';
    const canConfirmReturn =
        rental.status === 'dp_paid' || rental.status === 'fully_paid';
    const canCancel =
        rental.status !== 'returned' && rental.status !== 'cancelled';

    const isLate = rental.is_late || rental.current_late_days > 0;
    const lateDays = rental.late_days_preview || rental.current_late_days || 0;
    const lateFee =
        rental.late_fee_preview || Number(rental.late_fee_amount) || 0;

    const copyToClipboard = (text: string, label: string) => {
        void navigator.clipboard.writeText(text);
        toast.success(`${label} berhasil disalin!`);
    };

    // Clean phone number for WhatsApp URL (e.g. 0812... -> 62812...)
    const phone = rental.customer?.phone_number || '';
    const cleanPhone = phone.replace(/^0/, '62').replace(/\D/g, '');
    const waUrl = cleanPhone ? `https://wa.me/${cleanPhone}` : null;

    return (
        <>
            <Head title={`Detail Rental ${rental.rental_code}`} />

            <div className="mx-auto flex h-full w-full max-w-7xl flex-1 flex-col gap-6 p-4">
                {/* Back button and breadcrumb action */}
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="-ml-2 gap-1.5"
                    >
                        <Link href={rentalsIndex().url}>
                            <ArrowLeft className="size-4" />
                            <span>Kembali ke Daftar Rental</span>
                        </Link>
                    </Button>
                </div>

                {/* Top Header Card */}
                <div className="flex flex-col gap-4 rounded-xl border bg-card p-6 shadow-xs md:flex-row md:items-center md:justify-between">
                    <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2.5">
                            <h1 className="font-mono text-2xl font-bold tracking-tight text-primary">
                                {rental.rental_code}
                            </h1>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="size-7"
                                onClick={() =>
                                    copyToClipboard(
                                        rental.rental_code,
                                        'Kode Rental',
                                    )
                                }
                                title="Salin Kode Rental"
                            >
                                <Copy className="size-3.5" />
                            </Button>
                            <RentalStatusBadge status={rental.status} />

                            {isWaitingConfirmation && (
                                <Badge className="animate-pulse gap-1 bg-amber-500 text-xs text-white hover:bg-amber-600">
                                    <AlertCircle className="size-3" />
                                    Butuh Konfirmasi Pembayaran
                                </Badge>
                            )}

                            {isLate && (
                                <Badge
                                    variant="destructive"
                                    className="gap-1 text-xs"
                                >
                                    <Clock className="size-3" />
                                    Terlambat ({lateDays} Hari)
                                </Badge>
                            )}
                        </div>

                        <p className="text-xs text-muted-foreground">
                            Dipesan pada {formatDateTime(rental.created_at)}{' '}
                            oleh{' '}
                            <strong className="text-foreground">
                                {customerUser?.name ?? 'Customer'}
                            </strong>
                        </p>
                    </div>

                    {/* Header Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2">
                        {isWaitingConfirmation && (
                            <>
                                <Button
                                    size="sm"
                                    className="gap-1.5 bg-emerald-600 text-white shadow-xs hover:bg-emerald-700"
                                    onClick={() => setShowConfirmPayment(true)}
                                >
                                    <CheckCircle2 className="size-4" />
                                    Setujui Pembayaran
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10"
                                    onClick={() => setShowRejectPayment(true)}
                                >
                                    <XCircle className="size-4" />
                                    Tolak Pembayaran
                                </Button>
                            </>
                        )}

                        {canConfirmReturn && (
                            <Button
                                size="sm"
                                className="gap-1.5 shadow-xs"
                                onClick={() => setShowConfirmReturn(true)}
                            >
                                <Clock className="size-4" />
                                Konfirmasi Pengembalian
                            </Button>
                        )}

                        {canCancel && (
                            <Button
                                size="sm"
                                variant="outline"
                                className="gap-1.5 border-destructive/20 text-destructive hover:bg-destructive/10"
                                onClick={() => setShowCancelRental(true)}
                            >
                                <X className="size-4" />
                                Batalkan Rental
                            </Button>
                        )}
                    </div>
                </div>

                {/* Status Notice Alerts */}
                {isLate && (
                    <Alert
                        variant="destructive"
                        className="border-destructive/50 bg-destructive/5"
                    >
                        <AlertTriangle className="size-4" />
                        <AlertTitle className="font-semibold">
                            Peringatan Keterlambatan Pengembalian
                        </AlertTitle>
                        <AlertDescription className="mt-1 text-xs">
                            Rental ini melewati batas kembali (
                            {formatDate(rental.end_date)}). Keterlambatan
                            berjalan:{' '}
                            <span className="font-bold">{lateDays} hari</span>.
                            Estimasi denda saat ini:{' '}
                            <span className="font-bold">
                                {formatRupiah(lateFee)}
                            </span>{' '}
                            (Rp 50.000/hari dipotong dari deposit offline di
                            outlet).
                        </AlertDescription>
                    </Alert>
                )}

                {isWaitingConfirmation && (
                    <Alert className="border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                        <AlertCircle className="size-4 text-amber-600" />
                        <AlertTitle className="font-semibold">
                            Menunggu Konfirmasi Bukti Pembayaran QRIS
                        </AlertTitle>
                        <AlertDescription className="mt-1 text-xs">
                            Pelanggan telah mengunggah bukti transfer. Silakan
                            periksa nominal pada mutasi rekening/QRIS dan klik
                            "Setujui Pembayaran" jika valid, atau "Tolak
                            Pembayaran" jika tidak sesuai.
                        </AlertDescription>
                    </Alert>
                )}

                {rental.status === 'cancelled' && (
                    <Alert
                        variant="destructive"
                        className="border-destructive/30 bg-destructive/5"
                    >
                        <XCircle className="size-4" />
                        <AlertTitle className="font-semibold">
                            Rental Dibatalkan
                        </AlertTitle>
                        <AlertDescription className="mt-1 text-xs">
                            Alasan pembatalan:{' '}
                            <span className="font-medium italic">
                                "
                                {rental.cancel_reason ||
                                    'Tidak ada alasan yang dicatat.'}
                                "
                            </span>
                        </AlertDescription>
                    </Alert>
                )}

                {rental.status === 'returned' && (
                    <Alert className="border-emerald-300 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
                        <CheckCircle2 className="size-4 text-emerald-600" />
                        <AlertTitle className="font-semibold">
                            Rental Telah Selesai & Dikembalikan
                        </AlertTitle>
                        <AlertDescription className="mt-1 text-xs">
                            Dikembalikan pada{' '}
                            {formatDateTime(rental.returned_at)}. Petugas:{' '}
                            {rental.return_confirmed_by ?? 'Admin'}. Denda
                            keterlambatan:{' '}
                            {formatRupiah(rental.late_fee_amount)} (
                            {rental.late_days} hari).
                        </AlertDescription>
                    </Alert>
                )}

                {/* Main Content Grid: 2 Columns */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {/* LEFT COLUMN: Items, Payment Proof, Logs (2 Cols wide) */}
                    <div className="space-y-6 lg:col-span-2">
                        {/* 1. Items Card */}
                        <Card>
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="flex items-center gap-2 text-base">
                                            <Package className="size-4 text-primary" />
                                            Daftar Peralatan & Paket Disewa
                                        </CardTitle>
                                        <CardDescription>
                                            Total {rental.items.length} item
                                            peralatan outdoor
                                        </CardDescription>
                                    </div>
                                    <Badge
                                        variant="secondary"
                                        className="font-mono text-xs"
                                    >
                                        Durasi: {rental.total_days} Hari
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[45%]">
                                                Item
                                            </TableHead>
                                            <TableHead className="w-[10%] text-center">
                                                Qty
                                            </TableHead>
                                            <TableHead className="w-[20%] text-right">
                                                Sewa
                                            </TableHead>
                                            <TableHead className="w-[25%] text-right">
                                                Deposit (Offline)
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {rental.items.map((item) => (
                                            <TableRow key={item.id}>
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        {item.image ? (
                                                            <img
                                                                src={item.image}
                                                                alt={item.name}
                                                                className="size-11 shrink-0 rounded-md border bg-muted object-cover"
                                                            />
                                                        ) : (
                                                            <div className="flex size-11 shrink-0 items-center justify-center rounded-md border bg-muted text-muted-foreground">
                                                                <Package className="size-5" />
                                                            </div>
                                                        )}
                                                        <div className="flex min-w-0 flex-col">
                                                            <span className="truncate text-sm font-medium">
                                                                {item.name}
                                                            </span>
                                                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                                <Badge
                                                                    variant="outline"
                                                                    className="h-4 px-1 py-0 text-[10px] font-normal uppercase"
                                                                >
                                                                    {item.type}
                                                                </Badge>
                                                                <span>
                                                                    @{' '}
                                                                    {formatRupiah(
                                                                        item.unit_price,
                                                                    )}
                                                                    /durasi
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center text-sm font-medium">
                                                    {item.quantity}
                                                </TableCell>
                                                <TableCell className="text-right text-sm font-medium">
                                                    {formatRupiah(
                                                        item.subtotal,
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right text-sm">
                                                    <div className="flex flex-col items-end">
                                                        <span className="font-medium text-muted-foreground">
                                                            {formatRupiah(
                                                                item.deposit_subtotal,
                                                            )}
                                                        </span>
                                                        <span className="text-[10px] text-muted-foreground/80">
                                                            (@{' '}
                                                            {formatRupiah(
                                                                item.deposit_per_unit,
                                                            )}
                                                            )
                                                        </span>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>

                                {/* Items Summary Footnote */}
                                <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/30 p-4 text-xs">
                                    <span className="text-muted-foreground">
                                        * Deposit tidak ditagih online,
                                        melainkan disetorkan customer secara
                                        tunai/transfer di outlet saat
                                        pengambilan barang.
                                    </span>
                                    <div className="ml-auto flex items-center gap-4">
                                        <span className="text-muted-foreground">
                                            Subtotal Sewa:{' '}
                                            <strong className="text-foreground">
                                                {formatRupiah(
                                                    rental.rental_amount,
                                                )}
                                            </strong>
                                        </span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* 2. Payment Proof Section */}
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <FileText className="size-4 text-primary" />
                                        Bukti Pembayaran QRIS (Storage Privat)
                                    </CardTitle>
                                    {rental.latest_payment && (
                                        <Badge
                                            variant={
                                                rental.latest_payment.status ===
                                                'approved'
                                                    ? 'default'
                                                    : rental.latest_payment
                                                            .status ===
                                                        'rejected'
                                                      ? 'destructive'
                                                      : 'secondary'
                                            }
                                            className="text-xs"
                                        >
                                            {rental.latest_payment.status ===
                                            'approved'
                                                ? 'Disetujui'
                                                : rental.latest_payment
                                                        .status === 'rejected'
                                                  ? 'Ditolak'
                                                  : 'Menunggu Review'}
                                        </Badge>
                                    )}
                                </div>
                                <CardDescription>
                                    Bukti pembayaran diunggah customer melalui
                                    checkout QRIS dan disimpan secara privat.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {rental.proof_url ? (
                                    <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
                                        {/* Proof Thumbnail with Zoom Trigger */}
                                        <div
                                            className="group relative flex max-h-72 cursor-pointer items-center justify-center overflow-hidden rounded-lg border bg-muted/20 p-2 transition-all hover:border-primary"
                                            onClick={() =>
                                                setShowProofModal(true)
                                            }
                                            title="Klik untuk memperbesar bukti pembayaran"
                                        >
                                            {rental.proof_is_image ? (
                                                <img
                                                    src={rental.proof_url}
                                                    alt={`Bukti bayar ${rental.rental_code}`}
                                                    className="max-h-64 rounded object-contain transition-transform group-hover:scale-[1.02]"
                                                />
                                            ) : (
                                                <div className="flex h-48 flex-col items-center justify-center text-muted-foreground">
                                                    <FileText className="mb-2 size-12 text-primary" />
                                                    <span className="text-xs font-medium">
                                                        Dokumen Bukti (PDF)
                                                    </span>
                                                </div>
                                            )}

                                            {/* Hover Overlay */}
                                            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100">
                                                <Maximize2 className="size-5" />
                                                <span className="text-xs font-medium">
                                                    Perbesar Preview
                                                </span>
                                            </div>
                                        </div>

                                        {/* Proof Details & Validation */}
                                        <div className="space-y-4">
                                            <div className="space-y-2 rounded-lg border bg-muted/40 p-4 text-sm">
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">
                                                        Nominal Seharusnya:
                                                    </span>
                                                    <span className="font-bold text-foreground">
                                                        {formatRupiah(
                                                            rental.amount_to_pay_online,
                                                        )}
                                                    </span>
                                                </div>
                                                {rental.latest_payment && (
                                                    <div className="flex justify-between">
                                                        <span className="text-muted-foreground">
                                                            Nominal Dilaporkan:
                                                        </span>
                                                        <span className="font-semibold text-emerald-700">
                                                            {formatRupiah(
                                                                rental
                                                                    .latest_payment
                                                                    .amount,
                                                            )}
                                                        </span>
                                                    </div>
                                                )}
                                                <div className="flex justify-between border-t pt-1 text-xs text-muted-foreground">
                                                    <span>Waktu Unggah:</span>
                                                    <span>
                                                        {rental.latest_payment
                                                            ? formatDateTime(
                                                                  rental
                                                                      .latest_payment
                                                                      .created_at,
                                                              )
                                                            : '-'}
                                                    </span>
                                                </div>
                                                {rental.latest_payment
                                                    ?.reviewed_at && (
                                                    <div className="flex justify-between text-xs text-muted-foreground">
                                                        <span>
                                                            Waktu Direview:
                                                        </span>
                                                        <span>
                                                            {formatDateTime(
                                                                rental
                                                                    .latest_payment
                                                                    .reviewed_at,
                                                            )}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex flex-wrap items-center gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="gap-1.5 text-xs"
                                                    onClick={() =>
                                                        setShowProofModal(true)
                                                    }
                                                >
                                                    <Maximize2 className="size-3.5" />
                                                    Pratinjau Penuh (Zoom)
                                                </Button>

                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="gap-1.5 text-xs"
                                                    asChild
                                                >
                                                    <a
                                                        href={rental.proof_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                    >
                                                        <ExternalLink className="size-3.5" />
                                                        Buka Tab Baru
                                                    </a>
                                                </Button>
                                            </div>

                                            {/* Action buttons inside card for waiting confirmation */}
                                            {isWaitingConfirmation && (
                                                <div className="flex flex-wrap items-center gap-2 border-t pt-2">
                                                    <Button
                                                        size="sm"
                                                        className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
                                                        onClick={() =>
                                                            setShowConfirmPayment(
                                                                true,
                                                            )
                                                        }
                                                    >
                                                        <CheckCircle2 className="size-3.5" />
                                                        Setujui Pembayaran
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10"
                                                        onClick={() =>
                                                            setShowRejectPayment(
                                                                true,
                                                            )
                                                        }
                                                    >
                                                        <XCircle className="size-3.5" />
                                                        Tolak Pembayaran
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-1 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                                        <AlertCircle className="mx-auto mb-2 size-8 text-muted-foreground/60" />
                                        <p className="font-medium text-foreground">
                                            Belum Ada Bukti Pembayaran
                                        </p>
                                        <p className="text-xs">
                                            Pelanggan belum mengunggah bukti
                                            transfer QRIS untuk rental ini.
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* 3. Transaction History & Lifecycle Card */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Clock className="size-4 text-primary" />
                                    Jadwal & Catatan Transaksi
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 text-sm">
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div className="space-y-1 rounded-lg border bg-muted/20 p-3">
                                        <span className="text-xs text-muted-foreground">
                                            Batas Waktu Pembayaran (30 Menit):
                                        </span>
                                        <p className="font-medium">
                                            {formatDateTime(
                                                rental.payment_deadline_at,
                                            )}
                                        </p>
                                    </div>

                                    <div className="space-y-1 rounded-lg border bg-muted/20 p-3">
                                        <span className="text-xs text-muted-foreground">
                                            Pelepasan Stok (Buffer):
                                        </span>
                                        <p className="font-medium">
                                            {rental.stock_release_at
                                                ? formatDateTime(
                                                      rental.stock_release_at,
                                                  )
                                                : 'Menunggu konfirmasi pengembalian'}
                                        </p>
                                    </div>
                                </div>

                                {rental.returned_at && (
                                    <div className="space-y-2 rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 text-xs dark:bg-emerald-950/20">
                                        <div className="flex items-center gap-2 font-semibold text-emerald-800 dark:text-emerald-300">
                                            <CheckCircle2 className="size-4" />
                                            <span>
                                                Informasi Pengembalian Barang
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 pt-1 sm:grid-cols-4">
                                            <div>
                                                <span className="text-muted-foreground">
                                                    Waktu Kembali:
                                                </span>
                                                <p className="font-medium">
                                                    {formatDateTime(
                                                        rental.returned_at,
                                                    )}
                                                </p>
                                            </div>
                                            <div>
                                                <span className="text-muted-foreground">
                                                    Dikonfirmasi Oleh:
                                                </span>
                                                <p className="font-medium">
                                                    {rental.return_confirmed_by ??
                                                        'Admin'}
                                                </p>
                                            </div>
                                            <div>
                                                <span className="text-muted-foreground">
                                                    Keterlambatan:
                                                </span>
                                                <p className="font-medium">
                                                    {rental.late_days} Hari
                                                </p>
                                            </div>
                                            <div>
                                                <span className="text-muted-foreground">
                                                    Denda Dikenakan:
                                                </span>
                                                <p className="font-medium text-destructive">
                                                    {formatRupiah(
                                                        rental.late_fee_amount,
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* RIGHT COLUMN: Customer Details, Financial Breakdown, Schedule (1 Col wide) */}
                    <div className="space-y-6">
                        {/* 1. Customer Details Card */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <User className="size-4 text-primary" />
                                    Informasi Pelanggan
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm">
                                <div className="space-y-0.5">
                                    <span className="text-xs text-muted-foreground">
                                        Nama Lengkap:
                                    </span>
                                    <p className="font-semibold text-foreground">
                                        {customerUser?.name ?? '-'}
                                    </p>
                                </div>

                                <div className="space-y-0.5">
                                    <span className="text-xs text-muted-foreground">
                                        Email:
                                    </span>
                                    <p className="font-mono text-xs">
                                        {customerUser?.email ?? '-'}
                                    </p>
                                </div>

                                <div className="space-y-1">
                                    <span className="text-xs text-muted-foreground">
                                        Nomor WhatsApp / HP:
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <p className="font-medium text-foreground">
                                            {rental.customer?.phone_number ??
                                                '-'}
                                        </p>
                                        {waUrl && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-7 gap-1 border-emerald-300 px-2 text-xs text-emerald-600 hover:bg-emerald-50"
                                                asChild
                                            >
                                                <a
                                                    href={waUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                >
                                                    <MessageCircle className="size-3" />
                                                    WhatsApp
                                                </a>
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                {rental.customer?.emergency_contact && (
                                    <div className="space-y-0.5 border-t pt-1">
                                        <span className="text-xs text-muted-foreground">
                                            Kontak Darurat:
                                        </span>
                                        <p className="text-xs font-medium">
                                            {rental.customer.emergency_contact}
                                        </p>
                                    </div>
                                )}

                                {rental.customer?.address && (
                                    <div className="space-y-0.5 border-t pt-1">
                                        <span className="text-xs text-muted-foreground">
                                            Alamat Tempat Tinggal:
                                        </span>
                                        <p className="text-xs leading-relaxed text-muted-foreground">
                                            {rental.customer.address}
                                        </p>
                                    </div>
                                )}

                                {rental.customer?.social_media && (
                                    <div className="space-y-0.5 border-t pt-1">
                                        <span className="text-xs text-muted-foreground">
                                            Media Sosial:
                                        </span>
                                        <p className="font-mono text-xs text-muted-foreground">
                                            {rental.customer.social_media}
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* 2. Financial Breakdown Card */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <ReceiptText className="size-4 text-primary" />
                                    Rincian Biaya & Pembayaran
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm">
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">
                                            Biaya Sewa Alat:
                                        </span>
                                        <span className="font-medium">
                                            {formatRupiah(rental.rental_amount)}
                                        </span>
                                    </div>

                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">
                                            Deposit (Offline Outlet):
                                        </span>
                                        <span className="font-medium text-muted-foreground">
                                            {formatRupiah(
                                                rental.deposit_amount,
                                            )}
                                        </span>
                                    </div>

                                    <div className="flex justify-between border-t pt-2 text-base font-bold">
                                        <span>Grand Total:</span>
                                        <span className="text-primary">
                                            {formatRupiah(rental.grand_total)}
                                        </span>
                                    </div>
                                </div>

                                <Separator />

                                {/* Payment Breakdown */}
                                <div className="space-y-2 rounded-lg bg-muted/40 p-3 text-xs">
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">
                                            Metode Pembayaran:
                                        </span>
                                        <Badge
                                            variant="outline"
                                            className="font-medium"
                                        >
                                            {isDp
                                                ? 'Down Payment (DP 50%)'
                                                : 'Lunas (100%)'}
                                        </Badge>
                                    </div>

                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">
                                            Dibayar Online (QRIS):
                                        </span>
                                        <span className="font-bold text-emerald-700">
                                            {formatRupiah(
                                                rental.amount_to_pay_online,
                                            )}
                                        </span>
                                    </div>

                                    <div className="flex justify-between border-t pt-1 text-muted-foreground">
                                        <span>Sisa Tagihan Outlet:</span>
                                        <span className="font-semibold text-foreground">
                                            {formatRupiah(
                                                rental.remaining_to_pay_outlet,
                                            )}
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground italic">
                                        * Sisa sewa (
                                        {formatRupiah(rental.remaining_balance)}
                                        ) + deposit disetor saat ambil barang di
                                        outlet.
                                    </p>
                                </div>

                                {Number(rental.late_fee_amount) > 0 && (
                                    <div className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                                        <span>Denda Keterlambatan:</span>
                                        <span className="font-bold">
                                            {formatRupiah(
                                                rental.late_fee_amount,
                                            )}
                                        </span>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* 3. Rental Schedule Card */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Calendar className="size-4 text-primary" />
                                    Jadwal Sewa Peralatan
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 text-xs">
                                <div className="space-y-1">
                                    <span className="text-muted-foreground">
                                        Tanggal Pengambilan:
                                    </span>
                                    <p className="text-sm font-semibold">
                                        {formatDate(rental.start_date)}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground">
                                        Bebas dalam jendela 18:00 – 23:59 WIB
                                    </p>
                                </div>

                                <Separator />

                                <div className="space-y-1">
                                    <span className="text-muted-foreground">
                                        Batas Pengembalian:
                                    </span>
                                    <p className="text-sm font-semibold">
                                        {formatDate(rental.end_date)}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground">
                                        Maksimal pukul 23:59 WIB
                                    </p>
                                </div>

                                <Separator />

                                <div className="space-y-1">
                                    <span className="text-muted-foreground">
                                        Durasi Dihitung:
                                    </span>
                                    <p className="text-sm font-bold text-foreground">
                                        {rental.total_days} Hari Penuh
                                    </p>
                                    <p className="text-[11px] text-muted-foreground">
                                        (Mulai hitung H+1 pengambilan)
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Action Dialogs */}
            <ConfirmPaymentDialog
                rental={rental}
                open={showConfirmPayment}
                onOpenChange={setShowConfirmPayment}
            />

            <RejectPaymentDialog
                rental={rental}
                open={showRejectPayment}
                onOpenChange={setShowRejectPayment}
            />

            <ConfirmReturnDialog
                rental={rental}
                open={showConfirmReturn}
                onOpenChange={setShowConfirmReturn}
            />

            <CancelRentalDialog
                rental={rental}
                open={showCancelRental}
                onOpenChange={setShowCancelRental}
            />

            <PaymentProofModal
                open={showProofModal}
                onOpenChange={setShowProofModal}
                proofUrl={rental.proof_url}
                isImage={rental.proof_is_image}
                rentalCode={rental.rental_code}
            />
        </>
    );
}

RentalShow.layout = {
    breadcrumbs: [
        {
            title: 'Monitoring Transaksi',
            href: rentalsIndex().url,
        },
        {
            title: 'Detail Transaksi',
            href: '#',
        },
    ],
};
