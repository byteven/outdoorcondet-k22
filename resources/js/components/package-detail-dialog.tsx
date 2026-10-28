import { router } from '@inertiajs/react';
import { Boxes, Pencil } from 'lucide-react';
import { useState } from 'react';
import { DeleteConfirmDialog } from '@/components/delete-confirm-dialog';
import { type PackageRow } from '@/components/package-shared';
import { formatRupiah, variantLabel } from '@/components/product-shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { destroy } from '@/routes/admin/packages';

const dateFormatter = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
});

export function PackageDetailDialog({
    package: packageRow,
    onClose,
    onEdit,
}: {
    package: PackageRow | null;
    onClose: () => void;
    onEdit: (packageRow: PackageRow) => void;
}) {
    const [deleting, setDeleting] = useState(false);

    if (!packageRow) {
        return (
            <Dialog open={false} onOpenChange={(open) => !open && onClose()}>
                <DialogContent className="max-h-[90dvh] overflow-y-auto" />
            </Dialog>
        );
    }

    return (
        <Dialog
            open={packageRow !== null}
            onOpenChange={(open) => !open && onClose()}
        >
            <DialogContent className="flex max-h-[90dvh] flex-col overflow-hidden sm:max-w-2xl">
                <DialogHeader className="shrink-0">
                    <DialogTitle>Detail paket</DialogTitle>
                    <DialogDescription>
                        Pratinjau info, komposisi, harga, dan ketersediaan
                        paket.
                    </DialogDescription>
                </DialogHeader>

                <div className="min-h-0 flex-1 [scrollbar-width:thin] [scrollbar-color:var(--color-border)_transparent] overflow-y-auto px-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
                    <div className="flex flex-col gap-6 py-2 pb-6">
                        <div className="flex flex-col gap-4 sm:flex-row">
                            {packageRow.image_path ? (
                                <img
                                    src={`/storage/${packageRow.image_path}`}
                                    alt={packageRow.name}
                                    className="h-40 w-full shrink-0 rounded-lg border border-border object-cover sm:w-48"
                                />
                            ) : (
                                <div className="flex h-40 w-full shrink-0 items-center justify-center rounded-lg border border-border bg-muted sm:w-48">
                                    <Boxes className="size-8 text-muted-foreground" />
                                </div>
                            )}
                            <div className="flex min-w-0 flex-1 flex-col gap-2">
                                <div className="flex flex-wrap items-center gap-2">
                                    <Badge variant="secondary">
                                        {packageRow.items.length} item
                                    </Badge>
                                    <Badge
                                        variant="secondary"
                                        className={
                                            packageRow.is_active
                                                ? 'bg-success-muted text-success'
                                                : 'bg-destructive/10 text-destructive'
                                        }
                                    >
                                        {packageRow.is_active
                                            ? 'Aktif'
                                            : 'Nonaktif'}
                                    </Badge>
                                </div>
                                <p className="text-lg font-semibold">
                                    {packageRow.name}
                                </p>
                                <p className="font-mono text-xs text-muted-foreground">
                                    /{packageRow.slug}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    {packageRow.description || '-'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Ketersediaan {packageRow.available_stock}{' '}
                                    paket · Dibuat{' '}
                                    {packageRow.created_at
                                        ? dateFormatter.format(
                                              new Date(packageRow.created_at),
                                          )
                                        : '-'}
                                </p>
                            </div>
                        </div>

                        <section className="flex flex-col gap-2">
                            <h3 className="text-sm font-semibold">
                                Komposisi paket
                            </h3>
                            {packageRow.items.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                    Belum ada item paket.
                                </p>
                            ) : (
                                packageRow.items.map((item) => {
                                    const stock = item.allow_variant_selection
                                        ? (item.product?.variants ?? [])
                                              .filter(
                                                  (variant) =>
                                                      variant.is_active,
                                              )
                                              .reduce(
                                                  (total, variant) =>
                                                      total + variant.stock,
                                                  0,
                                              )
                                        : (item.variant?.stock ?? 0);

                                    return (
                                        <div
                                            key={item.id ?? item.product_id}
                                            className="flex items-center gap-3 rounded-lg border border-border p-3"
                                        >
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-medium">
                                                    {item.product?.name ??
                                                        item.variant?.product
                                                            ?.name ??
                                                        item.variant?.sku ??
                                                        'Item'}
                                                </p>
                                                <p className="truncate text-xs text-muted-foreground">
                                                    {item.allow_variant_selection
                                                        ? 'Pelanggan bebas memilih varian'
                                                        : item.variant
                                                          ? variantLabel(
                                                                item.variant,
                                                            )
                                                          : '-'}
                                                </p>
                                            </div>
                                            <div className="shrink-0 text-right text-sm">
                                                <p className="font-medium">
                                                    {item.quantity} unit
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    Stok{' '}
                                                    {item.allow_variant_selection
                                                        ? 'varian aktif'
                                                        : 'varian'}
                                                    : {stock}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </section>

                        <section className="flex flex-col gap-2">
                            <h3 className="text-sm font-semibold">
                                Harga & deposit
                            </h3>
                            <div className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                                <span className="text-muted-foreground">
                                    Harga 1 hari
                                </span>
                                <span className="font-medium">
                                    {formatRupiah(packageRow.daily_price)}
                                </span>
                            </div>
                            <div className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                                <span className="text-muted-foreground">
                                    Deposit per paket
                                </span>
                                <span className="font-medium">
                                    {formatRupiah(
                                        packageRow.deposit_per_package,
                                    )}
                                </span>
                            </div>
                            {packageRow.duration_prices.length > 0 && (
                                <div className="flex flex-col gap-1 rounded-lg border border-border p-3 text-sm">
                                    <span className="text-muted-foreground">
                                        Harga per durasi
                                    </span>
                                    {packageRow.duration_prices.map((price) => (
                                        <div
                                            key={price.duration_days}
                                            className="flex items-center justify-between"
                                        >
                                            <span>
                                                {price.duration_days} hari
                                            </span>
                                            <span className="font-medium">
                                                {formatRupiah(price.price)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    </div>
                </div>

                <DialogFooter className="shrink-0 sm:justify-between">
                    <DeleteConfirmDialog
                        title={`Hapus paket ${packageRow.name}?`}
                        description="Paket beserta komposisi dan harganya akan dihapus dari katalog."
                        processing={deleting}
                        onConfirm={() => {
                            router.delete(destroy(packageRow.id).url, {
                                preserveState: true,
                                onStart: () => setDeleting(true),
                                onFinish: () => setDeleting(false),
                                onSuccess: () => onClose(),
                            });
                        }}
                    />
                    <div className="flex items-center gap-2">
                        <DialogClose asChild>
                            <Button
                                type="button"
                                variant="outline"
                                disabled={deleting}
                            >
                                Tutup
                            </Button>
                        </DialogClose>
                        <Button
                            type="button"
                            onClick={() => onEdit(packageRow)}
                            disabled={deleting}
                        >
                            <Pencil />
                            Ubah
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
