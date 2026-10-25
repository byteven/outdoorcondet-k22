import { Skeleton } from '@/components/ui/skeleton';

export function CatalogDetailPageSkeleton() {
    return (
        <section className="mx-auto w-full max-w-6xl px-4 pt-24 pb-16 md:px-6">
            <div className="flex items-center gap-1">
                <Skeleton className="h-3 w-14 bg-muted" />
                <Skeleton className="h-3 w-3 rounded-full bg-muted" />
                <Skeleton className="h-3 w-24 bg-muted" />
                <Skeleton className="h-3 w-3 rounded-full bg-muted" />
                <Skeleton className="h-3 w-32 bg-muted" />
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-10">
                <Skeleton className="aspect-square w-full rounded-2xl bg-muted" />
                <div className="flex min-w-0 flex-col gap-6">
                    <DetailTitleSkeleton />
                    <RentalPriceCardSkeleton />
                </div>
            </div>

            <div className="mt-6">
                <Skeleton className="h-11 w-full rounded-lg bg-muted" />
            </div>

            <RelatedSectionSkeleton />
        </section>
    );
}

export function RentalPriceCardSkeleton() {
    return (
        <div className="rounded-2xl border border-border bg-card p-4 md:p-5">
            <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-3">
                    <div className="flex items-start gap-4">
                        <div className="flex flex-1 flex-col gap-1.5">
                            <Skeleton className="h-4 w-16 bg-muted" />
                            <Skeleton className="h-7 w-28 bg-muted" />
                        </div>
                        <div className="flex flex-1 flex-col gap-1.5">
                            <Skeleton className="h-4 w-14 bg-muted" />
                            <Skeleton className="h-7 w-24 bg-muted" />
                        </div>
                    </div>
                    <Skeleton className="h-4 w-32 bg-muted" />
                </div>
                <Skeleton className="h-24 w-full rounded-lg bg-muted" />
                <Skeleton className="h-16 w-full rounded-xl bg-muted" />
            </div>
        </div>
    );
}

function DetailTitleSkeleton() {
    return (
        <div className="flex flex-col gap-2">
            <Skeleton className="h-8 w-3/4 max-w-md bg-muted md:h-9" />
            <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-14 rounded-full bg-muted" />
                <Skeleton className="h-4 w-20 bg-muted" />
            </div>
        </div>
    );
}

function RelatedSectionSkeleton() {
    return (
        <section className="mt-12">
            <Skeleton className="h-6 w-40 bg-muted" />
            <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="flex flex-col gap-2">
                        <Skeleton className="aspect-[4/3] w-full rounded-[1rem] bg-muted" />
                        <Skeleton className="h-3 w-1/3 bg-muted" />
                        <Skeleton className="h-4 w-3/4 bg-muted" />
                    </div>
                ))}
            </div>
        </section>
    );
}

export function RelatedGridSkeleton() {
    return (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="flex flex-col gap-2">
                    <Skeleton className="aspect-[4/3] w-full rounded-[1rem] bg-muted" />
                    <Skeleton className="h-3 w-1/3 bg-muted" />
                    <Skeleton className="h-4 w-3/4 bg-muted" />
                </div>
            ))}
        </div>
    );
}
