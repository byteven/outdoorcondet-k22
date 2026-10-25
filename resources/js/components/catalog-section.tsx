import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import {
    BoxIcon,
    PackageIcon,
    PackageOpenIcon,
    SearchXIcon,
    TagsIcon,
    XIcon,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
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
    available: number | null;
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
    available: number | null;
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
    pickup_date?: string;
    return_date?: string;
};

const PER_PAGE_OPTIONS = [24, 48];

type TabContent = {
    gridColumnClass: string;
    skeletonCount: number;
    searchPlaceholder: string;
    searchAriaLabel: string;
    itemLabel: string;
    emptyIcon: LucideIcon;
    filteredEmptyIcon: LucideIcon;
    emptyTitle: string;
    filteredEmptyTitle: string;
    emptyDescription: string;
    filteredEmptyDescription: string;
};

const TAB_CONTENT: Record<CatalogFilters['tab'], TabContent> = {
    alat: {
        gridColumnClass: 'lg:grid-cols-3 xl:grid-cols-4',
        skeletonCount: 8,
        searchPlaceholder: 'Cari alat...',
        searchAriaLabel: 'Cari alat',
        itemLabel: 'alat',
        emptyIcon: PackageIcon,
        filteredEmptyIcon: SearchXIcon,
        emptyTitle: 'Belum ada alat',
        filteredEmptyTitle: 'Alat tidak ditemukan',
        emptyDescription:
            'Katalog perlengkapan akan tampil di sini setelah produk ditambahkan.',
        filteredEmptyDescription:
            'Coba kata kunci lain atau pilih kategori yang berbeda.',
    },
    bundle: {
        gridColumnClass: 'lg:grid-cols-3',
        skeletonCount: 6,
        searchPlaceholder: 'Cari Paket...',
        searchAriaLabel: 'Cari Paket',
        itemLabel: 'bundle',
        emptyIcon: PackageOpenIcon,
        filteredEmptyIcon: SearchXIcon,
        emptyTitle: 'Belum ada paket',
        filteredEmptyTitle: 'Paket tidak ditemukan',
        emptyDescription: 'Paket akan tampil di sini setelah ditambahkan.',
        filteredEmptyDescription:
            'Coba kata kunci lain untuk menemukan paket yang cocok.',
    },
};

const SEARCH_DEBOUNCE_MS = 500;

export function CatalogSection({
    catalog,
    filters,
    onFilterChange,
    loading = false,
}: {
    catalog: CatalogData;
    filters: CatalogFilters;
    onFilterChange: (
        params: Partial<CatalogFilters> & { page?: number },
    ) => void;
    loading?: boolean;
}) {
    const [search, setSearch] = useState(filters.search);
    const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
    const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(
        () => () => {
            if (searchTimer.current) {
                clearTimeout(searchTimer.current);
            }
        },
        [],
    );

    const content = TAB_CONTENT[filters.tab];
    const isFiltering = filters.search !== '' || filters.category !== null;

    const handleSearchChange = (value: string) => {
        setSearch(value);

        if (searchTimer.current) {
            clearTimeout(searchTimer.current);
        }

        searchTimer.current = setTimeout(() => {
            onFilterChange({ search: value, page: 1 });
        }, SEARCH_DEBOUNCE_MS);
    };

    const handleTabChange = (tab: CatalogFilters['tab']) => {
        setSearch('');
        onFilterChange({ tab, search: '', category: null, page: 1 });
    };

    const handleCategoryChange = (id: number) => {
        const next = filters.category === id ? null : id;
        onFilterChange({ category: next, page: 1 });
        setCategoryDialogOpen(false);
    };

    const resetFilters = () => {
        setSearch('');
        onFilterChange({ search: '', category: null, page: 1 });
    };

    return (
        <div>
            <div className="mt-8 flex md:w-fit w-full items-center justify-evenly gap-1 rounded-full border border-border bg-background p-2">
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

            {filters.tab === 'alat' && catalog.categories.length > 0 && (
                <CategoryFilter
                    categories={catalog.categories}
                    activeCategoryId={filters.category}
                    open={categoryDialogOpen}
                    onOpenChange={setCategoryDialogOpen}
                    onCategoryChange={handleCategoryChange}
                />
            )}

            <div className="mt-4">
                <SearchInput
                    value={search}
                    onChange={handleSearchChange}
                    placeholder={content.searchPlaceholder}
                    ariaLabel={content.searchAriaLabel}
                    className="w-full rounded-full [&_input]:rounded-full"
                />
            </div>

            {filters.tab === 'alat' ? (
                <CatalogGrid
                    content={content}
                    items={catalog.products}
                    loading={loading}
                    isFiltering={isFiltering}
                    onResetFilters={resetFilters}
                    renderItem={(product) => (
                        <CatalogCard
                            key={product.id}
                            image={product.image}
                            name={product.name}
                            dailyPrice={product.daily_price}
                            badge={product.category?.name}
                            stock={product.stock}
                            available={product.available}
                            fallbackIcon={
                                <PackageIcon
                                    className="size-10 text-muted-foreground/40"
                                    strokeWidth={1.5}
                                />
                            }
                        />
                    )}
                />
            ) : (
                <CatalogGrid
                    content={content}
                    items={catalog.packages}
                    loading={loading}
                    isFiltering={isFiltering}
                    onResetFilters={resetFilters}
                    renderItem={(pkg) => (
                        <CatalogCard
                            key={pkg.id}
                            image={pkg.image}
                            name={pkg.name}
                            dailyPrice={pkg.daily_price}
                            available={pkg.available}
                            fallbackIcon={
                                <PackageOpenIcon
                                    className="size-10 text-muted-foreground/40"
                                    strokeWidth={1.5}
                                />
                            }
                        />
                    )}
                />
            )}

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
                        itemLabel={content.itemLabel}
                        onPage={(page) => onFilterChange({ page })}
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

type CategoryFilterProps = {
    categories: CatalogCategory[];
    activeCategoryId: number | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCategoryChange: (id: number) => void;
};

const DRAG_START_THRESHOLD_PX = 6;

type ScrollDragState = {
    isDragging: boolean;
    pointerId: number;
    startX: number;
    startScrollLeft: number;
    hasMoved: boolean;
};

function CategoryFilter({
    categories,
    activeCategoryId,
    open,
    onOpenChange,
    onCategoryChange,
}: CategoryFilterProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const dragState = useRef<ScrollDragState>({
        isDragging: false,
        pointerId: -1,
        startX: 0,
        startScrollLeft: 0,
        hasMoved: false,
    });
    const [isDragging, setIsDragging] = useState(false);

    useEffect(() => {
        requestAnimationFrame(() => {
            scrollRef.current
                ?.querySelector<HTMLElement>('[data-active="true"]')
                ?.scrollIntoView({
                    behavior: 'smooth',
                    inline: 'center',
                    block: 'nearest',
                });
        });
    }, [activeCategoryId, open, categories]);

    useEffect(() => {
        const container = scrollRef.current;
        if (!container) {
            return;
        }

        const handleWheel = (event: WheelEvent) => {
            if (
                event.deltaY === 0 ||
                container.scrollWidth <= container.clientWidth
            ) {
                return;
            }

            event.preventDefault();
            container.scrollLeft += event.deltaY;
        };

        container.addEventListener('wheel', handleWheel, { passive: false });

        return () => container.removeEventListener('wheel', handleWheel);
    }, []);

    const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
        if (event.button !== 0 || event.pointerType !== 'mouse') {
            return;
        }

        const container = scrollRef.current;
        if (!container) {
            return;
        }

        dragState.current = {
            isDragging: true,
            pointerId: event.pointerId,
            startX: event.clientX,
            startScrollLeft: container.scrollLeft,
            hasMoved: false,
        };
        setIsDragging(true);
    };

    const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
        const container = scrollRef.current;
        if (!container || !dragState.current.isDragging) {
            return;
        }

        const delta = event.clientX - dragState.current.startX;

        if (
            !dragState.current.hasMoved &&
            Math.abs(delta) > DRAG_START_THRESHOLD_PX
        ) {
            dragState.current.hasMoved = true;
            container.setPointerCapture(event.pointerId);
        }

        if (dragState.current.hasMoved) {
            container.scrollLeft = dragState.current.startScrollLeft - delta;
        }
    };

    const handlePointerEnd = () => {
        dragState.current.isDragging = false;
        setIsDragging(false);
    };

    const handleClickCapture = (event: React.MouseEvent<HTMLDivElement>) => {
        if (!dragState.current.hasMoved) {
            return;
        }

        dragState.current.hasMoved = false;
        event.preventDefault();
        event.stopPropagation();
    };

    return (
        <div className="mt-4 flex items-center gap-0">
            <div className="relative min-w-0 flex-1 overflow-hidden">
                <div
                    ref={scrollRef}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerEnd}
                    onPointerCancel={handlePointerEnd}
                    onClickCapture={handleClickCapture}
                    className={cn(
                        '-mx-4 [scrollbar-width:none] overflow-x-auto px-4 pb-1 md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden',
                        isDragging
                            ? 'cursor-grabbing select-none'
                            : 'cursor-grab',
                    )}
                >
                    <div className="flex w-max gap-2 pr-12">
                        {categories.map((category) => (
                            <CategoryPill
                                key={category.id}
                                active={activeCategoryId === category.id}
                                onClick={() => onCategoryChange(category.id)}
                            >
                                {category.name}
                            </CategoryPill>
                        ))}
                    </div>
                </div>
                <div className="pointer-events-none absolute inset-y-0 right-0 w-14 bg-gradient-to-l from-[#fbfbfc] to-transparent" />
            </div>

            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogTrigger asChild>
                    <button
                        type="button"
                        className="ml-2 flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border-none px-2.5 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/40 sm:px-3"
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
                        {categories.map((category) => (
                            <CategoryPill
                                key={category.id}
                                active={activeCategoryId === category.id}
                                onClick={() => onCategoryChange(category.id)}
                            >
                                {category.name}
                            </CategoryPill>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

type GridItem = {
    id: number;
};

type CatalogGridProps<T extends GridItem> = {
    content: TabContent;
    items: T[] | null;
    loading: boolean;
    isFiltering: boolean;
    onResetFilters: () => void;
    renderItem: (item: T) => ReactNode;
};

function CatalogGrid<T extends GridItem>({
    content,
    items,
    loading,
    isFiltering,
    onResetFilters,
    renderItem,
}: CatalogGridProps<T>) {
    const EmptyIcon = isFiltering
        ? content.filteredEmptyIcon
        : content.emptyIcon;

    return (
        <div className="mt-6">
            {loading ? (
                <div
                    className={cn(
                        'grid grid-cols-2 gap-3 sm:gap-4',
                        content.gridColumnClass,
                    )}
                >
                    {Array.from(
                        { length: content.skeletonCount },
                        (_, index) => (
                            <CatalogCardSkeleton key={index} />
                        ),
                    )}
                </div>
            ) : !items || items.length === 0 ? (
                <EmptyState
                    icon={EmptyIcon}
                    title={
                        isFiltering
                            ? content.filteredEmptyTitle
                            : content.emptyTitle
                    }
                    description={
                        isFiltering
                            ? content.filteredEmptyDescription
                            : content.emptyDescription
                    }
                    action={
                        isFiltering ? (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={onResetFilters}
                            >
                                Reset filter
                            </Button>
                        ) : undefined
                    }
                    className="rounded-2xl border border-dashed border-border/70"
                />
            ) : (
                <div
                    className={cn(
                        'grid grid-cols-2 gap-3 sm:gap-4',
                        content.gridColumnClass,
                    )}
                >
                    {items.map(renderItem)}
                </div>
            )}
        </div>
    );
}

export function CatalogSkeleton() {
    return (
        <div aria-hidden="true">
            <div className="mt-8 flex items-center gap-3">
                <Skeleton className="h-10 w-24 rounded-xl bg-muted" />
                <Skeleton className="h-10 w-24 rounded-xl bg-muted" />
            </div>

            <div className="mt-4 flex gap-2 overflow-hidden">
                {[0, 1, 2, 3, 4].map((item) => (
                    <Skeleton
                        key={item}
                        className="h-9 w-20 shrink-0 rounded-full bg-muted"
                    />
                ))}
            </div>

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
    icon: ReactNode;
    onClick: () => void;
    children: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className={cn(
                'flex cursor-pointer w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold',
                active
                    ? 'bg-primary text-background'
                    : 'text-muted-foreground hover:border-foreground/30 hover:text-foreground',
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
            data-active={active}
            className={cn(
                'flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium',
                active
                    ? 'border-primary bg-primary text-white'
                    : 'text-muted-foreground hover:border-primary/40 hover:text-primary',
            )}
        >
            {children}
            {active && <XIcon className="size-3.5" strokeWidth={2.5} />}
        </button>
    );
}

type CatalogCardProps = {
    image: string | null;
    name: string;
    dailyPrice: number;
    badge?: string;
    available?: number | null;
    stock?: number;
    fallbackIcon: ReactNode;
};

function CatalogCard({
    image,
    name,
    dailyPrice,
    badge,
    available,
    stock,
    fallbackIcon,
}: CatalogCardProps) {
    const isUnavailable = available === 0 || stock === 0;

    return (
        <article
            className={cn(
                'group flex flex-col overflow-hidden rounded-[1.25rem] border border-border/20 bg-card p-2 transition-opacity',
                isUnavailable && 'opacity-50',
            )}
        >
            <div className="relative aspect-[4/3] cursor-pointer overflow-hidden rounded-[1rem] bg-muted">
                {image ? (
                    <img
                        src={`/storage/${image}`}
                        alt={name}
                        loading="lazy"
                        className={cn(
                            'size-full object-cover transition-all',
                            isUnavailable && 'grayscale',
                        )}
                    />
                ) : (
                    <div className="flex size-full items-center justify-center">
                        {fallbackIcon}
                    </div>
                )}

                {isUnavailable && (
                    <span className="absolute bottom-3 left-4 rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-white">
                        Tidak Tersedia
                    </span>
                )}
            </div>

            <div className="flex flex-1 flex-col gap-1.5 px-2 pt-2.5 pb-2">
                <div className="flex flex-col">
                    {badge && (
                        <span className="w-fit shrink-0 rounded-full py-0.5 text-[10px] font-medium text-muted-foreground">
                            {badge}
                        </span>
                    )}
                    <h3 className="line-clamp-1 font-semibold">{name}</h3>
                </div>
                <p className="text-sm font-semibold text-primary">
                    {formatRupiah(dailyPrice)}
                    <span className="text-xs font-normal text-muted-foreground">
                        {' '}
                        / hari
                    </span>
                </p>
            </div>
        </article>
    );
}

function CatalogCardSkeleton() {
    return (
        <div className="overflow-hidden rounded-[1.25rem] border border-border/20 bg-card p-2">
            <Skeleton className="aspect-[4/3] w-full rounded-[1rem] bg-muted" />
            <div className="space-y-2 px-2 pt-2.5 pb-2">
                <Skeleton className="h-3 w-1/3 bg-muted" />
                <Skeleton className="h-4 w-3/4 bg-muted" />
                <Skeleton className="h-4 w-2/5 bg-muted" />
            </div>
        </div>
    );
}
