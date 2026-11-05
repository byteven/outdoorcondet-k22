import { router, usePage } from '@inertiajs/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import InputError from '@/components/input-error';
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
import { Spinner } from '@/components/ui/spinner';
import { store } from '@/routes/admin/categories';

const createCategorySchema = z.object({
    name: z
        .string({ error: 'Nama kategori wajib diisi.' })
        .trim()
        .min(1, 'Nama kategori wajib diisi.')
        .max(100, 'Nama kategori maksimal 100 karakter.'),
    slug: z
        .string()
        .trim()
        .max(120, 'Slug maksimal 120 karakter.')
        .optional()
        .or(z.literal('')),
    description: z
        .string()
        .trim()
        .max(1000, 'Deskripsi maksimal 1000 karakter.')
        .optional()
        .or(z.literal('')),
});

type CreateCategoryFormData = z.infer<typeof createCategorySchema>;

export function CategoryFormDialog() {
    const [open, setOpen] = useState(false);
    const [processing, setProcessing] = useState(false);
    const serverErrors = usePage().props.errors;
    const formErrors = Object.fromEntries(
        Object.entries(serverErrors).filter(
            ([key]) => key !== 'updateCategory',
        ),
    ) as Record<string, string>;

    const {
        register,
        handleSubmit,
        reset,
        watch,
        formState: { errors },
    } = useForm<CreateCategoryFormData>({
        resolver: zodResolver(createCategorySchema),
        defaultValues: {
            name: '',
            slug: '',
            description: '',
        },
    });

    const watchedName = watch('name');

    useEffect(() => {
        if (Object.keys(formErrors).length > 0) {
            setOpen(true);
        }
    }, [serverErrors]);

    const closeDialog = (next: boolean) => {
        setOpen(next);

        if (!next) {
            reset();
        }
    };

    const onSubmit = (data: CreateCategoryFormData) => {
        router.post(
            store.url(),
            {
                name: data.name,
                slug: data.slug || undefined,
                description: data.description || undefined,
            },
            {
                onStart: () => setProcessing(true),
                onFinish: () => setProcessing(false),
                onSuccess: () => {
                    setOpen(false);
                    reset();
                    router.reload();
                },
            },
        );
    };

    return (
        <Dialog open={open} onOpenChange={closeDialog}>
            <DialogTrigger asChild>
                <Button>
                    <Plus />
                    Tambah kategori
                </Button>
            </DialogTrigger>
            <DialogContent className="flex max-h-[90dvh] flex-col overflow-hidden sm:max-w-md">
                <DialogHeader className="shrink-0">
                    <DialogTitle>Tambah kategori baru</DialogTitle>
                    <DialogDescription>
                        Tambahkan kategori peralatan camping untuk katalog
                        produk.
                    </DialogDescription>
                </DialogHeader>

                <form
                    id="create-category-form"
                    onSubmit={handleSubmit(onSubmit)}
                    className="min-h-0 flex-1 [scrollbar-width:thin] [scrollbar-color:var(--color-border)_transparent] overflow-y-auto px-1.5 py-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border"
                >
                    <div className="flex flex-col gap-4 py-2 pb-6">
                        <div className="grid gap-2">
                            <Label htmlFor="category-name">
                                Nama kategori{' '}
                                <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="category-name"
                                type="text"
                                placeholder="Contoh: Tenda & Shelter"
                                disabled={processing}
                                {...register('name')}
                            />
                            <InputError
                                message={
                                    errors.name?.message ?? formErrors.name
                                }
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="category-slug">
                                Slug URL{' '}
                                <span className="text-xs font-normal text-muted-foreground">
                                    (opsional)
                                </span>
                            </Label>
                            <Input
                                id="category-slug"
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
                            <p className="text-xs text-muted-foreground">
                                Biarkan kosong untuk membuat slug otomatis dari
                                nama kategori.
                            </p>
                            <InputError
                                message={
                                    errors.slug?.message ?? formErrors.slug
                                }
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="category-description">
                                Deskripsi{' '}
                                <span className="text-xs font-normal text-muted-foreground">
                                    (opsional)
                                </span>
                            </Label>
                            <textarea
                                id="category-description"
                                rows={3}
                                placeholder="Ringkasan atau panduan alat dalam kategori ini..."
                                disabled={processing}
                                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                                {...register('description')}
                            />
                            <InputError
                                message={
                                    errors.description?.message ??
                                    formErrors.description
                                }
                            />
                        </div>
                    </div>
                </form>

                <DialogFooter className="shrink-0">
                    <DialogClose asChild>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={processing}
                        >
                            Batal
                        </Button>
                    </DialogClose>
                    <Button
                        type="submit"
                        form="create-category-form"
                        disabled={processing}
                    >
                        {processing ? <Spinner className="size-4" /> : null}
                        Simpan kategori
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
