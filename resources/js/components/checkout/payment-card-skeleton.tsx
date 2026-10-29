import { Skeleton } from "@/components/ui/skeleton";

export function PaymentCardSkeleton() {
    return (
        <section className="mt-6 rounded-2xl border border-border bg-card p-6 md:p-8">
            <div className="flex flex-col items-center gap-4">
                <Skeleton className="h-6 w-56" />

                <div className="flex items-center justify-center gap-1.5">
                    <Skeleton className="h-12 w-10 md:h-14 md:w-12" />
                    <Skeleton className="h-12 w-10 md:h-14 md:w-12" />
                    <span className="px-0.5 text-2xl font-bold text-muted-foreground md:text-3xl">
                        :
                    </span>
                    <Skeleton className="h-12 w-10 md:h-14 md:w-12" />
                    <Skeleton className="h-12 w-10 md:h-14 md:w-12" />
                </div>

                <Skeleton className="h-52 w-56 rounded-lg" />

                <div className="flex w-full max-w-xs flex-col items-center gap-3">
                    <Skeleton className="h-6 w-40" />
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-10 w-56 rounded-full" />
                </div>
            </div>
        </section>
    );
}
