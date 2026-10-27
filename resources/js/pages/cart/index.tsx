import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
    ArrowRightIcon,
    CalendarArrowDownIcon,
    CalendarArrowUpIcon,
    PackageIcon,
    Trash2Icon,
} from 'lucide-react';
import { QuantityStepper } from '@/components/quantity-stepper';
import { LandingHeader } from '@/components/landing/landing-header';
import { RentalRange, type RentalRangeParams } from '@/components/rental-range';
import { SiteFooter } from '@/components/site-footer';
import { Button } from '@/components/ui/button';
import { formatRupiah } from '@/components/product-shared';
import { formatDateID } from '@/lib/rental-date';
import { cn } from '@/lib/utils';
import {
    syncRentalRangePersistence,
    toRentalQueryDate,
    useActiveRental,
} from '@/hooks/use-rental-dates';
import {
    dates as cartDates,
    destroy as cartDestroy,
    index as cartIndex,
    update as cartUpdate,
} from '@/routes/cart';
import { home } from '@/routes';
import { show as showProduct } from '@/routes/products';

type CartItemType = 'alat' | 'bundle';

type CartItemPayload = {
    id: number;
    type: CartItemType;
    name: string;
    sku: string | null;
    slug: string | null;
    image: string | null;
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

    const { items, summary } = cart;
    const hasItems = items.length > 0;
    const serverPickupKey = items[0]?.pickup_date;
    const serverReturnKey = items[0]?.return_date;

    const { saveDates, clearDates, activeRental } = useActiveRental({});

    // Semua item keranjang memakai SATU rentang tanggal yang sama dengan
    // rentang sewa aktif di landing/detail produk. Saat masuk halaman:
    // - rentang aktif ada   -> tanggal server disesuaikan ke rentang aktif;
    // - rentang aktif kosong-> rentang dari item server dipakai sebagai
    //                          rentang aktif bersama.
    useEffect(() => {
        if (!activeRental) {
            const pickup = parseDate(serverPickupKey);
            const returnDate = parseDate(serverReturnKey);

            if (pickup && returnDate) {
                saveDates(pickup, returnDate);
            }

            return;
        }

        const pickupKey = toRentalQueryDate(activeRental.pickupDate);
        const returnKey = toRentalQueryDate(activeRental.returnDate);

        if (!serverPickupKey || !serverReturnKey) {
            return;
        }

        if (pickupKey === serverPickupKey && returnKey === serverReturnKey) {
            return;
        }

        router.put(
            cartDates.url(),
            { pickup_date: pickupKey, return_date: returnKey },
            {
                preserveState: true,
                preserveScroll: true,
                onError: (errors) => {
                    const message =
                        errors.pickup_date ??
                        errors.return_date ??
                        Object.values(errors)[0];

                    if (typeof message === 'string') {
                        toast.error(message);
                    }
                },
            },
        );
    }, [activeRental, serverPickupKey, serverReturnKey, saveDates, clearDates]);

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

                    if (typeof message === 'string') {
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

    // Tanpa tombol "Cek": begitu kedua tanggal terpilih, rentang aktif
    // bersama diperbarui dan semua item di server ikut disesuaikan.
    // Rentang tidak boleh dikosongkan di keranjang (item wajib punya
    // tanggal sewa), jadi clear diabaikan sampai tanggal baru dipilih.
    const handleRangeChange = ({
        pickupDate,
        returnDate,
    }: RentalRangeParams) => {
        if (!pickupDate || !returnDate) {
            return;
        }

        syncRentalRangePersistence(
            pickupDate,
            returnDate,
            saveDates,
            clearDates,
        );

        router.put(
            cartDates.url(),
            {
                pickup_date: toRentalQueryDate(pickupDate),
                return_date: toRentalQueryDate(returnDate),
            },
            {
                preserveState: true,
                preserveScroll: true,
                onError: (errors) => {
                    const message =
                        errors.pickup_date ??
                        errors.return_date ??
                        Object.values(errors)[0];

                    if (typeof message === 'string') {
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
                        </div>

                        {hasItems ? (
                            <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_20rem] lg:gap-8">
                                <div className="flex min-w-0 flex-col gap-4">
                                    <RentalRange
                                        variant="compact"
                                        className="rounded-2xl border border-border bg-card p-3"
                                        initialPickupDate={
                                            activeRental?.pickupDate ??
                                            parseDate(serverPickupKey)
                                        }
                                        initialReturnDate={
                                            activeRental?.returnDate ??
                                            parseDate(serverReturnKey)
                                        }
                                        hideButton
                                        onSearch={handleRangeChange}
                                    />

                                    <CartItemList
                                        items={items}
                                        busyItemId={busyItemId}
                                        onQuantityChange={handleQuantityChange}
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

type CartItemListProps = {
    items: CartItemPayload[];
    busyItemId: number | null;
    onQuantityChange: (item: CartItemPayload, quantity: number) => void;
    onRemove: (item: CartItemPayload) => void;
};

function CartItemList({
    items,
    busyItemId,
    onQuantityChange,
    onRemove,
}: CartItemListProps) {
    return (
        <ul className="flex flex-col gap-4">
            {items.map((item) => (
                <li key={item.id}>
                    <CartItemRow
                        item={item}
                        busy={busyItemId === item.id}
                        onQuantityChange={onQuantityChange}
                        onRemove={onRemove}
                    />
                </li>
            ))}
        </ul>
    );
}

type CartItemRowProps = {
    item: CartItemPayload;
    busy: boolean;
    onQuantityChange: (item: CartItemPayload, quantity: number) => void;
    onRemove: (item: CartItemPayload) => void;
};

function CartItemRow({
    item,
    busy,
    onQuantityChange,
    onRemove,
}: CartItemRowProps) {
    const href = item.slug
        ? showProduct.url({
            productSlug: item.slug,
        })
        : undefined;

    return (
        <div
            className={cn(
                'rounded-2xl border border-border bg-card p-4',
                !item.is_rentable && 'opacity-80',
            )}
        >
            <div className="flex gap-4">
                <ItemThumbnail
                    image={item.image}
                    name={item.name}
                    href={href}
                />

                <div className="flex min-w-0 flex-1 flex-col gap-2.5">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            {href ? (
                                <Link
                                    href={href}
                                    className="block truncate font-semibold text-foreground transition-colors hover:text-primary"
                                >
                                    {item.name}
                                </Link>
                            ) : (
                                <p className="truncate font-semibold">
                                    {item.name}
                                </p>
                            )}

                            <p className="mt-0.5 text-xs text-muted-foreground">
                                {item.type === 'alat'
                                    ? `Alat${item.sku ? ` - ${item.sku}` : ''}`
                                    : 'Paket'}
                            </p>
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

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                            <CalendarArrowDownIcon className="size-3.5 text-primary" />
                            Ambil {formatDateID(parseDate(item.pickup_date))}
                        </span>
                        <span className="flex items-center gap-1.5">
                            <CalendarArrowUpIcon className="size-3.5 text-primary" />
                            Kembali {formatDateID(parseDate(item.return_date))}
                        </span>
                        <span>{item.total_days} hari</span>
                    </div>

                    <div className="mt-auto flex flex-wrap items-end justify-between gap-3">
                        <QuantityStepper
                            value={item.quantity}
                            min={1}
                            max={item.max_quantity}
                            disabled={busy || !item.is_rentable}
                            onChange={(quantity) =>
                                onQuantityChange(item, quantity)
                            }
                            ariaLabel={`Jumlah ${item.name}`}
                        />

                        <div className="text-right">
                            <p className="text-sm font-semibold text-foreground">
                                {formatRupiah(item.rental_subtotal)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Deposit {formatRupiah(item.deposit_subtotal)}
                            </p>
                        </div>
                    </div>

                    <CartItemWarnings item={item} />
                </div>
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

function CartItemWarnings({ item }: { item: CartItemPayload }) {
    if (item.is_rentable && !item.is_out_of_stock) {
        return null;
    }

    return (
        <p
            className={cn(
                'text-xs',
                item.is_rentable ? 'text-amber-600' : 'text-destructive',
            )}
        >
            {!item.is_rentable
                ? 'Item tidak lagi tersedia. Hapus dari keranjang untuk melanjutkan sewa.'
                : `Stok tersedia hanya ${item.available} unit untuk tanggal ini.`}
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
                Deposit disetor saat ambil barang, dikembalikan saat pengembalian barang.
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

function parseDate(value?: string): Date | undefined {
    if (!value) {
        return undefined;
    }

    const [year, month, day] = value.split('-').map(Number);

    if (!year || !month || !day) {
        return undefined;
    }

    return new Date(year, month - 1, day);
}
