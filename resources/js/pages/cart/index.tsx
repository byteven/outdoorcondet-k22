import { Head, Link, router, usePage } from "@inertiajs/react";
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
import { QrisLogo } from "@/components/qris-logo";
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
import { cartLineStock } from "@/lib/cart-stock";
import { cn } from "@/lib/utils";
import { parseRentalQueryDate } from "@/hooks/use-rental-dates";
import { useCartRentalDates } from "@/hooks/use-cart-rental-dates";
import {
    destroy as cartDestroy,
    packageVariant as cartPackageVariant,
    update as cartUpdate,
    variant as cartVariant,
} from "@/routes/cart";
import { store as checkoutStoreRoute } from "@/routes/checkout";
import { home } from "@/routes";
import { show as showProduct } from "@/routes/products";
import { show as showPackage } from "@/routes/packages";
import { CheckoutConfirmDialog } from "@/components/checkout/checkout-confirm-dialog";

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

type CartItemPackageVariantOption = {
    id: number;
    sku: string;
    available: number;
    values: CartItemVariantValue[];
};

/** Satu item penyusun paket pada baris keranjang bertipe bundle. */
type CartItemPackageItem = {
    id: number;
    name: string;
    quantity: number;
    allow_variant_selection: boolean;
    variant_id: number | null;
    variant_options: CartItemPackageVariantOption[];
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
    variant_consumptions?: Record<string, number>;
    variant_available?: Record<string, number>;
    items?: CartItemPackageItem[];
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

type PaymentType = "full" | "down_payment";

type Props = {
    cart: CartPayload;
};

export default function CartPage({ cart }: Props) {
    const [busyItemId, setBusyItemId] = useState<number | null>(null);
    const [paymentType, setPaymentType] = useState<PaymentType>("full");
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [isCheckingOut, setIsCheckingOut] = useState(false);

    const { items, summary, count } = cart;
    const hasItems = items.length > 0;
    const serverPickupKey = items[0]?.pickup_date;
    const serverReturnKey = items[0]?.return_date;

    const { activeRental, handleRangeChange } = useCartRentalDates({
        serverPickupDate: serverPickupKey,
        serverReturnDate: serverReturnKey,
    });

    const allItemsReady =
        items.length > 0 &&
        items.every(
            (item) => item.is_rentable && !item.is_out_of_stock
        );

    const checkoutDisabled =
        !allItemsReady || isCheckingOut || !hasItems;

    const rentalAmount = summary.rental_amount;
    const depositAmount = summary.deposit_amount;

    const downPaymentAmount =
        paymentType === "down_payment"
            ? rentalAmount * 0.5
            : 0;
    const remainingBalance = Math.max(0, rentalAmount - downPaymentAmount);
    const amountToPayNow =
        paymentType === "down_payment" ? downPaymentAmount : rentalAmount;
    const totalPrepareOutlet = remainingBalance + depositAmount;

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

    /**
     * Ubah pilihan varian bebas pada satu baris paket. Server menolak bila
     * stok varian yang dipilih tidak cukup, dan pilihan tersimpan pada
     * baris keranjang (key = package item id).
     */
    const handlePackageVariantChange = (
        item: CartItemPayload,
        selections: Record<string, number | undefined>,
    ) => {
        const selected_variants = Object.fromEntries(
            Object.entries(selections).filter(
                (entry): entry is [string, number] => entry[1] !== undefined,
            ),
        );

        setBusyItemId(item.id);

        router.patch(
            cartPackageVariant.url({ cartItem: item.id }),
            { selected_variants },
            {
                preserveState: true,
                preserveScroll: true,
                onFinish: () => setBusyItemId(null),
                onError: (errors) => {
                    const message =
                        errors.selected_variants ??
                        Object.values(errors)[0];

                    if (typeof message === "string") {
                        toast.error(message);
                    }
                },
            },
        );
    };

    const handleCheckout = () => {
        if (checkoutDisabled) {
            return;
        }

        setIsCheckingOut(true);

        router.post(
            checkoutStoreRoute.url(),
            {
                payment_type: paymentType,
            },
            {
                preserveScroll: true,
                onFinish: () => {
                    setIsCheckingOut(false);
                    setIsConfirmOpen(false);
                },
                onError: (errors) => {
                    setIsCheckingOut(false);
                    const message =
                        errors.cart ??
                        errors.customer ??
                        Object.values(errors)[0];

                    if (typeof message === "string") {
                        toast.error(message);
                    }
                },
            },
        );
    };

    const flash = (usePage().props as { flash?: { toast?: unknown } }).flash;

    if (flash?.toast) {
        const { type, message } = flash.toast as {
            type: string;
            message: string;
        };

        if (type === "success") {
            toast.success(message);
        } else if (type === "warning") {
            toast.warning(message);
        } else if (type === "error") {
            toast.error(message);
        }
    }

    return (
        <>
            <Head title="Keranjang Sewa" />

            <div className="flex min-h-screen flex-col bg-white">
                <LandingHeader />

                <main className="flex-1 bg-white">
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
                            <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_24rem] lg:gap-8">
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
                                            activeRental
                                                ? activeRental.returnDate
                                                : parseRentalQueryDate(
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
                                        onPackageVariantChange={
                                            handlePackageVariantChange
                                        }
                                        onRemove={handleRemoveItem}
                                    />
                                </div>

                                <CheckoutSummaryCard
                                    paymentType={paymentType}
                                    onPaymentTypeChange={setPaymentType}
                                    rentalAmount={rentalAmount}
                                    depositAmount={depositAmount}
                                    downPaymentAmount={downPaymentAmount}
                                    allItemsReady={allItemsReady}
                                    hasItems={hasItems}
                                    checkoutDisabled={checkoutDisabled}
                                    isCheckingOut={isCheckingOut}
                                    onCheckout={handleCheckout}
                                    onOpenConfirm={() => setIsConfirmOpen(true)}
                                />
                            </div>
                        ) : (
                            <EmptyCart />
                        )}
                    </section>
                </main>

                <SiteFooter />
            </div>

            <CheckoutConfirmDialog
                open={isConfirmOpen}
                onOpenChange={setIsConfirmOpen}
                onConfirm={handleCheckout}
            />
        </>
    );
}

type CheckoutSummaryCardProps = {
    paymentType: PaymentType;
    onPaymentTypeChange: (value: PaymentType) => void;
    rentalAmount: number;
    depositAmount: number;
    downPaymentAmount: number;
    allItemsReady: boolean;
    hasItems: boolean;
    checkoutDisabled: boolean;
    isCheckingOut: boolean;
    onCheckout: () => void;
    onOpenConfirm: () => void;
};

function CheckoutSummaryCard({
    paymentType,
    onPaymentTypeChange,
    rentalAmount,
    depositAmount,
    downPaymentAmount,
    allItemsReady,
    hasItems,
    checkoutDisabled,
    isCheckingOut,
    onCheckout,
    onOpenConfirm,
}: CheckoutSummaryCardProps) {
    const isDownPayment = paymentType === "down_payment";

    return (
        <div className="rounded-2xl border border-border bg-card p-4 md:sticky md:top-24 md:p-5">
            <h2 className="font-semibold tracking-tight">Ringkasan Harga</h2>

            <div className="mt-4 flex flex-col gap-2">
                <div className="flex items-baseline justify-between gap-2 pb-2 border-b border-border">
                    <span className="text-sm font-medium">Total Sewa</span>
                    <span className="text-lg font-semibold text-primary">
                        {formatRupiah(rentalAmount)}
                    </span>
                </div>

                {isDownPayment && (
                    <div className="flex items-baseline justify-between gap-2">
                        <span className="text-sm text-muted-foreground">
                            DP 50%
                        </span>
                        <span className="text-sm text-muted-foreground">
                            {formatRupiah(downPaymentAmount)}
                        </span>
                    </div>
                )}

                <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm text-muted-foreground">
                        Total Deposit
                    </span>
                    <span className="text-sm text-muted-foreground">
                        {formatRupiah(depositAmount)}
                    </span>
                </div>
            </div>

            <div className="mt-6 space-y-3">
                <div className="rounded-xl bg-background">
                    <div className="mb-3 flex items-center justify-between gap-3">

                        <QrisLogo className="h-5" />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <PaymentMethodCard
                            value="full"
                            checked={paymentType === "full"}
                            label="Bayar Penuh"
                            onChange={onPaymentTypeChange}
                        />
                        <PaymentMethodCard
                            value="down_payment"
                            checked={paymentType === "down_payment"}
                            label="DP 50%"
                            onChange={onPaymentTypeChange}
                        />
                    </div>
                </div>

                <div>
                    <Button
                        type="button"
                        className="w-full rounded-full transition-none mt-3"
                        disabled={checkoutDisabled}
                        onClick={onOpenConfirm}
                    >
                        {isCheckingOut ? "Memproses..." : "Checkout Sekarang"}
                    </Button>

                    {!allItemsReady && hasItems && (
                        <p className="mt-2 text-center text-xs text-destructive">
                            Tidak bisa checkout: ada item yang tidak tersedia untuk
                            tanggal ini.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

type PaymentMethodCardProps = {
    value: PaymentType;
    checked: boolean;
    label: string;
    onChange: (value: PaymentType) => void;
};

function PaymentMethodCard({
    value,
    checked,
    label,
    onChange,
}: PaymentMethodCardProps) {
    return (
        <label
            className={cn(
                "flex cursor-pointer select-none items-center gap-2.5 rounded-full border px-3 py-3 transition-none has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                checked
                    ? "border-primary"
                    : "border-input bg-background hover:opacity-75",
            )}
        >
            <input
                type="radio"
                name="payment-type"
                value={value}
                checked={checked}
                onChange={() => onChange(value)}
                className="sr-only"
            />
            <span
                className={cn(
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2",
                    checked ? "border-primary" : "border-muted-foreground/50",
                )}
            >
                {checked && (
                    <span className="h-2 w-2 rounded-full bg-primary" />
                )}
            </span>
            <span
                className={cn(
                    "text-sm font-medium",
                    checked ? "text-primary" : "text-foreground",
                )}
            >
                {label}
            </span>
        </label>
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
    onPackageVariantChange: (
        item: CartItemPayload,
        selections: Record<string, number | undefined>,
    ) => void;
    onRemove: (item: CartItemPayload) => void;
};

function CartItemList({
    items,
    busyItemId,
    onQuantityChange,
    onVariantChange,
    onPackageVariantChange,
    onRemove,
}: CartItemListProps) {
    return (
        <ul className="flex flex-col gap-4">
            {groupCartItems(items).map((group) => (
                <li key={group.key}>
                    <CartItemCard
                        group={group}
                        allItems={items}
                        busyItemId={busyItemId}
                        onQuantityChange={onQuantityChange}
                        onVariantChange={onVariantChange}
                        onPackageVariantChange={onPackageVariantChange}
                        onRemove={onRemove}
                    />
                </li>
            ))}
        </ul>
    );
}

type CartItemCardProps = {
    group: CartItemGroup;
    allItems: CartItemPayload[];
    busyItemId: number | null;
    onQuantityChange: (item: CartItemPayload, quantity: number) => void;
    onVariantChange: (item: CartItemPayload, variantId: number) => void;
    onPackageVariantChange: (
        item: CartItemPayload,
        selections: Record<string, number | undefined>,
    ) => void;
    onRemove: (item: CartItemPayload) => void;
};

function CartItemCard({
    group,
    allItems,
    busyItemId,
    onQuantityChange,
    onVariantChange,
    onPackageVariantChange,
    onRemove,
}: CartItemCardProps) {
    const firstItem = group.items[0];
    const isBundle = firstItem.type === "bundle";
    const href = group.slug
        ? isBundle
            ? showPackage.url({ packageSlug: group.slug })
            : showProduct.url({ productSlug: group.slug })
        : undefined;

    return (
        <div className="grid grid-cols-[auto_1fr] items-start gap-x-2 gap-y-2 rounded-xl border border-border bg-card p-3 sm:gap-x-4 sm:p-4">
            <div className="sm:row-span-2">
                <ItemThumbnail
                    image={group.image}
                    name={group.name}
                    href={href}
                />
            </div>

            <div className="flex min-h-12 min-w-0 items-center sm:min-h-0 sm:items-start">
                {href ? (
                    <Link
                        href={href}
                        className="line-clamp-2 break-words text-sm font-semibold leading-snug text-foreground transition-colors hover:text-primary sm:text-base"
                    >
                        {group.name}
                    </Link>
                ) : (
                    <p className="line-clamp-2 break-words text-sm font-semibold leading-snug sm:text-base">
                        {group.name}
                    </p>
                )}
            </div>

            {/* Blok varian: tanpa divider, cukup jarak antar blok */}
            <div className="col-span-2 flex min-w-0 flex-col gap-5 sm:col-span-1">
                {group.items.map((item) => (
                    <CartItemVariantRow
                        key={item.id}
                        item={item}
                        allItems={allItems}
                        busy={busyItemId === item.id}
                        onQuantityChange={onQuantityChange}
                        onVariantChange={onVariantChange}
                        onPackageVariantChange={onPackageVariantChange}
                        onRemove={onRemove}
                    />
                ))}
            </div>
        </div>
    );
}


type CartItemVariantRowProps = {
    item: CartItemPayload;
    allItems: CartItemPayload[];
    busy: boolean;
    onQuantityChange: (item: CartItemPayload, quantity: number) => void;
    onVariantChange: (item: CartItemPayload, variantId: number) => void;
    onPackageVariantChange: (
        item: CartItemPayload,
        selections: Record<string, number | undefined>,
    ) => void;
    onRemove: (item: CartItemPayload) => void;
};

function CartItemVariantRow({
    item,
    allItems,
    busy,
    onQuantityChange,
    onVariantChange,
    onPackageVariantChange,
    onRemove,
}: CartItemVariantRowProps) {
    return (
        <div
            className={cn(
                "flex flex-col gap-3",
                !item.is_rentable && "opacity-80",
            )}
        >
            {/* Row 1: varian + stok (kiri) | stepper + hapus (kanan) */}
            <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 flex-col items-start gap-1.5">

                    <CartItemVariant
                        item={item}
                        busy={busy}
                        onVariantChange={onVariantChange}
                    />
                    <CartItemStock item={item} allItems={allItems} />
                </div>

                <div className="flex shrink-0 items-center gap-1 sm:gap-2">

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
                    <QuantityStepper
                        value={item.quantity}
                        min={1}
                        max={cartLineStock(item, allItems).max}
                        disabled={busy || !item.is_rentable}
                        onChange={(quantity) =>
                            onQuantityChange(item, quantity)
                        }
                        ariaLabel={`Jumlah ${item.name}`}
                        className="shrink-0"
                    />
                </div>
            </div>

            {/* Row 2: pilihan varian bebas per item paket (baris bundle). */}
            {item.type === "bundle" && (
                <PackageVariantSelectors
                    item={item}
                    busy={busy}
                    onSelectionChange={onPackageVariantChange}
                />
            )}

            {/* Row 3: satu-satunya garis. Deposit kiri, harga sewa kanan */}
            <div className="flex items-baseline justify-between gap-3 border-t border-border/60 pt-3">
                <p className="text-xs text-muted-foreground">
                    Deposit {formatRupiah(item.deposit_subtotal)}
                </p>
                <p className="text-sm font-semibold text-foreground">
                    {formatRupiah(item.rental_subtotal)}
                </p>
            </div>
        </div>
    );
}

/**
 * Dropdown pemilih varian bebas untuk baris paket: preselect dari
 * pilihan yang tersimpan pada baris keranjang, satu dropdown per item
 * paket yang mengizinkan pemilihan — gaya yang sama dengan pemilih
 * varian baris produk biasa. Opsi nonaktif bila stok varian tidak
 * mencukupi quantity keranjang.
 */
function PackageVariantSelectors({
    item,
    busy,
    onSelectionChange,
}: {
    item: CartItemPayload;
    busy: boolean;
    onSelectionChange: (
        item: CartItemPayload,
        selections: Record<string, number | undefined>,
    ) => void;
}) {
    const selectable = (item.items ?? []).filter(
        (sub) =>
            sub.allow_variant_selection && sub.variant_options.length > 0,
    );

    if (selectable.length === 0) {
        return null;
    }

    return (
        <div className="flex flex-col gap-3">
            {selectable.map((sub) => {
                const minAvailable = sub.quantity * item.quantity;

                return (
                    <div key={sub.id} className="flex flex-col gap-1.5">
                        <p className="text-xs text-muted-foreground">
                            Varian {sub.name}
                        </p>
                        <Select
                            value={
                                sub.variant_id !== null
                                    ? String(sub.variant_id)
                                    : undefined
                            }
                            disabled={busy}
                            onValueChange={(value) => {
                                const variantId = Number(value);

                                if (variantId === sub.variant_id) {
                                    return;
                                }

                                const selections = Object.fromEntries(
                                    selectable
                                        .filter(
                                            (other) =>
                                                other.variant_id !== null,
                                        )
                                        .map((other) => [
                                            other.id,
                                            other.id === sub.id
                                                ? variantId
                                                : other.variant_id!,
                                        ]),
                                );

                                onSelectionChange(item, selections);
                            }}
                        >
                            <SelectTrigger
                                size="sm"
                                className="w-fit max-w-full text-xs"
                                aria-label={`Varian ${sub.name}`}
                            >
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {sub.variant_options.map((option) => {
                                    const label =
                                        option.values
                                            .map((value) => value.value)
                                            .join(" / ") || "Varian";
                                    const isUnavailable =
                                        option.available < minAvailable;

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
                    </div>
                );
            })}
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
            className="size-12 rounded-lg border border-border/20 object-cover sm:size-20 sm:rounded-xl"
        />
    ) : (
        <span className="flex size-12 items-center justify-center rounded-lg border border-border/20 bg-muted sm:size-20 sm:rounded-xl">
            <PackageIcon
                className="size-5 text-muted-foreground/40 sm:size-7"
                strokeWidth={1.5}
            />
        </span>
    );

    if (!href) {
        return content;
    }

    return (
        <Link href={href} tabIndex={-1} aria-hidden="true" className="block shrink-0">
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

function CartItemStock({
    item,
    allItems,
}: {
    item: CartItemPayload;
    allItems: CartItemPayload[];
}) {
    if (!item.is_rentable) {
        return (
            <p className="flex items-center gap-1.5 text-xs text-destructive">
                <CalendarXIcon className="size-3.5 shrink-0" />
                Tidak tersedia
            </p>
        );
    }

    const remaining = cartLineStock(item, allItems).remaining;

    if (remaining < item.quantity) {
        return (
            <p className="flex items-center gap-1.5 text-xs text-destructive">
                <CalendarXIcon className="size-3.5 shrink-0" />
                Sisa {remaining} unit
            </p>
        );
    }

    return (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarCheckIcon className="size-3.5 shrink-0 text-primary" />
            Sisa {remaining} unit
        </p>
    );
}
