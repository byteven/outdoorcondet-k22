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
import { store } from '@/routes/admin/attributes';

const createAttributeSchema = z.object({
    name: z
        .string({ error: 'Nama atribut wajib diisi.' })
        .trim()
        .min(1, 'Nama atribut wajib diisi.')
        .max(50, 'Nama atribut maksimal 50 karakter.'),
    description: z
        .string()
        .trim()
        .max(500, 'Deskripsi maksimal 500 karakter.')
        .optional()
        .or(z.literal('')),
});

type CreateAttributeFormData = z.infer<typeof createAttributeSchema>;

export function AttributeFormDialog() {
    const [open, setOpen] = useState(false);
    const [processing, setProcessing] = useState(false);
    const serverErrors = usePage().props.errors;
    const formErrors = Object.fromEntries(
        Object.entries(serverErrors).filter(
            ([key]) => key !== 'updateAttribute',
        ),
    ) as Record<string, string>;

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<CreateAttributeFormData>({
        resolver: zodResolver(createAttributeSchema),
        defaultValues: {
            name: '',
            description: '',
        },
    });

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

    const onSubmit = (data: CreateAttributeFormData) => {
        router.post(
            store.url(),
            {
                name: data.name,
                description: data.description || undefined,
            },
            {
                onStart: () => setProcessing(true),
                onFinish: () => setProcessing(false),
                onSuccess: () => {
                    setOpen(false);
                    reset();
                },
            },
        );
    };

    return (
        <Dialog open={open} onOpenChange={closeDialog}>
            <DialogTrigger asChild>
                <Button>
                    <Plus />
                    Tambah atribut
                </Button>
            </DialogTrigger>
            <DialogContent className="flex max-h-[90dvh] flex-col overflow-hidden sm:max-w-md">
                <DialogHeader className="shrink-0">
                    <DialogTitle>Tambah atribut baru</DialogTitle>
                    <DialogDescription>
                        Tambahkan jenis atribut untuk varian produk seperti
                        Warna, Ukuran, atau Kapasitas.
                    </DialogDescription>
                </DialogHeader>

                <form
                    id="create-attribute-form"
                    onSubmit={handleSubmit(onSubmit)}
                    className="min-h-0 flex-1 [scrollbar-width:thin] [scrollbar-color:var(--color-border)_transparent] overflow-y-auto px-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border"
                >
                    <div className="flex flex-col gap-4 py-2">
                        <div className="grid gap-2">
                            <Label htmlFor="attribute-name">
                                Nama atribut{' '}
                                <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="attribute-name"
                                type="text"
                                placeholder="Contoh: Warna, Ukuran, Kapasitas"
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
                            <Label htmlFor="attribute-description">
                                Deskripsi{' '}
                                <span className="text-xs font-normal text-muted-foreground">
                                    (opsional)
                                </span>
                            </Label>
                            <textarea
                                id="attribute-description"
                                rows={3}
                                placeholder="Keterangan penggunaan opsi atribut ini..."
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
                        form="create-attribute-form"
                        disabled={processing}
                    >
                        {processing ? <Spinner className="size-4" /> : null}
                        Simpan atribut
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
