import {
    BoxIcon,
    PackageIcon,
    PackageOpenIcon,
    SearchXIcon,
    TagsIcon,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { DataTablePagination } from '@/components/data-table-pagination';
import { EmptyState } from '@/components/empty-state';
import { formatRupiah } from '@/components/product-shared';
import { SearchInput } from '@/components/search-input';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export type CatalogCategory = {
    id: number;
    name: string;
};

export type CatalogProduct = {
    id: number;
    name: string;
    description: string | null;
    category: CatalogCategory | null;
    image: string | null;
    daily_price: number;
    deposit_per_unit: number;
    stock: number;
};

export type CatalogPackageItem = {
    name: string;
    quantity: number;
};

export type CatalogPackage = {
    id: number;
    name: string;
    description: string | null;
    image: string | null;
    daily_price: number;
    deposit_per_package: number;
    item_count: number;
    items: CatalogPackageItem[];
};

export type CatalogPagination = {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
};

export type CatalogData = {
    categories: CatalogCategory[];
    products: CatalogProduct[] | null;
    packages: CatalogPackage[] | null;
    pagination: CatalogPagination;
};

export type CatalogFilters = {
    tab: 'alat' | 'bundle';
    search: string;
    category: number | null;
    page: number;
    per_page: number;
};

const PER_PAGE_OPTIONS = [24, 48];

export function CatalogSection({
    catalog,
    filters,
    onFilterChange,
    loading = false,
}: {
    catalog: CatalogData;
    filters: CatalogFilters;
    onFilterChange: (params: Partial<CatalogFilters> & { page?: number }) => void;
    loading?: boolean;
}) {
    const [search, setSearch] = useState(filters.search);
    const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
    const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pillsRef = useRef<HTMLDivElement>(null);

    const hasOverflow = catalog.categories.length > 5;

    const handleSearchChange = (value: string) => {
        setSearch(value);
        if (searchTimer.current) {
            clearTimeout(searchTimer.current);
        }
        searchTimer.current = setTimeout(() => {
            onFilterChange({ search: value, page: 1 });
        }, 500);
    };

    const handleTabChange = (tab: 'alat' | 'bundle') => {
        setSearch('');
        onFilterChange({ tab, search: '', category: null, page: 1 });
    };

    const handleCategoryChange = (id: number | null) => {
        onFilterChange({ category: id, page: 1 });
        setCategoryDialogOpen(false);
    };

    const isFiltering = filters.search !== '' || filters.category !== null;

    const resetFilters = () => {
        setSearch('');
        onFilterChange({ search: '', category: null, page: 1 });
    };

    return (
        <div>
            {/* Tab picker: Alat / Bundle */}
            <div className="mt-8 flex items-center gap-1 bg-background p-2 border boder-border w-fit rounded-full">
                <TabButton
                    active={filters.tab === 'alat'}
                    icon={<BoxIcon className="size-4" />}
                    onClick={() => handleTabChange('alat')}
                >
                    Alat
                </TabButton>
                <TabButton
                    active={filters.tab === 'bundle'}
                    icon={<PackageOpenIcon className="size-4" />}
                    onClick={() => handleTabChange('bundle')}
                >
                    Paket
                </TabButton>
            </div>

            {/* Category filter pills (alat only) */}
            {filters.tab === 'alat' && catalog.categories.length > 0 && (
                <div className="mt-4 flex items-center gap-0">
                    <div className="relative min-w-0 flex-1 overflow-hidden">
                        <div
                            ref={pillsRef}
                            className="-mx-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden"
                        >
                            <div className="flex w-max gap-2 pr-12">
                                <CategoryPill
                                    active={filters.category === null}
                                    onClick={() => handleCategoryChange(null)}
                                >
                                    Semua
                                </CategoryPill>
                                {catalog.categories.map((category) => (
                                    <CategoryPill
                                        key={category.id}
                                        active={filters.category === category.id}
                                        onClick={() =>
                                            handleCategoryChange(category.id)
                                        }
                                    >
                                        {category.name}
                                    </CategoryPill>
                                ))}
                            </div>
                        </div>
                        <div className="pointer-events-none absolute inset-y-0 right-0 w-14 bg-gradient-to-l from-[#fbfbfc] to-transparent" />
                    </div>

                    <Dialog
                        open={categoryDialogOpen}
                        onOpenChange={setCategoryDialogOpen}
                    >
                        <DialogTrigger asChild>
                            <button
                                type="button"
                                className="ml-2 flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-border border-none px-2.5 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/40 sm:px-3"
                                aria-label="Lihat semua kategori"
                            >
                                <TagsIcon className="size-5 text-primary" />
                                <span className="hidden sm:inline">Lihat semua</span>
                            </button>
                        </DialogTrigger>
                        <DialogContent className="max-w-sm">
                            <DialogHeader>
                                <DialogTitle>Pilih kategori</DialogTitle>
                            </DialogHeader>
                            <div className="flex flex-wrap gap-2 pt-2">
                                <CategoryPill
                                    active={filters.category === null}
                                    onClick={() =>
                                        handleCategoryChange(null)
                                    }
                                >
                                    Semua
                                </CategoryPill>
                                {catalog.categories.map((category) => (
                                    <CategoryPill
                                        key={category.id}
                                        active={
                                            filters.category === category.id
                                        }
                                        onClick={() =>
                                            handleCategoryChange(category.id)
                                        }
                                    >
                                        {category.name}
                                    </CategoryPill>
                                ))}
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            )}

            {/* Search */}
            <div className="mt-4">
                <SearchInput
                    value={search}
                    onChange={handleSearchChange}
                    placeholder={
                        filters.tab === 'alat'
                            ? 'Cari alat...'
                            : 'Cari Paket...'
                    }
                    ariaLabel={
                        filters.tab === 'alat' ? 'Cari alat' : 'Cari Paket'
                    }
                    className="w-full rounded-full [&_input]:rounded-full"
                />
            </div>

            {/* Product grid */}
            {filters.tab === 'alat' && (
                <div className="mt-6">
                    {loading ? (
                        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
                            {[0, 1, 2, 3, 4, 5, 6, 7].map((item) => (
                                <div
                                    key={item}
                                    className="overflow-hidden rounded-[1.25rem] bg-card p-2"
                                >
                                    <Skeleton className="aspect-[4/3] w-full rounded-[1rem] bg-muted" />
                                    <div className="space-y-2 px-2 pt-2.5 pb-2">
                                        <Skeleton className="h-4 w-3/4 bg-muted" />
                                        <Skeleton className="h-4 w-1/3 bg-muted" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : !catalog.products || catalog.products.length === 0 ? (
                        <EmptyState
                            icon={isFiltering ? SearchXIcon : PackageIcon}
                            title={
                                isFiltering
                                    ? 'Alat tidak ditemukan'
                                    : 'Belum ada alat'
                            }
                            description={
                                isFiltering
                                    ? 'Coba kata kunci lain atau pilih kategori yang berbeda.'
                                    : 'Katalog perlengkapan akan tampil di sini setelah produk ditambahkan.'
                            }
                            action={
                                isFiltering ? (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={resetFilters}
                                    >
                                        Reset filter
                                    </Button>
                                ) : undefined
                            }
                            className="rounded-2xl border border-dashed border-border/70"
                        />
                    ) : (
                        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
                            {catalog.products.map((product) => (
                                <ProductCard
                                    key={product.id}
                                    product={product}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Paket grid */}
            {filters.tab === 'bundle' && (
                <div className="mt-6">
                    {loading ? (
                        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
                            {[0, 1, 2, 3, 4, 5].map((item) => (
                                <div
                                    key={item}
                                    className="overflow-hidden rounded-[1.25rem] bg-card p-2"
                                >
                                    <Skeleton className="aspect-[4/3] w-full rounded-[1rem] bg-muted" />
                                    <div className="space-y-2 px-2 pt-2.5 pb-2">
                                        <Skeleton className="h-4 w-3/4 bg-muted" />
                                        <Skeleton className="h-4 w-2/3 bg-muted" />
                                        <Skeleton className="h-4 w-1/3 bg-muted" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : !catalog.packages || catalog.packages.length === 0 ? (
                        <EmptyState
                            icon={
                                isFiltering ? SearchXIcon : PackageOpenIcon
                            }
                            title={
                                isFiltering
                                    ? 'Paket tidak ditemukan'
                                    : 'Belum ada paket'
                            }
                            description={
                                isFiltering
                                    ? 'Coba kata kunci lain untuk menemukan paket yang cocok.'
                                    : 'Paket akan tampil di sini setelah ditambahkan.'
                            }
                            action={
                                isFiltering ? (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={resetFilters}
                                    >
                                        Reset filter
                                    </Button>
                                ) : undefined
                            }
                            className="rounded-2xl border border-dashed border-border/70"
                        />
                    ) : (
                        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
                            {catalog.packages.map((item) => (
                                <PackageCard key={item.id} item={item} />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Pagination */}
            {catalog.pagination.total > 0 && (
                <div className="mt-6 border-t border-border/60 pt-4">
                    <DataTablePagination
                        currentPage={catalog.pagination.current_page}
                        lastPage={catalog.pagination.last_page}
                        perPage={String(catalog.pagination.per_page)}
                        perPageOptions={PER_PAGE_OPTIONS}
                        total={catalog.pagination.total}
                        from={catalog.pagination.from}
                        to={catalog.pagination.to}
                        itemLabel={
                            filters.tab === 'alat' ? 'alat' : 'bundle'
                        }
                        onPage={(p) => onFilterChange({ page: p })}
                        onPerPageChange={(value) =>
                            onFilterChange({
                                per_page: parseInt(value, 10),
                                page: 1,
                            })
                        }
                    />
                </div>
            )}
        </div>
    );
}

export function CatalogSkeleton() {
    return (
        <div aria-hidden="true">
            {/* Tab picker skeleton */}
            <div className="mt-8 flex items-center gap-3">
                <Skeleton className="h-10 w-24 rounded-xl bg-muted" />
                <Skeleton className="h-10 w-24 rounded-xl bg-muted" />
            </div>

            {/* Category pills skeleton */}
            <div className="mt-4 flex gap-2 overflow-hidden">
                {[0, 1, 2, 3, 4].map((item) => (
                    <Skeleton
                        key={item}
                        className="h-9 w-20 shrink-0 rounded-full bg-muted"
                    />
                ))}
            </div>

            {/* Search skeleton */}
            <div className="mt-4">
                <Skeleton className="h-9 w-full rounded-full bg-muted" />
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {[0, 1, 2, 3, 4, 5, 6, 7].map((item) => (
                    <div
                        key={item}
                        className="overflow-hidden rounded-2xl border border-border/70 bg-card"
                    >
                        <Skeleton className="aspect-[4/3] w-full rounded-none bg-muted" />
                        <div className="space-y-2 p-4">
                            <Skeleton className="h-4 w-3/4 bg-muted" />
                            <Skeleton className="h-4 w-1/3 bg-muted" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function TabButton({
    active,
    icon,
    onClick,
    children,
}: {
    active: boolean;
    icon: React.ReactNode;
    onClick: () => void;
    children: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className={cn(
                'flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition-colors',
                active
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-border/70 bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground',
            )}
        >
            {icon}
            {children}
        </button>
    );
}

function CategoryPill({
    active,
    onClick,
    children,
}: {
    active: boolean;
    onClick: () => void;
    children: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className={cn(
                'shrink-0 cursor-pointer rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                active
                    ? 'border-primary bg-primary text-white'
                    : 'text-muted-foreground hover:text-primary hover:border-primary/40',
            )}
        >
            {children}
        </button>
    );
}

function ProductCard({ product }: { product: CatalogProduct }) {
    return (
        <article className="group flex flex-col overflow-hidden rounded-[1.25rem] bg-card p-2 border border-border/20">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[1rem] bg-muted">
                {product.image ? (
                    <>
                        <img
                            src={`/storage/${product.image}`}
                            alt={product.name}
                            loading="lazy"
                            className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                        />
                    </>
                ) : (
                    <div className="flex size-full items-center justify-center">
                        <PackageIcon
                            className="size-10 text-muted-foreground/40"
                            strokeWidth={1.5}
                        />
                    </div>
                )}
            </div>

            <div className="flex flex-1 flex-col gap-1.5 px-2 pt-2.5 pb-2">
                <div className="flex flex-col">
                    {product.category && (
                        <span className="shrink-0 rounded-full w-fit py-0.5 text-[10px] font-medium text-muted-foreground">
                            {product.category.name}
                        </span>
                    )}
                    <h3 className="line-clamp-1 font-semibold">{product.name}</h3>
                </div>
                <p className="text-sm font-semibold text-primary">
                    {formatRupiah(product.daily_price)}
                    <span className="text-xs font-normal text-muted-foreground">
                        {' '}
                        / hari
                    </span>
                </p>
            </div>
        </article>
    );
}

function PackageCard({ item }: { item: CatalogPackage }) {
    return (
        <article className="group flex flex-col overflow-hidden rounded-[1.25rem] bg-card p-2 border border-border/20">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[1rem] bg-muted">
                {item.image ? (
                    <>
                        <img
                            src={`/storage/${item.image}`}
                            alt={item.name}
                            loading="lazy"
                            className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                        />
                    </>
                ) : (
                    <div className="flex size-full items-center justify-center">
                        <PackageOpenIcon
                            className="size-10 text-muted-foreground/40"
                            strokeWidth={1.5}
                        />
                    </div>
                )}
            </div>

            <div className="flex flex-1 flex-col gap-1.5 px-2 pt-2.5 pb-2">
                <h3 className="line-clamp-1 font-semibold">{item.name}</h3>
                <p className="text-sm font-semibold text-primary">
                    {formatRupiah(item.daily_price)}
                    <span className="text-xs font-normal text-muted-foreground">
                        {' '}
                        / hari
                    </span>
                </p>
            </div>
        </article>
    );
}
