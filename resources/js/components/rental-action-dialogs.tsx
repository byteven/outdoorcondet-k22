import { router } from '@inertiajs/react';
import {
    AlertTriangle,
    CalendarCheck,
    CheckCircle2,
    Clock,
    ExternalLink,
    FileText,
    Loader2,
    PackageOpen,
    Sparkles,
    Wrench,
    XCircle,
    ZoomIn,
    ZoomOut,
    RotateCcw,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { formatRupiah, type RentalRow } from '@/components/rental-shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
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

type InspectionItemState = {
    condition: 'good' | 'damaged' | 'lost';
    needs_maintenance: boolean;
    maintenance_qty: number;
    maintenance_reason: 'cleaning' | 'repair' | 'inspection';
    notes: string;
    lost_qty: number;
};

export function ConfirmReturnDialog({
    rental,
    open,
    onOpenChange,
    onSuccess,
}: ConfirmReturnDialogProps) {
    const [submitting, setSubmitting] = useState(false);
    const [inspections, setInspections] = useState<
        Record<number, InspectionItemState>
    >({});

    const items = rental?.items ?? [];

    useEffect(() => {
        if (open && items.length > 0) {
            const initial: Record<number, InspectionItemState> = {};
            items.forEach((item) => {
                initial[item.id] = {
                    condition: 'good',
                    needs_maintenance: false,
                    maintenance_qty: 1,
                    maintenance_reason: 'repair',
                    notes: '',
                    lost_qty: 1,
                };
            });
            setInspections(initial);
        }
    }, [open, items.length]);

    if (!rental) return null;

    const isLate = rental.is_late || rental.current_late_days > 0;
    const lateDays = rental.current_late_days;
    const lateFeePerDay = Number(rental.late_fee_per_day) || 50000;
    const estimatedLateFee = isLate ? lateDays * lateFeePerDay : 0;

    const updateItemInspection = (
        itemId: number,
        updates: Partial<InspectionItemState>,
    ) => {
        setInspections((prev) => {
            const current = prev[itemId] || {
                condition: 'good',
                needs_maintenance: false,
                maintenance_qty: 1,
                maintenance_reason: 'repair',
                notes: '',
                lost_qty: 1,
            };
            return {
                ...prev,
                [itemId]: { ...current, ...updates },
            };
        });
    };

    const handleConfirm = () => {
        setSubmitting(true);

        const inspectionsPayload = items.map((item) => {
            const state = inspections[item.id] || {
                condition: 'good',
                needs_maintenance: false,
                maintenance_qty: 1,
                maintenance_reason: 'repair',
                notes: '',
                lost_qty: 1,
            };
            return {
                rental_item_id: item.id,
                condition: state.condition,
                needs_maintenance: state.needs_maintenance,
                maintenance_qty:
                    state.condition === 'lost'
                        ? state.lost_qty
                        : state.maintenance_qty,
                maintenance_reason: state.maintenance_reason,
                notes: state.notes.trim() || null,
                lost_qty: state.lost_qty,
            };
        });

        router.post(
            confirmReturnRoute({ rental: rental.rental_code }).url,
            { inspections: inspectionsPayload },
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success(
                        `Pengembalian rental ${rental.rental_code} dan hasil inspeksi berhasil dicatat!`,
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

    const goodCount = items.filter(
        (i) => (inspections[i.id]?.condition ?? 'good') === 'good',
    ).length;
    const maintenanceCount = items.filter(
        (i) =>
            inspections[i.id]?.needs_maintenance &&
            inspections[i.id]?.condition !== 'lost',
    ).length;
    const lostCount = items.filter(
        (i) => (inspections[i.id]?.condition ?? 'good') === 'lost',
    ).length;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <div className="flex items-center gap-2 text-primary">
                        <CalendarCheck className="size-5" />
                        <DialogTitle>Konfirmasi Pengembalian & Return Inspector</DialogTitle>
                    </div>
                    <DialogDescription>
                        Catat fisik pengembalian untuk rental{' '}
                        <strong className="text-foreground">
                            {rental.rental_code}
                        </strong>
                        . Lakukan pengecekan kondisi barang sebelum stok dilepas.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-1 text-sm">
                    {/* Status Keterlambatan */}
                    {isLate ? (
                        <div className="space-y-2 rounded-lg border-0 bg-warning-muted p-3 text-warning">
                            <div className="flex items-center gap-1.5 font-semibold">
                                <Clock className="size-4 shrink-0" />
                                <span>Terdeteksi keterlambatan</span>
                            </div>
                            <div className="space-y-1 text-xs">
                                <div className="flex justify-between">
                                    <span>Jumlah hari terlambat:</span>
                                    <span className="font-bold">
                                        {lateDays} hari
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Tarif denda per hari:</span>
                                    <span>{formatRupiah(lateFeePerDay)}</span>
                                </div>
                                <div className="flex justify-between border-t border-warning/20 pt-1 font-semibold text-destructive">
                                    <span>Total denda keterlambatan:</span>
                                    <span>
                                        {formatRupiah(estimatedLateFee)}
                                    </span>
                                </div>
                            </div>
                            <p className="text-[11px] italic opacity-90">
                                * Sesuai aturan bisnis, denda dipotong dari
                                deposit secara offline di outlet.
                            </p>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 rounded-lg border-0 bg-success-muted p-3 text-xs text-success">
                            <CheckCircle2 className="size-4 shrink-0" />
                            <span>
                                Pengembalian tepat waktu. Tidak ada denda
                                keterlambatan.
                            </span>
                        </div>
                    )}

                    {/* Section Checklist Return Inspector */}
                    <div className="space-y-3 rounded-lg border border-border bg-card p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
                            <div>
                                <h4 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                                    <PackageOpen className="size-4 text-primary" />
                                    <span>Checklist kondisi fisik barang</span>
                                </h4>
                                <p className="text-xs text-muted-foreground">
                                    Tentukan kondisi tiap barang: Baik, Rusak, atau Hilang
                                </p>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs">
                                <Badge
                                    variant="secondary"
                                    className="border-transparent bg-success-muted text-success"
                                >
                                    {goodCount} Baik
                                </Badge>
                                {maintenanceCount > 0 && (
                                    <Badge
                                        variant="secondary"
                                        className="border-transparent bg-warning-muted text-warning"
                                    >
                                        {maintenanceCount} Perawatan
                                    </Badge>
                                )}
                                {lostCount > 0 && (
                                    <Badge
                                        variant="secondary"
                                        className="border-transparent bg-destructive/10 text-destructive"
                                    >
                                        {lostCount} Hilang
                                    </Badge>
                                )}
                            </div>
                        </div>

                        {items.length === 0 ? (
                            <p className="py-2 text-xs italic text-muted-foreground">
                                Data rincian item rental belum dimuat. Seluruh item akan otomatis ditandai kondisi baik.
                            </p>
                        ) : (
                            <div className="space-y-3 pt-1">
                                {items.map((item) => {
                                    const insp = inspections[item.id] || {
                                        condition: 'good',
                                        needs_maintenance: false,
                                        maintenance_qty: 1,
                                        maintenance_reason: 'repair',
                                        notes: '',
                                        lost_qty: 1,
                                    };

                                    return (
                                        <div
                                            key={item.id}
                                            className="space-y-2.5 rounded-md border border-border bg-muted/20 p-3 transition-colors"
                                        >
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <div className="space-y-0.5">
                                                    <span className="font-semibold text-foreground">
                                                        {item.name}
                                                    </span>
                                                    <div className="text-xs text-muted-foreground">
                                                        Total disewa: <span className="font-medium text-foreground">{item.quantity} unit</span>
                                                    </div>
                                                </div>

                                                {/* Segmented Button Kondisi */}
                                                <div className="flex items-center gap-1 rounded-md border border-border bg-muted/40 p-0.5">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            updateItemInspection(item.id, {
                                                                condition: 'good',
                                                                needs_maintenance: false,
                                                            })
                                                        }
                                                        className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                                                            insp.condition === 'good'
                                                                ? 'bg-success-muted font-semibold text-success'
                                                                : 'text-muted-foreground hover:text-foreground'
                                                        }`}
                                                    >
                                                        Baik
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            updateItemInspection(item.id, {
                                                                condition: 'damaged',
                                                                needs_maintenance: true,
                                                                maintenance_reason: 'repair',
                                                            })
                                                        }
                                                        className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                                                            insp.condition === 'damaged'
                                                                ? 'bg-warning-muted font-semibold text-warning'
                                                                : 'text-muted-foreground hover:text-foreground'
                                                        }`}
                                                    >
                                                        Rusak
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            updateItemInspection(item.id, {
                                                                condition: 'lost',
                                                                needs_maintenance: false,
                                                            })
                                                        }
                                                        className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                                                            insp.condition === 'lost'
                                                                ? 'bg-destructive/10 font-semibold text-destructive'
                                                                : 'text-muted-foreground hover:text-foreground'
                                                        }`}
                                                    >
                                                        Hilang
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Sub-panel: Kondisi BAIK */}
                                            {insp.condition === 'good' && (
                                                <div className="rounded border border-dashed border-border p-2">
                                                    <div className="flex items-center gap-2">
                                                        <Checkbox
                                                            id={`maint-good-${item.id}`}
                                                            checked={insp.needs_maintenance}
                                                            onCheckedChange={(checked) =>
                                                                updateItemInspection(item.id, {
                                                                    needs_maintenance: Boolean(checked),
                                                                    maintenance_reason: 'cleaning',
                                                                })
                                                            }
                                                        />
                                                        <Label
                                                            htmlFor={`maint-good-${item.id}`}
                                                            className="cursor-pointer text-xs text-muted-foreground"
                                                        >
                                                            Kondisi baik, tetapi perlu pembersihan / servis rutin sebelum siap disewa kembali
                                                        </Label>
                                                    </div>

                                                    {insp.needs_maintenance && (
                                                        <div className="mt-2.5 space-y-2 border-t border-border pt-2">
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <div>
                                                                    <Label className="text-[11px]">Jumlah Unit</Label>
                                                                    <Input
                                                                        type="number"
                                                                        min={1}
                                                                        max={item.quantity}
                                                                        value={insp.maintenance_qty}
                                                                        onChange={(e) =>
                                                                            updateItemInspection(item.id, {
                                                                                maintenance_qty: Math.min(
                                                                                    item.quantity,
                                                                                    Math.max(1, parseInt(e.target.value) || 1),
                                                                                ),
                                                                            })
                                                                        }
                                                                        className="h-8 text-xs"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <Label className="text-[11px]">Alasan Perawatan</Label>
                                                                    <Select
                                                                        value={insp.maintenance_reason}
                                                                        onValueChange={(val: 'cleaning' | 'repair' | 'inspection') =>
                                                                            updateItemInspection(item.id, {
                                                                                maintenance_reason: val,
                                                                            })
                                                                        }
                                                                    >
                                                                        <SelectTrigger className="h-8 text-xs">
                                                                            <SelectValue />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            <SelectItem value="cleaning">Pembersihan (Cleaning)</SelectItem>
                                                                            <SelectItem value="inspection">Inspeksi Rutin</SelectItem>
                                                                            <SelectItem value="repair">Perbaikan Minor</SelectItem>
                                                                        </SelectContent>
                                                                    </Select>
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <Label className="text-[11px]">Catatan Perawatan</Label>
                                                                <Textarea
                                                                    rows={1}
                                                                    placeholder="Contoh: Perlu dicuci dari lumpur, disemprot desinfektan..."
                                                                    value={insp.notes}
                                                                    onChange={(e) =>
                                                                        updateItemInspection(item.id, {
                                                                            notes: e.target.value,
                                                                        })
                                                                    }
                                                                    className="min-h-[36px] text-xs"
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Sub-panel: Kondisi RUSAK */}
                                            {insp.condition === 'damaged' && (
                                                <div className="space-y-2.5 rounded-md border border-border bg-warning-muted/30 p-2.5">
                                                    <div className="flex items-center gap-1.5 text-xs font-semibold text-warning">
                                                        <Wrench className="size-3.5" />
                                                        <span>Wajib masuk antrean perawatan alat</span>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div>
                                                            <Label className="text-[11px]">Jumlah Rusak (Unit)</Label>
                                                            <Input
                                                                type="number"
                                                                min={1}
                                                                max={item.quantity}
                                                                value={insp.maintenance_qty}
                                                                onChange={(e) =>
                                                                    updateItemInspection(item.id, {
                                                                        maintenance_qty: Math.min(
                                                                            item.quantity,
                                                                            Math.max(1, parseInt(e.target.value) || 1),
                                                                        ),
                                                                    })
                                                                }
                                                                className="h-8 text-xs"
                                                            />
                                                        </div>
                                                        <div>
                                                            <Label className="text-[11px]">Jenis Penanganan</Label>
                                                            <Select
                                                                value={insp.maintenance_reason}
                                                                onValueChange={(val: 'cleaning' | 'repair' | 'inspection') =>
                                                                    updateItemInspection(item.id, {
                                                                        maintenance_reason: val,
                                                                    })
                                                                }
                                                            >
                                                                <SelectTrigger className="h-8 text-xs">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="repair">Perbaikan</SelectItem>
                                                                    <SelectItem value="cleaning">Pembersihan</SelectItem>
                                                                    <SelectItem value="inspection">Inspeksi teknis</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <Label className="text-[11px]">Rincian Kerusakan & Tindakan</Label>
                                                        <Textarea
                                                            rows={2}
                                                            placeholder="Contoh: Resleting macet, pasak bengkok 2 buah, kain robek 5 cm..."
                                                            value={insp.notes}
                                                            onChange={(e) =>
                                                                updateItemInspection(item.id, {
                                                                    notes: e.target.value,
                                                                })
                                                            }
                                                            className="text-xs"
                                                        />
                                                    </div>
                                                    <p className="text-[11px] text-warning">
                                                        * Unit rusak akan langsung masuk ke menu <strong>Return & Maintenance</strong> dan stok di-hold sampai ditandai siap.
                                                    </p>
                                                </div>
                                            )}

                                            {/* Sub-panel: Kondisi HILANG */}
                                            {insp.condition === 'lost' && (
                                                <div className="space-y-2.5 rounded-md border border-border bg-destructive/5 p-2.5">
                                                    <div className="flex items-center gap-1.5 text-xs font-semibold text-destructive">
                                                        <AlertTriangle className="size-3.5" />
                                                        <span>Pengurangan stok permanen</span>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div>
                                                            <Label className="text-[11px]">Jumlah Hilang (Unit)</Label>
                                                            <Input
                                                                type="number"
                                                                min={1}
                                                                max={item.quantity}
                                                                value={insp.lost_qty}
                                                                onChange={(e) =>
                                                                    updateItemInspection(item.id, {
                                                                        lost_qty: Math.min(
                                                                            item.quantity,
                                                                            Math.max(1, parseInt(e.target.value) || 1),
                                                                        ),
                                                                    })
                                                                }
                                                                className="h-8 text-xs"
                                                            />
                                                        </div>
                                                        <div>
                                                            <Label className="text-[11px]">Catatan / Klaim Deposit</Label>
                                                            <Input
                                                                placeholder="Potong deposit customer / ganti rugi..."
                                                                value={insp.notes}
                                                                onChange={(e) =>
                                                                    updateItemInspection(item.id, {
                                                                        notes: e.target.value,
                                                                    })
                                                                }
                                                                className="h-8 text-xs"
                                                            />
                                                        </div>
                                                    </div>
                                                    <p className="text-[11px] text-destructive">
                                                        * Sesuai PRD AD-08, stok master varian akan <strong>dikurangi secara permanen</strong> sebanyak unit yang hilang.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="space-y-1 rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
                        <div className="font-medium text-foreground">
                            Aturan Pelepasan Stok:
                        </div>
                        <p>
                            Unit berkondisi <strong>Baik</strong> akan di-buffer selama 1 hari dan siap disewa kembali jam 00:00 (H+2). Unit <strong>Dalam Perawatan</strong> hanya akan kembali ke stok setelah ditandai siap oleh staf di menu <em>Return & Maintenance</em>.
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
                        Simpan & Konfirmasi Pengembalian
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
                                <span className="px-1 text-xs">
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
                                className="max-h-[70vh] max-w-full rounded object-contain select-none"
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
