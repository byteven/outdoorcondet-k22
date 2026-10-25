import { Link } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { formatRupiah } from '@/components/product-shared';
import { cn } from '@/lib/utils';

type CatalogCardProps = {
    image: string | null;
    name: string;
    dailyPrice: number;
    badge?: string;
    available?: number | null;
    stock?: number;
    fallbackIcon: ReactNode;
    href?: string;
};

export function CatalogCard({
    image,
    name,
    dailyPrice,
    badge,
    available,
    stock,
    fallbackIcon,
    href,
}: CatalogCardProps) {
    const isUnavailable = available === 0 || stock === 0;

    const card = (
        <article
            className={cn(
                'group flex h-full flex-col overflow-hidden rounded-[1.25rem] border border-border/20 bg-card p-2 transition-all',
                isUnavailable && 'opacity-50',
                href &&
                !isUnavailable &&
                'hover:-translate-y-2',
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
                <p className="mt-auto text-sm font-semibold text-primary">
                    {formatRupiah(dailyPrice)}
                    <span className="text-xs font-normal text-muted-foreground">
                        {' '}
                        / hari
                    </span>
                </p>
            </div>
        </article>
    );

    if (!href || isUnavailable) {
        return card;
    }

    return (
        <Link href={href} className="contents">
            {card}
        </Link>
    );
}
