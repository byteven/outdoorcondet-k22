import { Head, Link, router } from '@inertiajs/react';
import {
    AlertCircle,
    Calendar,
    CheckCircle2,
    ChevronRight,
    Clock,
    Eye,
    Filter,
    FileText,
    MoreHorizontal,
    ReceiptText,
    RotateCcw,
    X,
    XCircle,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { DataTablePagination } from '@/components/data-table-pagination';
import { EmptyState } from '@/components/empty-state';
import {
    CancelRentalDialog,
    ConfirmPaymentDialog,
    ConfirmReturnDialog,
    PaymentProofModal,
    RejectPaymentDialog,
} from '@/components/rental-action-dialogs';
import {
    formatDate,
    formatRupiah,
    STATUS_OPTIONS,
    type RentalFilters,
    type RentalRow,
    type RentalSummary,
} from '@/components/rental-shared';
import { RentalStatusBadge } from '@/components/rental-status-badge';
import { SearchInput } from '@/components/search-input';
import { SummaryCards, type SummaryCardItem } from '@/components/summary-cards';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    index as rentalsIndex,
    show as rentalsShow,
} from '@/routes/admin/rentals';

type PaginatedRentals = {
    data: RentalRow[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
};

type Props = {
    rentals: PaginatedRentals;
    summary: RentalSummary;
    filters: RentalFilters;
};

const PER_PAGE_OPTIONS = [10, 15, 25, 50];
const COLUMN_COUNT = 6;

export default function RentalsIndex({ rentals, summary, filters }: Props) {
    const [search, setSearch] = useState(filters.search);
    const [status, setStatus] = useState(filters.status);
    const [dateFrom, setDateFrom] = useState(filters.date_from);
    const [dateTo, setDateTo] = useState(filters.date_to);
    const [perPage, setPerPage] = useState(String(filters.per_page));
    const [loading, setLoading] = useState(false);
    const firstRender = useRef(true);

    // Dialog state
    const [selectedRental, setSelectedRental] = useState<RentalRow | null>(
        null,
    );
    const [showConfirmPayment, setShowConfirmPayment] = useState(false);
    const [showRejectPayment, setShowRejectPayment] = useState(false);
    const [showConfirmReturn, setShowConfirmReturn] = useState(false);
    const [showCancelRental, setShowCancelRental] = useState(false);
    const [proofModalUrl, setProofModalUrl] = useState<string | null>(null);
    const [proofModalCode, setProofModalCode] = useState('');

    const reload = (params: Record<string, string | number>) => {
        router.get(
            rentalsIndex().url,
            {
                search,
                status,
                date_from: dateFrom,
                date_to: dateTo,
                per_page: perPage,
                ...params,
            },
            {
                preserveState: true,
                replace: true,
                only: ['rentals', 'filters', 'summary'],
                onStart: () => setLoading(true),
                onFinish: () => setLoading(false),
            },
        );
    };

    // Debounce search
    useEffect(() => {
        if (firstRender.current) {
            firstRender.current = false;
            return;
        }

        const timeout = window.setTimeout(() => {
            if (search !== filters.search) {
                reload({ search, page: 1 });
            }
        }, 500);

        return () => window.clearTimeout(timeout);
    }, [search, filters.search]);

    const handleStatusChange = (newStatus: string) => {
        setStatus(newStatus);
        reload({ status: newStatus, page: 1 });
    };

    const handleDateFilterApply = () => {
        reload({ date_from: dateFrom, date_to: dateTo, page: 1 });
    };

    const handleResetFilters = () => {
        setSearch('');
        setStatus('all');
        setDateFrom('');
        setDateTo('');
        setPerPage('10');
        router.get(
            rentalsIndex().url,
            { per_page: 10 },
            {
                preserveState: true,
                replace: true,
                onStart: () => setLoading(true),
                onFinish: () => setLoading(false),
            },
        );
    };

    const hasActiveFilters =
        search !== '' || status !== 'all' || dateFrom !== '' || dateTo !== '';

    const summaryItems: SummaryCardItem[] = [
        {
            key: 'total',
            label: 'Total Transaksi',
            value: summary.total,
            icon: ReceiptText,
            iconClass:
                'bg-info bg-[radial-gradient(circle_at_50%_0%,rgb(255_255_255/0.45),transparent_80%)] text-primary-foreground',
        },
        {
            key: 'waiting_confirmation',
            label: 'Butuh Konfirmasi',
            value: summary.waiting_confirmation,
            icon: AlertCircle,
            iconClass:
                'bg-amber-500 bg-[radial-gradient(circle_at_50%_0%,rgb(255_255_255/0.45),transparent_80%)] text-white',
        },
        {
            key: 'late',
            label: 'Terlambat Pengembalian',
            value: summary.late,
            icon: Clock,
            iconClass:
                'bg-destructive bg-[radial-gradient(circle_at_50%_0%,rgb(255_255_255/0.45),transparent_80%)] text-destructive-foreground',
        },
        {
            key: 'returned',
            label: 'Selesai Dikembalikan',
            value: summary.returned,
            icon: CheckCircle2,
            iconClass:
                'bg-emerald-600 bg-[radial-gradient(circle_at_50%_0%,rgb(255_255_255/0.45),transparent_80%)] text-white',
        },
    ];

    return (
        <>
            <Head title="Monitoring Transaksi Rental" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4">
                {/* Header */}
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl font-bold tracking-tight">
                        Monitoring Transaksi Rental
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Kelola alur transaksi, konfirmasi bukti pembayaran QRIS,
                        dan pengembalian sewa peralatan outdoor.
                    </p>
                </div>

                {/* Summary Cards */}
                <SummaryCards items={summaryItems} />

                {/* Filter and Search Bar */}
                <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-xs">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        {/* Search Input */}
                        <SearchInput
                            value={search}
                            onChange={setSearch}
                            placeholder="Cari kode rental, nama pelanggan, no HP..."
                            ariaLabel="Cari rental"
                            className="w-full lg:max-w-md"
                        />

                        {/* Status Select */}
                        <div className="flex flex-wrap items-center gap-2">
                            <Select
                                value={status}
                                onValueChange={handleStatusChange}
                            >
                                <SelectTrigger className="w-full sm:w-[220px]">
                                    <SelectValue placeholder="Pilih status" />
                                </SelectTrigger>
                                <SelectContent>
                                    {STATUS_OPTIONS.map((opt) => (
                                        <SelectItem
                                            key={opt.value}
                                            value={opt.value}
                                        >
                                            {opt.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Date Filters Row */}
                    <div className="flex flex-wrap items-center gap-3 border-t pt-2">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Calendar className="size-3.5" />
                            <span>Rentang Tanggal Sewa:</span>
                        </div>

                        <div className="flex items-center gap-2">
                            <Input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                className="h-8 w-[140px] text-xs"
                                placeholder="Dari tgl"
                            />
                            <span className="text-xs text-muted-foreground">
                                s/d
                            </span>
                            <Input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                className="h-8 w-[140px] text-xs"
                                placeholder="Sampai tgl"
                            />
                            <Button
                                size="sm"
                                variant="secondary"
                                className="h-8 text-xs"
                                onClick={handleDateFilterApply}
                            >
                                <Filter className="mr-1 size-3.5" />
                                Terapkan
                            </Button>
                        </div>

                        {hasActiveFilters && (
                            <Button
                                size="sm"
                                variant="ghost"
                                className="ml-auto h-8 text-xs text-muted-foreground hover:text-foreground"
                                onClick={handleResetFilters}
                            >
                                <RotateCcw className="mr-1 size-3" />
                                Reset Filter
                            </Button>
                        )}
                    </div>
                </div>

                {/* Table Content */}
                <div className="flex flex-col gap-2">
                    {loading && (
                        <div
                            className="h-1 w-full animate-pulse rounded-sm bg-primary"
                            role="status"
                            aria-label="Memuat data rental"
                        />
                    )}

                    <div className="overflow-hidden rounded-md border bg-card">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[180px]">
                                        Kode & Waktu
                                    </TableHead>
                                    <TableHead>Pelanggan</TableHead>
                                    <TableHead>Periode Sewa</TableHead>
                                    <TableHead>Pembayaran</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="w-[160px] text-right">
                                        Aksi
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    Array.from({ length: 5 }).map(
                                        (_, index) => (
                                            <TableRow key={`skeleton-${index}`}>
                                                <TableCell>
                                                    <Skeleton className="mb-1 h-5 w-28" />
                                                    <Skeleton className="h-3 w-20" />
                                                </TableCell>
                                                <TableCell>
                                                    <Skeleton className="mb-1 h-5 w-32" />
                                                    <Skeleton className="h-3 w-24" />
                                                </TableCell>
                                                <TableCell>
                                                    <Skeleton className="mb-1 h-5 w-36" />
                                                    <Skeleton className="h-3 w-16" />
                                                </TableCell>
                                                <TableCell>
                                                    <Skeleton className="mb-1 h-5 w-28" />
                                                    <Skeleton className="h-3 w-20" />
                                                </TableCell>
                                                <TableCell>
                                                    <Skeleton className="h-6 w-24" />
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Skeleton className="ml-auto h-8 w-16" />
                                                </TableCell>
                                            </TableRow>
                                        ),
                                    )
                                ) : rentals.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={COLUMN_COUNT}
                                            className="h-64"
                                        >
                                            <EmptyState
                                                icon={ReceiptText}
                                                title={
                                                    hasActiveFilters
                                                        ? 'Transaksi tidak ditemukan'
                                                        : 'Belum ada transaksi rental'
                                                }
                                                description={
                                                    hasActiveFilters
                                                        ? `Tidak ada rental yang cocok dengan filter aktif. Coba ubah kata kunci atau status.`
                                                        : 'Transaksi sewa dari pelanggan akan muncul di sini setelah checkout.'
                                                }
                                                action={
                                                    hasActiveFilters ? (
                                                        <Button
                                                            variant="outline"
                                                            onClick={
                                                                handleResetFilters
                                                            }
                                                        >
                                                            Reset filter
                                                            pencarian
                                                        </Button>
                                                    ) : undefined
                                                }
                                            />
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    rentals.data.map((rental) => {
                                        const customerUser =
                                            rental.customer?.user;
                                        const isWaitingConfirmation =
                                            rental.status ===
                                            'waiting_confirmation';
                                        const isLate =
                                            rental.is_late ||
                                            rental.current_late_days > 0;
                                        const canConfirmReturn =
                                            rental.status === 'dp_paid' ||
                                            rental.status === 'fully_paid';
                                        const canCancel =
                                            rental.status !== 'returned' &&
                                            rental.status !== 'cancelled';

                                        return (
                                            <TableRow
                                                key={rental.id}
                                                className="cursor-pointer transition-colors hover:bg-muted/50"
                                                onClick={() => {
                                                    router.visit(
                                                        rentalsShow({
                                                            rental: rental.rental_code,
                                                        }).url,
                                                    );
                                                }}
                                            >
                                                {/* Kode & Waktu Order */}
                                                <TableCell className="font-medium">
                                                    <div className="flex flex-col">
                                                        <span className="font-mono text-xs font-semibold text-primary">
                                                            {rental.rental_code}
                                                        </span>
                                                        <span className="text-[11px] text-muted-foreground">
                                                            {formatDate(
                                                                rental.created_at,
                                                            )}
                                                        </span>
                                                    </div>
                                                </TableCell>

                                                {/* Pelanggan */}
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-medium">
                                                            {customerUser?.name ??
                                                                'Customer'}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {rental.customer
                                                                ?.phone_number ||
                                                                customerUser?.email ||
                                                                '-'}
                                                        </span>
                                                    </div>
                                                </TableCell>

                                                {/* Periode Sewa */}
                                                <TableCell>
                                                    <div className="flex flex-col text-xs">
                                                        <span className="font-medium text-foreground">
                                                            {formatDate(
                                                                rental.start_date,
                                                            )}{' '}
                                                            —{' '}
                                                            {formatDate(
                                                                rental.end_date,
                                                            )}
                                                        </span>
                                                        <span className="text-muted-foreground">
                                                            Durasi:{' '}
                                                            {rental.total_days}{' '}
                                                            hari
                                                        </span>
                                                    </div>
                                                </TableCell>

                                                {/* Pembayaran */}
                                                <TableCell>
                                                    <div className="flex flex-col text-xs">
                                                        <div className="flex items-center gap-1.5 font-medium">
                                                            <span>
                                                                {rental.payment_type ===
                                                                'down_payment'
                                                                    ? formatRupiah(
                                                                          rental.down_payment_amount,
                                                                      )
                                                                    : formatRupiah(
                                                                          rental.rental_amount,
                                                                      )}
                                                            </span>
                                                            <Badge
                                                                variant="outline"
                                                                className="h-4 px-1 py-0 text-[10px] font-normal"
                                                            >
                                                                {rental.payment_type ===
                                                                'down_payment'
                                                                    ? 'DP 50%'
                                                                    : 'Lunas'}
                                                            </Badge>
                                                        </div>
                                                        {rental.payment_type ===
                                                            'down_payment' && (
                                                            <span className="text-[11px] text-muted-foreground">
                                                                Sisa outlet:{' '}
                                                                {formatRupiah(
                                                                    Number(
                                                                        rental.remaining_balance,
                                                                    ) +
                                                                        Number(
                                                                            rental.deposit_amount,
                                                                        ),
                                                                )}
                                                            </span>
                                                        )}
                                                    </div>
                                                </TableCell>

                                                {/* Status + Badges Alert */}
                                                <TableCell>
                                                    <div className="flex flex-col items-start gap-1">
                                                        <RentalStatusBadge
                                                            status={
                                                                rental.status
                                                            }
                                                        />

                                                        {isWaitingConfirmation && (
                                                            <Badge className="animate-pulse gap-1 bg-amber-500 px-1.5 py-0 text-[10px] text-white hover:bg-amber-600">
                                                                <AlertCircle className="size-2.5" />
                                                                Butuh Konfirmasi
                                                            </Badge>
                                                        )}

                                                        {isLate && (
                                                            <Badge
                                                                variant="destructive"
                                                                className="gap-1 px-1.5 py-0 text-[10px]"
                                                            >
                                                                <Clock className="size-2.5" />
                                                                Terlambat (
                                                                {
                                                                    rental.current_late_days
                                                                }
                                                                h)
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </TableCell>

                                                {/* Aksi */}
                                                <TableCell
                                                    className="text-right"
                                                    onClick={(e) =>
                                                        e.stopPropagation()
                                                    }
                                                >
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        {/* Quick action button for waiting_confirmation */}
                                                        {isWaitingConfirmation && (
                                                            <Button
                                                                size="sm"
                                                                className="h-8 bg-amber-500 px-2.5 text-xs text-white hover:bg-amber-600"
                                                                onClick={() => {
                                                                    setSelectedRental(
                                                                        rental,
                                                                    );
                                                                    setShowConfirmPayment(
                                                                        true,
                                                                    );
                                                                }}
                                                                title="Setujui Bukti Pembayaran"
                                                            >
                                                                <CheckCircle2 className="mr-1 size-3.5" />
                                                                Setujui
                                                            </Button>
                                                        )}

                                                        {/* Quick action button for confirm return */}
                                                        {canConfirmReturn && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="h-8 border-primary/30 px-2.5 text-xs text-primary hover:bg-primary/5"
                                                                onClick={() => {
                                                                    setSelectedRental(
                                                                        rental,
                                                                    );
                                                                    setShowConfirmReturn(
                                                                        true,
                                                                    );
                                                                }}
                                                                title="Konfirmasi Pengembalian Barang"
                                                            >
                                                                <Clock className="mr-1 size-3.5" />
                                                                Kembali
                                                            </Button>
                                                        )}

                                                        {/* Dropdown Menu for More Actions */}
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger
                                                                asChild
                                                            >
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="size-8"
                                                                >
                                                                    <MoreHorizontal className="size-4" />
                                                                    <span className="sr-only">
                                                                        Menu
                                                                        aksi
                                                                    </span>
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent
                                                                align="end"
                                                                className="w-48"
                                                            >
                                                                <DropdownMenuItem
                                                                    asChild
                                                                >
                                                                    <Link
                                                                        href={
                                                                            rentalsShow(
                                                                                {
                                                                                    rental: rental.rental_code,
                                                                                },
                                                                            )
                                                                                .url
                                                                        }
                                                                        className="flex cursor-pointer items-center"
                                                                    >
                                                                        <Eye className="mr-2 size-4" />
                                                                        Lihat
                                                                        Detail
                                                                    </Link>
                                                                </DropdownMenuItem>

                                                                {rental.has_proof &&
                                                                    rental.proof_url && (
                                                                        <DropdownMenuItem
                                                                            onClick={() => {
                                                                                setProofModalUrl(
                                                                                    rental.proof_url,
                                                                                );
                                                                                setProofModalCode(
                                                                                    rental.rental_code,
                                                                                );
                                                                            }}
                                                                        >
                                                                            <FileText className="mr-2 size-4" />
                                                                            Lihat
                                                                            Bukti
                                                                            QRIS
                                                                        </DropdownMenuItem>
                                                                    )}

                                                                {isWaitingConfirmation && (
                                                                    <>
                                                                        <DropdownMenuItem
                                                                            onClick={() => {
                                                                                setSelectedRental(
                                                                                    rental,
                                                                                );
                                                                                setShowConfirmPayment(
                                                                                    true,
                                                                                );
                                                                            }}
                                                                            className="text-emerald-600"
                                                                        >
                                                                            <CheckCircle2 className="mr-2 size-4" />
                                                                            Setujui
                                                                            Pembayaran
                                                                        </DropdownMenuItem>
                                                                        <DropdownMenuItem
                                                                            onClick={() => {
                                                                                setSelectedRental(
                                                                                    rental,
                                                                                );
                                                                                setShowRejectPayment(
                                                                                    true,
                                                                                );
                                                                            }}
                                                                            className="text-destructive"
                                                                        >
                                                                            <XCircle className="mr-2 size-4" />
                                                                            Tolak
                                                                            Pembayaran
                                                                        </DropdownMenuItem>
                                                                    </>
                                                                )}

                                                                {canConfirmReturn && (
                                                                    <DropdownMenuItem
                                                                        onClick={() => {
                                                                            setSelectedRental(
                                                                                rental,
                                                                            );
                                                                            setShowConfirmReturn(
                                                                                true,
                                                                            );
                                                                        }}
                                                                    >
                                                                        <Clock className="mr-2 size-4" />
                                                                        Konfirmasi
                                                                        Kembali
                                                                    </DropdownMenuItem>
                                                                )}

                                                                {canCancel && (
                                                                    <>
                                                                        <DropdownMenuSeparator />
                                                                        <DropdownMenuItem
                                                                            onClick={() => {
                                                                                setSelectedRental(
                                                                                    rental,
                                                                                );
                                                                                setShowCancelRental(
                                                                                    true,
                                                                                );
                                                                            }}
                                                                            className="text-destructive focus:text-destructive"
                                                                        >
                                                                            <X className="mr-2 size-4" />
                                                                            Batalkan
                                                                            Rental
                                                                        </DropdownMenuItem>
                                                                    </>
                                                                )}
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>

                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="size-8"
                                                            asChild
                                                        >
                                                            <Link
                                                                href={
                                                                    rentalsShow(
                                                                        {
                                                                            rental: rental.rental_code,
                                                                        },
                                                                    ).url
                                                                }
                                                                title="Detail"
                                                            >
                                                                <ChevronRight className="size-4" />
                                                            </Link>
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>

                {/* Pagination */}
                <DataTablePagination
                    currentPage={rentals.current_page}
                    lastPage={rentals.last_page}
                    perPage={perPage}
                    perPageOptions={PER_PAGE_OPTIONS}
                    total={rentals.total}
                    from={rentals.from}
                    to={rentals.to}
                    itemLabel="transaksi rental"
                    loading={loading}
                    onPage={(page) => reload({ page })}
                    onPerPageChange={(value) => {
                        setPerPage(value);
                        reload({ per_page: value, page: 1 });
                    }}
                />
            </div>

            {/* Mounted Action Dialogs */}
            <ConfirmPaymentDialog
                rental={selectedRental}
                open={showConfirmPayment}
                onOpenChange={setShowConfirmPayment}
            />

            <RejectPaymentDialog
                rental={selectedRental}
                open={showRejectPayment}
                onOpenChange={setShowRejectPayment}
            />

            <ConfirmReturnDialog
                rental={selectedRental}
                open={showConfirmReturn}
                onOpenChange={setShowConfirmReturn}
            />

            <CancelRentalDialog
                rental={selectedRental}
                open={showCancelRental}
                onOpenChange={setShowCancelRental}
            />

            <PaymentProofModal
                open={proofModalUrl !== null}
                onOpenChange={(v) => {
                    if (!v) setProofModalUrl(null);
                }}
                proofUrl={proofModalUrl}
                rentalCode={proofModalCode}
            />
        </>
    );
}

RentalsIndex.layout = {
    breadcrumbs: [
        {
            title: 'Monitoring Transaksi',
            href: rentalsIndex().url,
        },
    ],
};
