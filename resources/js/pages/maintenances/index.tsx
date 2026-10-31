import { Head, Link, router } from '@inertiajs/react';
import {
    CheckCircle2,
    ExternalLink,
    Hammer,
    Loader2,
    Package,
    Plus,
    RotateCcw,
    Sparkles,
    Wrench,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { DataTablePagination } from '@/components/data-table-pagination';
import {
    formatDate,
    formatDateTime,
    type MaintenanceRow,
    type MaintenanceSummary,
    type VariantOption,
} from '@/components/rental-shared';
import { SearchInput } from '@/components/search-input';
import { SummaryCards, type SummaryCardItem } from '@/components/summary-cards';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import {
    index as maintenancesIndex,
    markReady as markReadyRoute,
    store as storeMaintenanceRoute,
} from '@/routes/admin/maintenances';
import { show as rentalsShow } from '@/routes/admin/rentals';

const PER_PAGE_OPTIONS = [10, 15, 25, 50];

const REASON_MAP: Record<string, { label: string; badgeClass: string; icon: typeof Wrench }> = {
    cleaning: {
        label: 'Pembersihan',
        badgeClass: 'bg-info-muted text-info border-transparent',
        icon: Sparkles,
    },
    repair: {
        label: 'Perbaikan',
        badgeClass: 'bg-warning-muted text-warning border-transparent',
        icon: Hammer,
    },
    inspection: {
        label: 'Inspeksi',
        badgeClass: 'border-border bg-background text-foreground',
        icon: Wrench,
    },
};

type Props = {
    maintenances: {
        data: MaintenanceRow[];
        current_page: number;
        last_page: number;
        total: number;
        from: number | null;
        to: number | null;
        per_page: number;
    };
    summary: MaintenanceSummary;
    variants: VariantOption[];
    filters: {
        search: string;
        status: string;
        reason: string;
        per_page: number;
    };
};

export default function MaintenanceIndex({
    maintenances,
    summary,
    variants,
    filters,
}: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [status, setStatus] = useState(filters.status || 'in_maintenance');
    const [reason, setReason] = useState(filters.reason || 'all');
    const [perPage, setPerPage] = useState(String(filters.per_page || 15));
    const [loading, setLoading] = useState(false);

    // Modal state for Mark Ready confirmation
    const [selectedMaintenance, setSelectedMaintenance] = useState<MaintenanceRow | null>(null);
    const [showMarkReadyDialog, setShowMarkReadyDialog] = useState(false);
    const [readyingSubmitting, setReadyingSubmitting] = useState(false);

    // Modal state for manual maintenance creation
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createVariantId, setCreateVariantId] = useState<string>('');
    const [createQuantity, setCreateQuantity] = useState<string>('1');
    const [createReason, setCreateReason] = useState<'cleaning' | 'repair' | 'inspection' | 'custom'>('cleaning');
    const [createCustomReason, setCreateCustomReason] = useState('');
    const [createNotes, setCreateNotes] = useState('');
    const [createSubmitting, setCreateSubmitting] = useState(false);

    const applyFilters = (newParams: Record<string, string | number | undefined> = {}) => {
        setLoading(true);
        const query: Record<string, string | number> = {
            search: newParams.search !== undefined ? (newParams.search as string) : search,
            status: newParams.status !== undefined ? (newParams.status as string) : status,
            reason: newParams.reason !== undefined ? (newParams.reason as string) : reason,
            per_page: newParams.per_page !== undefined ? (newParams.per_page as number) : Number(perPage),
            page: (newParams.page as number) || 1,
        };

        if (!query.search) delete query.search;
        if (query.reason === 'all') delete query.reason;

        router.get(maintenancesIndex().url, query, {
            preserveState: true,
            preserveScroll: true,
            onFinish: () => setLoading(false),
        });
    };

    const handleResetFilters = () => {
        setSearch('');
        setStatus('in_maintenance');
        setReason('all');
        setPerPage('15');
        router.get(
            maintenancesIndex().url,
            { status: 'in_maintenance', per_page: 15 },
            { preserveState: true, preserveScroll: true },
        );
    };

    const handleMarkReadyConfirm = () => {
        if (!selectedMaintenance) return;
        setReadyingSubmitting(true);

        router.post(
            markReadyRoute({ maintenance: selectedMaintenance.id }).url,
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    setShowMarkReadyDialog(false);
                    setSelectedMaintenance(null);
                },
                onError: () => {
                    toast.error('Gagal menandai unit siap. Silakan coba lagi.');
                },
                onFinish: () => setReadyingSubmitting(false),
            },
        );
    };

    const handleCreateMaintenance = (e: React.FormEvent) => {
        e.preventDefault();
        if (!createVariantId) {
            toast.error('Silakan pilih varian produk terlebih dahulu.');
            return;
        }

        const parsedQty = parseInt(createQuantity, 10);
        if (isNaN(parsedQty) || parsedQty < 1) {
            toast.error('Jumlah unit wajib diisi dan minimal 1.');
            return;
        }

        if (createReason === 'custom' && !createCustomReason.trim()) {
            toast.error('Silakan isi alasan perawatan manual.');
            return;
        }

        setCreateSubmitting(true);
        router.post(
            storeMaintenanceRoute().url,
            {
                product_variant_id: parseInt(createVariantId, 10),
                quantity: parsedQty,
                reason: createReason,
                custom_reason: createReason === 'custom' ? createCustomReason.trim() : null,
                notes: createNotes.trim() || null,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setShowCreateModal(false);
                    setCreateVariantId('');
                    setCreateQuantity('1');
                    setCreateReason('cleaning');
                    setCreateCustomReason('');
                    setCreateNotes('');
                },
                onError: (errs) => {
                    const msg = Object.values(errs)[0] || 'Gagal menambahkan perawatan.';
                    toast.error(String(msg));
                },
                onFinish: () => setCreateSubmitting(false),
            },
        );
    };

    const hasActiveFilters = search !== '' || status !== 'in_maintenance' || reason !== 'all';

    const summaryItems: SummaryCardItem[] = [
        {
            key: 'total_in_maintenance',
            label: 'Total Dalam Perawatan',
            value: summary.total_in_maintenance,
            icon: Wrench,
            iconClass:
                'bg-warning bg-[radial-gradient(circle_at_50%_0%,rgb(255_255_255/0.45),transparent_80%)] text-primary-foreground',
        },
        {
            key: 'cleaning',
            label: 'Pembersihan',
            value: summary.cleaning,
            icon: Sparkles,
            iconClass:
                'bg-info bg-[radial-gradient(circle_at_50%_0%,rgb(255_255_255/0.45),transparent_80%)] text-primary-foreground',
        },
        {
            key: 'repair',
            label: 'Perbaikan',
            value: summary.repair,
            icon: Hammer,
            iconClass:
                'bg-amber-500 bg-[radial-gradient(circle_at_50%_0%,rgb(255_255_255/0.45),transparent_80%)] text-white',
        },
        {
            key: 'ready_total',
            label: 'Siap Digunakan',
            value: summary.ready_total,
            icon: CheckCircle2,
            iconClass:
                'bg-success bg-[radial-gradient(circle_at_50%_0%,rgb(255_255_255/0.45),transparent_80%)] text-primary-foreground',
        },
    ];

    return (
        <>
            <Head title="Return & Maintenance" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-col gap-1">
                        <h1 className="text-2xl font-bold tracking-tight">
                            Return & Maintenance Alat
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Pantau antrean perawatan alat dan kembalikan unit yang sudah siap ke stok aktif.
                        </p>
                    </div>

                    <Button
                        onClick={() => setShowCreateModal(true)}
                        className="gap-1.5"
                    >
                        <Plus className="size-4" />
                        <span>Tambah perawatan manual</span>
                    </Button>
                </div>

                {/* Summary Metrics Cards */}
                <SummaryCards items={summaryItems} />

                {/* Filter and Search Bar */}
                <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        {/* Search Input */}
                        <SearchInput
                            value={search}
                            onChange={(val) => {
                                setSearch(val);
                                applyFilters({ search: val, page: 1 });
                            }}
                            placeholder="Cari produk, SKU, rental code, catatan..."
                            ariaLabel="Cari antrean perawatan"
                            className="w-full lg:max-w-md"
                        />

                        {/* Status & Reason Filters */}
                        <div className="flex flex-wrap items-center gap-2">
                            <Select
                                value={status}
                                onValueChange={(val) => {
                                    setStatus(val);
                                    applyFilters({ status: val, page: 1 });
                                }}
                            >
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Pilih status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="in_maintenance">
                                        Dalam perawatan
                                    </SelectItem>
                                    <SelectItem value="ready">
                                        Siap digunakan
                                    </SelectItem>
                                    <SelectItem value="all">
                                        Semua status
                                    </SelectItem>
                                </SelectContent>
                            </Select>

                            <Select
                                value={reason}
                                onValueChange={(val) => {
                                    setReason(val);
                                    applyFilters({ reason: val, page: 1 });
                                }}
                            >
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Semua alasan" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Semua alasan</SelectItem>
                                    <SelectItem value="cleaning">Pembersihan</SelectItem>
                                    <SelectItem value="repair">Perbaikan</SelectItem>
                                    <SelectItem value="inspection">Inspeksi</SelectItem>
                                    <SelectItem value="custom">Lainnya / Manual</SelectItem>
                                </SelectContent>
                            </Select>

                            {hasActiveFilters && (
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 text-xs text-muted-foreground hover:text-foreground"
                                    onClick={handleResetFilters}
                                >
                                    <RotateCcw className="mr-1 size-3" />
                                    Reset Filter
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Table Content */}
                <div className="flex flex-col gap-2">
                    {loading && (
                        <div
                            className="h-1 w-full animate-pulse rounded-sm bg-primary"
                            role="status"
                            aria-label="Memuat data perawatan"
                        />
                    )}

                    <div className="overflow-hidden rounded-md border border-border bg-card">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[30%]">Produk & varian</TableHead>
                                    <TableHead className="w-[8%] text-center">Qty</TableHead>
                                    <TableHead className="w-[14%]">Alasan</TableHead>
                                    <TableHead className="w-[16%]">Sumber</TableHead>
                                    <TableHead className="w-[18%]">Catatan</TableHead>
                                    <TableHead className="w-[14%] text-right">Status & aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {maintenances.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={6}
                                            className="h-32 text-center text-sm text-muted-foreground"
                                        >
                                            <div className="flex flex-col items-center justify-center gap-1.5">
                                                <Package className="size-8 text-muted-foreground/40" />
                                                <span className="font-medium">
                                                    Tidak ada antrean perawatan yang ditemukan.
                                                </span>
                                                <span className="text-xs">
                                                    Semua unit alat dalam kondisi siap disewa di katalog.
                                                </span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    maintenances.data.map((item) => {
                                        const reasonConfig = REASON_MAP[item.reason] || {
                                            label: item.reason,
                                            badgeClass: 'border-border bg-background text-foreground',
                                            icon: Wrench,
                                        };
                                        const ReasonIcon = reasonConfig.icon;
                                        const isUnderMaintenance = item.status === 'in_maintenance';

                                        return (
                                            <TableRow key={item.id} className="transition-colors hover:bg-muted/40">
                                                {/* Produk & Varian */}
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        {item.image_url ? (
                                                            <img
                                                                src={item.image_url}
                                                                alt={item.product_name}
                                                                className="size-11 shrink-0 rounded-md border border-border bg-muted object-cover"
                                                            />
                                                        ) : (
                                                            <div className="flex size-11 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground">
                                                                <Package className="size-5" />
                                                            </div>
                                                        )}
                                                        <div className="flex min-w-0 flex-col">
                                                            <span className="truncate text-sm font-semibold text-foreground">
                                                                {item.product_name}
                                                            </span>
                                                            <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                                                                <span className="text-[11px] font-medium text-foreground">
                                                                    {item.sku}
                                                                </span>
                                                                {item.attributes_summary && (
                                                                    <>
                                                                        <span>•</span>
                                                                        <span>{item.attributes_summary}</span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </TableCell>

                                                {/* Jumlah Unit */}
                                                <TableCell className="text-center">
                                                    <span className="inline-flex items-center justify-center rounded-md bg-muted px-2 py-0.5 text-xs font-semibold">
                                                        {item.quantity} Unit
                                                    </span>
                                                </TableCell>

                                                {/* Alasan */}
                                                <TableCell>
                                                    <Badge
                                                        variant="outline"
                                                        className={`gap-1 font-medium capitalize ${reasonConfig.badgeClass}`}
                                                    >
                                                        <ReasonIcon className="size-3" />
                                                        <span>{reasonConfig.label}</span>
                                                    </Badge>
                                                </TableCell>

                                                {/* Sumber / Asal */}
                                                <TableCell>
                                                    {item.rental_code ? (
                                                        <div className="space-y-0.5 text-xs">
                                                            <Link
                                                                href={rentalsShow({ rental: item.rental_code }).url}
                                                                className="group inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                                                            >
                                                                <span>{item.rental_code}</span>
                                                                <ExternalLink className="size-3 opacity-0 transition-opacity group-hover:opacity-100" />
                                                            </Link>
                                                            <div className="text-[11px] text-muted-foreground">
                                                                Penyewa: {item.customer_name}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <Badge variant="outline" className="text-[11px] font-normal">
                                                            Gudang / manual
                                                        </Badge>
                                                    )}
                                                </TableCell>

                                                {/* Catatan Kerusakan */}
                                                <TableCell>
                                                    <p className="line-clamp-2 text-xs text-muted-foreground">
                                                        {item.notes || <span className="italic text-muted-foreground/60">Tidak ada catatan</span>}
                                                    </p>
                                                    <span className="text-[10px] text-muted-foreground/75">
                                                        Masuk: {formatDateTime(item.created_at)}
                                                    </span>
                                                </TableCell>

                                                {/* Status & Aksi */}
                                                <TableCell className="text-right">
                                                    {isUnderMaintenance ? (
                                                        <div className="flex flex-col items-end gap-1.5">
                                                            <Badge
                                                                variant="secondary"
                                                                className="border-transparent bg-warning-muted text-[10px] font-semibold text-warning"
                                                            >
                                                                Dalam perawatan
                                                            </Badge>
                                                            <Button
                                                                size="sm"
                                                                variant="default"
                                                                onClick={() => {
                                                                    setSelectedMaintenance(item);
                                                                    setShowMarkReadyDialog(true);
                                                                }}
                                                                className="h-7 gap-1 px-2.5 text-xs"
                                                            >
                                                                <CheckCircle2 className="size-3.5" />
                                                                <span>Tandai siap</span>
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col items-end text-xs">
                                                            <Badge
                                                                variant="secondary"
                                                                className="border-transparent bg-success-muted text-[10px] font-semibold text-success"
                                                            >
                                                                Siap digunakan
                                                            </Badge>
                                                            <span className="mt-1 text-[10px] text-muted-foreground">
                                                                Selesai: {formatDate(item.completed_at || item.created_at)}
                                                            </span>
                                                        </div>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination */}
                    <DataTablePagination
                        currentPage={maintenances.current_page}
                        lastPage={maintenances.last_page}
                        perPage={perPage}
                        perPageOptions={PER_PAGE_OPTIONS}
                        total={maintenances.total}
                        from={maintenances.from}
                        to={maintenances.to}
                        itemLabel="data perawatan"
                        loading={loading}
                        onPage={(page) => applyFilters({ page })}
                        onPerPageChange={(value) => {
                            setPerPage(value);
                            applyFilters({ per_page: value, page: 1 });
                        }}
                    />
                </div>
            </div>

            {/* Dialog 1: Konfirmasi Tandai Siap */}
            <Dialog open={showMarkReadyDialog} onOpenChange={setShowMarkReadyDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <div className="flex items-center gap-2 text-success">
                            <CheckCircle2 className="size-5" />
                            <DialogTitle>Tandai unit siap digunakan?</DialogTitle>
                        </div>
                        <DialogDescription>
                            Unit yang ditandai siap akan otomatis kembali ke pool stok aktif dan langsung dapat disewa oleh pelanggan di katalog.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedMaintenance && (
                        <div className="space-y-3 py-2 text-xs">
                            <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-1.5">
                                <div className="font-semibold text-foreground text-sm">
                                    {selectedMaintenance.product_name}
                                </div>
                                <div className="text-muted-foreground">
                                    SKU: <span className="text-foreground">{selectedMaintenance.sku}</span>
                                </div>
                                <div className="text-muted-foreground">
                                    Jumlah: <strong className="text-foreground">{selectedMaintenance.quantity} unit</strong>
                                </div>
                                <div className="text-muted-foreground">
                                    Alasan: <span className="capitalize font-medium text-foreground">{selectedMaintenance.reason}</span>
                                </div>
                                {selectedMaintenance.notes && (
                                    <div className="text-muted-foreground pt-1 border-t border-border">
                                        Catatan: <em>"{selectedMaintenance.notes}"</em>
                                    </div>
                                )}
                            </div>

                            <p className="text-[11px] text-muted-foreground italic">
                                * Berdasarkan sistem ketersediaan (AvailabilityService), status unit ini akan berubah menjadi 'ready' dan tidak lagi memblokir stok.
                            </p>
                        </div>
                    )}

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowMarkReadyDialog(false)}
                            disabled={readyingSubmitting}
                        >
                            Batal
                        </Button>
                        <Button
                            type="button"
                            onClick={handleMarkReadyConfirm}
                            disabled={readyingSubmitting}
                        >
                            {readyingSubmitting && (
                                <Loader2 className="mr-2 size-4 animate-spin" />
                            )}
                            Ya, tandai siap
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog 2: Tambah Perawatan Manual */}
            <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
                <DialogContent className="sm:max-w-xl">
                    <form onSubmit={handleCreateMaintenance}>
                        <DialogHeader>
                            <div className="flex items-center gap-2 text-primary">
                                <Plus className="size-5" />
                                <DialogTitle className="text-lg font-semibold">
                                    Tambah perawatan alat manual
                                </DialogTitle>
                            </div>
                            <DialogDescription className="text-xs text-muted-foreground">
                                Masukkan unit alat ke antrean perawatan (misal saat pengecekan gudang rutin atau pembersihan berkala).
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                            {/* Pilih Produk & Varian */}
                            <div className="space-y-1.5">
                                <Label htmlFor="variant-select" className="text-sm font-medium">
                                    Pilih produk & varian <span className="text-destructive">*</span>
                                </Label>
                                <Select
                                    value={createVariantId}
                                    onValueChange={setCreateVariantId}
                                >
                                    <SelectTrigger id="variant-select" className="h-10 w-full text-sm">
                                        <SelectValue placeholder="-- Pilih Produk & Varian --" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-60">
                                        {variants.map((v) => (
                                            <SelectItem key={v.id} value={String(v.id)}>
                                                {v.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Jumlah Unit & Alasan Perawatan (Grid Asimetris: 1 Kolom vs 2 Kolom) */}
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                <div className="space-y-1.5 sm:col-span-1">
                                    <Label htmlFor="create-qty" className="text-sm font-medium">
                                        Jumlah unit <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        id="create-qty"
                                        type="number"
                                        min={1}
                                        value={createQuantity}
                                        onChange={(e) => setCreateQuantity(e.target.value)}
                                        onBlur={() => {
                                            if (!createQuantity || parseInt(createQuantity, 10) < 1) {
                                                setCreateQuantity('1');
                                            }
                                        }}
                                        placeholder="1"
                                        className="h-10 text-sm"
                                        required
                                    />
                                </div>

                                <div className="space-y-1.5 sm:col-span-2">
                                    <Label htmlFor="create-reason" className="text-sm font-medium">
                                        Alasan perawatan <span className="text-destructive">*</span>
                                    </Label>
                                    <Select
                                        value={createReason}
                                        onValueChange={(val: 'cleaning' | 'repair' | 'inspection' | 'custom') =>
                                            setCreateReason(val)
                                        }
                                    >
                                        <SelectTrigger id="create-reason" className="h-10 w-full text-sm">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="cleaning">Pembersihan</SelectItem>
                                            <SelectItem value="repair">Perbaikan</SelectItem>
                                            <SelectItem value="inspection">Inspeksi teknis</SelectItem>
                                            <SelectItem value="custom">Lainnya (isi manual)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Input Alasan Manual (Kondisional jika opsi Lainnya dipilih) */}
                            {createReason === 'custom' && (
                                <div className="space-y-1.5 animate-in fade-in-50 duration-200">
                                    <Label htmlFor="create-custom-reason" className="text-sm font-medium">
                                        Tuliskan alasan perawatan <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        id="create-custom-reason"
                                        type="text"
                                        placeholder="Contoh: Modifikasi tali, penggantian baut, kalibrasi..."
                                        value={createCustomReason}
                                        onChange={(e) => setCreateCustomReason(e.target.value)}
                                        className="h-10 text-sm"
                                        required
                                    />
                                </div>
                            )}

                            {/* Catatan & Rincian */}
                            <div className="space-y-1.5">
                                <Label htmlFor="create-notes" className="text-sm font-medium">
                                    Catatan & rincian
                                </Label>
                                <Textarea
                                    id="create-notes"
                                    rows={3}
                                    placeholder="Contoh: Ritsleting tenda bagian depan tersendat, perlu pelumasan..."
                                    value={createNotes}
                                    onChange={(e) => setCreateNotes(e.target.value)}
                                    className="resize-none text-sm"
                                />
                            </div>

                            <div className="rounded-md border border-border bg-muted/50 p-2.5 text-xs text-muted-foreground">
                                * Stok varian ini akan otomatis terpotong sementara dari ketersediaan booking aktif sampai Anda menandainya siap.
                            </div>
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowCreateModal(false)}
                                disabled={createSubmitting}
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={createSubmitting}
                            >
                                {createSubmitting && (
                                    <Loader2 className="mr-2 size-4 animate-spin" />
                                )}
                                Simpan ke antrean
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}

MaintenanceIndex.layout = {
    breadcrumbs: [
        {
            title: 'Return & Maintenance',
            href: maintenancesIndex().url,
        },
    ],
};
