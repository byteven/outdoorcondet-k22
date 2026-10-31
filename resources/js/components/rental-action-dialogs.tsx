import { router } from '@inertiajs/react';
import {
    AlertTriangle,
    CalendarCheck,
    CheckCircle2,
    Clock,
    ExternalLink,
    FileText,
    Loader2,
    XCircle,
    ZoomIn,
    ZoomOut,
    RotateCcw,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { formatRupiah, type RentalRow } from '@/components/rental-shared';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    cancel as cancelRoute,
    confirmPayment as confirmPaymentRoute,
    confirmReturn as confirmReturnRoute,
    rejectPayment as rejectPaymentRoute,
} from '@/routes/admin/rentals';

// ==========================================
// 1. Confirm Payment Dialog (Approve)
// ==========================================
type ConfirmPaymentDialogProps = {
    rental: RentalRow | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
};

export function ConfirmPaymentDialog({
    rental,
    open,
    onOpenChange,
    onSuccess,
}: ConfirmPaymentDialogProps) {
    const [submitting, setSubmitting] = useState(false);

    if (!rental) return null;

    const isDp = rental.payment_type === 'down_payment';
    const amountToConfirm = isDp
        ? rental.down_payment_amount
        : rental.rental_amount;

    const handleConfirm = () => {
        setSubmitting(true);
        router.post(
            confirmPaymentRoute({ rental: rental.rental_code }).url,
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success(
                        `Pembayaran rental ${rental.rental_code} berhasil disetujui!`,
                    );
                    onOpenChange(false);
                    onSuccess?.();
                },
                onError: (errors) => {
                    const message =
                        errors.rental ||
                        errors.error ||
                        'Gagal menyetujui pembayaran. Silakan coba lagi.';
                    toast.error(message);
                },
                onFinish: () => setSubmitting(false),
            },
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="flex items-center gap-2 text-emerald-600">
                        <CheckCircle2 className="size-5" />
                        <DialogTitle>Setujui Pembayaran QRIS</DialogTitle>
                    </div>
                    <DialogDescription>
                        Konfirmasi bahwa bukti pembayaran untuk rental{' '}
                        <strong className="text-foreground">
                            {rental.rental_code}
                        </strong>{' '}
                        telah diperiksa dan valid.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-2 rounded-lg border bg-muted/40 p-4 text-sm">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">
                            Tipe Pembayaran:
                        </span>
                        <span className="font-medium">
                            {isDp ? 'Down Payment (DP 50%)' : 'Lunas (100%)'}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">
                            Nominal yang Disetujui:
                        </span>
                        <span className="font-semibold text-emerald-700">
                            {formatRupiah(amountToConfirm)}
                        </span>
                    </div>
                    {isDp && (
                        <div className="flex justify-between border-t pt-1 text-xs text-muted-foreground">
                            <span>Sisa Tagihan di Outlet:</span>
                            <span>
                                {formatRupiah(
                                    Number(rental.remaining_balance) +
                                        Number(rental.deposit_amount),
                                )}
                            </span>
                        </div>
                    )}
                </div>

                <p className="text-xs text-muted-foreground">
                    Setelah disetujui, status rental akan berubah menjadi{' '}
                    <span className="font-semibold text-foreground">
                        {isDp ? '"DP Dibayar"' : '"Lunas"'}
                    </span>
                    . Customer dapat mengambil peralatan di outlet sesuai
                    jadwal.
                </p>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={submitting}
                    >
                        Batal
                    </Button>
                    <Button
                        type="button"
                        className="bg-emerald-600 text-white hover:bg-emerald-700"
                        onClick={handleConfirm}
                        disabled={submitting}
                    >
                        {submitting && (
                            <Loader2 className="mr-2 size-4 animate-spin" />
                        )}
                        Setujui Pembayaran
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ==========================================
// 2. Reject Payment Dialog
// ==========================================
type RejectPaymentDialogProps = {
    rental: RentalRow | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
};

export function RejectPaymentDialog({
    rental,
    open,
    onOpenChange,
    onSuccess,
}: RejectPaymentDialogProps) {
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!rental) return null;

    const handleReject = () => {
        if (!reason.trim()) {
            setError('Alasan penolakan pembayaran wajib diisi.');
            return;
        }

        setError(null);
        setSubmitting(true);

        router.post(
            rejectPaymentRoute({ rental: rental.rental_code }).url,
            { reason: reason.trim() },
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success(
                        `Pembayaran rental ${rental.rental_code} ditolak. Status menjadi dibatalkan.`,
                    );
                    setReason('');
                    onOpenChange(false);
                    onSuccess?.();
                },
                onError: (errors) => {
                    const message =
                        errors.reason ||
                        errors.rental ||
                        'Gagal menolak pembayaran. Silakan coba lagi.';
                    setError(message);
                    toast.error(message);
                },
                onFinish: () => setSubmitting(false),
            },
        );
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(v) => {
                if (!submitting) {
                    setError(null);
                    setReason('');
                    onOpenChange(v);
                }
            }}
        >
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="flex items-center gap-2 text-destructive">
                        <XCircle className="size-5" />
                        <DialogTitle>Tolak Bukti Pembayaran</DialogTitle>
                    </div>
                    <DialogDescription>
                        Rental{' '}
                        <strong className="text-foreground">
                            {rental.rental_code}
                        </strong>{' '}
                        akan dibatalkan dan alasan penolakan akan dapat dilihat
                        oleh customer.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 py-2">
                    <div className="space-y-1.5">
                        <Label
                            htmlFor="reject-reason"
                            className="text-sm font-medium"
                        >
                            Alasan Penolakan{' '}
                            <span className="text-destructive">*</span>
                        </Label>
                        <Textarea
                            id="reject-reason"
                            placeholder="Contoh: Nominal transfer tidak sesuai, bukti buram atau tidak terbaca, transaksi tidak ditemukan di mutasi..."
                            rows={3}
                            value={reason}
                            onChange={(e) => {
                                setReason(e.target.value);
                                if (error) setError(null);
                            }}
                            disabled={submitting}
                        />
                        {error && (
                            <p className="text-xs text-destructive">{error}</p>
                        )}
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={submitting}
                    >
                        Batal
                    </Button>
                    <Button
                        type="button"
                        variant="destructive"
                        onClick={handleReject}
                        disabled={submitting}
                    >
                        {submitting && (
                            <Loader2 className="mr-2 size-4 animate-spin" />
                        )}
                        Tolak & Batalkan
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ==========================================
// 3. Confirm Return Dialog
// ==========================================
type ConfirmReturnDialogProps = {
    rental: RentalRow | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
};

export function ConfirmReturnDialog({
    rental,
    open,
    onOpenChange,
    onSuccess,
}: ConfirmReturnDialogProps) {
    const [submitting, setSubmitting] = useState(false);

    if (!rental) return null;

    const isLate = rental.is_late || rental.current_late_days > 0;
    const lateDays = rental.current_late_days;
    const lateFeePerDay = Number(rental.late_fee_per_day) || 50000;
    const estimatedLateFee = isLate ? lateDays * lateFeePerDay : 0;

    const handleConfirm = () => {
        setSubmitting(true);
        router.post(
            confirmReturnRoute({ rental: rental.rental_code }).url,
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success(
                        `Pengembalian rental ${rental.rental_code} berhasil dicatat!`,
                    );
                    onOpenChange(false);
                    onSuccess?.();
                },
                onError: (errors) => {
                    const message =
                        errors.rental ||
                        errors.error ||
                        'Gagal mengonfirmasi pengembalian. Silakan periksa kembali.';
                    toast.error(message);
                },
                onFinish: () => setSubmitting(false),
            },
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="flex items-center gap-2 text-primary">
                        <CalendarCheck className="size-5" />
                        <DialogTitle>
                            Konfirmasi Pengembalian Barang
                        </DialogTitle>
                    </div>
                    <DialogDescription>
                        Catat bahwa seluruh barang untuk rental{' '}
                        <strong className="text-foreground">
                            {rental.rental_code}
                        </strong>{' '}
                        telah dikembalikan ke outlet.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 py-1 text-sm">
                    {isLate ? (
                        <div className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/40">
                            <div className="flex items-center gap-1.5 font-semibold text-amber-800 dark:text-amber-300">
                                <Clock className="size-4 shrink-0" />
                                <span>Terdeteksi Keterlambatan!</span>
                            </div>
                            <div className="space-y-1 text-xs text-amber-900 dark:text-amber-200">
                                <div className="flex justify-between">
                                    <span>Jumlah Hari Terlambat:</span>
                                    <span className="font-bold">
                                        {lateDays} Hari
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Tarif Denda per Hari:</span>
                                    <span>{formatRupiah(lateFeePerDay)}</span>
                                </div>
                                <div className="flex justify-between border-t border-amber-200 pt-1 font-semibold text-destructive dark:border-amber-800">
                                    <span>Total Denda Keterlambatan:</span>
                                    <span>
                                        {formatRupiah(estimatedLateFee)}
                                    </span>
                                </div>
                            </div>
                            <p className="text-[11px] text-amber-800/80 italic dark:text-amber-300/80">
                                * Sesuai aturan bisnis, denda dipotong dari
                                deposit secara offline di outlet.
                            </p>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
                            <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                            <span>
                                Pengembalian tepat waktu. Tidak ada denda
                                keterlambatan.
                            </span>
                        </div>
                    )}

                    <div className="space-y-1 rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
                        <div className="font-medium text-foreground">
                            Aturan Pelepasan Stok (Buffer):
                        </div>
                        <p>
                            Stok alat akan di-buffer selama 1 hari penuh untuk
                            proses pembersihan dan siap disewa kembali jam 00:00
                            setelahnya (2 hari dari tanggal hari ini).
                        </p>
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={submitting}
                    >
                        Batal
                    </Button>
                    <Button
                        type="button"
                        onClick={handleConfirm}
                        disabled={submitting}
                    >
                        {submitting && (
                            <Loader2 className="mr-2 size-4 animate-spin" />
                        )}
                        Konfirmasi Selesai
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ==========================================
// 4. Cancel Rental Dialog (Manual Cancel)
// ==========================================
type CancelRentalDialogProps = {
    rental: RentalRow | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
};

export function CancelRentalDialog({
    rental,
    open,
    onOpenChange,
    onSuccess,
}: CancelRentalDialogProps) {
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!rental) return null;

    const handleCancel = () => {
        if (!reason.trim()) {
            setError('Alasan pembatalan rental wajib diisi.');
            return;
        }

        setError(null);
        setSubmitting(true);

        router.post(
            cancelRoute({ rental: rental.rental_code }).url,
            { reason: reason.trim() },
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success(
                        `Rental ${rental.rental_code} berhasil dibatalkan.`,
                    );
                    setReason('');
                    onOpenChange(false);
                    onSuccess?.();
                },
                onError: (errors) => {
                    const message =
                        errors.reason ||
                        errors.rental ||
                        'Gagal membatalkan rental. Silakan coba lagi.';
                    setError(message);
                    toast.error(message);
                },
                onFinish: () => setSubmitting(false),
            },
        );
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(v) => {
                if (!submitting) {
                    setError(null);
                    setReason('');
                    onOpenChange(v);
                }
            }}
        >
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="size-5" />
                        <DialogTitle>Batalkan Pesanan Rental</DialogTitle>
                    </div>
                    <DialogDescription>
                        Apakah Anda yakin ingin membatalkan transaksi rental{' '}
                        <strong className="text-foreground">
                            {rental.rental_code}
                        </strong>
                        ? Stok yang sebelumnya ter-hold akan langsung dilepas.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 py-2">
                    <div className="space-y-1.5">
                        <Label
                            htmlFor="cancel-reason"
                            className="text-sm font-medium"
                        >
                            Alasan Pembatalan{' '}
                            <span className="text-destructive">*</span>
                        </Label>
                        <Textarea
                            id="cancel-reason"
                            placeholder="Tulis alasan pembatalan rental ini (misal: Permintaan customer via WhatsApp, unit rusak sebelum serah terima, dsb)..."
                            rows={3}
                            value={reason}
                            onChange={(e) => {
                                setReason(e.target.value);
                                if (error) setError(null);
                            }}
                            disabled={submitting}
                        />
                        {error && (
                            <p className="text-xs text-destructive">{error}</p>
                        )}
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={submitting}
                    >
                        Kembali
                    </Button>
                    <Button
                        type="button"
                        variant="destructive"
                        onClick={handleCancel}
                        disabled={submitting}
                    >
                        {submitting && (
                            <Loader2 className="mr-2 size-4 animate-spin" />
                        )}
                        Batalkan Rental
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ==========================================
// 5. Payment Proof Lightbox Dialog (Zoom & Preview)
// ==========================================
type PaymentProofModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    proofUrl: string | null;
    isImage?: boolean;
    rentalCode: string;
};

export function PaymentProofModal({
    open,
    onOpenChange,
    proofUrl,
    isImage = true,
    rentalCode,
}: PaymentProofModalProps) {
    const [zoomLevel, setZoomLevel] = useState(1);

    if (!proofUrl) return null;

    const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.25, 3));
    const handleZoomOut = () =>
        setZoomLevel((prev) => Math.max(prev - 0.25, 0.5));
    const handleResetZoom = () => setZoomLevel(1);

    return (
        <Dialog
            open={open}
            onOpenChange={(v) => {
                if (!v) handleResetZoom();
                onOpenChange(v);
            }}
        >
            <DialogContent className="max-w-4xl overflow-hidden bg-background p-0">
                <DialogHeader className="flex flex-row items-center justify-between space-y-0 border-b p-4">
                    <div className="flex items-center gap-2">
                        <FileText className="size-4 text-primary" />
                        <DialogTitle className="text-base font-semibold">
                            Bukti Transfer QRIS — {rentalCode}
                        </DialogTitle>
                    </div>

                    <div className="mr-6 flex items-center gap-1.5">
                        {isImage && (
                            <>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="size-8"
                                    onClick={handleZoomOut}
                                    title="Perkecil"
                                    disabled={zoomLevel <= 0.5}
                                >
                                    <ZoomOut className="size-4" />
                                </Button>
                                <span className="px-1 font-mono text-xs">
                                    {Math.round(zoomLevel * 100)}%
                                </span>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="size-8"
                                    onClick={handleZoomIn}
                                    title="Perbesar"
                                    disabled={zoomLevel >= 3}
                                >
                                    <ZoomIn className="size-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-8"
                                    onClick={handleResetZoom}
                                    title="Reset Zoom"
                                >
                                    <RotateCcw className="size-4" />
                                </Button>
                            </>
                        )}
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1.5 text-xs"
                            asChild
                        >
                            <a
                                href={proofUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <ExternalLink className="size-3.5" />
                                Buka Tab Baru
                            </a>
                        </Button>
                    </div>
                </DialogHeader>

                <div className="relative flex max-h-[75vh] min-h-[300px] items-center justify-center overflow-auto bg-neutral-900 p-4">
                    {isImage ? (
                        <div
                            className="origin-center transition-transform duration-150"
                            style={{ transform: `scale(${zoomLevel})` }}
                        >
                            <img
                                src={proofUrl}
                                alt={`Bukti pembayaran ${rentalCode}`}
                                className="max-h-[70vh] max-w-full rounded object-contain shadow-lg select-none"
                            />
                        </div>
                    ) : (
                        <iframe
                            src={proofUrl}
                            title={`Bukti pembayaran ${rentalCode}`}
                            className="h-[65vh] w-full rounded border-0 bg-white"
                        />
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
