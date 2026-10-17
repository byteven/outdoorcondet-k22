import { router, usePage } from '@inertiajs/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import InputError from '@/components/input-error';
import { EmergencyContactInput } from '@/components/emergency-contact-input';
import { PasswordInput } from '@/components/password-input';
import { SocialMediaInput } from '@/components/social-media-input';
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
import { store } from '@/routes/admin/customers';

const createCustomerSchema = z.object({
    name: z
        .string({ error: 'Nama lengkap wajib diisi.' })
        .trim()
        .min(1, 'Nama lengkap wajib diisi.')
        .max(255, 'Nama lengkap maksimal 255 karakter.'),
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
    emergency_contact: z
        .string()
        .max(255, 'Kontak darurat maksimal 255 karakter.')
        .optional(),
    social_media: z.string().max(255, 'Sosial media maksimal 255 karakter.').optional(),
    address: z.string().max(2000, 'Alamat maksimal 2000 karakter.').optional(),
});

type CreateCustomerFormData = z.infer<typeof createCustomerSchema>;

export function CustomerFormDialog() {
    const [open, setOpen] = useState(false);
    const [processing, setProcessing] = useState(false);
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
        setValue,
        watch,
        formState: { errors },
    } = useForm<CreateCustomerFormData>({
        resolver: zodResolver(createCustomerSchema),
        defaultValues: {
            name: '',
            email: '',
            password: '',
            phone_number: '',
            emergency_contact: '',
            social_media: '',
            address: '',
        },
    });

    const emergencyContactValue = watch('emergency_contact');
    const socialMediaValue = watch('social_media');

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
                emergency_contact: data.emergency_contact || undefined,
                social_media: data.social_media || undefined,
                address: data.address || undefined,
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
                    <div className="min-h-0 flex-1 [scrollbar-width:thin] [scrollbar-color:var(--color-border)_transparent] overflow-y-auto px-1.5 py-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
                        <div className="grid gap-4 pb-6">
                            <div className="grid gap-2">
                                <Label htmlFor="customer-name">Nama Lengkap</Label>
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
                                    Password sementara untuk login pertama kali
                                    pelanggan.
                                </p>
                            </div>
                            <EmergencyContactInput
                                id="customer-emergency-contact"
                                label="Kontak darurat"
                                value={emergencyContactValue}
                                onChange={(val) =>
                                    setValue('emergency_contact', val, {
                                        shouldValidate: true,
                                    })
                                }
                                error={errorFor('emergency_contact')}
                            />
                            <div className="grid gap-2">
                                <Label htmlFor="customer-address">Alamat</Label>
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

                            <SocialMediaInput
                                id="customer-social-media"
                                label="Sosial media"
                                value={socialMediaValue}
                                onChange={(val) => setValue('social_media', val)}
                                error={errorFor('social_media')}
                            />
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
