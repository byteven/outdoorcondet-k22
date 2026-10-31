import { Head, router } from '@inertiajs/react';
import {
    Boxes,
    ChevronDown,
    ChevronRight,
    PackageCheck,
    PackageX,
} from 'lucide-react';
import { Fragment, useEffect, useRef, useState } from 'react';
import { DataTablePagination } from '@/components/data-table-pagination';
import { EmptyState } from '@/components/empty-state';
import { PackageDetailDialog } from '@/components/package-detail-dialog';
import { PackageFormDialog } from '@/components/package-form-dialog';
import {
    type PackageProductOption,
    type PackageRow,
} from '@/components/package-shared';
import { formatRupiah, variantLabel } from '@/components/product-shared';
import { SearchInput } from '@/components/search-input';
import { SortButton } from '@/components/sort-button';
import { SummaryCards, type SummaryCardItem } from '@/components/summary-cards';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { index as packagesIndex } from '@/routes/admin/packages';

type PaginatedPackages = {
    data: PackageRow[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
};

type PackageSummary = {
    total: number;
    active: number;
    inactive: number;
};

type SortColumn = 'name' | 'slug' | 'created_at';
type SortDir = 'asc' | 'desc';
type StatusFilter = 'all' | 'active' | 'inactive';

type PackageFilters = {
    search: string;
    status: StatusFilter;
    per_page: number;
    sort_by: SortColumn;
    sort_dir: SortDir;
};

type Props = {
    packages: PaginatedPackages;
    summary: PackageSummary;
    products: PackageProductOption[];
    filters: PackageFilters;
};

const PER_PAGE_OPTIONS = [10, 15, 25, 50];
const COLUMN_COUNT = 7;

const dateFormatter = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
});

function formatDate(value: string | null): string {
    if (!value) {
        return '-';
    }

    return dateFormatter.format(new Date(value));
}

export default function PackagesIndex({
    packages,
    summary,
    products,
    filters,
}: Props) {
    const [search, setSearch] = useState(filters.search);
    const [perPage, setPerPage] = useState(String(filters.per_page));
    const [sortBy, setSortBy] = useState<SortColumn>(filters.sort_by);
    const [sortDir, setSortDir] = useState<SortDir>(filters.sort_dir);
    const [status, setStatus] = useState<StatusFilter>(filters.status);
    const [preview, setPreview] = useState<PackageRow | null>(null);
    const [editing, setEditing] = useState<PackageRow | null>(null);
    const [expanded, setExpanded] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const firstRender = useRef(true);

    useEffect(() => {
        if (!preview) {
            return;
        }

        const fresh = packages.data.find(
            (packageRow) => packageRow.id === preview.id,
        );

        if (!fresh) {
            setPreview(null);
            return;
        }

        if (fresh !== preview) {
            setPreview(fresh);
        }
    }, [packages, preview]);

    const reload = (params: Record<string, string | number>) => {
        router.get(
            packagesIndex(),
            {
                search,
                per_page: perPage,
                sort_by: sortBy,
                sort_dir: sortDir,
                status,
                ...params,
            },
            {
                preserveState: true,
                replace: true,
                only: ['packages', 'filters', 'summary'],
                onStart: () => setLoading(true),
                onFinish: () => setLoading(false),
            },
        );
    };

    useEffect(() => {
        if (firstRender.current) {
            firstRender.current = false;
            return;
        }

        const timeout = window.setTimeout(() => {
            if (search !== filters.search) {
                reload({ search });
            }
        }, 500);

        return () => window.clearTimeout(timeout);
    }, [search, filters.search]);

    const hasFilter = search !== '' || status !== 'all';

    const handleSort = (column: SortColumn) => {
        if (sortBy !== column) {
            const nextDir: SortDir = column === 'created_at' ? 'desc' : 'asc';
            setSortBy(column);
            setSortDir(nextDir);
            reload({ sort_by: column, sort_dir: nextDir });
            return;
        }

        if (sortDir === 'asc') {
            setSortDir('desc');
            reload({ sort_by: column, sort_dir: 'desc' });
            return;
        }

        setSortBy('created_at');
        setSortDir('desc');
        reload({ sort_by: 'created_at', sort_dir: 'desc' });
    };

    const goToPage = (page: number) => {
        setExpanded(null);
        reload({ page });
    };

    const toggleExpanded = (id: number) => {
        setExpanded((current) => (current === id ? null : id));
    };

    const summaryItems: SummaryCardItem[] = [
        {
            key: 'total',
            label: 'Total paket',
            value: summary.total,
            icon: Boxes,
            iconClass:
                'bg-info bg-[radial-gradient(circle_at_50%_0%,rgb(255_255_255/0.45),transparent_80%)] text-primary-foreground',
        },
        {
            key: 'active',
            label: 'Aktif',
            value: summary.active,
            icon: PackageCheck,
            iconClass:
                'bg-success bg-[radial-gradient(circle_at_50%_0%,rgb(255_255_255/0.45),transparent_80%)] text-primary-foreground',
        },
        {
            key: 'inactive',
            label: 'Nonaktif',
            value: summary.inactive,
            icon: PackageX,
            iconClass:
                'bg-warning bg-[radial-gradient(circle_at_50%_0%,rgb(255_255_255/0.45),transparent_80%)] text-primary-foreground',
        },
    ];

    return (
        <>
            <Head title="Paket" />
            <div className="flex h-full flex-1 flex-col gap-6 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Paket</h1>
                        <p className="text-sm text-muted-foreground">
                            Kelola paket bundling, komposisi produk, harga, dan
                            deposit
                        </p>
                    </div>
                    <PackageFormDialog
                        products={products}
                        trigger={
                            <Button>
                                <Boxes />
                                Tambah paket
                            </Button>
                        }
                    />
                </div>

                <SummaryCards items={summaryItems} />

                <div className="grid grid-cols-1 gap-4 sm:max-w-xl sm:grid-cols-[1fr_160px]">
                    <SearchInput
                        value={search}
                        onChange={setSearch}
                        placeholder="Cari nama, slug, atau deskripsi paket..."
                        ariaLabel="Cari paket"
                        className="w-full"
                    />
                    <Select
                        value={status}
                        onValueChange={(value) => {
                            setStatus(value as StatusFilter);
                            reload({ status: value });
                        }}
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Semua status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Semua status</SelectItem>
                            <SelectItem value="active">Aktif</SelectItem>
                            <SelectItem value="inactive">Nonaktif</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex flex-col gap-2">
                    {loading && (
                        <div
                            className="h-1 w-full animate-pulse rounded-sm bg-muted"
                            role="status"
                            aria-label="Memuat data paket"
                        />
                    )}
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-10">
                                    <span className="sr-only">
                                        Rincian komposisi
                                    </span>
                                </TableHead>
                                <TableHead>
                                    <SortButton
                                        label="Paket"
                                        active={sortBy === 'name'}
                                        direction={sortDir}
                                        onClick={() => handleSort('name')}
                                    />
                                </TableHead>
                                <TableHead>Komposisi</TableHead>
                                <TableHead>Ketersediaan</TableHead>
                                <TableHead>Harga mulai</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="w-24 text-right">
                                    Aksi
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                Array.from({ length: 5 }).map((_, index) => (
                                    <TableRow key={`skeleton-${index}`}>
                                        <TableCell>
                                            <Skeleton className="h-5 w-5" />
                                        </TableCell>
                                        <TableCell>
                                            <Skeleton className="h-5 w-40" />
                                        </TableCell>
                                        <TableCell>
                                            <Skeleton className="h-5 w-24" />
                                        </TableCell>
                                        <TableCell>
                                            <Skeleton className="h-5 w-24" />
                                        </TableCell>
                                        <TableCell>
                                            <Skeleton className="h-5 w-28" />
                                        </TableCell>
                                        <TableCell>
                                            <Skeleton className="h-5 w-16" />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Skeleton className="ml-auto h-8 w-16" />
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : packages.data.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={COLUMN_COUNT}
                                        className="h-64"
                                    >
                                        <EmptyState
                                            icon={Boxes}
                                            title={
                                                hasFilter
                                                    ? 'Paket tidak ditemukan'
                                                    : 'Belum ada paket'
                                            }
                                            description={
                                                hasFilter
                                                    ? 'Tidak ada paket yang cocok dengan filter saat ini. Coba kata kunci lain.'
                                                    : 'Mulai dengan menambahkan paket bundling beserta komposisi produknya.'
                                            }
                                            action={
                                                hasFilter ? (
                                                    <Button
                                                        variant="outline"
                                                        onClick={() => {
                                                            setSearch('');
                                                            setStatus('all');
                                                            reload({
                                                                search: '',
                                                                status: 'all',
                                                            });
                                                        }}
                                                    >
                                                        Reset filter
                                                    </Button>
                                                ) : (
                                                    <PackageFormDialog
                                                        products={products}
                                                        trigger={
                                                            <Button>
                                                                <Boxes />
                                                                Tambah paket
                                                            </Button>
                                                        }
                                                    />
                                                )
                                            }
                                        />
                                    </TableCell>
                                </TableRow>
                            ) : (
                                packages.data.map((packageRow) => (
                                    <Fragment key={packageRow.id}>
                                        <TableRow
                                            className="cursor-pointer hover:bg-muted/50"
                                            onClick={() =>
                                                setPreview(packageRow)
                                            }
                                        >
                                            <TableCell
                                                className="w-10"
                                                onClick={(event) =>
                                                    event.stopPropagation()
                                                }
                                            >
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    aria-label={
                                                        expanded ===
                                                        packageRow.id
                                                            ? `Sembunyikan komposisi ${packageRow.name}`
                                                            : `Tampilkan komposisi ${packageRow.name}`
                                                    }
                                                    onClick={() =>
                                                        toggleExpanded(
                                                            packageRow.id,
                                                        )
                                                    }
                                                >
                                                    <ChevronDown
                                                        className={`size-4 transition-transform ${expanded === packageRow.id ? 'rotate-180' : ''}`}
                                                    />
                                                </Button>
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    {packageRow.image_path ? (
                                                        <img
                                                            src={`/storage/${packageRow.image_path}`}
                                                            alt={
                                                                packageRow.name
                                                            }
                                                            className="size-8 shrink-0 rounded-md border border-border object-cover"
                                                        />
                                                    ) : (
                                                        <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted">
                                                            <Boxes className="size-4 text-muted-foreground" />
                                                        </span>
                                                    )}
                                                    <span className="min-w-0">
                                                        <span className="block truncate">
                                                            {packageRow.name}
                                                        </span>
                                                        <span className="block truncate text-xs font-normal text-muted-foreground">
                                                            /{packageRow.slug} ·{' '}
                                                            {formatDate(
                                                                packageRow.created_at,
                                                            )}
                                                        </span>
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {packageRow.items.length} item
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {packageRow.available_stock}{' '}
                                                <span className="text-muted-foreground">
                                                    paket
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {formatRupiah(
                                                    packageRow.daily_price,
                                                )}
                                                <span className="text-muted-foreground">
                                                    /hari
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant="secondary"
                                                    className={
                                                        packageRow.is_active
                                                            ? 'bg-success-muted text-success'
                                                            : 'bg-destructive/10 text-destructive'
                                                    }
                                                >
                                                    {packageRow.is_active
                                                        ? 'Aktif'
                                                        : 'Nonaktif'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        setPreview(packageRow);
                                                    }}
                                                >
                                                    Detail
                                                    <ChevronRight className="size-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                        {expanded === packageRow.id && (
                                            <TableRow>
                                                <TableCell />
                                                <TableCell
                                                    colSpan={COLUMN_COUNT - 1}
                                                >
                                                    <div className="flex flex-col gap-2 py-1">
                                                        {packageRow.items.map(
                                                            (item) => {
                                                                const stock =
                                                                    item.allow_variant_selection
                                                                        ? (
                                                                              item
                                                                                  .product
                                                                                  ?.variants ??
                                                                              []
                                                                          )
                                                                              .filter(
                                                                                  (
                                                                                      variant,
                                                                                  ) =>
                                                                                      variant.is_active,
                                                                              )
                                                                              .reduce(
                                                                                  (
                                                                                      total,
                                                                                      variant,
                                                                                  ) =>
                                                                                      total +
                                                                                      variant.stock,
                                                                                  0,
                                                                              )
                                                                        : (item
                                                                              .variant
                                                                              ?.stock ??
                                                                          0);

                                                                return (
                                                                    <div
                                                                        key={
                                                                            item.id ??
                                                                            item.product_id
                                                                        }
                                                                        className="flex items-center gap-3 rounded-md border border-border bg-muted/40 px-3 py-2"
                                                                    >
                                                                        <div className="min-w-0 flex-1">
                                                                            <p className="truncate text-sm font-medium">
                                                                                {item
                                                                                    .product
                                                                                    ?.name ??
                                                                                    item
                                                                                        .variant
                                                                                        ?.product
                                                                                        ?.name ??
                                                                                    item
                                                                                        .variant
                                                                                        ?.sku ??
                                                                                    'Item'}
                                                                            </p>
                                                                            <p className="truncate text-xs text-muted-foreground">
                                                                                {item.allow_variant_selection
                                                                                    ? 'Pelanggan bebas memilih varian'
                                                                                    : item.variant
                                                                                      ? variantLabel(
                                                                                            item.variant,
                                                                                        )
                                                                                      : '-'}
                                                                            </p>
                                                                        </div>
                                                                        <p className="shrink-0 text-xs text-muted-foreground">
                                                                            {
                                                                                item.quantity
                                                                            }{' '}
                                                                            unit
                                                                        </p>
                                                                        <p className="w-24 shrink-0 text-right text-xs text-muted-foreground">
                                                                            stok{' '}
                                                                            {
                                                                                stock
                                                                            }
                                                                        </p>
                                                                    </div>
                                                                );
                                                            },
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </Fragment>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                <DataTablePagination
                    currentPage={packages.current_page}
                    lastPage={packages.last_page}
                    perPage={perPage}
                    perPageOptions={PER_PAGE_OPTIONS}
                    total={packages.total}
                    from={packages.from}
                    to={packages.to}
                    itemLabel="paket"
                    loading={loading}
                    onPage={goToPage}
                    onPerPageChange={(value) => {
                        setPerPage(value);
                        reload({ per_page: value });
                    }}
                />
            </div>

            <PackageDetailDialog
                package={preview}
                onClose={() => setPreview(null)}
                onEdit={(packageRow) => {
                    setPreview(null);
                    setEditing(packageRow);
                }}
            />

            <PackageFormDialog
                products={products}
                package={editing}
                open={editing !== null}
                onOpenChange={(open) => !open && setEditing(null)}
            />
        </>
    );
}

PackagesIndex.layout = {
    breadcrumbs: [
        {
            title: 'Paket',
            href: packagesIndex(),
        },
    ],
};
