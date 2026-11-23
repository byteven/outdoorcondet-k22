import { Head, router, usePage } from '@inertiajs/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import DeleteUser from '@/components/delete-user';
import { EmergencyContactInput } from '@/components/emergency-contact-input';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { SocialMediaInput } from '@/components/social-media-input';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { edit, update } from '@/routes/profile';
import type { Auth } from '@/types';

type CustomerProp = {
    phone_number: string;
    emergency_contact: string | null;
    address: string | null;
    social_media: string | null;
    is_verified: boolean;
} | null;

type PageProps = {
    auth: Auth;
    customer: CustomerProp;
};

const profileSchema = z.object({
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
    phone_number: z
        .string({ error: 'Nomor telepon wajib diisi.' })
        .trim()
        .min(9, 'Nomor telepon minimal 9 digit.')
        .max(13, 'Nomor telepon maksimal 13 digit.')
        .regex(/^[0-9]+$/, 'Nomor telepon hanya boleh berisi angka.'),
    emergency_contact: z
        .string({ error: 'Kontak darurat wajib diisi.' })
        .trim()
        .min(1, 'Kontak darurat wajib diisi.')
        .max(255, 'Kontak darurat maksimal 255 karakter.'),
    social_media: z
        .string({ error: 'Sosial media wajib diisi.' })
        .trim()
        .min(1, 'Sosial media wajib diisi.')
        .max(255, 'Sosial media maksimal 255 karakter.'),
    address: z
        .string({ error: 'Alamat wajib diisi.' })
        .trim()
        .min(1, 'Alamat wajib diisi.')
        .max(2000, 'Alamat maksimal 2000 karakter.'),
});

type ProfileFormData = z.infer<typeof profileSchema>;

function stripPhonePrefix(value: string | null | undefined): string {
    if (!value) {
        return '';
    }

    return value
        .replace(/\D/g, '')
        .replace(/^0+/, '')
        .replace(/^62/, '')
        .slice(0, 13);
}

function normalizePhoneRest(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 13).replace(/^0+/, '');

    if (digits.startsWith('62')) {
        return digits.slice(2);
    }

    return digits;
}

export default function Profile() {
    const { auth, customer } = usePage<PageProps>().props;
    const serverErrors = usePage().props.errors as Record<string, string>;

    const [processing, setProcessing] = useState(false);
    const [dataDiriOpen, setDataDiriOpen] = useState(true);
    const [verifikasiOpen, setVerifikasiOpen] = useState(true);

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        watch,
        formState: { errors, isDirty },
    } = useForm<ProfileFormData>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            name: auth.user.name,
            email: auth.user.email,
            phone_number: stripPhonePrefix(customer?.phone_number),
            emergency_contact: customer?.emergency_contact ?? '',
            social_media: customer?.social_media ?? '',
            address: customer?.address ?? '',
        },
    });

    const emergencyContactValue = watch('emergency_contact');
    const socialMediaValue = watch('social_media');

    const errorFor = (
        field: keyof ProfileFormData,
    ): string | undefined => errors[field]?.message ?? serverErrors[field];

    const onSubmit = (data: ProfileFormData) => {
        router.post(
            update.url(),
            {
                _method: 'patch',
                name: data.name,
                email: data.email,
                phone_number: `62${normalizePhoneRest(data.phone_number)}`,
                emergency_contact: data.emergency_contact,
                social_media: data.social_media,
                address: data.address,
            },
            {
                onStart: () => setProcessing(true),
                onFinish: () => setProcessing(false),
                onSuccess: () => {
                    reset(data);
                },
            },
        );
    };

    const handleCancel = () => {
        reset();
    };

    const hasUnsavedChanges = isDirty;

    return (
        <>
            <Head title="Profil" />

            <h1 className="sr-only">Profil</h1>

            <div className="space-y-6">
                <Heading
                    variant="small"
                    title="Profil"
                    description="Perbarui data diri dan kontak untuk mulai menyewa"
                />

                <form onSubmit={handleSubmit(onSubmit)} noValidate>
                    <div className="grid gap-6">
                        <Collapsible
                            open={dataDiriOpen}
                            onOpenChange={setDataDiriOpen}
                        >
                            <Card className="gap-0 overflow-hidden py-0">
                                <CollapsibleTrigger asChild>
                                    <CardHeader className="cursor-pointer py-6">
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="grid gap-1">
                                                <CardTitle>
                                                    Data diri
                                                </CardTitle>
                                                <CardDescription>
                                                    Nama lengkap, email, telepon, dan
                                                    alamat domisili
                                                </CardDescription>
                                            </div>
                                            <ChevronDown
                                                className={cn(
                                                    'size-4 shrink-0 text-muted-foreground transition-transform duration-200',
                                                    dataDiriOpen &&
                                                        'rotate-180',
                                                )}
                                            />
                                        </div>
                                    </CardHeader>
                                </CollapsibleTrigger>
                                <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                                    <CardContent className="grid gap-4 pb-6">
                                        <div className="grid gap-2">
                                            <Label htmlFor="name">Nama Lengkap</Label>
                                            <Input
                                                id="name"
                                                autoComplete="name"
                                                placeholder="Nama lengkap"
                                                aria-invalid={!!errorFor('name')}
                                                {...register('name')}
                                            />
                                            <InputError message={errorFor('name')} />
                                        </div>

                                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                            <div className="grid gap-2">
                                                <Label htmlFor="email">Email</Label>
                                                <Input
                                                    id="email"
                                                    type="email"
                                                    autoComplete="email"
                                                    placeholder="nama@email.com"
                                                    aria-invalid={!!errorFor('email')}
                                                    {...register('email')}
                                                />
                                                <InputError message={errorFor('email')} />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label htmlFor="phone_number">
                                                    Nomor telepon
                                                </Label>
                                                <div className="relative">
                                                    <span
                                                        aria-hidden="true"
                                                        className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground"
                                                    >
                                                        +62
                                                    </span>
                                                    <Input
                                                        id="phone_number"
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
                                            <Label htmlFor="address">Alamat</Label>
                                            <Textarea
                                                id="address"
                                                rows={3}
                                                autoComplete="street-address"
                                                placeholder="Alamat domisili"
                                                aria-invalid={!!errorFor('address')}
                                                {...register('address')}
                                            />
                                            <InputError message={errorFor('address')} />
                                        </div>
                                    </CardContent>
                                </CollapsibleContent>
                            </Card>
                        </Collapsible>

                        <Collapsible
                            open={verifikasiOpen}
                            onOpenChange={setVerifikasiOpen}
                        >
                            <Card className="gap-0 overflow-hidden py-0">
                                <CollapsibleTrigger asChild>
                                    <CardHeader className="cursor-pointer py-6">
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="grid gap-1">
                                                <CardTitle>
                                                    Kontak Darurat & Sosial Media
                                                </CardTitle>
                                                <CardDescription>
                                                    Kontak darurat dan akun sosial media untuk kebutuhan reservasi
                                                </CardDescription>
                                            </div>
                                            <ChevronDown
                                                className={cn(
                                                    'size-4 shrink-0 text-muted-foreground transition-transform duration-200',
                                                    verifikasiOpen &&
                                                        'rotate-180',
                                                )}
                                            />
                                        </div>
                                    </CardHeader>
                                </CollapsibleTrigger>
                                <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                                    <CardContent className="grid gap-4 pb-6">
                                        <EmergencyContactInput
                                            id="emergency_contact"
                                            value={emergencyContactValue}
                                            onChange={(val) =>
                                                setValue('emergency_contact', val, {
                                                    shouldDirty: true,
                                                })
                                            }
                                            error={errorFor('emergency_contact')}
                                        />

                                        <SocialMediaInput
                                            id="social_media"
                                            label="Sosial media"
                                            value={socialMediaValue}
                                            onChange={(val) =>
                                                setValue('social_media', val, {
                                                    shouldDirty: true,
                                                })
                                            }
                                            error={errorFor('social_media')}
                                        />
                                    </CardContent>
                                </CollapsibleContent>
                            </Card>
                        </Collapsible>
                    </div>

                    {hasUnsavedChanges && (
                        <div className="mt-6 flex items-center gap-2">
                            <Button
                                disabled={processing}
                                data-test="update-profile-button"
                            >
                                {processing && <Spinner />}
                                Simpan perubahan
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                disabled={processing}
                                onClick={handleCancel}
                            >
                                Batal
                            </Button>
                        </div>
                    )}
                </form>
            </div>

            <DeleteUser />
        </>
    );
}

Profile.layout = {
    breadcrumbs: [
        {
            title: 'Profil',
            href: edit(),
        },
    ],
};
