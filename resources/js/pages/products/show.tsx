import { Head, router } from "@inertiajs/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ChevronRightIcon, PackageIcon } from "lucide-react";
import { CatalogCard } from "@/components/catalog-card";
import {
    CatalogDetailPageSkeleton,
    RelatedGridSkeleton,
} from "@/components/detail/catalog-detail-skeleton";
import { DetailAccordion } from "@/components/detail/detail-accordion";
import { ImageGallery } from "@/components/detail/image-gallery";
import { CartAction } from "@/components/detail/cart-action";
import { RentalPriceCard } from "@/components/detail/rental-price-card";
import {
    VariantSelector,
    type DetailVariant,
    type DetailVariantValue,
} from "@/components/detail/variant-selector";
import { LandingHeader } from "@/components/landing/landing-header";
import { SiteFooter } from "@/components/site-footer";
import { RentalRange, type RentalRangeParams } from "@/components/rental-range";
import { useCatalogDetailPricing } from "@/hooks/use-catalog-detail-pricing";

import {
    buildRentalRangeQuery,
    syncRentalRangePersistence,
    toRentalQueryDate,
    useActiveRental,
} from "@/hooks/use-rental-dates";
import { formatDateID } from "@/lib/rental-date";
import { type DurationPrice, cheapestDailyVariant, type RentalVariant } from "@/lib/rental-pricing";
import { home } from "@/routes";
import { show as showProduct } from "@/routes/products";
import { show as showPackage } from "@/routes/packages";

type DetailCategory = {
    id: number;
    name: string;
    slug: string;
};

type ProductDetail = {
    type: "alat";
    id: number;
    name: string;
    slug: string;
    description: string | null;
    category: DetailCategory | null;
    images: string[];
    variants: DetailVariant[];
};

type PackageDetail = {
    type: "bundle";
    id: number;
    name: string;
    slug: string;
    description: string | null;
    image: string | null;
    daily_price: number;
    deposit_per_package: number;
    duration_prices: DurationPrice[];
    items: {
        product_id: number;
        name: string;
        quantity: number;
        allow_variant_selection: boolean;
        variant_name: string | null;
        variant_values: DetailVariantValue[];
    }[];
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
    in_cart_ids: number[];
    related: RelatedProduct[];
};

export default function CatalogDetailPage({
    detail,
    availability,
    filters,
    in_cart_ids,
    related,
}: Props) {
    const [isInitialLoading, setIsInitialLoading] = useState(false);
    const [isRangeUpdating, setIsRangeUpdating] = useState(false);
    const [dateError, setDateError] = useState(false);
    const [selectedVariantId, setSelectedVariantId] = useState<number | null>(
        () => {
            if (detail.type !== "alat" || detail.variants.length === 0) {
                return null;
            }

            return cheapestDailyVariant(detail.variants)?.id ?? null;
        },
    );
    const isRangeVisit = useRef(false);

    useEffect(() => {
        const removeStartListener = router.on("start", () => {
            if (!isRangeVisit.current) {
                setIsInitialLoading(true);
            }
        });

        const removeFinishListener = router.on("finish", () => {
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

    // Jaga agar varian terpilih selalu valid: jika pilihan user hilang
    // dari daftar atau habis stoknya, kembali ke varian termurah yang
    // tersedia. null berarti default (varian termurah) — boleh dipertahankan.
    useEffect(() => {
        if (detail.type !== "alat") {
            return;
        }

        setSelectedVariantId((current) => {
            if (current === null) {
                const availableVariants = detail.variants.filter(
                    (variant) => variant.available !== 0,
                );
                const pool =
                    availableVariants.length > 0
                        ? availableVariants
                        : detail.variants;

                return cheapestDailyVariant(pool)?.id ?? null;
            }

            const currentVariant = detail.variants.find(
                (variant) => variant.id === current,
            );

            if (currentVariant && currentVariant.available !== 0) {
                return currentVariant.id;
            }

            const availableVariants = detail.variants.filter(
                (variant) => variant.available !== 0,
            );
            const pool =
                availableVariants.length > 0
                    ? availableVariants
                    : detail.variants;

            return cheapestDailyVariant(pool)?.id ?? null;
        });
    }, [detail]);

    const selectedVariant =
        detail.type === "alat"
            ? (detail.variants.find(
                (variant) => variant.id === selectedVariantId,
            ) ?? null)
            : null;
    const displayAvailability = selectedVariant?.available ?? availability;
    const isInCartForSelection =
        detail.type === "alat" && selectedVariantId !== null
            ? in_cart_ids.includes(selectedVariantId)
            : in_cart_ids.length > 0;

    const {
        pickupDate,
        returnDate,
        totalDays,
        unitPrice,
        normalPrice,
        depositPerUnit,
        dailyPrice,
    } = useCatalogDetailPricing(detail, activeRental, selectedVariantId);

    const handleRangeChange = (params: RentalRangeParams) => {
        setDateError(false);
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
                only: ["availability", "detail", "filters", "related"],
                onFinish: () => {
                    setIsRangeUpdating(false);
                    isRangeVisit.current = false;
                },
            },
        );
    };

    // Tanggal bisa datang dari localStorage (mis. dipilih di landing
    // tanpa klik "Cek") tanpa query di URL, sehingga availability belum
    // dihitung server. Sinkronkan sekali per rentang agar stok tampil
    // dan tombol keranjang bisa disable dengan benar.
    const availabilitySyncKey = useRef<string | null>(null);

    useEffect(() => {
        if (!pickupDate || !returnDate) {
            availabilitySyncKey.current = null;

            return;
        }

        if (availability !== null || isRangeVisit.current) {
            return;
        }

        const key = `${toRentalQueryDate(pickupDate)}-${toRentalQueryDate(returnDate)}`;

        if (availabilitySyncKey.current === key) {
            return;
        }

        availabilitySyncKey.current = key;

        router.get(
            routeDetail(detail),
            buildRentalRangeQuery(pickupDate, returnDate),
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                only: ["availability", "detail", "filters", "related"],
            },
        );
    }, [availability, detail, pickupDate, returnDate]);

    const unavailableNoticeKey = useRef<string | null>(null);

    useEffect(() => {
        if (!pickupDate || !returnDate) {
            unavailableNoticeKey.current = null;

            return;
        }

        if (isAvailabilityLoading || displayAvailability === null) {
            return;
        }

        const key = `${selectedVariantId ?? "product"}-${toRentalQueryDate(pickupDate)}-${toRentalQueryDate(returnDate)}`;

        if (displayAvailability > 0) {
            unavailableNoticeKey.current = null;

            return;
        }

        if (unavailableNoticeKey.current === key) {
            return;
        }

        unavailableNoticeKey.current = key;

        toast.error(
            `${detail.name} tidak tersedia untuk tanggal ${formatDateID(pickupDate)} - ${formatDateID(returnDate)}.`,
        );
    }, [
        detail.name,
        displayAvailability,
        isAvailabilityLoading,
        pickupDate,
        returnDate,
        selectedVariantId,
    ]);

    return (
        <>
            <Head title={`${detail.name} - OutdoorCondet`} />

            <div className="min-h-screen bg-white">
                <LandingHeader />

                <main className="bg-white">
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
                                    <RentalPriceCard
                                        title={detail.name}
                                        unitPrice={unitPrice}
                                        normalPrice={normalPrice}
                                        depositPerUnit={depositPerUnit}
                                        totalDays={totalDays}
                                        available={displayAvailability}
                                        dailyPrice={dailyPrice}
                                        loading={isAvailabilityLoading}
                                        variantSelector={
                                            detail.type === "alat" &&
                                                detail.variants.length > 0 ? (
                                                <VariantSelector
                                                    variants={detail.variants}
                                                    selectedId={
                                                        selectedVariantId
                                                    }
                                                    onSelect={(variantId) =>
                                                        setSelectedVariantId(
                                                            variantId,
                                                        )
                                                    }
                                                />
                                            ) : undefined
                                        }
                                        rentalRangeComponent={
                                            <RentalRange
                                                variant="compact"
                                                initialPickupDate={pickupDate}
                                                initialReturnDate={returnDate}
                                                onSearch={handleRangeChange}
                                                hideButton
                                                dateError={dateError}
                                            />
                                        }
                                        footerAction={
                                            <CartAction
                                                detail={detail}
                                                totalDays={totalDays}
                                                pickupDate={pickupDate ?? null}
                                                returnDate={returnDate ?? null}
                                                inCart={isInCartForSelection}
                                                availability={
                                                    displayAvailability
                                                }
                                                selectedVariantId={
                                                    selectedVariantId
                                                }
                                                loading={isAvailabilityLoading}
                                                onMissingDates={() =>
                                                    setDateError(true)
                                                }
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
    return detail.type === "alat"
        ? showProduct.url({ productSlug: detail.slug })
        : showPackage.url({ packageSlug: detail.slug });
}

function detailCategoryName(detail: CatalogDetail): string | null {
    return detail.type === "alat" ? (detail.category?.name ?? null) : null;
}

function galleryImages(detail: CatalogDetail): string[] {
    return detail.type === "bundle"
        ? detail.image
            ? [detail.image]
            : []
        : detail.images;
}

function detailItems(detail: CatalogDetail) {
    return detail.type === "bundle" ? detail.items : undefined;
}
