import { router, usePage } from '@inertiajs/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { FormStepper } from '@/components/form-stepper';
import InputError from '@/components/input-error';
import {
    MAX_IMAGES,
    STEPS,
    productFormSchema,
    validateImageFiles,
    type AttributeOption,
    type CategoryOption,
    type ProductFormData,
} from '@/components/product-shared';
import { Button } from '@/components/ui/button';
import { ActiveSwitch } from '@/components/product-detail-dialog';
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
import { store } from '@/routes/admin/products';

const defaultVariant = {
    sku: '',
    stock: 1,
    rental_price_per_day: 0,
    deposit_per_unit: 0,
    weight_grams: 0,
    is_active: true,
    values: [{ attribute_id: 0, value: '' }],
    duration_prices: [],
};

export function ProductFormDialog({
    categories,
    attributes,
}: {
    categories: CategoryOption[];
    attributes: AttributeOption[];
}) {
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState(0);
    const [processing, setProcessing] = useState(false);
    const [files, setFiles] = useState<File[]>([]);
    const [primary, setPrimary] = useState(0);
    const [fileError, setFileError] = useState<string | null>(null);
    const serverErrors = usePage().props.errors as Record<string, string>;

    const {
        register,
        control,
        handleSubmit,
        reset,
        watch,
        trigger,
        setValue,
        formState: { errors },
    } = useForm<ProductFormData>({
        resolver: zodResolver(productFormSchema),
        defaultValues: {
            category_id: 0,
            name: '',
            slug: '',
            description: '',
            is_active: true,
            variants: [{ ...defaultVariant, values: [{ attribute_id: 0, value: '' }] }],
        },
    });

    const {
        fields: variantFields,
        append: appendVariant,
        remove: removeVariant,
    } = useFieldArray({ control, name: 'variants' });

    const watchedName = watch('name');
    const watchedCategory = watch('category_id');

    const closeDialog = (next: boolean) => {
        setOpen(next);

        if (!next) {
            reset();
            setStep(0);
            setFiles([]);
            setPrimary(0);
            setFileError(null);
        }
    };

    useEffect(() => {
        if (!open) {
            return;
        }

        if (
            serverErrors.category_id ||
            serverErrors.name ||
            serverErrors.slug ||
            serverErrors.description
        ) {
            setStep(0);
        } else if (
            serverErrors.variants ||
            Object.keys(serverErrors).some((k) => k.startsWith('variants.'))
        ) {
            setStep(1);
        } else if (
            serverErrors.images ||
            Object.keys(serverErrors).some((k) => k.startsWith('images.'))
        ) {
            setStep(2);
        }
    }, [serverErrors, open]);

    const nextStep = async () => {
        const fields =
            step === 0
                ? (['category_id', 'name', 'slug', 'description'] as const)
                : (['variants'] as const);
        const valid = await trigger(fields as Parameters<typeof trigger>[0]);

        if (valid) {
            setStep((s) => Math.min(s + 1, STEPS.length - 1));
        }
    };

    const onPickFiles = (list: FileList | null) => {
        if (!list) {
            return;
        }

        const picked = [...files, ...Array.from(list)].slice(0, MAX_IMAGES);
        const error = validateImageFiles(picked);

        setFileError(error);
        setFiles(error ? files : picked);
    };

    const onSubmit = (data: ProductFormData) => {
        if (files.length > MAX_IMAGES) {
            setFileError(`Maksimal ${MAX_IMAGES} gambar per produk.`);

            return;
        }

        const formData = new FormData();
        formData.append('category_id', String(data.category_id));
        formData.append('name', data.name);

        if (data.slug) {
            formData.append('slug', data.slug);
        }

        if (data.description) {
            formData.append('description', data.description);
        }

        formData.append('is_active', data.is_active ? '1' : '0');
        formData.append('primary_image', String(primary));

        data.variants.forEach((variant, i) => {
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

        router.post(store.url(), formData, {
            forceFormData: true,
            onStart: () => setProcessing(true),
            onFinish: () => setProcessing(false),
            onSuccess: () => closeDialog(false),
        });
    };

    return (
        <Dialog open={open} onOpenChange={closeDialog}>
            <DialogTrigger asChild>
                <Button>
                    <Plus />
                    Tambah produk
                </Button>
            </DialogTrigger>
            <DialogContent className="flex max-h-[90dvh] flex-col overflow-hidden sm:max-w-2xl">
                <DialogHeader className="shrink-0">
                    <DialogTitle>Tambah produk baru</DialogTitle>
                    <DialogDescription>
                        Isi info produk, varian & stok fisik, lalu unggah
                        gambar.
                    </DialogDescription>
                </DialogHeader>

                <div className="shrink-0 px-1 py-2">
                    <FormStepper steps={[...STEPS]} currentStep={step} />
                </div>

                <form
                    id="create-product-form"
                    onSubmit={handleSubmit(onSubmit)}
                    className="min-h-0 flex-1 [scrollbar-width:thin] [scrollbar-color:var(--color-border)_transparent] overflow-y-auto px-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border"
                >
                    {step === 0 && (
                        <div className="flex flex-col gap-4 py-2">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="product-category">
                                        Kategori{' '}
                                        <span className="text-destructive">
                                            *
                                        </span>
                                    </Label>
                                    <Select
                                        value={
                                            watchedCategory
                                                ? String(watchedCategory)
                                                : ''
                                        }
                                        onValueChange={(v) =>
                                            setValue('category_id', Number(v), {
                                                shouldValidate: true,
                                            })
                                        }
                                    >
                                        <SelectTrigger
                                            id="product-category"
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
                                            errors.category_id?.message ??
                                            serverErrors.category_id
                                        }
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="product-name">
                                        Nama produk{' '}
                                        <span className="text-destructive">
                                            *
                                        </span>
                                    </Label>
                                    <Input
                                        id="product-name"
                                        type="text"
                                        placeholder="Contoh: Tenda Dome 4 Orang"
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
                                <Label htmlFor="product-slug">
                                    Slug URL{' '}
                                    <span className="text-xs font-normal text-muted-foreground">
                                        (opsional)
                                    </span>
                                </Label>
                                <Input
                                    id="product-slug"
                                    type="text"
                                    placeholder={
                                        watchedName
                                            ? watchedName
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

                            <div className="grid gap-2">
                                <Label htmlFor="product-description">
                                    Deskripsi{' '}
                                    <span className="text-xs font-normal text-muted-foreground">
                                        (opsional)
                                    </span>
                                </Label>
                                <textarea
                                    id="product-description"
                                    rows={3}
                                    placeholder="Bahan, kapasitas, dan kelengkapan produk..."
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

                            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm">
                                <span className="flex flex-col">
                                    <span className="font-medium text-foreground">
                                        Tampilkan di katalog
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        {watch('is_active')
                                            ? 'Produk aktif dan dapat disewa oleh pelanggan'
                                            : 'Produk nonaktif dan disembunyikan dari katalog'}
                                    </span>
                                </span>
                                <ActiveSwitch
                                    checked={watch('is_active')}
                                    onChange={(next) =>
                                        setValue('is_active', next)
                                    }
                                    disabled={processing}
                                    label="Status aktif produk"
                                />
                            </label>
                        </div>
                    )}

                    {step === 1 && (
                        <div className="flex flex-col gap-4 py-2">
                            {variantFields.map((field, i) => (
                                <div
                                    key={field.id}
                                    className="flex flex-col gap-3 rounded-lg border border-border p-4"
                                >
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-semibold">
                                            Varian {i + 1}
                                        </p>
                                        {variantFields.length > 1 && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => removeVariant(i)}
                                            >
                                                <Trash2 />
                                                Hapus
                                            </Button>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                        <div className="grid gap-2">
                                            <Label htmlFor={`variant-sku-${i}`}>
                                                SKU{' '}
                                                <span className="text-destructive">
                                                    *
                                                </span>
                                            </Label>
                                            <Input
                                                id={`variant-sku-${i}`}
                                                placeholder="Contoh: TND-DOME4-MRH"
                                                disabled={processing}
                                                {...register(
                                                    `variants.${i}.sku`,
                                                )}
                                            />
                                            <InputError
                                                message={
                                                    errors.variants?.[i]?.sku
                                                        ?.message ??
                                                    serverErrors[
                                                    `variants.${i}.sku`
                                                    ]
                                                }
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label
                                                htmlFor={`variant-stock-${i}`}
                                            >
                                                Stok fisik{' '}
                                                <span className="text-destructive">
                                                    *
                                                </span>
                                            </Label>
                                            <Input
                                                id={`variant-stock-${i}`}
                                                type="number"
                                                min={0}
                                                disabled={processing}
                                                {...register(
                                                    `variants.${i}.stock`,
                                                    { valueAsNumber: true },
                                                )}
                                            />
                                            <InputError
                                                message={
                                                    errors.variants?.[i]?.stock
                                                        ?.message ??
                                                    serverErrors[
                                                    `variants.${i}.stock`
                                                    ]
                                                }
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label
                                                htmlFor={`variant-price-${i}`}
                                            >
                                                Harga per hari (Rp){' '}
                                                <span className="text-destructive">
                                                    *
                                                </span>
                                            </Label>
                                            <Input
                                                id={`variant-price-${i}`}
                                                type="number"
                                                min={0}
                                                step={500}
                                                disabled={processing}
                                                {...register(
                                                    `variants.${i}.rental_price_per_day`,
                                                    { valueAsNumber: true },
                                                )}
                                            />
                                            <InputError
                                                message={
                                                    errors.variants?.[i]
                                                        ?.rental_price_per_day
                                                        ?.message ??
                                                    serverErrors[
                                                    `variants.${i}.rental_price_per_day`
                                                    ]
                                                }
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label
                                                htmlFor={`variant-deposit-${i}`}
                                            >
                                                Harga deposit / unit (Rp)
                                            </Label>
                                            <Input
                                                id={`variant-deposit-${i}`}
                                                type="number"
                                                min={0}
                                                step={1000}
                                                placeholder="Contoh: 50000"
                                                disabled={processing}
                                                {...register(
                                                    `variants.${i}.deposit_per_unit`,
                                                    { valueAsNumber: true },
                                                )}
                                            />
                                            <InputError
                                                message={
                                                    errors.variants?.[i]
                                                        ?.deposit_per_unit
                                                        ?.message ??
                                                    serverErrors[
                                                    `variants.${i}.deposit_per_unit`
                                                    ]
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
                                                    { valueAsNumber: true },
                                                )}
                                            />
                                            <InputError
                                                message={
                                                    errors.variants?.[i]
                                                        ?.weight_grams?.message
                                                }
                                            />
                                        </div>
                                    </div>
                                    <VariantValuesInput
                                        control={control}
                                        register={register}
                                        setValue={setValue}
                                        variantIndex={i}
                                        attributes={attributes}
                                        processing={processing}
                                        errors={errors}
                                        serverErrors={serverErrors}
                                    />
                                    <VariantDurationPricesInput
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
                                            ...defaultVariant,
                                            values: [{ attribute_id: 0, value: '' }],
                                        })
                                    }
                                    disabled={variantFields.length >= 20}
                                >
                                    <Plus />
                                    Tambah varian
                                </Button>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="flex flex-col gap-4 py-2">
                            <div className="grid gap-2">
                                <Label htmlFor="product-images">
                                    Gambar produk (maksimal {MAX_IMAGES})
                                </Label>
                                <Input
                                    id="product-images"
                                    type="file"
                                    accept="image/jpeg,image/png,image/jpg,image/webp"
                                    multiple
                                    disabled={processing}
                                    onChange={(e) =>
                                        onPickFiles(e.target.files)
                                    }
                                />
                                <p className="text-xs text-muted-foreground">
                                    Format JPG, PNG, atau WebP, maksimal 2 MB
                                    per gambar.
                                </p>
                                <InputError
                                    message={fileError ?? serverErrors.images}
                                />
                            </div>
                            {files.length > 0 && (
                                <div className="grid grid-cols-1 gap-2">
                                    {files.map((file, i) => (
                                        <div
                                            key={`${file.name}-${i}`}
                                            className="flex items-center gap-3 rounded-lg border border-border p-2"
                                        >
                                            <img
                                                src={URL.createObjectURL(file)}
                                                alt={file.name}
                                                className="size-12 shrink-0 rounded-md border border-border object-cover"
                                            />
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-medium">
                                                    {file.name}
                                                </p>
                                                <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
                                                    <input
                                                        type="radio"
                                                        name="primary-image"
                                                        checked={primary === i}
                                                        onChange={() =>
                                                            setPrimary(i)
                                                        }
                                                        className="size-3.5 accent-(--color-primary)"
                                                    />
                                                    Jadikan utama
                                                    {primary === i && (
                                                        <span className="font-semibold text-primary">
                                                            (Utama)
                                                        </span>
                                                    )}
                                                </label>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    setFiles((f) =>
                                                        f.filter(
                                                            (_, idx) =>
                                                                idx !== i,
                                                        ),
                                                    );
                                                    setPrimary((p) =>
                                                        p >= i && p > 0
                                                            ? p - 1
                                                            : p,
                                                    );
                                                }}
                                            >
                                                <Trash2 />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </form>

                <DialogFooter className="shrink-0 sm:justify-between">
                    <div>
                        {step > 0 && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setStep((s) => s - 1)}
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
                                key="btn-step-next"
                                type="button"
                                onClick={nextStep}
                                disabled={processing}
                            >
                                Lanjut
                            </Button>
                        ) : (
                            <Button
                                key="btn-step-submit"
                                type="submit"
                                form="create-product-form"
                                disabled={processing}
                            >
                                {processing ? (
                                    <Spinner className="size-4" />
                                ) : null}
                                Simpan produk
                            </Button>
                        )}
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function VariantValuesInput({
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
    variantIndex: number;
    attributes: AttributeOption[];
    processing: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    errors: any;
    serverErrors: Record<string, string>;
}) {
    const { fields, append, remove } = useFieldArray({
        control,
        name: `variants.${variantIndex}.values`,
    });

    return (
        <div className="flex flex-col gap-2 rounded-md bg-muted/40 p-3">
            <p className="text-xs font-medium text-muted-foreground">
                Atribut varian{' '}
                <span className="text-destructive">*</span>{' '}
                <span className="font-normal">(contoh: Warna = Merah)</span>
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

function VariantDurationPricesInput({
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
