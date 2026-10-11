import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Status kosong / galat yang reusable untuk tabel dan daftar.
 */
export function EmptyState({
    icon: Icon,
    title,
    description,
    action,
    className,
}: {
    icon: LucideIcon;
    title: string;
    description?: string;
    action?: ReactNode;
    className?: string;
}) {
    return (
        <div className={cn('flex flex-col items-center gap-2 py-10 text-center', className)}>
            <Icon className="size-8 text-muted-foreground" />
            <p className="text-sm font-medium">{title}</p>
            {description && (
                <p className="text-sm text-muted-foreground">{description}</p>
            )}
            {action}
        </div>
    );
}
