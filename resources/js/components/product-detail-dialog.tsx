import { router, usePage } from '@inertiajs/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Package, Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { DeleteConfirmDialog } from '@/components/delete-confirm-dialog';
import InputError from '@/components/input-error';
import {
    MAX_IMAGES,
    formatRupiah,
    productFormSchema,
    totalStock,
    validateImageFiles,
    variantLabel,
    type AttributeOption,
    type CategoryOption,
    type ProductFormData,
    type ProductRow,
} from '@/components/product-shared';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { destroy, update } from '@/routes/admin/products';
import { cn } from '@/lib/utils';

const dateFormatter = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
});

export function ProductDetailDialog({
    product,
    categories,
    attributes,
    onClose,
}: {
    product: ProductRow | null;
    categories: CategoryOption[];
    attributes: AttributeOption[];
    onClose: () => void;
}) {
    const [mode, setMode] = useState<'view' | 'edit'>('view');
    const [processing, setProcessing] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [keptImages, setKeptImages] = useState<number[]>([]);
    const [files, setFiles] = useState<File[]>([]);
    const [primary, setPrimary] = useState(0);
    const [fileError, setFileError] = useState<string | null>(null);
    const serverErrors = (usePage().props.errors.updateProduct ?? {}) as Record<
        string,
        string
    >;

    const {
        register,
        control,
        handleSubmit,
        reset,
        setValue,
        watch,
        formState: { errors, isDirty },
    } = useForm<ProductFormData>({
        resolver: zodResolver(productFormSchema),
        defaultValues: {
            category_id: 0,
            name: '',
            slug: '',
            description: '',
            is_active: true,
            variants: [],
        },
    });

    const {
        fields: variantFields,
        append: appendVariant,
        remove: removeVariant,
    } = useFieldArray({ control, name: 'variants' });

    useEffect(() => {
        if (product) {
            resetForm(product);
            setMode('view');
        }
    }, [product, reset]);

    if (!product) {
        return (
            <Dialog open={false} onOpenChange={(open) => !open && onClose()}>
                <DialogContent className="max-h-[90dvh] overflow-y-auto" />
            </Dialog>
        );
    }

    const resetForm = (source: ProductRow) => {
        reset({
            category_id: source.category_id,
            name: source.name,
            slug: source.slug,
            description: source.description ?? '',
            is_active: source.is_active,
            variants: source.variants.map((v) => ({
                id: v.id,
                sku: v.sku,
                stock: v.stock,
                rental_price_per_day: Number(v.rental_price_per_day),
                deposit_per_unit: Number(v.deposit_per_unit || 0),
                weight_grams: v.weight_grams,
                is_active: v.is_active,
                values: v.values.map((val) => ({
                    attribute_id: val.attribute_id,
                    value: val.value,
                })),
                duration_prices: (v.duration_prices || []).map((dp) => ({
                    id: dp.id,
                    duration_days: dp.duration_days,
                    price: Number(dp.price),
                })),
            })),
        });
        setKeptImages(source.images.map((img) => img.id));
        setFiles([]);
        setPrimary(
            Math.max(
                source.images.findIndex((img) => img.is_primary),
                0,
            ),
        );
        setFileError(null);
    };

    const cancelEdit = () => {
        resetForm(product);
        setMode('view');
    };

    const dirty =
        isDirty ||
        keptImages.length !== product.images.length ||
        files.length > 0;

    const onPickFiles = (list: FileList | null) => {
        if (!list) {
            return;
        }

        const picked = [...files, ...Array.from(list)].slice(
            0,
            Math.max(MAX_IMAGES - keptImages.length, 0),
        );
        const error = validateImageFiles(picked);

        setFileError(error);

        if (!error) {
            setFiles(picked);
        }
    };

    const onSubmit = (data: ProductFormData) => {
        const formData = new FormData();
        formData.append('_method', 'put');
        formData.append('category_id', String(data.category_id));
        formData.append('name', data.name);
        formData.append('slug', data.slug || '');
        formData.append('description', data.description || '');
        formData.append('is_active', data.is_active ? '1' : '0');
        formData.append('primary_image', String(primary));
        keptImages.forEach((id, i) => {
            formData.append(`keep_images[${i}]`, String(id));
        });

        data.variants.forEach((variant, i) => {
            if (variant.id) {
                formData.append(`variants[${i}][id]`, String(variant.id));
            }
            formData.append(`variants[${i}][sku]`, variant.sku);
            formData.append(`variants[${i}][stock]`, String(variant.stock));
            formData.append(
                `variants[${i}][rental_price_per_day]`,
                String(variant.rental_price_per_day),
            );
            formData.append(
                `variants[${i}][deposit_per_unit]`,
                String(variant.deposit_per_unit ?? 0),
            );
            (variant.duration_prices ?? []).forEach((dp, j) => {
                if (dp.id) {
                    formData.append(
                        `variants[${i}][duration_prices][${j}][id]`,
                        String(dp.id),
                    );
                }
                formData.append(
                    `variants[${i}][duration_prices][${j}][duration_days]`,
                    String(dp.duration_days),
                );
                formData.append(
                    `variants[${i}][duration_prices][${j}][price]`,
                    String(dp.price),
                );
            });
            formData.append(
                `variants[${i}][weight_grams]`,
                String(variant.weight_grams ?? 0),
            );
            formData.append(
                `variants[${i}][is_active]`,
                variant.is_active === false ? '0' : '1',
            );
            (variant.values ?? []).forEach((v, j) => {
                formData.append(
                    `variants[${i}][values][${j}][attribute_id]`,
                    String(v.attribute_id),
                );
                formData.append(`variants[${i}][values][${j}][value]`, v.value);
            });
        });

        files.forEach((file) => {
            formData.append('images[]', file);
        });

        router.post(update(product.id).url, formData, {
            forceFormData: true,
            errorBag: 'updateProduct',
            preserveState: true,
            onStart: () => setProcessing(true),
            onFinish: () => setProcessing(false),
            onSuccess: () => {
                setMode('view');
                router.reload();
            },
        });
    };

    const combinedCount = keptImages.length + files.length;
    const keptList = product.images.filter((img) =>
        keptImages.includes(img.id),
    );
    const primaryImage =
        product.images.find((img) => img.is_primary) ?? product.images[0];

    return (
        <Dialog
            open={product !== null}
            onOpenChange={(open) => !open && onClose()}
        >
            <DialogContent className="flex max-h-[90dvh] flex-col overflow-hidden sm:max-w-2xl">
                <DialogHeader className="shrink-0">
                    <DialogTitle>
                        {mode === 'view' ? 'Detail produk' : 'Ubah produk'}
                    </DialogTitle>
                    <DialogDescription>
                        {mode === 'view'
                            ? 'Pratinjau info, varian, dan gambar produk.'
                            : 'Ubah info, varian, atau gambar produk.'}
                    </DialogDescription>
                </DialogHeader>

                {mode === 'view' ? (
                    <>
                        <div className="min-h-0 flex-1 [scrollbar-width:thin] [scrollbar-color:var(--color-border)_transparent] overflow-y-auto px-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
                            <div className="flex flex-col gap-6 py-2">
                                <div className="flex flex-col gap-4 sm:flex-row">
                                    {primaryImage ? (
                                        <img
                                            src={`/storage/${primaryImage.image_path}`}
                                            alt={product.name}
                                            className="h-40 w-full shrink-0 rounded-lg border border-border object-cover sm:w-48"
                                        />
                                    ) : (
                                        <div className="flex h-40 w-full shrink-0 items-center justify-center rounded-lg border border-border bg-muted sm:w-48">
                                            <Package className="size-8 text-muted-foreground" />
                                        </div>
                                    )}
                                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Badge variant="secondary">
                                                {product.category?.name ?? '-'}
                                            </Badge>
                                            <Badge
                                                variant="secondary"
                                                className={
                                                    product.is_active
                                                        ? 'bg-success-muted text-success'
                                                        : 'bg-destructive/10 text-destructive'
                                                }
                                            >
                                                {product.is_active
                                                    ? 'Aktif'
                                                    : 'Nonaktif'}
                                            </Badge>
                                        </div>
                                        <p className="text-lg font-semibold">
                                            {product.name}
                                        </p>
                                        <p className="font-mono text-xs text-muted-foreground">
                                            /{product.slug}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            {product.description || '-'}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {product.variants.length} varian ·{' '}
                                            {totalStock(product)} unit · Dibuat{' '}
                                            {product.created_at
                                                ? dateFormatter.format(
                                                    new Date(
                                                        product.created_at,
                                                    ),
                                                )
                                                : '-'}
                                        </p>
                                    </div>
                                </div>

                                <section className="flex flex-col gap-2">
                                    <h3 className="text-sm font-semibold">
                                        Varian & stok
                                    </h3>
                                    {product.variants.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">
                                            Belum ada varian.
                                        </p>
                                    ) : (
                                        product.variants.map((variant) => (
                                            <div
                                                key={variant.id}
                                                className="flex items-center gap-3 rounded-lg border border-border p-3"
                                            >
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm font-medium">
                                                        {variantLabel(variant)}
                                                    </p>
                                                    <p className="truncate font-mono text-xs text-muted-foreground">
                                                        {variant.sku}
                                                    </p>
                                                </div>
                                                <div className="shrink-0 text-right text-sm">
                                                    <p className="font-medium">
                                                        {formatRupiah(
                                                            variant.rental_price_per_day,
                                                        )}
                                                        <span className="font-normal text-muted-foreground">
                                                            /hari
                                                        </span>
                                                    </p>
                                                    {Number(
                                                        variant.deposit_per_unit ||
                                                        0,
                                                    ) > 0 && (
                                                            <p className="text-xs text-muted-foreground">
                                                                Deposit:{' '}
                                                                {formatRupiah(
                                                                    variant.deposit_per_unit,
                                                                )}
                                                                /unit
                                                            </p>
                                                        )}
                                                    {variant.duration_prices &&
                                                        variant.duration_prices
                                                            .length > 0 && (
                                                            <p className="text-[11px] text-muted-foreground">
                                                                {variant.duration_prices
                                                                    .map(
                                                                        (dp) =>
                                                                            `${dp.duration_days}h: ${formatRupiah(dp.price)}`,
                                                                    )
                                                                    .join(', ')}
                                                            </p>
                                                        )}
                                                    <p className="text-xs text-muted-foreground">
                                                        {variant.stock} unit ·{' '}
                                                        {variant.weight_grams} g
                                                    </p>
                                                </div>
                                                {!variant.is_active && (
                                                    <Badge
                                                        variant="secondary"
                                                        className="bg-destructive/10 text-destructive"
                                                    >
                                                        Nonaktif
                                                    </Badge>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </section>

                                <section className="flex flex-col gap-2">
                                    <h3 className="text-sm font-semibold">
                                        Gambar ({product.images.length})
                                    </h3>
                                    {product.images.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">
                                            Belum ada gambar.
                                        </p>
                                    ) : (
                                        <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                                            {product.images.map((img) => (
                                                <div
                                                    key={img.id}
                                                    className="relative"
                                                >
                                                    <img
                                                        src={`/storage/${img.image_path}`}
                                                        alt={product.name}
                                                        className="aspect-square w-full rounded-md border border-border object-cover"
                                                    />
                                                    {img.is_primary && (
                                                        <Badge
                                                            variant="secondary"
                                                            className="absolute top-1 left-1 bg-success-muted text-success"
                                                        >
                                                            Utama
                                                        </Badge>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </section>
                            </div>
                        </div>

                        <DialogFooter className="shrink-0 sm:justify-between">
                            <DeleteConfirmDialog
                                title={`Hapus produk ${product.name}?`}
                                description="Produk beserta varian dan gambarnya akan dihapus dari katalog."
                                processing={deleting}
                                onConfirm={() => {
                                    router.delete(destroy(product.id).url, {
                                        preserveState: true,
                                        onStart: () => setDeleting(true),
                                        onFinish: () => setDeleting(false),
                                        onSuccess: () => {
                                            onClose();
                                            router.reload();
                                        },
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
                                    onClick={() => setMode('edit')}
                                    disabled={deleting}
                                >
                                    <Pencil />
                                    Ubah
                                </Button>
                            </div>
                        </DialogFooter>
                    </>
                ) : (
                    <>
                        <form
                            id="update-product-form"
                            onSubmit={handleSubmit(onSubmit)}
                            className="min-h-0 flex-1 [scrollbar-width:thin] [scrollbar-color:var(--color-border)_transparent] overflow-y-auto px-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border"
                        >
                            <div className="flex flex-col gap-6 py-2">
                                <section className="flex flex-col gap-4">
                                    <h3 className="text-sm font-semibold">
                                        Info produk
                                    </h3>
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                        <div className="grid gap-2">
                                            <Label htmlFor="edit-product-category">
                                                Kategori{' '}
                                                <span className="text-destructive">
                                                    *
                                                </span>
                                            </Label>
                                            <Select
                                                value={
                                                    watch('category_id')
                                                        ? String(
                                                            watch(
                                                                'category_id',
                                                            ),
                                                        )
                                                        : ''
                                                }
                                                onValueChange={(v) =>
                                                    setValue(
                                                        'category_id',
                                                        Number(v),
                                                        {
                                                            shouldDirty: true,
                                                            shouldValidate: true,
                                                        },
                                                    )
                                                }
                                            >
                                                <SelectTrigger
                                                    id="edit-product-category"
                                                    className="w-full"
                                                >
                                                    <SelectValue placeholder="Pilih kategori" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {categories.map((c) => (
                                                        <SelectItem
                                                            key={c.id}
                                                            value={String(c.id)}
                                                        >
                                                            {c.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <InputError
                                                message={
                                                    errors.category_id
                                                        ?.message ??
                                                    serverErrors.category_id
                                                }
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="edit-product-name">
                                                Nama produk{' '}
                                                <span className="text-destructive">
                                                    *
                                                </span>
                                            </Label>
                                            <Input
                                                id="edit-product-name"
                                                type="text"
                                                disabled={processing}
                                                {...register('name')}
                                            />
                                            <InputError
                                                message={
                                                    errors.name?.message ??
                                                    serverErrors.name
                                                }
                                            />
                                        </div>
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="edit-product-slug">
                                            Slug URL{' '}
                                            <span className="text-destructive">
                                                *
                                            </span>
                                        </Label>
                                        <Input
                                            id="edit-product-slug"
                                            type="text"
                                            disabled={processing}
                                            {...register('slug')}
                                        />
                                        <InputError
                                            message={
                                                errors.slug?.message ??
                                                serverErrors.slug
                                            }
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="edit-product-description">
                                            Deskripsi
                                        </Label>
                                        <textarea
                                            id="edit-product-description"
                                            rows={3}
                                            disabled={processing}
                                            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                                            {...register('description')}
                                        />
                                        <InputError
                                            message={
                                                errors.description?.message ??
                                                serverErrors.description
                                            }
                                        />
                                    </div>

                                    <label className="flex cursor-pointer items-center justify-between gap-2 rounded-lg border border-border p-3 text-sm">
                                        <span>
                                            <span className="block font-medium">
                                                Tampilkan di katalog
                                            </span>
                                            <span className="block text-xs text-muted-foreground">
                                                {watch('is_active')
                                                    ? 'Produk aktif dan terlihat pelanggan'
                                                    : 'Produk nonaktif dan disembunyikan'}
                                            </span>
                                        </span>
                                        <ActiveSwitch
                                            checked={watch('is_active')}
                                            onChange={(next) =>
                                                setValue('is_active', next, {
                                                    shouldDirty: true,
                                                })
                                            }
                                            disabled={processing}
                                            label="Status aktif produk"
                                        />
                                    </label>
                                </section>

                                <section className="flex flex-col gap-4">
                                    <h3 className="text-sm font-semibold">
                                        Varian & stok
                                    </h3>
                                    {variantFields.map((field, i) => (
                                        <div
                                            key={field.id}
                                            className="flex flex-col gap-3 rounded-lg border border-border p-4"
                                        >
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-semibold">
                                                    Varian {i + 1}{' '}
                                                    <span className="font-normal text-muted-foreground">
                                                        ·{' '}
                                                        {formatRupiah(
                                                            Number(
                                                                watch(
                                                                    `variants.${i}.rental_price_per_day`,
                                                                ),
                                                            ) || 0,
                                                        )}
                                                        /hari
                                                    </span>
                                                </p>
                                                {variantFields.length > 1 && (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() =>
                                                            removeVariant(i)
                                                        }
                                                    >
                                                        <Trash2 />
                                                        Hapus
                                                    </Button>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                                <div className="grid gap-2">
                                                    <Label>
                                                        SKU{' '}
                                                        <span className="text-destructive">
                                                            *
                                                        </span>
                                                    </Label>
                                                    <Input
                                                        disabled={processing}
                                                        {...register(
                                                            `variants.${i}.sku`,
                                                        )}
                                                    />
                                                    <InputError
                                                        message={
                                                            errors.variants?.[i]
                                                                ?.sku
                                                                ?.message ??
                                                            serverErrors[
                                                            `variants.${i}.sku`
                                                            ]
                                                        }
                                                    />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label>
                                                        Stok fisik{' '}
                                                        <span className="text-destructive">
                                                            *
                                                        </span>
                                                    </Label>
                                                    <Input
                                                        type="number"
                                                        min={0}
                                                        disabled={processing}
                                                        {...register(
                                                            `variants.${i}.stock`,
                                                            {
                                                                valueAsNumber: true,
                                                            },
                                                        )}
                                                    />
                                                    <InputError
                                                        message={
                                                            errors.variants?.[i]
                                                                ?.stock?.message
                                                        }
                                                    />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label>
                                                        Harga per hari (Rp){' '}
                                                        <span className="text-destructive">
                                                            *
                                                        </span>
                                                    </Label>
                                                    <Input
                                                        type="number"
                                                        min={0}
                                                        step={500}
                                                        disabled={processing}
                                                        {...register(
                                                            `variants.${i}.rental_price_per_day`,
                                                            {
                                                                valueAsNumber: true,
                                                            },
                                                        )}
                                                    />
                                                    <InputError
                                                        message={
                                                            errors.variants?.[i]
                                                                ?.rental_price_per_day
                                                                ?.message
                                                        }
                                                    />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label>
                                                        Harga deposit / unit
                                                        (Rp)
                                                    </Label>
                                                    <Input
                                                        type="number"
                                                        min={0}
                                                        step={1000}
                                                        placeholder="Contoh: 50000"
                                                        disabled={processing}
                                                        {...register(
                                                            `variants.${i}.deposit_per_unit`,
                                                            {
                                                                valueAsNumber: true,
                                                            },
                                                        )}
                                                    />
                                                    <InputError
                                                        message={
                                                            errors.variants?.[i]
                                                                ?.deposit_per_unit
                                                                ?.message
                                                        }
                                                    />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label
                                                        htmlFor={`variant-weight-${i}`}
                                                    >
                                                        Berat (gram)
                                                    </Label>
                                                    <Input
                                                        id={`variant-weight-${i}`}
                                                        type="number"
                                                        min={0}
                                                        disabled={processing}
                                                        {...register(
                                                            `variants.${i}.weight_grams`,
                                                            {
                                                                valueAsNumber: true,
                                                            },
                                                        )}
                                                    />
                                                </div>
                                            </div>
                                            <EditVariantValuesInput
                                                control={control}
                                                register={register}
                                                setValue={setValue}
                                                variantIndex={i}
                                                attributes={attributes}
                                                processing={processing}
                                                errors={errors}
                                                serverErrors={serverErrors}
                                            />
                                            <InputError
                                                message={
                                                    errors.variants?.[i]?.values
                                                        ?.message ??
                                                    errors.variants?.[i]?.values
                                                        ?.root?.message ??
                                                    serverErrors[
                                                        `variants.${i}.values`
                                                    ]
                                                }
                                            />
                                            <EditVariantDurationPricesInput
                                                control={control}
                                                register={register}
                                                variantIndex={i}
                                                processing={processing}
                                            />
                                        </div>
                                    ))}
                                    <InputError
                                        message={
                                            errors.variants?.message ??
                                            errors.variants?.root?.message ??
                                            serverErrors.variants
                                        }
                                    />
                                    <div>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() =>
                                                appendVariant({
                                                    sku: '',
                                                    stock: 1,
                                                    rental_price_per_day: 0,
                                                    deposit_per_unit: 0,
                                                    weight_grams: 0,
                                                    is_active: true,
                                                    values: [],
                                                    duration_prices: [],
                                                })
                                            }
                                            disabled={
                                                variantFields.length >= 20
                                            }
                                        >
                                            <Plus />
                                            Tambah varian
                                        </Button>
                                    </div>
                                </section>

                                <section className="flex flex-col gap-4">
                                    <h3 className="text-sm font-semibold">
                                        Gambar
                                    </h3>
                                    {keptList.length > 0 && (
                                        <div className="grid grid-cols-1 gap-2">
                                            <p className="text-xs font-medium text-muted-foreground">
                                                Gambar tersimpan
                                            </p>
                                            {keptList.map((img, order) => (
                                                <ImageRow
                                                    key={img.id}
                                                    src={`/storage/${img.image_path}`}
                                                    label={`Gambar ${order + 1}`}
                                                    checked={primary === order}
                                                    onPrimary={() =>
                                                        setPrimary(order)
                                                    }
                                                    onRemove={() =>
                                                        setKeptImages((ids) => {
                                                            const next =
                                                                ids.filter(
                                                                    (id) =>
                                                                        id !==
                                                                        img.id,
                                                                );
                                                            setPrimary((p) =>
                                                                p >= next.length
                                                                    ? Math.max(
                                                                        next.length -
                                                                        1,
                                                                        0,
                                                                    )
                                                                    : p,
                                                            );

                                                            return next;
                                                        })
                                                    }
                                                />
                                            ))}
                                        </div>
                                    )}
                                    <div className="grid gap-2">
                                        <Label htmlFor="edit-product-images">
                                            Tambah gambar (sisa kuota:{' '}
                                            {MAX_IMAGES - keptImages.length})
                                        </Label>
                                        <Input
                                            id="edit-product-images"
                                            type="file"
                                            accept="image/jpeg,image/png,image/jpg,image/webp"
                                            multiple
                                            disabled={
                                                processing ||
                                                keptImages.length >= MAX_IMAGES
                                            }
                                            onChange={(e) =>
                                                onPickFiles(e.target.files)
                                            }
                                        />
                                        <InputError
                                            message={fileError ?? undefined}
                                        />
                                    </div>
                                    {files.map((file, i) => (
                                        <ImageRow
                                            key={`${file.name}-${i}`}
                                            src={URL.createObjectURL(file)}
                                            label={file.name}
                                            checked={
                                                primary ===
                                                keptImages.length + i
                                            }
                                            onPrimary={() =>
                                                setPrimary(
                                                    keptImages.length + i,
                                                )
                                            }
                                            onRemove={() =>
                                                setFiles((f) =>
                                                    f.filter(
                                                        (_, idx) => idx !== i,
                                                    ),
                                                )
                                            }
                                        />
                                    ))}
                                    {combinedCount === 0 && (
                                        <p className="text-xs text-muted-foreground">
                                            Belum ada gambar. Produk tanpa
                                            gambar tetap bisa disimpan.
                                        </p>
                                    )}
                                </section>
                            </div>
                        </form>

                        <DialogFooter className="shrink-0 sm:justify-between">
                            <DeleteConfirmDialog
                                title={`Hapus produk ${product.name}?`}
                                description="Produk beserta varian dan gambarnya akan dihapus dari katalog."
                                processing={deleting}
                                onConfirm={() => {
                                    router.delete(destroy(product.id).url, {
                                        preserveState: true,
                                        onStart: () => setDeleting(true),
                                        onFinish: () => setDeleting(false),
                                        onSuccess: () => {
                                            onClose();
                                            router.reload();
                                        },
                                    });
                                }}
                            />
                            <div className="flex items-center gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={cancelEdit}
                                    disabled={processing || deleting}
                                >
                                    Batal
                                </Button>
                                <Button
                                    type="submit"
                                    form="update-product-form"
                                    disabled={processing || deleting || !dirty}
                                >
                                    {processing ? (
                                        <Spinner className="size-4" />
                                    ) : null}
                                    Simpan perubahan
                                </Button>
                            </div>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}

export function ActiveSwitch({
    checked,
    onChange,
    disabled,
    label,
}: {
    checked: boolean;
    onChange: (next: boolean) => void;
    disabled?: boolean;
    label: string;
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            disabled={disabled}
            onClick={() => onChange(!checked)}
            className={cn(
                'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50',
                checked ? 'bg-success' : 'bg-input',
            )}
        >
            <span
                className={cn(
                    'pointer-events-none block size-5 rounded-full bg-white transition-transform',
                    checked ? 'translate-x-[22px]' : 'translate-x-0.5',
                )}
            />
        </button>
    );
}

function ImageRow({
    src,
    label,
    checked,
    onPrimary,
    onRemove,
}: {
    src: string;
    label: string;
    checked: boolean;
    onPrimary: () => void;
    onRemove: () => void;
}) {
    return (
        <div className="flex items-center gap-3 rounded-lg border border-border p-2">
            <img
                src={src}
                alt={label}
                className="size-12 shrink-0 rounded-md border border-border object-cover"
            />
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{label}</p>
                <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
                    <input
                        type="radio"
                        name="edit-primary-image"
                        checked={checked}
                        onChange={onPrimary}
                        className="size-3.5 accent-(--color-primary)"
                    />
                    Jadikan utama
                    {checked && (
                        <span className="font-semibold text-primary">
                            (Utama)
                        </span>
                    )}
                </label>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
                <Trash2 />
            </Button>
        </div>
    );
}

function EditVariantValuesInput({
    control,
    register,
    setValue,
    variantIndex,
    attributes,
    processing,
    errors,
    serverErrors,
}: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    control: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    register: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setValue: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    errors: any;
    serverErrors: Record<string, string>;
    variantIndex: number;
    attributes: AttributeOption[];
    processing: boolean;
}) {
    const { fields, append, remove } = useFieldArray({
        control,
        name: `variants.${variantIndex}.values`,
    });

    return (
        <div className="flex flex-col gap-2 rounded-md bg-muted/40 p-3">
            <p className="text-xs font-medium text-muted-foreground">
                Atribut varian{' '}
                <span className="text-destructive">*</span>
            </p>
            {fields.map((field, j) => (
                <div key={field.id} className="flex flex-col gap-2">
                    <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
                        <div className="grid gap-1">
                            <Label className="text-xs">Atribut</Label>
                            <Select
                                defaultValue={String(
                                    (
                                        field as unknown as {
                                            attribute_id?: number;
                                        }
                                    ).attribute_id ?? '',
                                )}
                                onValueChange={(v) =>
                                    setValue(
                                        `variants.${variantIndex}.values.${j}.attribute_id`,
                                        Number(v),
                                        {
                                            shouldDirty: true,
                                            shouldValidate: true,
                                        },
                                    )
                                }
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Pilih" />
                                </SelectTrigger>
                                <SelectContent>
                                    {attributes.map((a) => (
                                        <SelectItem
                                            key={a.id}
                                            value={String(a.id)}
                                        >
                                            {a.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-1">
                            <Label className="text-xs">Nilai</Label>
                            <Input
                                placeholder="Merah, XL, 4 Orang..."
                                disabled={processing}
                                {...register(
                                    `variants.${variantIndex}.values.${j}.value`,
                                )}
                            />
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => remove(j)}
                            disabled={fields.length <= 1}
                            title={
                                fields.length <= 1
                                    ? 'Minimal satu atribut wajib diisi'
                                    : 'Hapus atribut'
                            }
                        >
                            <Trash2 />
                        </Button>
                    </div>
                    <InputError
                        message={
                            errors.variants?.[variantIndex]?.values?.[j]
                                ?.attribute_id?.message ??
                            errors.variants?.[variantIndex]?.values?.[j]?.value
                                ?.message ??
                            serverErrors[
                            `variants.${variantIndex}.values.${j}.attribute_id`
                            ] ??
                            serverErrors[
                            `variants.${variantIndex}.values.${j}.value`
                            ]
                        }
                    />
                </div>
            ))}
            <InputError
                message={
                    errors.variants?.[variantIndex]?.values?.message ??
                    serverErrors[`variants.${variantIndex}.values`]
                }
            />
            {attributes.length > 0 && (
                <div>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                            append({
                                attribute_id: attributes[0].id,
                                value: '',
                            })
                        }
                        disabled={fields.length >= 10}
                    >
                        <Plus />
                        Tambah atribut
                    </Button>
                </div>
            )}
        </div>
    );
}

function EditVariantDurationPricesInput({
    control,
    register,
    variantIndex,
    processing,
}: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    control: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    register: any;
    variantIndex: number;
    processing: boolean;
}) {
    const { fields, append, remove } = useFieldArray({
        control,
        name: `variants.${variantIndex}.duration_prices`,
    });

    return (
        <div className="flex flex-col gap-2 rounded-md bg-muted/40 p-3">
            <div>
                <p className="text-xs font-medium text-foreground">
                    Harga per Durasi{' '}
                    <span className="font-normal text-muted-foreground">
                        (opsional, mis. 3 hari = Rp50.000)
                    </span>
                </p>
                <p className="text-[11px] text-muted-foreground">
                    Tentukan harga total sewa untuk durasi tertentu.
                </p>
            </div>
            {fields.map((field, j) => (
                <div
                    key={field.id}
                    className="grid grid-cols-[1fr_1fr_auto] items-end gap-2"
                >
                    <div className="grid gap-1">
                        <Label className="text-xs">Durasi (hari)</Label>
                        <Input
                            id={`variant-duration-days-${variantIndex}-${j}`}
                            type="number"
                            min={2}
                            placeholder="Contoh: 3"
                            disabled={processing}
                            {...register(
                                `variants.${variantIndex}.duration_prices.${j}.duration_days`,
                                { valueAsNumber: true },
                            )}
                        />
                    </div>
                    <div className="grid gap-1">
                        <Label className="text-xs">Harga Total (Rp)</Label>
                        <Input
                            id={`variant-duration-price-${variantIndex}-${j}`}
                            type="number"
                            min={0}
                            step={500}
                            placeholder="Contoh: 50000"
                            disabled={processing}
                            {...register(
                                `variants.${variantIndex}.duration_prices.${j}.price`,
                                { valueAsNumber: true },
                            )}
                        />
                    </div>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(j)}
                    >
                        <Trash2 />
                    </Button>
                </div>
            ))}
            <div>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ duration_days: 3, price: 0 })}
                    disabled={fields.length >= 20}
                >
                    <Plus />
                    Tambah durasi
                </Button>
            </div>
        </div>
    );
}
