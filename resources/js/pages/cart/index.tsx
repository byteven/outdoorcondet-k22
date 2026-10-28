import { Head, Link, router } from "@inertiajs/react";
import { useState } from "react";
import { toast } from "sonner";
import {
    ArrowRightIcon,
    CalendarCheckIcon,
    CalendarXIcon,
    PackageIcon,
    Trash2Icon,
} from "lucide-react";
import { QuantityStepper } from "@/components/quantity-stepper";
import { LandingHeader } from "@/components/landing/landing-header";
import { RentalRange } from "@/components/rental-range";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { formatRupiah } from "@/components/product-shared";
import { cn } from "@/lib/utils";
import { parseRentalQueryDate } from "@/hooks/use-rental-dates";
import { useCartRentalDates } from "@/hooks/use-cart-rental-dates";
import {
    destroy as cartDestroy,
    update as cartUpdate,
    variant as cartVariant,
} from "@/routes/cart";
import { home } from "@/routes";
import { show as showProduct } from "@/routes/products";

type CartItemType = "alat" | "bundle";

type CartItemVariantValue = {
    attribute: string | null;
    value: string;
};

type CartItemVariantOption = {
    id: number;
    available: number;
    values: CartItemVariantValue[];
};

type CartItemPayload = {
    id: number;
    type: CartItemType;
    name: string;
    sku: string | null;
    slug: string | null;
    image: string | null;
    product_id: number | null;
    variant_id: number | null;
    variant_options: CartItemVariantOption[];
    quantity: number;
    max_quantity: number;
    available: number;
    is_out_of_stock: boolean;
    is_rentable: boolean;
    total_days: number;
    pickup_date: string;
    return_date: string;
    unit_price: number;
    deposit_per_unit: number;
    rental_subtotal: number;
    deposit_subtotal: number;
};

type CartSummary = {
    rental_amount: number;
    deposit_amount: number;
};

type CartPayload = {
    items: CartItemPayload[];
    summary: CartSummary;
    count: number;
};

type Props = {
    cart: CartPayload;
};

export default function CartPage({ cart }: Props) {
    const [busyItemId, setBusyItemId] = useState<number | null>(null);

    const { items, summary, count } = cart;
    const hasItems = items.length > 0;
    const serverPickupKey = items[0]?.pickup_date;
    const serverReturnKey = items[0]?.return_date;

    const { activeRental, handleRangeChange } = useCartRentalDates({
        serverPickupDate: serverPickupKey,
        serverReturnDate: serverReturnKey,
    });

    const handleQuantityChange = (item: CartItemPayload, quantity: number) => {
        setBusyItemId(item.id);

        router.patch(
            cartUpdate.url({ cartItem: item.id }),
            { quantity },
            {
                preserveState: true,
                preserveScroll: true,
                onFinish: () => setBusyItemId(null),
                onError: (errors) => {
                    const message = errors.quantity ?? Object.values(errors)[0];

                    if (typeof message === "string") {
                        toast.error(message);
                    }
                },
            },
        );
    };

    const handleRemoveItem = (item: CartItemPayload) => {
        setBusyItemId(item.id);

        router.delete(cartDestroy.url({ cartItem: item.id }), {
            preserveState: true,
            preserveScroll: true,
            onFinish: () => setBusyItemId(null),
        });
    };

    const handleVariantChange = (item: CartItemPayload, variantId: number) => {
        setBusyItemId(item.id);

        router.patch(
            cartVariant.url({ cartItem: item.id }),
            { variant_id: variantId },
            {
                preserveState: true,
                preserveScroll: true,
                onFinish: () => setBusyItemId(null),
                onError: (errors) => {
                    const message =
                        errors.variant_id ?? Object.values(errors)[0];

                    if (typeof message === "string") {
                        toast.error(message);
                    }
                },
            },
        );
    };

    return (
        <>
            <Head title="Keranjang" />

            <div className="flex min-h-screen flex-col bg-background">
                <LandingHeader />

                <main className="flex-1 bg-[#fbfbfc]">
                    <section className="mx-auto w-full max-w-6xl px-4 pt-24 pb-16 md:px-6">
                        <div className="flex flex-col gap-1">
                            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                                Keranjang Sewa
                            </h1>
                            {hasItems && (
                                <p className="text-sm text-muted-foreground">
                                    {count} barang disewa
                                </p>
                            )}
                        </div>

                        {hasItems ? (
                            <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_20rem] lg:gap-8">
                                <div className="flex min-w-0 flex-col gap-4">
                                    <RentalRange
                                        variant="compact"
                                        className="rounded-2xl border border-border bg-card p-3"
                                        initialPickupDate={
                                            activeRental?.pickupDate ??
                                            parseRentalQueryDate(
                                                serverPickupKey,
                                            )
                                        }
                                        initialReturnDate={
                                            activeRental?.returnDate ??
                                            parseRentalQueryDate(
                                                serverReturnKey,
                                            )
                                        }
                                        hideButton
                                        onSearch={handleRangeChange}
                                    />

                                    <CartItemList
                                        items={items}
                                        busyItemId={busyItemId}
                                        onQuantityChange={handleQuantityChange}
                                        onVariantChange={handleVariantChange}
                                        onRemove={handleRemoveItem}
                                    />
                                </div>

                                <CartSummaryCard summary={summary} />
                            </div>
                        ) : (
                            <EmptyCart />
                        )}
                    </section>
                </main>

                <SiteFooter />
            </div>
        </>
    );
}

type CartItemGroup = {
    key: string;
    name: string;
    slug: string | null;
    image: string | null;
    items: CartItemPayload[];
};

function groupCartItems(items: CartItemPayload[]): CartItemGroup[] {
    const groups = new Map<string, CartItemGroup>();

    for (const item of items) {
        const key =
            item.type === "alat" && item.product_id !== null
                ? `alat-${item.product_id}`
                : `item-${item.id}`;
        const existing = groups.get(key);

        if (existing) {
            existing.items.push(item);

            continue;
        }

        groups.set(key, {
            key,
            name: item.name,
            slug: item.slug,
            image: item.image,
            items: [item],
        });
    }

    return [...groups.values()];
}

type CartItemListProps = {
    items: CartItemPayload[];
    busyItemId: number | null;
    onQuantityChange: (item: CartItemPayload, quantity: number) => void;
    onVariantChange: (item: CartItemPayload, variantId: number) => void;
    onRemove: (item: CartItemPayload) => void;
};

function CartItemList({
    items,
    busyItemId,
    onQuantityChange,
    onVariantChange,
    onRemove,
}: CartItemListProps) {
    return (
        <ul className="flex flex-col gap-4">
            {groupCartItems(items).map((group) => (
                <li key={group.key}>
                    <CartItemCard
                        group={group}
                        busyItemId={busyItemId}
                        onQuantityChange={onQuantityChange}
                        onVariantChange={onVariantChange}
                        onRemove={onRemove}
                    />
                </li>
            ))}
        </ul>
    );
}

type CartItemCardProps = {
    group: CartItemGroup;
    busyItemId: number | null;
    onQuantityChange: (item: CartItemPayload, quantity: number) => void;
    onVariantChange: (item: CartItemPayload, variantId: number) => void;
    onRemove: (item: CartItemPayload) => void;
};

function CartItemCard({
    group,
    busyItemId,
    onQuantityChange,
    onVariantChange,
    onRemove,
}: CartItemCardProps) {
    const href = group.slug
        ? showProduct.url({
              productSlug: group.slug,
          })
        : undefined;

    return (
        <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex gap-4">
                <ItemThumbnail
                    image={group.image}
                    name={group.name}
                    href={href}
                />

                <div className="flex min-w-0 flex-1 flex-col">
                    <div className="min-w-0">
                        {href ? (
                            <Link
                                href={href}
                                className="block truncate font-semibold text-foreground transition-colors hover:text-primary"
                            >
                                {group.name}
                            </Link>
                        ) : (
                            <p className="truncate font-semibold">
                                {group.name}
                            </p>
                        )}
                    </div>

                    <div className="mt-1.5 flex flex-col divide-y divide-border">
                        {group.items.map((item) => (
                            <CartItemVariantRow
                                key={item.id}
                                item={item}
                                busy={busyItemId === item.id}
                                onQuantityChange={onQuantityChange}
                                onVariantChange={onVariantChange}
                                onRemove={onRemove}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

type CartItemVariantRowProps = {
    item: CartItemPayload;
    busy: boolean;
    onQuantityChange: (item: CartItemPayload, quantity: number) => void;
    onVariantChange: (item: CartItemPayload, variantId: number) => void;
    onRemove: (item: CartItemPayload) => void;
};

function CartItemVariantRow({
    item,
    busy,
    onQuantityChange,
    onVariantChange,
    onRemove,
}: CartItemVariantRowProps) {
    return (
        <div
            className={cn(
                "flex flex-col gap-2 py-3 first:pt-0 last:pb-0",
                !item.is_rentable && "opacity-80",
            )}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 flex-col gap-1.5">
                    <CartItemVariant
                        item={item}
                        busy={busy}
                        onVariantChange={onVariantChange}
                    />
                    <CartItemStock item={item} />
                </div>

                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                    disabled={busy}
                    onClick={() => onRemove(item)}
                    aria-label={`Hapus ${item.name} dari keranjang`}
                >
                    <Trash2Icon className="size-4" />
                </Button>
            </div>

            <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="text-left">
                    <p className="text-sm font-semibold text-foreground">
                        {formatRupiah(item.rental_subtotal)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        Deposit {formatRupiah(item.deposit_subtotal)}
                    </p>
                </div>
                <QuantityStepper
                    value={item.quantity}
                    min={1}
                    max={item.max_quantity}
                    disabled={busy || !item.is_rentable}
                    onChange={(quantity) => onQuantityChange(item, quantity)}
                    ariaLabel={`Jumlah ${item.name}`}
                />
            </div>
        </div>
    );
}

function ItemThumbnail({
    image,
    name,
    href,
}: {
    image: string | null;
    name: string;
    href?: string;
}) {
    const content = image ? (
        <img
            src={`/storage/${image}`}
            alt={name}
            loading="lazy"
            className="size-20 rounded-xl border border-border/20 object-cover md:size-24"
        />
    ) : (
        <span className="flex size-20 items-center justify-center rounded-xl border border-border/20 bg-muted md:size-24">
            <PackageIcon
                className="size-8 text-muted-foreground/40"
                strokeWidth={1.5}
            />
        </span>
    );

    if (!href) {
        return content;
    }

    return (
        <Link href={href} tabIndex={-1} aria-hidden="true" className="shrink-0">
            {content}
        </Link>
    );
}

function CartItemVariant({
    item,
    busy,
    onVariantChange,
}: {
    item: CartItemPayload;
    busy: boolean;
    onVariantChange: (item: CartItemPayload, variantId: number) => void;
}) {
    if (item.variant_options.length === 0) {
        return null;
    }

    return (
        <Select
            value={
                item.variant_id !== null ? String(item.variant_id) : undefined
            }
            disabled={busy || !item.is_rentable}
            onValueChange={(value) => onVariantChange(item, Number(value))}
        >
            <SelectTrigger
                size="sm"
                className="w-fit max-w-full text-xs"
                aria-label={`Varian ${item.name}`}
            >
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                {item.variant_options.map((option) => {
                    const label =
                        option.values.map((value) => value.value).join(" / ") ||
                        "Varian";
                    const isUnavailable = option.available < item.quantity;

                    return (
                        <SelectItem
                            key={option.id}
                            value={String(option.id)}
                            disabled={isUnavailable}
                            title={
                                isUnavailable
                                    ? "Stok varian ini tidak cukup untuk quantity keranjang"
                                    : undefined
                            }
                        >
                            {label}
                        </SelectItem>
                    );
                })}
            </SelectContent>
        </Select>
    );
}

function CartItemStock({ item }: { item: CartItemPayload }) {
    if (!item.is_rentable) {
        return (
            <p className="flex items-center gap-1.5 text-xs text-destructive">
                <CalendarXIcon className="size-3.5 shrink-0" />
                Tidak tersedia
            </p>
        );
    }

    if (item.is_out_of_stock) {
        return (
            <p className="flex items-center gap-1.5 text-xs text-amber-600">
                <CalendarXIcon className="size-3.5 shrink-0" />
                Stok tersedia hanya {item.available} unit untuk tanggal ini
            </p>
        );
    }

    return (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarCheckIcon className="size-3.5 shrink-0 text-primary" />
            {item.available} unit tersedia
        </p>
    );
}

function CartSummaryCard({ summary }: { summary: CartSummary }) {
    return (
        <div className="rounded-2xl border border-border bg-card p-4 md:sticky md:top-24 md:p-5">
            <h2 className="font-semibold tracking-tight">Ringkasan Harga</h2>

            <div className="mt-4 flex flex-col gap-2.5">
                <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-medium">Total Sewa</span>
                    <span className="text-lg font-semibold text-primary">
                        {formatRupiah(summary.rental_amount)}
                    </span>
                </div>

                <div className="flex items-baseline justify-between gap-2 border-t border-border pt-3">
                    <span className="text-sm text-muted-foreground">
                        Total Deposit
                    </span>
                    <span className="text-sm font-semibold text-foreground">
                        {formatRupiah(summary.deposit_amount)}
                    </span>
                </div>
            </div>

            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                Deposit disetor saat ambil barang, dikembalikan saat
                pengembalian barang.
            </p>
        </div>
    );
}

function EmptyCart() {
    return (
        <div className="flex flex-col items-center gap-4 py-24 text-center">
            <span className="flex size-20 items-center justify-center rounded-full bg-muted">
                <PackageIcon
                    className="size-9 text-muted-foreground/50"
                    strokeWidth={1.5}
                />
            </span>

            <div className="flex flex-col gap-1">
                <p className="text-lg font-semibold">Keranjang masih kosong</p>
                <p className="text-sm text-muted-foreground">
                    Yuk, pilih alat outdoor favoritmu dulu.
                </p>
            </div>

            <Button asChild className="rounded-full">
                <Link href={home.url()}>
                    Lihat Katalog
                    <ArrowRightIcon />
                </Link>
            </Button>
        </div>
    );
}
