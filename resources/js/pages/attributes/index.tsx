import { Head, router } from "@inertiajs/react";
import { ChevronRight, SlidersHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AttributeDetailDialog, type AttributeRow } from "@/components/attribute-detail-dialog";
import { AttributeFormDialog } from "@/components/attribute-form-dialog";
import { DataTablePagination } from "@/components/data-table-pagination";
import { EmptyState } from "@/components/empty-state";
import { SearchInput } from "@/components/search-input";
import { SortButton } from "@/components/sort-button";
import { SummaryCards, type SummaryCardItem } from "@/components/summary-cards";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { index as attributesIndex } from "@/routes/admin/attributes";

type PaginatedAttributes = {
    data: AttributeRow[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
};

type AttributeSummary = {
    total: number;
};

type SortColumn = "name" | "created_at";
type SortDir = "asc" | "desc";

type AttributeFilters = {
    search: string;
    per_page: number;
    sort_by: SortColumn;
    sort_dir: SortDir;
};

type Props = {
    attributes: PaginatedAttributes;
    summary: AttributeSummary;
    filters: AttributeFilters;
};

const PER_PAGE_OPTIONS = [10, 15, 25, 50];
const COLUMN_COUNT = 4;

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
});

function formatDate(value: string | null): string {
    if (!value) {
        return "-";
    }

    return dateFormatter.format(new Date(value));
}

export default function AttributesIndex({ attributes, summary, filters }: Props) {
    const [search, setSearch] = useState(filters.search);
    const [perPage, setPerPage] = useState(String(filters.per_page));
    const [sortBy, setSortBy] = useState<SortColumn>(filters.sort_by);
    const [sortDir, setSortDir] = useState<SortDir>(filters.sort_dir);
    const [preview, setPreview] = useState<AttributeRow | null>(null);
    const [loading, setLoading] = useState(false);
    const firstRender = useRef(true);

    useEffect(() => {
        if (!preview) {
            return;
        }

        const fresh = attributes.data.find((attribute) => attribute.id === preview.id);

        if (!fresh) {
            setPreview(null);
            return;
        }

        if (fresh !== preview) {
            setPreview(fresh);
        }
    }, [attributes, preview]);

    const reload = (params: Record<string, string | number>) => {
        router.get(
            attributesIndex(),
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
                only: ["attributes", "filters", "summary"],
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

    const hasSearch = search !== "";

    const handleSort = (column: SortColumn) => {
        if (sortBy !== column) {
            const nextDir: SortDir = column === "created_at" ? "desc" : "asc";
            setSortBy(column);
            setSortDir(nextDir);
            reload({ sort_by: column, sort_dir: nextDir });
            return;
        }

        if (sortDir === "asc") {
            setSortDir("desc");
            reload({ sort_by: column, sort_dir: "desc" });
            return;
        }

        setSortBy("created_at");
        setSortDir("desc");
        reload({ sort_by: "created_at", sort_dir: "desc" });
    };

    const goToPage = (page: number) => {
        reload({ page });
    };

    const summaryItems: SummaryCardItem[] = [
        {
            key: "total",
            label: "Total atribut",
            value: summary.total,
            icon: SlidersHorizontal,
            iconClass:
                "bg-info bg-[radial-gradient(circle_at_50%_0%,rgb(255_255_255/0.45),transparent_80%)] text-primary-foreground",
        },
    ];

    return (
        <>
            <Head title="Atribut" />
            <div className="flex h-full flex-1 flex-col gap-6 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Atribut Varian</h1>
                        <p className="text-sm text-muted-foreground">
                            Kelola jenis opsi varian produk seperti Warna, Ukuran, atau Kapasitas
                        </p>
                    </div>
                    <AttributeFormDialog />
                </div>

                <SummaryCards items={summaryItems} />

                <div className="grid grid-cols-1 gap-4">
                    <SearchInput
                        value={search}
                        onChange={setSearch}
                        placeholder="Cari nama atau deskripsi atribut..."
                        ariaLabel="Cari atribut"
                        className="w-full sm:max-w-md"
                    />
                </div>

                <div className="flex flex-col gap-2">
                    {loading && (
                        <div
                            className="h-1 w-full animate-pulse rounded-sm bg-muted"
                            role="status"
                            aria-label="Memuat data atribut"
                        />
                    )}
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>
                                    <SortButton
                                        label="Atribut"
                                        active={sortBy === "name"}
                                        direction={sortDir}
                                        onClick={() => handleSort("name")}
                                    />
                                </TableHead>
                                <TableHead>Deskripsi</TableHead>
                                <TableHead>
                                    <SortButton
                                        label="Dibuat Pada"
                                        active={sortBy === "created_at"}
                                        direction={sortDir}
                                        onClick={() => handleSort("created_at")}
                                    />
                                </TableHead>
                                <TableHead className="w-24 text-right">Aksi</TableHead>
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
                            ) : attributes.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={COLUMN_COUNT} className="h-64">
                                        <EmptyState
                                            icon={SlidersHorizontal}
                                            title={
                                                hasSearch
                                                    ? "Atribut tidak ditemukan"
                                                    : "Belum ada atribut"
                                            }
                                            description={
                                                hasSearch
                                                    ? `Tidak ada atribut yang cocok dengan pencarian "${search}". Coba kata kunci lain.`
                                                    : "Mulai dengan menambahkan opsi atribut varian pertama (contoh: Warna, Ukuran)."
                                            }
                                            action={
                                                hasSearch ? (
                                                    <Button
                                                        variant="outline"
                                                        onClick={() => {
                                                            setSearch("");
                                                            reload({ search: "" });
                                                        }}
                                                    >
                                                        Reset pencarian
                                                    </Button>
                                                ) : (
                                                    <AttributeFormDialog />
                                                )
                                            }
                                        />
                                    </TableCell>
                                </TableRow>
                            ) : (
                                attributes.data.map((attribute) => (
                                    <TableRow
                                        key={attribute.id}
                                        className="cursor-pointer hover:bg-muted/50"
                                        onClick={() => setPreview(attribute)}
                                    >
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                <SlidersHorizontal className="size-4 text-muted-foreground shrink-0" />
                                                <span className="truncate">{attribute.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="max-w-xs truncate text-muted-foreground text-sm">
                                            {attribute.description || "-"}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            {formatDate(attribute.created_at)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setPreview(attribute);
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
                    currentPage={attributes.current_page}
                    lastPage={attributes.last_page}
                    perPage={perPage}
                    perPageOptions={PER_PAGE_OPTIONS}
                    total={attributes.total}
                    from={attributes.from}
                    to={attributes.to}
                    itemLabel="atribut"
                    loading={loading}
                    onPage={goToPage}
                    onPerPageChange={(value) => {
                        setPerPage(value);
                        reload({ per_page: value });
                    }}
                />
            </div>

            <AttributeDetailDialog attribute={preview} onClose={() => setPreview(null)} />
        </>
    );
}

AttributesIndex.layout = {
    breadcrumbs: [
        {
            title: "Atribut",
            href: attributesIndex(),
        },
    ],
};
