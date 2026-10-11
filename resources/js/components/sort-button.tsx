import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';

/**
 * Tombol label header kolom yang bisa diurutkan.
 * Ikon netral ketika kolom tidak aktif.
 */
export function SortButton({
    label,
    active,
    direction,
    onClick,
}: {
    label: string;
    active: boolean;
    direction: 'asc' | 'desc';
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="inline-flex cursor-pointer items-center gap-1 hover:text-foreground"
            aria-label={`Urutkan berdasarkan ${label}`}
        >
            {label}
            {!active && <ArrowUpDown className="size-4 opacity-50" />}
            {active &&
                (direction === 'asc' ? (
                    <ArrowUp className="size-4" />
                ) : (
                    <ArrowDown className="size-4" />
                ))}
        </button>
    );
}
