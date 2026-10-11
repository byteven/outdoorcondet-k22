import { Head, router } from '@inertiajs/react';
import {
    ChevronRight,
    Power,
    UserCheck,
    UserSearch,
    UserX,
    Users,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { DataTablePagination } from '@/components/data-table-pagination';
import { EmptyState } from '@/components/empty-state';
import { UserAvatar } from '@/components/user-avatar';
import { CustomerFormDialog } from '@/components/customer-form-dialog';
import { CustomerProfileDialog } from '@/components/customer-profile-dialog';
import { SearchInput } from '@/components/search-input';
import { SortButton } from '@/components/sort-button';
import { SummaryCards, type SummaryCardItem } from '@/components/summary-cards';
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
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { index as customersIndex } from '@/routes/admin/customers';

type CustomerRow = {
    id: number;
    identity_number: string | null;
    identity_card_path: string | null;
    identity_card_url: string | null;
    phone_number: string;
    address: string | null;
    is_verified: boolean;
    is_active: boolean;
    created_at: string | null;
    user: {
        id: number;
        name: string;
        email: string;
    };
};

type PaginatedCustomers = {
    data: CustomerRow[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
};

type CustomerSummary = {
    total: number;
    active: number;
    inactive: number;
};

type SortColumn = 'name' | 'email' | 'created_at';
type SortDir = 'asc' | 'desc';

type CustomerFilters = {
    search: string;
    status: 'all' | 'active' | 'inactive';
    per_page: number;
    sort_by: SortColumn;
    sort_dir: SortDir;
};

type Props = {
    customers: PaginatedCustomers;
    summary: CustomerSummary;
    filters: CustomerFilters;
};

const PER_PAGE_OPTIONS = [10, 15, 25, 50];
const COLUMN_COUNT = 6;

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

export default function CustomersIndex({ customers, summary, filters }: Props) {
    const [search, setSearch] = useState(filters.search);
    const [status, setStatus] = useState<CustomerFilters['status']>(filters.status);
    const [perPage, setPerPage] = useState(String(filters.per_page));
    const [sortBy, setSortBy] = useState<SortColumn>(filters.sort_by);
    const [sortDir, setSortDir] = useState<SortDir>(filters.sort_dir);
    const [preview, setPreview] = useState<CustomerRow | null>(null);
    const [loading, setLoading] = useState(false);
    const firstRender = useRef(true);

    useEffect(() => {
        if (!preview) {
            return;
        }

        const fresh = customers.data.find((customer) => customer.id === preview.id);

        if (!fresh) {
            setPreview(null);

            return;
        }

        if (fresh !== preview) {
            setPreview(fresh);
        }
    }, [customers, preview]);

    const reload = (params: Record<string, string | number>) => {
        router.get(
            customersIndex(),
            {
                search,
                status,
                per_page: perPage,
                sort_by: sortBy,
                sort_dir: sortDir,
                ...params,
            },
            {
                preserveState: true,
                replace: true,
                only: ['customers', 'filters', 'summary'],
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
            label: 'Total pelanggan',
            value: summary.total,
            icon: Users,
            iconClass:
                'bg-info bg-[radial-gradient(circle_at_50%_0%,rgb(255_255_255/0.45),transparent_80%)] text-primary-foreground',
        },
        {
            key: 'active',
            label: 'Pelanggan aktif',
            value: summary.active,
            icon: UserCheck,
            iconClass:
                'bg-success bg-[radial-gradient(circle_at_50%_0%,rgb(255_255_255/0.45),transparent_80%)] text-primary-foreground',
        },
        {
            key: 'inactive',
            label: 'Pelanggan nonaktif',
            value: summary.inactive,
            icon: UserX,
            iconClass:
                'bg-destructive bg-[radial-gradient(circle_at_50%_0%,rgb(255_255_255/0.45),transparent_80%)] text-primary-foreground',
        },
    ];

    return (
        <>
            <Head title="Pelanggan" />
            <div className="flex h-full flex-1 flex-col gap-6 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Pelanggan</h1>
                        <p className="text-sm text-muted-foreground">
                            Kelola pelangganmu
                        </p>
                    </div>
                    <CustomerFormDialog />
                </div>

                <SummaryCards items={summaryItems} />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_192px]">
                    <SearchInput
                        value={search}
                        onChange={setSearch}
                        placeholder="Cari nama, email, atau telepon..."
                        ariaLabel="Cari pelanggan"
                        className="sm:col-span-2 lg:col-span-1"
                    />
                    <Select
                        value={status}
                        onValueChange={(value) => {
                            const next = value as CustomerFilters['status'];
                            setStatus(next);
                            reload({ status: next });
                        }}
                    >
                        <SelectTrigger aria-label="Filter status" className="w-full">
                            <Power className="size-4 text-muted-foreground" />
                            <SelectValue placeholder="Status" />
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
                            aria-label="Memuat data pelanggan"
                        />
                    )}
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>
                                    <SortButton
                                        label="Pelanggan"
                                        active={sortBy === 'name'}
                                        direction={sortDir}
                                        onClick={() => handleSort('name')}
                                    />
                                </TableHead>
                                <TableHead>
                                    <SortButton
                                        label="Email"
                                        active={sortBy === 'email'}
                                        direction={sortDir}
                                        onClick={() => handleSort('email')}
                                    />
                                </TableHead>
                                <TableHead>Telepon</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>
                                    <SortButton
                                        label="Terdaftar"
                                        active={sortBy === 'created_at'}
                                        direction={sortDir}
                                        onClick={() => handleSort('created_at')}
                                    />
                                </TableHead>
                                <TableHead>
                                    <span className="sr-only">Aksi</span>
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                Array.from({ length: Number(perPage) }).map((_, row) => (
                                    <TableRow key={row} className="[&>td]:py-3">
                                        {Array.from({ length: COLUMN_COUNT }).map((__, cell) => (
                                            <TableCell key={cell}>
                                                <Skeleton className="h-4 w-full bg-muted" />
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : customers.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={COLUMN_COUNT}>
                                        <EmptyState
                                            icon={UserSearch}
                                            title="Belum ada data pelanggan"
                                            description={
                                                hasSearch
                                                    ? 'Coba ubah kata kunci pencarian.'
                                                    : 'Data pelanggan akan tampil di sini setelah ada pendaftar.'
                                            }
                                        />
                                    </TableCell>
                                </TableRow>
                            ) : (
                                customers.data.map((customer) => (
                                    <TableRow key={customer.id} className="[&>td]:py-3">
                                        <TableCell>
                                            <button
                                                type="button"
                                                onClick={() => setPreview(customer)}
                                                aria-label={`Lihat profil ${customer.user.name}`}
                                                className="flex cursor-pointer items-center gap-2 rounded-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                            >
                                                <UserAvatar name={customer.user.name} />
                                                <span className="font-medium hover:text-primary hover:underline hover:underline-offset-4">
                                                    {customer.user.name}
                                                </span>
                                            </button>
                                        </TableCell>
                                        <TableCell>{customer.user.email}</TableCell>
                                        <TableCell>{customer.phone_number}</TableCell>
                                        <TableCell>
                                            <span className="inline-flex items-center gap-1.5 text-sm">
                                                <span
                                                    aria-hidden="true"
                                                    className={
                                                        customer.is_active
                                                            ? 'size-2 rounded-full bg-success'
                                                            : 'size-2 rounded-full bg-destructive'
                                                    }
                                                />
                                                {customer.is_active ? 'Aktif' : 'Nonaktif'}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            {formatDate(customer.created_at)}
                                        </TableCell>
                                        <TableCell>
                                            <Tooltip delayDuration={500}>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setPreview(customer)}
                                                    >
                                                        <ChevronRight />
                                                        <span className="sr-only">
                                                            {customer.user.name}
                                                        </span>
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent className="pointer-events-none">
                                                    Kelola Data
                                                </TooltipContent>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                <DataTablePagination
                    currentPage={customers.current_page}
                    lastPage={customers.last_page}
                    perPage={perPage}
                    perPageOptions={PER_PAGE_OPTIONS}
                    total={customers.total}
                    from={customers.from}
                    to={customers.to}
                    itemLabel="pelanggan"
                    loading={loading}
                    onPage={goToPage}
                    onPerPageChange={(value) => {
                        setPerPage(value);
                        reload({ per_page: value });
                    }}
                />
            </div>

            <CustomerProfileDialog customer={preview} onClose={() => setPreview(null)} />
        </>
    );
}

CustomersIndex.layout = {
    breadcrumbs: [
        {
            title: 'Pelanggan',
            href: customersIndex(),
        },
    ],
};
