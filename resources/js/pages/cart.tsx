import { Head, Link } from '@inertiajs/react';
import { useEffect } from 'react';
import { PackageIcon, ShoppingCartIcon, Trash2Icon } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { LandingHeader } from '@/components/landing/landing-header';
import { formatRupiah } from '@/components/product-shared';
import { QuantityStepper } from '@/components/quantity-stepper';
import { SiteFooter } from '@/components/site-footer';
import { Button } from '@/components/ui/button';
import { useCart } from '@/hooks/use-cart';
import { useRentalDates } from '@/hooks/use-rental-dates';
import { parseDateOnly, formatDateID } from '@/lib/rental-date';
import { removeCartItem, updateCartQuantity, type CartItem } from '@/lib/cart';
import { home } from '@/routes';
import { show as showPackage } from '@/routes/packages';
import { show as showProduct } from '@/routes/products';

export default function CartPage() {
    const cart = useCart();
    const { saveDates } = useRentalDates();
    const pickupDate = parseDateOnly(cart.pickup_date);
    const returnDate = parseDateOnly(cart.return_date);

    useEffect(() => {
        const nextPickup = parseDateOnly(cart.pickup_date);
        const nextReturn = parseDateOnly(cart.return_date);

        if (!nextPickup || !nextReturn) {
            return;
        }

        saveDates(nextPickup, nextReturn);
    }, [cart.pickup_date, cart.return_date, saveDates]);

    return (
        <>
            <Head title="Keranjang - OutdoorCondet" />

            <div className="min-h-screen bg-background">
                <LandingHeader />

                <main className="bg-muted/40">
                    <section className="mx-auto w-full max-w-6xl px-4 pt-24 pb-16 md:px-6">
                        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                            Keranjang
                        </h1>

                        {cart.isEmpty ? (
                            <EmptyCart />
                        ) : (
                            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
                                <div className="flex flex-col gap-3 lg:col-span-2">
                                    {pickupDate && returnDate && (
                                        <p className="text-sm text-muted-foreground">
                                            {formatDateID(pickupDate)} –{' '}
                                            {formatDateID(returnDate)} ·{' '}
                                            {cart.total_days} hari
                                        </p>
                                    )}

                                    {cart.items.map((item) => (
                                        <CartLine
                                            key={`${item.type}:${item.id}`}
                                            item={item}
                                            pickupDate={cart.pickup_date}
                                            returnDate={cart.return_date}
                                        />
                                    ))}
                                </div>

                                <aside className="h-fit rounded-lg border border-border bg-card p-6">
                                    <h2 className="text-lg font-semibold">
                                        Ringkasan
                                    </h2>
                                    <div className="mt-4 flex flex-col gap-2">
                                        <SummaryRow
                                            label="Sewa"
                                            value={formatRupiah(
                                                cart.totals.rental,
                                            )}
                                        />
                                        <SummaryRow
                                            label="Deposit"
                                            value={formatRupiah(
                                                cart.totals.deposit,
                                            )}
                                        />
                                        <div className="mt-1 flex items-baseline justify-between gap-2 border-t border-border pt-3">
                                            <span className="text-sm font-medium">
                                                Total
                                            </span>
                                            <span className="text-base font-semibold text-primary">
                                                {formatRupiah(
                                                    cart.totals.grand,
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                    <Button
                                        type="button"
                                        className="mt-5 w-full"
                                        disabled
                                    >
                                        Lanjut checkout
                                    </Button>
                                </aside>
                            </div>
                        )}
                    </section>
                </main>

                <SiteFooter />
            </div>
        </>
    );
}

function EmptyCart() {
    return (
        <EmptyState
            icon={ShoppingCartIcon}
            title="Keranjang masih kosong"
            description="Pilih tanggal sewa, lalu tambah alat atau paket."
            action={
                <Button asChild className="mt-2">
                    <Link href={home.url()}>Lihat katalog</Link>
                </Button>
            }
        />
    );
}

function CartLine({
    item,
    pickupDate,
    returnDate,
}: {
    item: CartItem;
    pickupDate: string;
    returnDate: string;
}) {
    return (
        <article className="flex gap-4 rounded-lg border border-border bg-card p-4">
            <Link
                href={itemHref(item, pickupDate, returnDate)}
                className="size-20 shrink-0 overflow-hidden rounded-md bg-muted"
            >
                {item.image ? (
                    <img
                        src={`/storage/${item.image}`}
                        alt={item.name}
                        className="size-full object-cover"
                    />
                ) : (
                    <div className="flex size-full items-center justify-center">
                        <PackageIcon
                            className="size-8 text-muted-foreground/40"
                            strokeWidth={1.5}
                        />
                    </div>
                )}
            </Link>

            <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                    <Link
                        href={itemHref(item, pickupDate, returnDate)}
                        className="line-clamp-1 font-semibold"
                        title={item.name}
                    >
                        {item.name}
                    </Link>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                        {formatRupiah(item.unit_price)}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <QuantityStepper
                        value={item.quantity}
                        max={item.available}
                        onChange={(quantity) =>
                            updateCartQuantity(item.type, item.id, quantity)
                        }
                    />
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        aria-label={`Hapus ${item.name}`}
                        onClick={() => removeCartItem(item.type, item.id)}
                    >
                        <Trash2Icon />
                    </Button>
                </div>
            </div>
        </article>
    );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm text-muted-foreground">{label}</span>
            <span className="text-sm font-semibold">{value}</span>
        </div>
    );
}

function itemHref(
    item: CartItem,
    pickupDate: string,
    returnDate: string,
): string {
    const path =
        item.type === 'product'
            ? showProduct.url({ productSlug: item.slug })
            : showPackage.url({ packageSlug: item.slug });

    return `${path}?pickup_date=${pickupDate}&return_date=${returnDate}`;
}
