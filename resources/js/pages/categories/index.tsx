import { Head, router } from '@inertiajs/react';
import { ChevronRight, FolderTree } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
    CategoryDetailDialog,
    type CategoryRow,
} from '@/components/category-detail-dialog';
import { CategoryFormDialog } from '@/components/category-form-dialog';
import { DataTablePagination } from '@/components/data-table-pagination';
import { EmptyState } from '@/components/empty-state';
import { SearchInput } from '@/components/search-input';
import { SortButton } from '@/components/sort-button';
import { SummaryCards, type SummaryCardItem } from '@/components/summary-cards';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { index as categoriesIndex } from '@/routes/admin/categories';

type PaginatedCategories = {
    data: CategoryRow[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
};

type CategorySummary = {
    total: number;
};

type SortColumn = 'name' | 'slug' | 'created_at';
type SortDir = 'asc' | 'desc';

type CategoryFilters = {
    search: string;
    per_page: number;
    sort_by: SortColumn;
    sort_dir: SortDir;
};

type Props = {
    categories: PaginatedCategories;
    summary: CategorySummary;
    filters: CategoryFilters;
};

const PER_PAGE_OPTIONS = [10, 15, 25, 50];
const COLUMN_COUNT = 5;

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

export default function CategoriesIndex({
    categories,
    summary,
    filters,
}: Props) {
    const [search, setSearch] = useState(filters.search);
    const [perPage, setPerPage] = useState(String(filters.per_page));
    const [sortBy, setSortBy] = useState<SortColumn>(filters.sort_by);
    const [sortDir, setSortDir] = useState<SortDir>(filters.sort_dir);
    const [preview, setPreview] = useState<CategoryRow | null>(null);
    const [loading, setLoading] = useState(false);
    const firstRender = useRef(true);

    useEffect(() => {
        if (!preview) {
            return;
        }

        const fresh = categories.data.find(
            (category) => category.id === preview.id,
        );

        if (!fresh) {
            setPreview(null);
            return;
        }

        if (fresh !== preview) {
            setPreview(fresh);
        }
    }, [categories, preview]);

    const reload = (params: Record<string, string | number>) => {
        router.get(
            categoriesIndex(),
            {
                search,
                per_page: perPage,
                sort_by: sortBy,
                sort_dir: sortDir,
                ...params,
            },
            {
                preserveState: true,
                replace: true,
                only: ['categories', 'filters', 'summary'],
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

    const hasSearch = search !== '';

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
        reload({ page });
    };

    const summaryItems: SummaryCardItem[] = [
        {
            key: 'total',
            label: 'Total kategori',
            value: summary.total,
            icon: FolderTree,
            iconClass:
                'bg-info bg-[radial-gradient(circle_at_50%_0%,rgb(255_255_255/0.45),transparent_80%)] text-primary-foreground',
        },
    ];

    return (
        <>
            <Head title="Kategori" />
            <div className="flex h-full flex-1 flex-col gap-6 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Kategori</h1>
                        <p className="text-sm text-muted-foreground">
                            Kelola kategori peralatan outdoor & camping
                        </p>
                    </div>
                    <CategoryFormDialog />
                </div>

                <SummaryCards items={summaryItems} />

                <div className="grid grid-cols-1 gap-4">
                    <SearchInput
                        value={search}
                        onChange={setSearch}
                        placeholder="Cari nama, slug, atau deskripsi kategori..."
                        ariaLabel="Cari kategori"
                        className="w-full sm:max-w-md"
                    />
                </div>

                <div className="flex flex-col gap-2">
                    {loading && (
                        <div
                            className="h-1 w-full animate-pulse rounded-sm bg-muted"
                            role="status"
                            aria-label="Memuat data kategori"
                        />
                    )}
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>
                                    <SortButton
                                        label="Kategori"
                                        active={sortBy === 'name'}
                                        direction={sortDir}
                                        onClick={() => handleSort('name')}
                                    />
                                </TableHead>
                                <TableHead>
                                    <SortButton
                                        label="Slug"
                                        active={sortBy === 'slug'}
                                        direction={sortDir}
                                        onClick={() => handleSort('slug')}
                                    />
                                </TableHead>
                                <TableHead>Deskripsi</TableHead>
                                <TableHead>
                                    <SortButton
                                        label="Dibuat Pada"
                                        active={sortBy === 'created_at'}
                                        direction={sortDir}
                                        onClick={() => handleSort('created_at')}
                                    />
                                </TableHead>
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
                                            <Skeleton className="h-5 w-32" />
                                        </TableCell>
                                        <TableCell>
                                            <Skeleton className="h-5 w-24" />
                                        </TableCell>
                                        <TableCell>
                                            <Skeleton className="h-5 w-48" />
                                        </TableCell>
                                        <TableCell>
                                            <Skeleton className="h-5 w-28" />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Skeleton className="ml-auto h-8 w-16" />
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : categories.data.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={COLUMN_COUNT}
                                        className="h-64"
                                    >
                                        <EmptyState
                                            icon={FolderTree}
                                            title={
                                                hasSearch
                                                    ? 'Kategori tidak ditemukan'
                                                    : 'Belum ada kategori'
                                            }
                                            description={
                                                hasSearch
                                                    ? `Tidak ada kategori yang cocok dengan pencarian "${search}". Coba kata kunci lain.`
                                                    : 'Mulai dengan menambahkan kategori peralatan camping pertama.'
                                            }
                                            action={
                                                hasSearch ? (
                                                    <Button
                                                        variant="outline"
                                                        onClick={() => {
                                                            setSearch('');
                                                            reload({
                                                                search: '',
                                                            });
                                                        }}
                                                    >
                                                        Reset pencarian
                                                    </Button>
                                                ) : (
                                                    <CategoryFormDialog />
                                                )
                                            }
                                        />
                                    </TableCell>
                                </TableRow>
                            ) : (
                                categories.data.map((category) => (
                                    <TableRow
                                        key={category.id}
                                        className="cursor-pointer hover:bg-muted/50"
                                        onClick={() => setPreview(category)}
                                    >
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                <FolderTree className="size-4 shrink-0 text-muted-foreground" />
                                                <span className="truncate">
                                                    {category.name}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="rounded bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
                                                /{category.slug}
                                            </span>
                                        </TableCell>
                                        <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                                            {category.description || '-'}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {formatDate(category.created_at)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setPreview(category);
                                                }}
                                            >
                                                Detail
                                                <ChevronRight className="size-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                <DataTablePagination
                    currentPage={categories.current_page}
                    lastPage={categories.last_page}
                    perPage={perPage}
                    perPageOptions={PER_PAGE_OPTIONS}
                    total={categories.total}
                    from={categories.from}
                    to={categories.to}
                    itemLabel="kategori"
                    loading={loading}
                    onPage={goToPage}
                    onPerPageChange={(value) => {
                        setPerPage(value);
                        reload({ per_page: value });
                    }}
                />
            </div>

            <CategoryDetailDialog
                category={preview}
                onClose={() => setPreview(null)}
            />
        </>
    );
}

CategoriesIndex.layout = {
    breadcrumbs: [
        {
            title: 'Kategori',
            href: categoriesIndex(),
        },
    ],
};
