import {
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

/**
 * Footer paginasi server-side: info baris, baris-per-halaman,
 * dan tombol pertama/sebelumnya/berikutnya/terakhir.
 */
export function DataTablePagination({
    currentPage,
    lastPage,
    perPage,
    perPageOptions = [10, 15, 25, 50],
    total,
    from,
    to,
    itemLabel,
    loading = false,
    onPage,
    onPerPageChange,
}: {
    currentPage: number;
    lastPage: number;
    perPage: string;
    perPageOptions?: number[];
    total: number;
    from: number | null;
    to: number | null;
    itemLabel: string;
    loading?: boolean;
    onPage: (page: number) => void;
    onPerPageChange: (value: string) => void;
}) {
    const goToPage = (page: number) => {
        if (page < 1 || page > lastPage || page === currentPage) {
            return;
        }

        onPage(page);
    };

    return (
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
            <p className="text-sm text-muted-foreground">
                Menampilkan {from ?? 0}-{to ?? 0} dari {total} {itemLabel}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                        Baris per halaman
                    </span>
                    <Select value={perPage} onValueChange={onPerPageChange}>
                        <SelectTrigger aria-label="Baris per halaman" className="w-20">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent side="top">
                            {perPageOptions.map((option) => (
                                <SelectItem key={option} value={String(option)}>
                                    {option}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex items-center gap-1">
                    <Button
                        variant="outline"
                        size="icon"
                        aria-label="Halaman pertama"
                        disabled={loading || currentPage <= 1}
                        onClick={() => goToPage(1)}
                    >
                        <ChevronsLeft />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        aria-label="Halaman sebelumnya"
                        disabled={loading || currentPage <= 1}
                        onClick={() => goToPage(currentPage - 1)}
                    >
                        <ChevronLeft />
                    </Button>
                    <span className="min-w-28 px-2 text-center text-sm text-muted-foreground">
                        Halaman {currentPage} dari {lastPage}
                    </span>
                    <Button
                        variant="outline"
                        size="icon"
                        aria-label="Halaman berikutnya"
                        disabled={loading || currentPage >= lastPage}
                        onClick={() => goToPage(currentPage + 1)}
                    >
                        <ChevronRight />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        aria-label="Halaman terakhir"
                        disabled={loading || currentPage >= lastPage}
                        onClick={() => goToPage(lastPage)}
                    >
                        <ChevronsRight />
                    </Button>
                </div>
            </div>
        </div>
    );
}
