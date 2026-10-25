import { Head, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { ChevronRightIcon, PackageIcon } from 'lucide-react';
import { CatalogCard } from '@/components/catalog-card';
import {
    CatalogDetailPageSkeleton,
    RelatedGridSkeleton,
} from '@/components/detail/catalog-detail-skeleton';
import { DetailAccordion } from '@/components/detail/detail-accordion';
import { ImageGallery } from '@/components/detail/image-gallery';
import { RentalPriceCard } from '@/components/detail/rental-price-card';
import { LandingHeader } from '@/components/landing/landing-header';
import { SiteFooter } from '@/components/site-footer';
import { RentalRange, type RentalRangeParams } from '@/components/rental-range';
import { Badge } from '@/components/ui/badge';
import { useCatalogDetailPricing } from '@/hooks/use-catalog-detail-pricing';

import {
    buildRentalRangeQuery,
    syncRentalRangePersistence,
    useActiveRental,
} from '@/hooks/use-rental-dates';
import {
    type DurationPrice,
    type RentalVariant,
} from '@/lib/rental-pricing';
import { home } from '@/routes';
import { show as showProduct } from '@/routes/products';
import { show as showPackage } from '@/routes/packages';

type DetailCategory = {
    id: number;
    name: string;
    slug: string;
};

type ProductDetail = {
    type: 'alat';
    id: number;
    name: string;
    slug: string;
    description: string | null;
    category: DetailCategory | null;
    images: string[];
    variants: RentalVariant[];
};

type PackageDetail = {
    type: 'bundle';
    id: number;
    name: string;
    slug: string;
    description: string | null;
    image: string | null;
    daily_price: number;
    deposit_per_package: number;
    duration_prices: DurationPrice[];
    items: { name: string; quantity: number }[];
};

type CatalogDetail = ProductDetail | PackageDetail;

type RelatedProduct = {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    category: { id: number; name: string } | null;
    image: string | null;
    daily_price: number;
    available: number | null;
    stock: number;
};

type Props = {
    detail: CatalogDetail;
    availability: number | null;
    filters: { pickup_date?: string; return_date?: string };
    related: RelatedProduct[];
};

export default function CatalogDetailPage({
    detail,
    availability,
    filters,
    related,
}: Props) {
    const [isInitialLoading, setIsInitialLoading] = useState(false);
    const [isRangeUpdating, setIsRangeUpdating] = useState(false);
    const isRangeVisit = useRef(false);

    useEffect(() => {
        const removeStartListener = router.on('start', () => {
            if (!isRangeVisit.current) {
                setIsInitialLoading(true);
            }
        });

        const removeFinishListener = router.on('finish', () => {
            setIsInitialLoading(false);
            isRangeVisit.current = false;
        });

        return () => {
            removeStartListener();
            removeFinishListener();
        };
    }, []);

    const isAvailabilityLoading = isRangeUpdating;

    const { saveDates, clearDates, activeRental } = useActiveRental(filters);
    const {
        pickupDate,
        returnDate,
        totalDays,
        unitPrice,
        depositPerUnit,
        dailyPrice,
    } = useCatalogDetailPricing(detail, activeRental);



    const handleRangeChange = (params: RentalRangeParams) => {
        syncRentalRangePersistence(
            params.pickupDate,
            params.returnDate,
            saveDates,
            clearDates,
        );

        isRangeVisit.current = true;
        setIsRangeUpdating(true);

        router.get(
            routeDetail(detail),
            buildRentalRangeQuery(params.pickupDate, params.returnDate),
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                only: ['availability', 'filters', 'related'],
                onFinish: () => {
                    setIsRangeUpdating(false);
                    isRangeVisit.current = false;
                },
            },
        );
    };

    return (
        <>
            <Head title={`${detail.name} - OutdoorCondet`} />

            <div className="min-h-screen bg-background">
                <LandingHeader />

                <main className="bg-[#fbfbfc]">
                    {isInitialLoading ? (
                        <CatalogDetailPageSkeleton />
                    ) : (
                        <section className="mx-auto w-full max-w-6xl px-4 pt-24 pb-16 md:px-6">
                            <Breadcrumbs
                                categoryName={detailCategoryName(detail)}
                                name={detail.name}
                            />

                            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-10">
                                <div className="flex min-w-0 flex-col gap-6">
                                    <ImageGallery
                                        images={galleryImages(detail)}
                                        name={detail.name}
                                    />
                                </div>

                                <div className="flex min-w-0 flex-col gap-6">
                                    <DetailTitle detail={detail} />

                                    <RentalPriceCard
                                        unitPrice={unitPrice}
                                        depositPerUnit={depositPerUnit}
                                        totalDays={totalDays}
                                        available={availability}
                                        dailyPrice={dailyPrice}
                                        loading={isAvailabilityLoading}
                                        rentalRangeComponent={
                                            <RentalRange
                                                variant="compact"
                                                initialPickupDate={pickupDate}
                                                initialReturnDate={returnDate}
                                                onSearch={handleRangeChange}
                                                hideButton
                                            />
                                        }
                                    />
                                </div>
                            </div>

                            <div className="mt-6">
                                <DetailAccordion
                                    description={detail.description}
                                    items={detailItems(detail)}
                                />
                            </div>

                            {isAvailabilityLoading ? (
                                <section className="mt-12">
                                    <h2 className="text-lg font-bold tracking-tight md:text-xl">
                                        Peralatan Lainnya
                                    </h2>
                                    <RelatedGridSkeleton />
                                </section>
                            ) : (
                                related.length > 0 && (
                                    <RelatedSection related={related} />
                                )
                            )}
                        </section>
                    )}
                </main>

                <SiteFooter />
            </div>
        </>
    );
}

function DetailTitle({ detail }: { detail: CatalogDetail }) {
    return (
        <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                {detail.name}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
                <Badge
                    variant="outline"
                    className="rounded-full px-2.5 py-1 text-xs font-medium"
                >
                    {detail.type === 'alat' ? 'Alat' : 'Paket'}
                </Badge>
                {detailCategoryName(detail) && (
                    <span className="text-xs text-muted-foreground">
                        {detailCategoryName(detail)}
                    </span>
                )}
            </div>
        </div>
    );
}

function Breadcrumbs({
    categoryName,
    name,
}: {
    categoryName: string | null;
    name: string;
}) {
    return (
        <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-1 text-xs text-muted-foreground"
        >
            <a
                href={home.url()}
                className="transition-colors hover:text-foreground"
            >
                Beranda
            </a>
            {categoryName && (
                <>
                    <ChevronRightIcon className="size-3" />
                    <span>{categoryName}</span>
                </>
            )}
            <ChevronRightIcon className="size-3" />
            <span className="font-medium text-foreground">{name}</span>
        </nav>
    );
}

function RelatedSection({ related }: { related: RelatedProduct[] }) {
    return (
        <section id="peralatan-lainnya" className="mt-12">
            <h2 className="text-lg font-bold tracking-tight md:text-xl">
                Peralatan Lainnya
            </h2>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                {related.map((item) => (
                    <CatalogCard
                        key={item.id}
                        href={showProduct.url({ productSlug: item.slug })}
                        image={item.image}
                        name={item.name}
                        dailyPrice={item.daily_price}
                        badge={item.category?.name}
                        stock={item.stock}
                        available={item.available}
                        fallbackIcon={
                            <PackageIcon
                                className="size-10 text-muted-foreground/40"
                                strokeWidth={1.5}
                            />
                        }
                    />
                ))}
            </div>
        </section>
    );
}

function routeDetail(detail: CatalogDetail): string {
    return detail.type === 'alat'
        ? showProduct.url({ productSlug: detail.slug })
        : showPackage.url({ packageSlug: detail.slug });
}

function detailCategoryName(detail: CatalogDetail): string | null {
    return detail.type === 'alat' ? (detail.category?.name ?? null) : null;
}

function galleryImages(detail: CatalogDetail): string[] {
    return detail.type === 'bundle'
        ? detail.image
            ? [detail.image]
            : []
        : detail.images;
}

function detailItems(detail: CatalogDetail) {
    return detail.type === 'bundle' ? detail.items : undefined;
}
