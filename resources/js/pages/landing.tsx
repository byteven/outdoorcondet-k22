import { Deferred, Head, router } from "@inertiajs/react";
import { useEffect, useRef, useState } from "react";
import {
    CatalogSection,
    type CatalogData,
    type CatalogFilters,
} from "@/components/catalog-section";
import { HeroSection } from "@/components/landing/hero-section";
import { LandingHeader } from "@/components/landing/landing-header";
import { RentalRange, type RentalRangeParams } from "@/components/rental-range";
import { SiteFooter } from "@/components/site-footer";
import { home } from "@/routes";
import {
    buildRentalSelection,
    syncRentalRangePersistence,
    toRentalQueryDate,
    useActiveRental,
    type RentalDateSelection,
} from "@/hooks/use-rental-dates";

type Props = {
    catalog?: CatalogData;
    filters: CatalogFilters;
};

const CATALOG_SECTION_ID = "katalog";

export default function Landing({ catalog, filters }: Props) {
    const [isCatalogLoading, setIsCatalogLoading] = useState(false);
    const latestFilters = useRef(filters);
    const hasHydratedCatalog = useRef(false);
    const { saveDates, clearDates, activeRental, selection } =
        useActiveRental(filters);
    latestFilters.current = filters;

    const visitCatalog = (
        overrides: Partial<CatalogFilters> & { page?: number },
        rentalSelection: RentalDateSelection | null,
        shouldScrollToCatalog = true,
    ): void => {
        const nextFilters = { ...latestFilters.current, ...overrides };

        router.get(
            home.url(),
            buildCatalogQuery(nextFilters, rentalSelection),
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                only: ["catalog", "filters"],
                onStart: () => setIsCatalogLoading(true),
                onFinish: () => {
                    setIsCatalogLoading(false);

                    if (shouldScrollToCatalog) {
                        scrollCatalogSectionIntoView();
                    }
                },
            },
        );
    };

    useEffect(() => {
        if (!activeRental) {
            return;
        }

        if (filters.pickup_date && filters.return_date) {
            hasHydratedCatalog.current = true;

            return;
        }

        if (hasHydratedCatalog.current) {
            return;
        }

        hasHydratedCatalog.current = true;

        visitCatalog(
            { page: 1 },
            buildRentalSelection(
                activeRental.pickupDate,
                activeRental.returnDate,
            ),
            false,
        );
    }, [activeRental, filters.pickup_date, filters.return_date]);

    const handleFilterChange = (
        params: Partial<CatalogFilters> & { page?: number },
    ) => {
        visitCatalog(params, selection);
    };

    const handleRentalSearch = ({
        pickupDate,
        returnDate,
        totalDays,
        origin,
    }: RentalRangeParams) => {
        const hasRange = Boolean(pickupDate && returnDate);

        syncRentalRangePersistence(
            pickupDate,
            returnDate,
            saveDates,
            clearDates,
        );

        const rentalSelection: RentalDateSelection | null = hasRange
            ? {
                  pickupDate: pickupDate!,
                  returnDate: returnDate!,
                  totalDays: totalDays ?? 0,
              }
            : null;

        visitCatalog(
            { page: 1 },
            rentalSelection,
            origin === "button" && hasRange,
        );
    };

    return (
        <>
            <Head title="OutdoorCondet - Sewa Alat Outdoor Condet" />

            <div className="min-h-screen bg-white">
                <LandingHeader />

                <main className="bg-white">
                    <HeroSection />

                    <section className="relative z-10 mx-auto -mt-16 w-full max-w-5xl px-4 md:-mt-28">
                        <RentalRange
                            initialPickupDate={activeRental?.pickupDate}
                            initialReturnDate={activeRental?.returnDate}
                            onSearch={handleRentalSearch}
                        />
                    </section>

                    <section
                        id={CATALOG_SECTION_ID}
                        className="scroll-mt-20 bg-white"
                    >
                        <div className="mx-auto w-full max-w-6xl px-4 py-16 md:px-6 md:py-20">
                            <div className="max-w-2xl">
                                <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
                                    Katalog Peralatan
                                </h2>
                                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                                    Cari tenda, carrier, dan perlengkapan
                                    camping lain yang kamu butuhkan.
                                </p>
                            </div>

                            <Deferred
                                data="catalog"
                                fallback={
                                    <DeferredCatalogFallback
                                        filters={filters}
                                    />
                                }
                            >
                                <CatalogSection
                                    catalog={catalog!}
                                    filters={filters}
                                    onFilterChange={handleFilterChange}
                                    loading={isCatalogLoading}
                                />
                            </Deferred>
                        </div>
                    </section>
                </main>

                <SiteFooter />
            </div>
        </>
    );
}

function DeferredCatalogFallback({ filters }: { filters: CatalogFilters }) {
    return (
        <CatalogSection
            catalog={{
                categories: [],
                products: null,
                packages: null,
                pagination: {
                    current_page: 1,
                    last_page: 1,
                    per_page: 12,
                    total: 0,
                    from: null,
                    to: null,
                },
            }}
            filters={filters}
            onFilterChange={() => {
                return;
            }}
            loading
        />
    );
}

function buildCatalogQuery(
    filters: CatalogFilters,
    selection: RentalDateSelection | null,
): Record<string, string | number> {
    const query: Record<string, string | number> = {
        tab: filters.tab,
        per_page: filters.per_page,
        page: filters.page ?? 1,
    };

    if (filters.search) {
        query.search = filters.search;
    }

    if (filters.category !== null && filters.category !== undefined) {
        query.category = filters.category;
    }

    if (selection?.pickupDate) {
        query.pickup_date = toRentalQueryDate(selection.pickupDate);
    }

    if (selection?.returnDate) {
        query.return_date = toRentalQueryDate(selection.returnDate);
    }

    return query;
}

function scrollCatalogSectionIntoView(): void {
    requestAnimationFrame(() => {
        document
            .getElementById(CATALOG_SECTION_ID)
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
}
