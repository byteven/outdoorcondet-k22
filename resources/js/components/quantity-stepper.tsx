import { MinusIcon, PlusIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type QuantityStepperProps = {
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    disabled?: boolean;
    className?: string;
    ariaLabel?: string;
};

/**
 * Primitif stepper quantity: tombol minus, angka, tombol plus.
 * Tanpa logika bisnis — nilai di-clamp ke [min, max] dan angka
 * tidak bisa diedit langsung.
 */
export function QuantityStepper({
    value,
    onChange,
    min = 1,
    max = Number.MAX_SAFE_INTEGER,
    disabled = false,
    className,
    ariaLabel = 'Jumlah',
}: QuantityStepperProps) {
    const clamp = (next: number): number =>
        Math.min(max, Math.max(min, next));

    const canDecrement = !disabled && value > min;
    const canIncrement = !disabled && value < max;

    return (
        <div
            className={cn(
                'inline-flex h-9 items-center rounded-full border border-input bg-background',
                disabled && 'opacity-50',
                className,
            )}
        >
            <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 rounded-full hover:rounded-full"
                disabled={!canDecrement}
                onClick={() => onChange(clamp(value - 1))}
                aria-label={`Kurangi ${ariaLabel}`}
            >
                <MinusIcon className="size-3.5" />
            </Button>

            <span
                aria-label={ariaLabel}
                aria-live="polite"
                className="min-w-8 text-center text-sm font-semibold tabular-nums"
            >
                {value}
            </span>

            <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 rounded-full hover:rounded-full"
                disabled={!canIncrement}
                onClick={() => onChange(clamp(value + 1))}
                aria-label={`Tambah ${ariaLabel}`}
            >
                <PlusIcon className="size-3.5" />
            </Button>
        </div>
    );
}
