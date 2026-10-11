import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/**
 * Field pencarian dengan ikon kaca pembesar dan tombol X
 * untuk mengosongkan ketika sudah ada teks.
 */
export function SearchInput({
    value,
    onChange,
    placeholder = 'Cari...',
    ariaLabel = 'Cari',
    className,
}: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    ariaLabel?: string;
    className?: string;
}) {
    return (
        <div className={cn('relative', className)}>
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
                aria-label={ariaLabel}
                className="pr-9 pl-9"
            />
            {value !== '' && (
                <button
                    type="button"
                    onClick={() => onChange('')}
                    aria-label="Bersihkan pencarian"
                    className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer text-muted-foreground hover:text-foreground focus-visible:outline-none"
                >
                    <X className="size-4" />
                </button>
            )}
        </div>
    );
}
