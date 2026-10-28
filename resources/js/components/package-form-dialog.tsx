import { router, usePage } from '@inertiajs/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { FormStepper } from '@/components/form-stepper';
import InputError from '@/components/input-error';
import {
    packageFormSchema,
    packageVariantLabel,
    type PackageFormData,
    type PackageProductOption,
    type PackageRow,
} from '@/components/package-shared';
import { ActiveSwitch } from '@/components/product-detail-dialog';
import { validateImageFiles } from '@/components/product-shared';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
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
import { store, update } from '@/routes/admin/packages';

const STEPS = [
    { label: 'Info paket' },
    { label: 'Komposisi' },
    { label: 'Harga & deposit' },
] as const;

function emptyForm(): PackageFormData {
    return {
        name: '',
        slug: '',
        description: '',
        daily_price: 0,
        deposit_per_package: 0,
        is_active: true,
        items: [
            {
                product_id: 0,
                allow_variant_selection: false,
                product_variant_id: null,
                quantity: 1,
            },
        ],
        duration_prices: [],
    };
}

export function PackageFormDialog({
    products,
    package: packageRow = null,
    open: controlledOpen,
    onOpenChange,
    trigger,
}: {
    products: PackageProductOption[];
    package?: PackageRow | null;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    trigger?: ReactNode;
}) {
    const isControlled = controlledOpen !== undefined;
    const [internalOpen, setInternalOpen] = useState(false);
    const [step, setStep] = useState(0);
    const [processing, setProcessing] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imageError, setImageError] = useState<string | null>(null);
    const [removeImage, setRemoveImage] = useState(false);
    const serverErrors = (usePage().props.errors.packageForm ?? {}) as Record<
        string,
        string
    >;

    const open = isControlled ? controlledOpen : internalOpen;
    const isEdit = packageRow !== null;

    const {
        register,
        control,
        handleSubmit,
        reset,
        watch,
        trigger: validate,
        setValue,
        formState: { errors },
    } = useForm<PackageFormData>({
        resolver: zodResolver(packageFormSchema),
        defaultValues: emptyForm(),
    });

    const {
        fields: itemFields,
        append: appendItem,
        remove: removeItem,
    } = useFieldArray({ control, name: 'items' });

    const {
        fields: durationFields,
        append: appendDuration,
        remove: removeDuration,
    } = useFieldArray({ control, name: 'duration_prices' });

    const imagePreview = useMemo(
        () => (imageFile ? URL.createObjectURL(imageFile) : null),
        [imageFile],
    );

    useEffect(() => {
        return () => {
            if (imagePreview) {
                URL.revokeObjectURL(imagePreview);
            }
        };
    }, [imagePreview]);

    useEffect(() => {
        if (!open) {
            return;
        }

        if (packageRow) {
            reset({
                name: packageRow.name,
                slug: packageRow.slug,
                description: packageRow.description ?? '',
                daily_price: Number(packageRow.daily_price),
                deposit_per_package: Number(packageRow.deposit_per_package),
                is_active: packageRow.is_active,
                items: packageRow.items.map((item) => ({
                    product_id: item.product_id,
                    allow_variant_selection: item.allow_variant_selection,
                    product_variant_id: item.product_variant_id,
                    quantity: item.quantity,
                })),
                duration_prices: packageRow.duration_prices.map((price) => ({
                    duration_days: price.duration_days,
                    price: Number(price.price),
                })),
            });
        } else {
            reset(emptyForm());
        }

        setStep(0);
        setImageFile(null);
        setImageError(null);
        setRemoveImage(false);
    }, [open, packageRow?.id, reset]);

    useEffect(() => {
        if (!open) {
            return;
        }

        const keys = Object.keys(serverErrors);

        if (
            keys.some((key) =>
                [
                    'name',
                    'slug',
                    'description',
                    'daily_price',
                    'deposit_per_package',
                    'image',
                    'is_active',
                ].includes(key),
            )
        ) {
            setStep(0);
        } else if (keys.some((key) => key.startsWith('items'))) {
            setStep(1);
        } else if (keys.some((key) => key.startsWith('duration_prices'))) {
            setStep(2);
        }
    }, [serverErrors, open]);

    const setOpen = (next: boolean) => {
        if (!isControlled) {
            setInternalOpen(next);
        }

        onOpenChange?.(next);
    };

    const closeDialog = (next: boolean) => {
        setOpen(next);

        if (!next) {
            setStep(0);
            setImageFile(null);
            setImageError(null);
            setRemoveImage(false);
            reset(emptyForm());
        }
    };

    const nextStep = async () => {
        const fields =
            step === 0
                ? ([
                      'name',
                      'slug',
                      'description',
                      'daily_price',
                      'deposit_per_package',
                  ] as const)
                : step === 1
                  ? (['items'] as const)
                  : (['duration_prices'] as const);
        const valid = await validate(fields as Parameters<typeof validate>[0]);

        if (valid) {
            setStep((current) => Math.min(current + 1, STEPS.length - 1));
        }
    };

    const onPickImage = (list: FileList | null) => {
        const file = list?.[0];

        if (!file) {
            return;
        }

        const error = validateImageFiles([file]);

        setImageError(error);
        setImageFile(error ? null : file);

        if (!error) {
            setRemoveImage(false);
        }
    };

    const onSubmit = (data: PackageFormData) => {
        const formData = new FormData();
        formData.append('name', data.name);

        if (data.slug) {
            formData.append('slug', data.slug);
        }

        if (data.description) {
            formData.append('description', data.description);
        }

        formData.append('daily_price', String(data.daily_price));
        formData.append(
            'deposit_per_package',
            String(data.deposit_per_package ?? 0),
        );
        formData.append('is_active', data.is_active ? '1' : '0');

        data.items.forEach((item, i) => {
            formData.append(`items[${i}][product_id]`, String(item.product_id));
            formData.append(
                `items[${i}][allow_variant_selection]`,
                item.allow_variant_selection ? '1' : '0',
            );
            formData.append(`items[${i}][quantity]`, String(item.quantity));

            if (!item.allow_variant_selection && item.product_variant_id) {
                formData.append(
                    `items[${i}][product_variant_id]`,
                    String(item.product_variant_id),
                );
            }
        });

        (data.duration_prices ?? []).forEach((price, i) => {
            formData.append(
                `duration_prices[${i}][duration_days]`,
                String(price.duration_days),
            );
            formData.append(
                `duration_prices[${i}][price]`,
                String(price.price),
            );
        });

        if (imageFile) {
            formData.append('image', imageFile);
        }

        if (removeImage) {
            formData.append('remove_image', '1');
        }

        const options = {
            forceFormData: true,
            errorBag: 'packageForm',
            preserveState: true,
            onStart: () => setProcessing(true),
            onFinish: () => setProcessing(false),
            onSuccess: () => closeDialog(false),
        };

        if (isEdit && packageRow) {
            formData.append('_method', 'put');
            router.post(update(packageRow.id).url, formData, options);
        } else {
            router.post(store.url(), formData, options);
        }
    };

    const previewSrc =
        imagePreview ??
        (!removeImage && packageRow?.image_path
            ? `/storage/${packageRow.image_path}`
            : null);

    return (
        <Dialog open={open} onOpenChange={closeDialog}>
            {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
            <DialogContent className="flex max-h-[90dvh] flex-col overflow-hidden sm:max-w-2xl">
                <DialogHeader className="shrink-0">
                    <DialogTitle>
                        {isEdit ? 'Ubah paket' : 'Tambah paket baru'}
                    </DialogTitle>
                    <DialogDescription>
                        {isEdit
                            ? 'Ubah info, komposisi, harga, atau gambar paket.'
                            : 'Isi info paket, komposisi produk, lalu atur harga dan deposit.'}
                    </DialogDescription>
                </DialogHeader>

                <div className="shrink-0 px-1 py-2">
                    <FormStepper steps={[...STEPS]} currentStep={step} />
                </div>

                <form
                    id="package-form"
                    onSubmit={handleSubmit(onSubmit)}
                    className="min-h-0 flex-1 [scrollbar-width:thin] [scrollbar-color:var(--color-border)_transparent] overflow-y-auto px-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border"
                >
                    {step === 0 && (
                        <div className="flex flex-col gap-4 py-2 pb-6">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="package-name">
                                        Nama paket{' '}
                                        <span className="text-destructive">
                                            *
                                        </span>
                                    </Label>
                                    <Input
                                        id="package-name"
                                        type="text"
                                        placeholder="Contoh: Paket Camping Dasar"
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
                                <div className="grid gap-2">
                                    <Label htmlFor="package-slug">
                                        Slug URL
                                    </Label>
                                    <Input
                                        id="package-slug"
                                        type="text"
                                        placeholder={
                                            watch('name')
                                                ? watch('name')
                                                      .toLowerCase()
                                                      .replace(/[^\w ]+/g, '')
                                                      .replace(/ +/g, '-')
                                                : 'otomatis dari nama'
                                        }
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
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="package-description">
                                    Deskripsi
                                </Label>
                                <textarea
                                    id="package-description"
                                    rows={3}
                                    placeholder="Isi paket, kapasitas, dan kelengkapan..."
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

                            <div className="grid gap-2">
                                <Label htmlFor="package-image">
                                    Gambar paket
                                </Label>
                                {previewSrc ? (
                                    <div className="flex items-center gap-3 rounded-lg border border-border p-2">
                                        <img
                                            src={previewSrc}
                                            alt="Pratinjau paket"
                                            className="size-16 shrink-0 rounded-md border border-border object-cover"
                                        />
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-medium">
                                                {imageFile
                                                    ? imageFile.name
                                                    : 'Gambar tersimpan'}
                                            </p>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                disabled={processing}
                                                onClick={() => {
                                                    if (imageFile) {
                                                        setImageFile(null);
                                                    } else {
                                                        setRemoveImage(true);
                                                    }
                                                }}
                                            >
                                                <Trash2 />
                                                {imageFile
                                                    ? 'Batalkan unggahan'
                                                    : 'Hapus gambar'}
                                            </Button>
                                        </div>
                                    </div>
                                ) : null}
                                <Input
                                    id="package-image"
                                    type="file"
                                    accept="image/jpeg,image/png,image/jpg,image/webp"
                                    disabled={processing}
                                    onChange={(e) =>
                                        onPickImage(e.target.files)
                                    }
                                />
                                <p className="text-xs text-muted-foreground">
                                    Format JPG, PNG, atau WebP, maksimal 2 MB.
                                </p>
                                <InputError
                                    message={imageError ?? serverErrors.image}
                                />
                            </div>

                            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm">
                                <span className="flex flex-col">
                                    <span className="font-medium text-foreground">
                                        Tampilkan di katalog
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        {watch('is_active')
                                            ? 'Paket aktif dan dapat disewa oleh pelanggan'
                                            : 'Paket nonaktif dan disembunyikan dari katalog'}
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
                                    label="Status aktif paket"
                                />
                            </label>
                        </div>
                    )}

                    {step === 1 && (
                        <div className="flex flex-col gap-4 py-2 pb-6">
                            <div>
                                <p className="text-sm font-semibold">
                                    Komposisi paket
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Pilih produk dan jumlahnya. Satu produk
                                    hanya boleh muncul sekali dalam paket.
                                </p>
                            </div>

                            {itemFields.map((field, i) => {
                                const productId = watch(
                                    `items.${i}.product_id`,
                                );
                                const allowSelection = watch(
                                    `items.${i}.allow_variant_selection`,
                                );
                                const variantId = watch(
                                    `items.${i}.product_variant_id`,
                                );
                                const selectedProduct = products.find(
                                    (product) => product.id === productId,
                                );
                                const selectedVariant =
                                    selectedProduct?.variants.find(
                                        (variant) => variant.id === variantId,
                                    );
                                const activeStock =
                                    selectedProduct?.variants
                                        .filter(
                                            (variant) =>
                                                variant.is_active !== false,
                                        )
                                        .reduce(
                                            (total, variant) =>
                                                total + variant.stock,
                                            0,
                                        ) ?? 0;

                                return (
                                    <div
                                        key={field.id}
                                        className="flex flex-col gap-3 rounded-lg border border-border p-4"
                                    >
                                        <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[1fr_120px_auto]">
                                            <div className="grid gap-1">
                                                <Label className="text-xs">
                                                    Produk{' '}
                                                    <span className="text-destructive">
                                                        *
                                                    </span>
                                                </Label>
                                                <Select
                                                    value={
                                                        productId
                                                            ? String(productId)
                                                            : ''
                                                    }
                                                    onValueChange={(value) => {
                                                        const nextProduct =
                                                            products.find(
                                                                (product) =>
                                                                    product.id ===
                                                                    Number(
                                                                        value,
                                                                    ),
                                                            );

                                                        setValue(
                                                            `items.${i}.product_id`,
                                                            Number(value),
                                                            {
                                                                shouldDirty: true,
                                                                shouldValidate: true,
                                                            },
                                                        );
                                                        setValue(
                                                            `items.${i}.product_variant_id`,
                                                            null,
                                                            {
                                                                shouldDirty: true,
                                                                shouldValidate: true,
                                                            },
                                                        );

                                                        if (
                                                            !nextProduct ||
                                                            nextProduct.variants
                                                                .length === 0
                                                        ) {
                                                            setValue(
                                                                `items.${i}.allow_variant_selection`,
                                                                false,
                                                                {
                                                                    shouldDirty: true,
                                                                },
                                                            );
                                                        }
                                                    }}
                                                >
                                                    <SelectTrigger className="w-full">
                                                        <SelectValue placeholder="Pilih produk" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {products.map(
                                                            (product) => (
                                                                <SelectItem
                                                                    key={
                                                                        product.id
                                                                    }
                                                                    value={String(
                                                                        product.id,
                                                                    )}
                                                                >
                                                                    {
                                                                        product.name
                                                                    }
                                                                </SelectItem>
                                                            ),
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                                <InputError
                                                    message={
                                                        errors.items?.[i]
                                                            ?.product_id
                                                            ?.message ??
                                                        serverErrors[
                                                            `items.${i}.product_id`
                                                        ]
                                                    }
                                                />
                                            </div>
                                            <div className="grid gap-1">
                                                <Label className="text-xs">
                                                    Jumlah
                                                </Label>
                                                <Input
                                                    type="number"
                                                    min={1}
                                                    disabled={processing}
                                                    {...register(
                                                        `items.${i}.quantity`,
                                                        {
                                                            valueAsNumber: true,
                                                        },
                                                    )}
                                                />
                                                <InputError
                                                    message={
                                                        errors.items?.[i]
                                                            ?.quantity
                                                            ?.message ??
                                                        serverErrors[
                                                            `items.${i}.quantity`
                                                        ]
                                                    }
                                                />
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                disabled={
                                                    processing ||
                                                    itemFields.length <= 1
                                                }
                                                onClick={() => removeItem(i)}
                                            >
                                                <Trash2 />
                                            </Button>
                                        </div>

                                        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-border/60 p-3 text-sm">
                                            <span className="flex flex-col">
                                                <span className="font-medium">
                                                    Pelanggan bebas memilih
                                                    varian
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    Jika aktif, varian dipilih
                                                    pelanggan saat checkout.
                                                </span>
                                            </span>
                                            <ActiveSwitch
                                                checked={allowSelection}
                                                onChange={(next) => {
                                                    setValue(
                                                        `items.${i}.allow_variant_selection`,
                                                        next,
                                                        {
                                                            shouldDirty: true,
                                                            shouldValidate: true,
                                                        },
                                                    );

                                                    if (next) {
                                                        setValue(
                                                            `items.${i}.product_variant_id`,
                                                            null,
                                                            {
                                                                shouldDirty: true,
                                                                shouldValidate: true,
                                                            },
                                                        );
                                                    }
                                                }}
                                                disabled={
                                                    processing ||
                                                    !selectedProduct ||
                                                    selectedProduct.variants
                                                        .length === 0
                                                }
                                                label={`Pemilihan varian item ${i + 1}`}
                                            />
                                        </label>

                                        {!allowSelection && (
                                            <div className="grid gap-1">
                                                <Label className="text-xs">
                                                    Varian{' '}
                                                    <span className="text-destructive">
                                                        *
                                                    </span>
                                                </Label>
                                                <Select
                                                    value={
                                                        variantId
                                                            ? String(variantId)
                                                            : ''
                                                    }
                                                    onValueChange={(value) =>
                                                        setValue(
                                                            `items.${i}.product_variant_id`,
                                                            Number(value),
                                                            {
                                                                shouldDirty: true,
                                                                shouldValidate: true,
                                                            },
                                                        )
                                                    }
                                                    disabled={
                                                        processing ||
                                                        !selectedProduct ||
                                                        selectedProduct.variants
                                                            .length === 0
                                                    }
                                                >
                                                    <SelectTrigger className="w-full">
                                                        <SelectValue
                                                            placeholder={
                                                                selectedProduct
                                                                    ? 'Pilih varian'
                                                                    : 'Pilih produk dulu'
                                                            }
                                                        />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {(
                                                            selectedProduct?.variants ??
                                                            []
                                                        ).map((variant) => (
                                                            <SelectItem
                                                                key={variant.id}
                                                                value={String(
                                                                    variant.id,
                                                                )}
                                                            >
                                                                {packageVariantLabel(
                                                                    variant,
                                                                    selectedProduct?.name,
                                                                )}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <InputError
                                                    message={
                                                        errors.items?.[i]
                                                            ?.product_variant_id
                                                            ?.message ??
                                                        serverErrors[
                                                            `items.${i}.product_variant_id`
                                                        ]
                                                    }
                                                />
                                            </div>
                                        )}

                                        {!allowSelection && selectedVariant && (
                                            <p className="text-xs text-muted-foreground">
                                                Stok varian:{' '}
                                                {selectedVariant.stock} unit
                                            </p>
                                        )}

                                        {allowSelection && selectedProduct && (
                                            <p className="text-xs text-muted-foreground">
                                                Stok seluruh varian aktif:{' '}
                                                {activeStock} unit. Pelanggan
                                                memilih varian saat checkout.
                                            </p>
                                        )}

                                        {selectedProduct &&
                                            selectedProduct.variants.length ===
                                                0 && (
                                                <p className="text-xs text-muted-foreground">
                                                    Produk ini belum memiliki
                                                    varian.
                                                </p>
                                            )}
                                    </div>
                                );
                            })}

                            <InputError
                                message={
                                    errors.items?.message ??
                                    errors.items?.root?.message ??
                                    serverErrors.items
                                }
                            />

                            {products.length === 0 && (
                                <p className="text-sm text-muted-foreground">
                                    Belum ada produk. Tambahkan produk terlebih
                                    dahulu.
                                </p>
                            )}

                            <div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={
                                        processing ||
                                        itemFields.length >= 50 ||
                                        products.length === 0
                                    }
                                    onClick={() =>
                                        appendItem({
                                            product_id: 0,
                                            allow_variant_selection: false,
                                            product_variant_id: null,
                                            quantity: 1,
                                        })
                                    }
                                >
                                    <Plus />
                                    Tambah item
                                </Button>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="flex flex-col gap-6 py-2 pb-6">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="package-daily-price">
                                        Harga 1 hari (Rp){' '}
                                        <span className="text-destructive">
                                            *
                                        </span>
                                    </Label>
                                    <Input
                                        id="package-daily-price"
                                        type="number"
                                        min={0}
                                        step={500}
                                        disabled={processing}
                                        {...register('daily_price', {
                                            valueAsNumber: true,
                                        })}
                                    />
                                    <InputError
                                        message={
                                            errors.daily_price?.message ??
                                            serverErrors.daily_price
                                        }
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="package-deposit">
                                        Deposit per paket (Rp)
                                    </Label>
                                    <Input
                                        id="package-deposit"
                                        type="number"
                                        min={0}
                                        step={1000}
                                        placeholder="Contoh: 150000"
                                        disabled={processing}
                                        {...register('deposit_per_package', {
                                            valueAsNumber: true,
                                        })}
                                    />
                                    <InputError
                                        message={
                                            errors.deposit_per_package
                                                ?.message ??
                                            serverErrors.deposit_per_package
                                        }
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col gap-2 rounded-lg border border-border p-4">
                                <div>
                                    <p className="text-sm font-semibold">
                                        Harga per durasi
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Tentukan harga total paket untuk durasi
                                        tertentu, misalnya 3 hari = Rp140.000.
                                    </p>
                                </div>

                                {durationFields.map((field, i) => (
                                    <div
                                        key={field.id}
                                        className="grid grid-cols-[1fr_1fr_auto] items-end gap-2"
                                    >
                                        <div className="grid gap-1">
                                            <Label className="text-xs">
                                                Durasi (hari)
                                            </Label>
                                            <Input
                                                type="number"
                                                min={2}
                                                placeholder="Contoh: 3"
                                                disabled={processing}
                                                {...register(
                                                    `duration_prices.${i}.duration_days`,
                                                    {
                                                        valueAsNumber: true,
                                                    },
                                                )}
                                            />
                                            <InputError
                                                message={
                                                    errors.duration_prices?.[i]
                                                        ?.duration_days
                                                        ?.message ??
                                                    serverErrors[
                                                        `duration_prices.${i}.duration_days`
                                                    ]
                                                }
                                            />
                                        </div>
                                        <div className="grid gap-1">
                                            <Label className="text-xs">
                                                Harga total (Rp)
                                            </Label>
                                            <Input
                                                type="number"
                                                min={0}
                                                step={500}
                                                placeholder="Contoh: 140000"
                                                disabled={processing}
                                                {...register(
                                                    `duration_prices.${i}.price`,
                                                    {
                                                        valueAsNumber: true,
                                                    },
                                                )}
                                            />
                                            <InputError
                                                message={
                                                    errors.duration_prices?.[i]
                                                        ?.price?.message ??
                                                    serverErrors[
                                                        `duration_prices.${i}.price`
                                                    ]
                                                }
                                            />
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            disabled={processing}
                                            onClick={() => removeDuration(i)}
                                        >
                                            <Trash2 />
                                        </Button>
                                    </div>
                                ))}

                                <InputError
                                    message={
                                        errors.duration_prices?.message ??
                                        errors.duration_prices?.root?.message ??
                                        serverErrors.duration_prices
                                    }
                                />

                                <div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        disabled={
                                            processing ||
                                            durationFields.length >= 20
                                        }
                                        onClick={() =>
                                            appendDuration({
                                                duration_days: 2,
                                                price: 0,
                                            })
                                        }
                                    >
                                        <Plus />
                                        Tambah durasi
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </form>

                <DialogFooter className="shrink-0 sm:justify-between">
                    <div>
                        {step > 0 && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() =>
                                    setStep((current) => current - 1)
                                }
                                disabled={processing}
                            >
                                Kembali
                            </Button>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <DialogClose asChild>
                            <Button
                                type="button"
                                variant="outline"
                                disabled={processing}
                            >
                                Batal
                            </Button>
                        </DialogClose>
                        {step < STEPS.length - 1 ? (
                            <Button
                                key="package-next"
                                type="button"
                                onClick={nextStep}
                                disabled={processing}
                            >
                                Lanjut
                            </Button>
                        ) : (
                            <Button
                                key="package-submit"
                                type="submit"
                                form="package-form"
                                disabled={processing}
                            >
                                {processing ? (
                                    <Spinner className="size-4" />
                                ) : null}
                                {isEdit ? 'Simpan perubahan' : 'Simpan paket'}
                            </Button>
                        )}
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
