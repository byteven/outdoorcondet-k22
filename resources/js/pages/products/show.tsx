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
    type DetailVariantOption,
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
import { type DurationPrice, cheapestDailyVariant } from "@/lib/rental-pricing";
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
        id: number;
        product_id: number;
        name: string;
        quantity: number;
        allow_variant_selection: boolean;
        variant_name: string | null;
        variant_values: DetailVariantValue[];
        variant_options: DetailVariantOption[];
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

    /**
     * Pilihan varian customer per item paket (key = package item id).
     * null berarti belum memilih — server memakai total kapasitas semua
     * varian untuk menghitung ketersediaan paket.
     */
    const [packageItemSelections, setPackageItemSelections] = useState<
        Record<number, number | null>
    >({});

    /**
     * Pilihan varian bebas yang efektif (key = package item id): pilihan
     * user, dengan fallback opsi pertama — selaras default server (varian
     * aktif pertama produk). Setiap item bebas pilih minimal terikat satu
     * varian, jadi hasil ini selalu terisi dan tidak bisa kosong.
     */
    const bundleSelections: Record<number, number> =
        detail.type === "bundle"
            ? Object.fromEntries(
                  detail.items
                      .filter(
                          (item) =>
                              item.allow_variant_selection &&
                              item.variant_options.length > 0,
                      )
                      .map((item) => [
                          item.id,
                          packageItemSelections[item.id] ??
                              item.variant_options[0].id,
                      ]),
              )
            : {};

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

    /**
     * Query parameter pemilihan varian paket (key = package item id)
     * untuk partial reload ketersediaan. Selection efektif selalu ada,
     * jadi server menghitung ketersediaan paket varian yang sama dengan
     * yang akan dipakai saat add-to-cart.
     */
    const buildSelectionQuery = (
        selections: Record<number, number>,
    ): { selected_variants?: Record<string, number> } => {
        if (detail.type !== "bundle") {
            return {};
        }

        const entries = Object.entries(selections).filter(
            (entry): entry is [string, number] => entry[1] > 0,
        );

        return entries.length > 0
            ? { selected_variants: Object.fromEntries(entries) }
            : {};
    };

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
            {
                ...buildRentalRangeQuery(params.pickupDate, params.returnDate),
                ...buildSelectionQuery(bundleSelections),
            },
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

    /**
     * Pilih varian untuk satu item paket, lalu muat ulang ketersediaan
     * paket bila rentang sudah aktif. Klik chip yang sama tidak
     * membatalkan pilihan: tiap item bebas pilih wajib terikat minimal
     * satu varian.
     */
    const handleItemVariantSelect = (itemId: number, variantId: number) => {
        if (bundleSelections[itemId] === variantId) {
            return;
        }

        const next = {
            ...bundleSelections,
            [itemId]: variantId,
        };

        setPackageItemSelections(next);

        if (!pickupDate || !returnDate || availability === null) {
            return;
        }

        isRangeVisit.current = true;
        setIsRangeUpdating(true);

        router.get(
            routeDetail(detail),
            {
                ...buildRentalRangeQuery(pickupDate, returnDate),
                ...buildSelectionQuery(next),
            },
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
            {
                ...buildRentalRangeQuery(pickupDate, returnDate),
                ...buildSelectionQuery(bundleSelections),
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                only: ["availability", "detail", "filters", "related"],
            },
        );
    }, [packageItemSelections, availability, detail, pickupDate, returnDate]);

    const unavailableNoticeKey = useRef<string | null>(null);

    useEffect(() => {
        if (!pickupDate || !returnDate) {
            unavailableNoticeKey.current = null;

            return;
        }

        if (isAvailabilityLoading || displayAvailability === null) {
            return;
        }

        const bundleSelectionKey =
            detail.type === "bundle"
                ? Object.entries(bundleSelections)
                      .sort(([a], [b]) => Number(a) - Number(b))
                      .map(([itemId, variantId]) => `${itemId}:${variantId}`)
                      .join(",")
                : "";

        const key = `${selectedVariantId ?? "product"}${bundleSelectionKey ? `-sel-${bundleSelectionKey}` : ""}-${toRentalQueryDate(pickupDate)}-${toRentalQueryDate(returnDate)}`;

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
        packageItemSelections,
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
                                            ) : detail.type === "bundle" ? (
                                                <PackageItemVariantSelectors
                                                    items={detail.items}
                                                    selections={
                                                        bundleSelections
                                                    }
                                                    onSelect={
                                                        handleItemVariantSelect
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
                                                selectedVariants={
                                                    detail.type === "bundle"
                                                        ? bundleSelections
                                                        : undefined
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

/**
 * Chip pemilih varian untuk item paket yang mengizinkan pelanggan
 * memilih varian sendiri ("varian bebas"), satu kelompok chip per item.
 */
function PackageItemVariantSelectors({
    items,
    selections,
    onSelect,
}: {
    items: {
        id: number;
        name: string;
        allow_variant_selection: boolean;
        variant_options: DetailVariantOption[];
    }[];
    selections: Record<number, number>;
    onSelect: (itemId: number, variantId: number) => void;
}) {
    const selectableItems = items.filter(
        (item) =>
            item.allow_variant_selection && item.variant_options.length > 0,
    );

    if (selectableItems.length === 0) {
        return null;
    }

    return (
        <div className="flex flex-col gap-4">
            {selectableItems.map((item) => (
                <VariantSelector
                    key={item.id}
                    label={`Varian ${item.name}`}
                    variants={item.variant_options}
                    selectedId={selections[item.id] ?? null}
                    onSelect={(variantId) => onSelect(item.id, variantId)}
                />
            ))}
        </div>
    );
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
