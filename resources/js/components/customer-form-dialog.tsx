import { router, usePage } from '@inertiajs/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { ImagePlus, Plus, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
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
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { store } from '@/routes/admin/customers';

const createCustomerSchema = z.object({
    name: z
        .string({ error: 'Nama wajib diisi.' })
        .trim()
        .min(1, 'Nama wajib diisi.')
        .max(255, 'Nama maksimal 255 karakter.'),
    email: z
        .string({ error: 'Email wajib diisi.' })
        .trim()
        .min(1, 'Email wajib diisi.')
        .email('Format email tidak valid.')
        .max(255, 'Email maksimal 255 karakter.'),
    password: z
        .string({ error: 'Password wajib diisi.' })
        .min(8, 'Password minimal 8 karakter.')
        .max(100, 'Password maksimal 100 karakter.'),
    phone_number: z
        .string({ error: 'Nomor telepon wajib diisi.' })
        .trim()
        .min(9, 'Nomor telepon minimal 9 digit.')
        .max(13, 'Nomor telepon maksimal 13 digit.'),
    identity_number: z.string().max(32, 'NIK maksimal 32 karakter.').optional(),
    address: z.string().max(2000, 'Alamat maksimal 2000 karakter.').optional(),
});

type CreateCustomerFormData = z.infer<typeof createCustomerSchema>;

const MAX_IDENTITY_CARD_SIZE = 2 * 1024 * 1024;
const IDENTITY_CARD_ACCEPT = 'image/jpeg,image/png,image/webp';

export function CustomerFormDialog() {
    const [open, setOpen] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [identityCard, setIdentityCard] = useState<File | null>(null);
    const [identityCardPreview, setIdentityCardPreview] = useState<
        string | null
    >(null);
    const [identityCardError, setIdentityCardError] = useState<string>();
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const serverErrors = usePage().props.errors;
    const formErrors = Object.fromEntries(
        Object.entries(serverErrors).filter(
            ([key]) => key !== 'updateCustomer',
        ),
    ) as Record<string, string>;

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<CreateCustomerFormData>({
        resolver: zodResolver(createCustomerSchema),
        defaultValues: {
            name: '',
            email: '',
            password: '',
            phone_number: '',
            identity_number: '',
            address: '',
        },
    });

    useEffect(() => {
        if (Object.keys(formErrors).length > 0) {
            setOpen(true);
        }
    }, [serverErrors]);

    const clearIdentityCard = () => {
        if (identityCardPreview) {
            URL.revokeObjectURL(identityCardPreview);
        }

        setIdentityCard(null);
        setIdentityCardPreview(null);
        setIdentityCardError(undefined);

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const selectIdentityCard = (file: File | undefined) => {
        if (!file) {
            return;
        }

        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
            setIdentityCardError('Format file harus JPG, PNG, atau WebP.');

            return;
        }

        if (file.size > MAX_IDENTITY_CARD_SIZE) {
            setIdentityCardError('Ukuran file maksimal 2 MB.');

            return;
        }

        if (identityCardPreview) {
            URL.revokeObjectURL(identityCardPreview);
        }

        setIdentityCardError(undefined);
        setIdentityCard(file);
        setIdentityCardPreview(URL.createObjectURL(file));
    };

    const closeDialog = (next: boolean) => {
        setOpen(next);

        if (!next) {
            reset();
            clearIdentityCard();
        }
    };

    const normalizePhoneRest = (value: string): string => {
        const digits = value.replace(/\D/g, '').slice(0, 13).replace(/^0+/, '');

        if (digits.startsWith('62')) {
            return digits.slice(2);
        }

        return digits;
    };

    const onSubmit = (data: CreateCustomerFormData) => {
        router.post(
            store.url(),
            {
                ...data,
                phone_number: `62${normalizePhoneRest(data.phone_number)}`,
                identity_number: data.identity_number || undefined,
                address: data.address || undefined,
                identity_card: identityCard ?? undefined,
            },
            {
                onStart: () => setProcessing(true),
                onFinish: () => setProcessing(false),
                onSuccess: () => {
                    setOpen(false);
                    reset();
                    clearIdentityCard();
                },
            },
        );
    };

    const errorFor = (
        field: keyof CreateCustomerFormData,
    ): string | undefined =>
        errors[field]?.message ?? formErrors[field as string];

    return (
        <Dialog open={open} onOpenChange={closeDialog}>
            <DialogTrigger asChild>
                <Button>
                    <Plus />
                    Tambah Pelanggan
                </Button>
            </DialogTrigger>
            <DialogContent className="flex max-h-[90dvh] flex-col overflow-hidden sm:max-w-xl">
                <DialogHeader className="shrink-0">
                    <DialogTitle>Tambah Pelanggan</DialogTitle>
                    <DialogDescription>
                        Buat akun sekaligus profil pelanggan baru.
                    </DialogDescription>
                </DialogHeader>
                <form
                    onSubmit={handleSubmit(onSubmit)}
                    noValidate
                    className="flex min-h-0 flex-1 flex-col gap-4"
                >
                    <div className="min-h-0 flex-1 [scrollbar-width:thin] [scrollbar-color:var(--color-border)_transparent] overflow-y-auto px-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
                        <div className="grid gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="customer-name">Nama</Label>
                                <Input
                                    id="customer-name"
                                    autoComplete="name"
                                    placeholder="Nama lengkap"
                                    aria-invalid={!!errorFor('name')}
                                    {...register('name')}
                                />
                                <InputError message={errorFor('name')} />
                            </div>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="customer-email">
                                        Email
                                    </Label>
                                    <Input
                                        id="customer-email"
                                        type="email"
                                        autoComplete="email"
                                        placeholder="nama@email.com"
                                        aria-invalid={!!errorFor('email')}
                                        {...register('email')}
                                    />
                                    <InputError message={errorFor('email')} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="customer-phone">
                                        Telepon
                                    </Label>
                                    <div className="relative">
                                        <span
                                            aria-hidden="true"
                                            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground"
                                        >
                                            +62
                                        </span>
                                        <Input
                                            id="customer-phone"
                                            autoComplete="tel"
                                            inputMode="numeric"
                                            placeholder="81234567890"
                                            aria-invalid={
                                                !!errorFor('phone_number')
                                            }
                                            className="pl-12"
                                            {...register('phone_number', {
                                                onChange: (event) => {
                                                    event.target.value =
                                                        event.target.value
                                                            .replace(/\D/g, '')
                                                            .slice(0, 13);
                                                },
                                            })}
                                        />
                                    </div>
                                    <InputError
                                        message={errorFor('phone_number')}
                                    />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="customer-password">
                                    Password
                                </Label>
                                <PasswordInput
                                    id="customer-password"
                                    autoComplete="new-password"
                                    placeholder="Minimal 8 karakter"
                                    aria-invalid={!!errorFor('password')}
                                    {...register('password')}
                                />
                                <InputError message={errorFor('password')} />
                                <p className="text-xs text-muted-foreground">
                                    User masih bisa mengubah password ini nanti.
                                </p>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="customer-nik">
                                    NIK (opsional)
                                </Label>
                                <Input
                                    id="customer-nik"
                                    inputMode="numeric"
                                    placeholder="Nomor induk kependudukan"
                                    aria-invalid={!!errorFor('identity_number')}
                                    {...register('identity_number')}
                                />
                                <InputError
                                    message={errorFor('identity_number')}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="customer-address">
                                    Alamat (opsional)
                                </Label>
                                <Textarea
                                    id="customer-address"
                                    rows={3}
                                    autoComplete="street-address"
                                    placeholder="Alamat domisili"
                                    aria-invalid={!!errorFor('address')}
                                    {...register('address')}
                                />
                                <InputError message={errorFor('address')} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="customer-identity-card">
                                    Foto KTP (opsional)
                                </Label>
                                <div
                                    role="button"
                                    tabIndex={0}
                                    aria-label="Unggah foto KTP"
                                    onClick={() =>
                                        fileInputRef.current?.click()
                                    }
                                    onKeyDown={(event) => {
                                        if (
                                            event.key === 'Enter' ||
                                            event.key === ' '
                                        ) {
                                            event.preventDefault();
                                            fileInputRef.current?.click();
                                        }
                                    }}
                                    onDragOver={(event) => {
                                        event.preventDefault();
                                        setDragActive(true);
                                    }}
                                    onDragLeave={() => setDragActive(false)}
                                    onDrop={(event) => {
                                        event.preventDefault();
                                        setDragActive(false);
                                        selectIdentityCard(
                                            event.dataTransfer.files?.[0],
                                        );
                                    }}
                                    className={cn(
                                        'flex cursor-pointer flex-col items-center gap-2 rounded-md border border-dashed border-input p-6 text-center outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                                        dragActive && 'border-ring bg-muted/50',
                                    )}
                                >
                                    {identityCard && identityCardPreview ? (
                                        <>
                                            <img
                                                src={identityCardPreview}
                                                alt="Pratinjau foto KTP"
                                                className="h-28 w-auto rounded-md object-cover"
                                            />
                                            <p className="text-sm font-medium">
                                                {identityCard.name}
                                            </p>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    clearIdentityCard();
                                                }}
                                            >
                                                <X />
                                                Hapus
                                            </Button>
                                        </>
                                    ) : (
                                        <>
                                            <ImagePlus className="size-8 text-muted-foreground" />
                                            <p className="text-sm font-medium">
                                                Seret foto KTP ke sini atau klik
                                                untuk memilih
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                JPG, PNG, atau WebP maksimal 2
                                                MB.
                                            </p>
                                        </>
                                    )}
                                </div>
                                <input
                                    ref={fileInputRef}
                                    id="customer-identity-card"
                                    type="file"
                                    accept={IDENTITY_CARD_ACCEPT}
                                    className="hidden"
                                    onChange={(event) =>
                                        selectIdentityCard(
                                            event.target.files?.[0],
                                        )
                                    }
                                />
                                <InputError
                                    message={
                                        identityCardError ??
                                        formErrors.identity_card
                                    }
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="shrink-0">
                        <DialogClose asChild>
                            <Button type="button" variant="outline">
                                Batal
                            </Button>
                        </DialogClose>
                        <Button type="submit" disabled={processing}>
                            {processing && <Spinner />}
                            Simpan
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
