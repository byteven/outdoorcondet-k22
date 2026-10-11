import type { LucideIcon } from 'lucide-react';

export type SummaryCardItem = {
    key: string;
    label: string;
    value: number | string;
    icon: LucideIcon;
    /** Kelas warna ikon, mis. 'bg-info text-primary-foreground'. */
    iconClass: string;
};

/**
 * Tiga kartu ringkasan bernilai angka dengan ikon berwarna.
 */
export function SummaryCards({ items }: { items: SummaryCardItem[] }) {
    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {items.map((card) => (
                <div
                    key={card.key}
                    className="flex items-center gap-4 rounded-lg border border-border p-4"
                >
                    <span
                        className={`flex size-10 shrink-0 items-center justify-center rounded-md ${card.iconClass}`}
                    >
                        <card.icon className="size-5" />
                    </span>
                    <span>
                        <span className="block text-sm text-muted-foreground">
                            {card.label}
                        </span>
                        <span className="block text-2xl font-bold">
                            {card.value}
                        </span>
                    </span>
                </div>
            ))}
        </div>
    );
}
