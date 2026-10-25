import { Head, router } from '@inertiajs/react';
import { useMemo } from 'react';
import { ChevronRightIcon, PackageIcon } from 'lucide-react';
import { CatalogCard } from '@/components/catalog-card';
import { DetailAccordion } from '@/components/detail/detail-accordion';
import { ImageGallery } from '@/components/detail/image-gallery';
import { RentalPriceCard } from '@/components/detail/rental-price-card';
import { LandingHeader } from '@/components/landing/landing-header';
import { SiteFooter } from '@/components/site-footer';
import { RentalRange, type RentalRangeParams } from '@/components/rental-range';
import { Badge } from '@/components/ui/badge';
import {
    getBillingStartDate,
    getRentalDurationDays,
    STORE_PICKUP_TIME,
    STORE_RETURN_TIME,
} from '@/lib/rental-date';
import {
    cheapestVariantForDuration,
    packageUnitPrice,
    type DurationPrice,
    type RentalVariant,
} from '@/lib/rental-pricing';
import { home } from '@/routes';
import { show as showProduct } from '@/routes/products';
import { show as showPackage } from '@/routes/packages';
import { cn } from '@/lib/utils';
import { useRentalDates } from '@/hooks/use-rental-dates';

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
    const { dates: storedDates, saveDates } = useRentalDates();
    const isBundle = detail.type === 'bundle';
    const bundle = detail.type === 'bundle' ? detail : null;
    const product = detail.type === 'alat' ? detail : null;

    const rentalDates = useMemo(
        () => ({
            pickup: filters.pickup_date
                ? new Date(filters.pickup_date)
                : storedDates?.pickupDate,
            ret: filters.return_date
                ? new Date(filters.return_date)
                : storedDates?.returnDate,
        }),
        [filters.pickup_date, filters.return_date, storedDates],
    );

    const totalDays = useMemo(() => {
        if (!rentalDates.pickup || !rentalDates.ret) {
            return null;
        }

        const billingStart = getBillingStartDate(
            rentalDates.pickup,
            STORE_PICKUP_TIME,
        );

        return getRentalDurationDays(billingStart, rentalDates.ret);
    }, [rentalDates]);

    const unitPrice = useMemo(() => {
        if (totalDays === null) {
            return null;
        }

        if (bundle) {
            return packageUnitPrice(
                bundle.daily_price,
                bundle.duration_prices,
                totalDays,
            );
        }

        return (
            cheapestVariantForDuration(product?.variants ?? [], totalDays)
                ?.unitPrice ?? null
        );
    }, [bundle, product, totalDays]);

    const depositPerUnit = useMemo(() => {
        if (bundle) {
            return bundle.deposit_per_package;
        }

        return (
            cheapestVariantForDuration(product?.variants ?? [], totalDays ?? 1)
                ?.depositPerUnit ?? 0
        );
    }, [bundle, product, totalDays]);

    const dailyPrice = useMemo(() => {
        if (bundle) {
            return bundle.daily_price;
        }

        // Get cheapest variant's daily price
        if (product?.variants && product.variants.length > 0) {
            const cheapest = cheapestVariantForDuration(product.variants, 1);
            return cheapest?.unitPrice ?? product.variants[0]?.rental_price_per_day ?? 0;
        }

        return 0;
    }, [bundle, product]);

    const handleRangeChange = (params: RentalRangeParams) => {
        // Save to localStorage for syncing
        if (params.pickupDate && params.returnDate) {
            saveDates(params.pickupDate, params.returnDate);
        }

        router.get(
            routeDetail(detail),
            {
                pickup_date: formDataDate(params.pickupDate),
                return_date: formDataDate(params.returnDate),
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                only: ['availability', 'filters', 'related'],
            },
        );
    };

    return (
        <>
            <Head title={`${detail.name} - OutdoorCondet`} />

            <div className="min-h-screen bg-background">
                <LandingHeader />

                <main className="bg-[#fbfbfc]">
                    <section className="mx-auto w-full max-w-6xl px-4 pt-24 pb-16 md:px-6">
                        <Breadcrumbs
                            categoryName={detailCategoryName(detail)}
                            name={detail.name}
                        />

                        <div className="mt-6 grid gap-6 lg:grid-cols-2 lg:gap-10">
                            {/* Section Kiri: Gambar */}
                            <div className="flex flex-col gap-6">
                                <ImageGallery
                                    images={galleryImages(detail)}
                                    name={detail.name}
                                />
                            </div>

                            {/* Section Kanan: Info Produk */}
                            <div className="flex flex-col gap-6">
                                <DetailTitle
                                    detail={detail}
                                    availability={availability}
                                />

                                <RentalPriceCard
                                    unitPrice={unitPrice}
                                    depositPerUnit={depositPerUnit}
                                    totalDays={totalDays}
                                    available={availability}
                                    dailyPrice={dailyPrice}
                                    rentalRangeComponent={
                                        <RentalRange
                                            variant="compact"
                                            initialPickupDate={rentalDates.pickup}
                                            initialReturnDate={rentalDates.ret}
                                            onSearch={handleRangeChange}
                                            hideButton
                                        />
                                    }
                                />
                            </div>
                        </div>

                        {/* Deskripsi - Full Width */}
                        <div className="mt-6">
                            <DetailAccordion
                                description={detail.description}
                                items={detailItems(detail)}
                            />
                        </div>

                        {related.length > 0 && (
                            <RelatedSection related={related} />
                        )}
                    </section>
                </main>

                <SiteFooter />
            </div>
        </>
    );
}

function DetailTitle({
    detail,
    availability,
}: {
    detail: CatalogDetail;
    availability: number | null;
}) {
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
                {availability !== null && (
                    <Badge
                        className={cn(
                            'rounded-full px-2.5 py-1 text-xs font-medium',
                            availability === 0
                                ? 'bg-destructive/10 text-destructive'
                                : 'bg-emerald-100 text-emerald-700',
                        )}
                    >
                        {availability === 0
                            ? 'Tidak tersedia'
                            : `${availability} tersedia`}
                    </Badge>
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

function formDataDate(date?: Date): string {
    return date ? date.toLocaleDateString('en-CA') : '';
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

function quantityLabel(isBundle: boolean): string {
    return isBundle ? 'Paket' : 'Unit';
}
