import { Head, router } from '@inertiajs/react';
import {
    ChevronDown,
    ChevronRight,
    Package,
    PackageCheck,
    PackageX,
} from 'lucide-react';
import { Fragment, useEffect, useRef, useState } from 'react';
import { ProductDetailDialog } from '@/components/product-detail-dialog';
import { ProductFormDialog } from '@/components/product-form-dialog';
import {
    formatRupiah,
    lowestPrice,
    totalStock,
    variantLabel,
    type AttributeOption,
    type CategoryOption,
    type ProductRow,
} from '@/components/product-shared';
import { DataTablePagination } from '@/components/data-table-pagination';
import { EmptyState } from '@/components/empty-state';
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
import { index as productsIndex } from '@/routes/admin/products';

type PaginatedProducts = {
    data: ProductRow[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
};

type ProductSummary = {
    total: number;
    active: number;
    inactive: number;
    total_stock: number;
};

type SortColumn = 'name' | 'slug' | 'created_at';
type SortDir = 'asc' | 'desc';
type StatusFilter = 'all' | 'active' | 'inactive';

type ProductFilters = {
    search: string;
    category_id: number | null;
    status: StatusFilter;
    per_page: number;
    sort_by: SortColumn;
    sort_dir: SortDir;
};

type Props = {
    products: PaginatedProducts;
    summary: ProductSummary;
    categories: CategoryOption[];
    attributes: AttributeOption[];
    filters: ProductFilters;
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

export default function ProductsIndex({
    products,
    summary,
    categories,
    attributes,
    filters,
}: Props) {
    const [search, setSearch] = useState(filters.search);
    const [perPage, setPerPage] = useState(String(filters.per_page));
    const [sortBy, setSortBy] = useState<SortColumn>(filters.sort_by);
    const [sortDir, setSortDir] = useState<SortDir>(filters.sort_dir);
    const [categoryId, setCategoryId] = useState(
        filters.category_id ? String(filters.category_id) : 'all',
    );
    const [status, setStatus] = useState<StatusFilter>(filters.status);
    const [preview, setPreview] = useState<ProductRow | null>(null);
    const [expanded, setExpanded] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const firstRender = useRef(true);

    useEffect(() => {
        if (!preview) {
            return;
        }

        const fresh = products.data.find(
            (product) => product.id === preview.id,
        );

        if (!fresh) {
            setPreview(null);
            return;
        }

        if (fresh !== preview) {
            setPreview(fresh);
        }
    }, [products, preview]);

    const reload = (params: Record<string, string | number>) => {
        router.get(
            productsIndex(),
            {
                search,
                per_page: perPage,
                sort_by: sortBy,
                sort_dir: sortDir,
                category_id: categoryId === 'all' ? undefined : categoryId,
                status,
                ...params,
            },
            {
                preserveState: true,
                replace: true,
                only: ['products', 'filters', 'summary'],
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

    const hasFilter = search !== '' || categoryId !== 'all' || status !== 'all';

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
            label: 'Total produk',
            value: summary.total,
            icon: Package,
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
            key: 'stock',
            label: 'Total stok varian',
            value: summary.total_stock,
            icon: PackageX,
            iconClass:
                'bg-warning bg-[radial-gradient(circle_at_50%_0%,rgb(255_255_255/0.45),transparent_80%)] text-primary-foreground',
        },
    ];

    return (
        <>
            <Head title="Produk" />
            <div className="flex h-full flex-1 flex-col gap-6 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Produk</h1>
                        <p className="text-sm text-muted-foreground">
                            Kelola produk, varian, stok fisik, dan gambar
                            katalog
                        </p>
                    </div>
                    <ProductFormDialog
                        categories={categories}
                        attributes={attributes}
                    />
                </div>

                <SummaryCards items={summaryItems} />

                <div className="grid grid-cols-1 gap-4 sm:max-w-3xl sm:grid-cols-[1fr_200px_160px]">
                    <SearchInput
                        value={search}
                        onChange={setSearch}
                        placeholder="Cari nama, slug, atau deskripsi produk..."
                        ariaLabel="Cari produk"
                        className="w-full"
                    />
                    <Select
                        value={categoryId}
                        onValueChange={(v) => {
                            setCategoryId(v);
                            reload({ category_id: v === 'all' ? '' : v });
                        }}
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Semua kategori" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Semua kategori</SelectItem>
                            {categories.map((c) => (
                                <SelectItem key={c.id} value={String(c.id)}>
                                    {c.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select
                        value={status}
                        onValueChange={(v) => {
                            setStatus(v as StatusFilter);
                            reload({ status: v });
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
                            aria-label="Memuat data produk"
                        />
                    )}
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-10">
                                    <span className="sr-only">
                                        Rincian varian
                                    </span>
                                </TableHead>
                                <TableHead>
                                    <SortButton
                                        label="Produk"
                                        active={sortBy === 'name'}
                                        direction={sortDir}
                                        onClick={() => handleSort('name')}
                                    />
                                </TableHead>
                                <TableHead>Kategori</TableHead>
                                <TableHead>Varian / Stok</TableHead>
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
                            ) : products.data.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={COLUMN_COUNT}
                                        className="h-64"
                                    >
                                        <EmptyState
                                            icon={Package}
                                            title={
                                                hasFilter
                                                    ? 'Produk tidak ditemukan'
                                                    : 'Belum ada produk'
                                            }
                                            description={
                                                hasFilter
                                                    ? `Tidak ada produk yang cocok dengan filter saat ini. Coba kata kunci lain.`
                                                    : 'Mulai dengan menambahkan produk peralatan camping pertama beserta variannya.'
                                            }
                                            action={
                                                hasFilter ? (
                                                    <Button
                                                        variant="outline"
                                                        onClick={() => {
                                                            setSearch('');
                                                            setCategoryId(
                                                                'all',
                                                            );
                                                            setStatus('all');
                                                            reload({
                                                                search: '',
                                                                category_id: '',
                                                                status: 'all',
                                                            });
                                                        }}
                                                    >
                                                        Reset filter
                                                    </Button>
                                                ) : (
                                                    <ProductFormDialog
                                                        categories={categories}
                                                        attributes={attributes}
                                                    />
                                                )
                                            }
                                        />
                                    </TableCell>
                                </TableRow>
                            ) : (
                                products.data.map((product) => (
                                    <Fragment key={product.id}>
                                        <TableRow
                                            className="cursor-pointer hover:bg-muted/50"
                                            onClick={() => setPreview(product)}
                                        >
                                            <TableCell
                                                className="w-10"
                                                onClick={(e) =>
                                                    e.stopPropagation()
                                                }
                                            >
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    aria-label={
                                                        expanded === product.id
                                                            ? `Sembunyikan varian ${product.name}`
                                                            : `Tampilkan varian ${product.name}`
                                                    }
                                                    onClick={() =>
                                                        toggleExpanded(
                                                            product.id,
                                                        )
                                                    }
                                                >
                                                    <ChevronDown
                                                        className={`size-4 transition-transform ${expanded === product.id ? 'rotate-180' : ''}`}
                                                    />
                                                </Button>
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    {(product.images.find(
                                                        (img) => img.is_primary,
                                                    ) ?? product.images[0]) ? (
                                                        <img
                                                            src={`/storage/${(product.images.find((img) => img.is_primary) ?? product.images[0]).image_path}`}
                                                            alt={product.name}
                                                            className="size-8 shrink-0 rounded-md border border-border object-cover"
                                                        />
                                                    ) : (
                                                        <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted">
                                                            <Package className="size-4 text-muted-foreground" />
                                                        </span>
                                                    )}
                                                    <span className="min-w-0">
                                                        <span className="block truncate">
                                                            {product.name}
                                                        </span>
                                                        <span className="block truncate text-xs font-normal text-muted-foreground">
                                                            /{product.slug} ·{' '}
                                                            {formatDate(
                                                                product.created_at,
                                                            )}
                                                        </span>
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {product.category?.name ?? '-'}
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {product.variants.length} varian
                                                · {totalStock(product)} unit
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {formatRupiah(
                                                    lowestPrice(product),
                                                )}
                                                <span className="text-muted-foreground">
                                                    /hari
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant="secondary"
                                                    className={
                                                        product.is_active
                                                            ? 'bg-success-muted text-success'
                                                            : 'bg-destructive/10 text-destructive'
                                                    }
                                                >
                                                    {product.is_active
                                                        ? 'Aktif'
                                                        : 'Nonaktif'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setPreview(product);
                                                    }}
                                                >
                                                    Detail
                                                    <ChevronRight className="size-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                        {expanded === product.id && (
                                            <TableRow
                                                key={`${product.id}-varian`}
                                            >
                                                <TableCell />
                                                <TableCell
                                                    colSpan={COLUMN_COUNT - 1}
                                                >
                                                    <div className="flex flex-col gap-2 py-1">
                                                        {product.variants.map(
                                                            (variant) => (
                                                                <div
                                                                    key={
                                                                        variant.id
                                                                    }
                                                                    className="flex items-center gap-3 rounded-md border border-border bg-muted/40 px-3 py-2"
                                                                >
                                                                    <div className="min-w-0 flex-1">
                                                                        <p className="truncate text-sm font-medium">
                                                                            {variantLabel(
                                                                                variant,
                                                                            )}
                                                                        </p>
                                                                        <p className="truncate font-mono text-xs text-muted-foreground">
                                                                            {
                                                                                variant.sku
                                                                            }
                                                                        </p>
                                                                    </div>
                                                                    {!variant.is_active && (
                                                                        <Badge
                                                                            variant="secondary"
                                                                            className="bg-destructive/10 text-destructive"
                                                                        >
                                                                            Nonaktif
                                                                        </Badge>
                                                                    )}
                                                                    <p className="shrink-0 text-xs text-muted-foreground">
                                                                        {
                                                                            variant.stock
                                                                        }{' '}
                                                                        unit
                                                                    </p>
                                                                    <p className="w-32 shrink-0 text-right text-sm font-medium">
                                                                        {formatRupiah(
                                                                            variant.rental_price_per_day,
                                                                        )}
                                                                        <span className="font-normal text-muted-foreground">
                                                                            /hari
                                                                        </span>
                                                                    </p>
                                                                </div>
                                                            ),
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
                    currentPage={products.current_page}
                    lastPage={products.last_page}
                    perPage={perPage}
                    perPageOptions={PER_PAGE_OPTIONS}
                    total={products.total}
                    from={products.from}
                    to={products.to}
                    itemLabel="produk"
                    loading={loading}
                    onPage={goToPage}
                    onPerPageChange={(value) => {
                        setPerPage(value);
                        reload({ per_page: value });
                    }}
                />
            </div>

            <ProductDetailDialog
                product={preview}
                categories={categories}
                attributes={attributes}
                onClose={() => setPreview(null)}
            />
        </>
    );
}

ProductsIndex.layout = {
    breadcrumbs: [
        {
            title: 'Produk',
            href: productsIndex(),
        },
    ],
};
