import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

/**
 * Ambil inisial 2 huruf dari sebuah nama.
 */
export function getInitials(name: string): string {
    const words = name.trim().split(/\s+/).filter(Boolean);

    if (words.length === 0) {
        return '?';
    }

    if (words.length === 1) {
        return words[0].slice(0, 2).toUpperCase();
    }

    return (words[0][0] + words[1][0]).toUpperCase();
}

/**
 * Avatar lingkaran dengan inisial nama, reusable di seluruh aplikasi.
 */
export function UserAvatar({
    name,
    className,
}: {
    name: string;
    className?: string;
}) {
    return (
        <Avatar className={cn('size-8', className)} aria-hidden="true">
            <AvatarFallback className="bg-muted text-xs font-semibold text-muted-foreground">
                {getInitials(name)}
            </AvatarFallback>
        </Avatar>
    );
}
