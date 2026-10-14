import { Head, router, usePage } from '@inertiajs/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronDown, ImagePlus, RefreshCw, Trash2, TriangleAlert, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import DeleteUser from '@/components/delete-user';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { edit, update } from '@/routes/profile';
import type { Auth } from '@/types';

type CustomerProp = {
    phone_number: string;
    identity_number: string | null;
    address: string | null;
    identity_card_url: string | null;
    is_verified: boolean;
} | null;

type PageProps = {
    auth: Auth;
    customer: CustomerProp;
};

const profileSchema = z.object({
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
    phone_number: z
        .string({ error: 'Nomor telepon wajib diisi.' })
        .trim()
        .min(9, 'Nomor telepon minimal 9 digit.')
        .max(13, 'Nomor telepon maksimal 13 digit.')
        .regex(/^[0-9]+$/, 'Nomor telepon hanya boleh berisi angka.'),
    identity_number: z.string().max(32, 'NIK maksimal 32 karakter.').optional(),
    address: z.string().max(2000, 'Alamat maksimal 2000 karakter.').optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const MAX_IDENTITY_CARD_SIZE = 2 * 1024 * 1024;
const IDENTITY_CARD_ACCEPT = 'image/jpeg,image/png,image/webp';

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
    const [identityCard, setIdentityCard] = useState<File | null>(null);
    const [identityCardPreview, setIdentityCardPreview] = useState<string | null>(
        null,
    );
    const [identityCardError, setIdentityCardError] = useState<string>();
    const [removeIdentityCard, setRemoveIdentityCard] = useState(false);
    const [ktpPreviewOpen, setKtpPreviewOpen] = useState(false);
    const [dataDiriOpen, setDataDiriOpen] = useState(true);
    const [verifikasiOpen, setVerifikasiOpen] = useState(true);
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isDirty },
    } = useForm<ProfileFormData>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            name: auth.user.name,
            email: auth.user.email,
            phone_number: stripPhonePrefix(customer?.phone_number),
            identity_number: customer?.identity_number ?? '',
            address: customer?.address ?? '',
        },
    });

    const errorFor = (
        field: keyof ProfileFormData | 'identity_card',
    ): string | undefined => {
        if (field === 'identity_card') {
            return identityCardError ?? serverErrors.identity_card;
        }

        return errors[field]?.message ?? serverErrors[field];
    };

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
        setRemoveIdentityCard(false);
    };

    const onSubmit = (data: ProfileFormData) => {
        router.post(
            update.url(),
            {
                _method: 'patch',
                name: data.name,
                email: data.email,
                phone_number: `62${normalizePhoneRest(data.phone_number)}`,
                identity_number: data.identity_number || null,
                address: data.address || null,
                identity_card: identityCard ?? undefined,
                remove_identity_card:
                    removeIdentityCard && !identityCard ? true : undefined,
            },
            {
                forceFormData: true,
                onStart: () => setProcessing(true),
                onFinish: () => setProcessing(false),
                onSuccess: () => {
                    clearIdentityCard();
                    setRemoveIdentityCard(false);
                    reset(data);
                },
            },
        );
    };

    const handleCancel = () => {
        reset();
        clearIdentityCard();
        setRemoveIdentityCard(false);
    };

    const hasUnsavedChanges =
        isDirty || identityCard !== null || removeIdentityCard;
    const isKtpEmpty =
        (!customer?.identity_card_url || removeIdentityCard) &&
        identityCard === null;
    const showKtpWarning = isKtpEmpty;

    return (
        <>
            <Head title="Profil" />

            <h1 className="sr-only">Profil</h1>

            <div className="space-y-6">
                <Heading
                    variant="small"
                    title="Profil"
                    description="Perbarui data diri dan verifikasi KTP untuk mulai menyewa"
                />

                {showKtpWarning && (
                    <Alert className="border-0 bg-muted text-foreground">
                        <TriangleAlert />
                        <AlertTitle>Verifikasi KTP belum lengkap</AlertTitle>
                        <AlertDescription className="text-muted-foreground">
                            Foto KTP masih kosong. Unggah foto KTP agar admin
                            bisa memverifikasi akunmu sebelum mulai menyewa.
                        </AlertDescription>
                    </Alert>
                )}

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
                                                    Nama, email, telepon, dan
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
                                    <Label htmlFor="name">Nama</Label>
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
                                                    Verifikasi KTP
                                                </CardTitle>
                                                <CardDescription>
                                                    NIK dan foto KTP dipakai
                                                    admin untuk verifikasi
                                                    sebelum penyewaan
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
                                <div className="grid gap-2">
                                    <Label htmlFor="identity_number">NIK</Label>
                                    <Input
                                        id="identity_number"
                                        inputMode="numeric"
                                        placeholder="Nomor induk kependudukan"
                                        aria-invalid={
                                            !!errorFor('identity_number')
                                        }
                                        {...register('identity_number')}
                                    />
                                    <InputError
                                        message={errorFor('identity_number')}
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="identity_card">
                                        Foto KTP
                                    </Label>
                                    {customer?.identity_card_url &&
                                        !identityCardPreview &&
                                        !removeIdentityCard && (
                                            <div className="flex items-center gap-3 rounded-md border border-border bg-card p-3">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setKtpPreviewOpen(true)
                                                    }
                                                    aria-label="Pratinjau foto KTP tersimpan"
                                                    className="shrink-0 cursor-pointer rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                                >
                                                    <img
                                                        src={
                                                            customer.identity_card_url
                                                        }
                                                        alt="Foto KTP tersimpan"
                                                        className="h-14 w-auto rounded-md object-cover"
                                                    />
                                                </button>
                                                <p className="flex-1 text-sm font-medium">
                                                    KTP tersimpan
                                                </p>
                                                <div className="flex shrink-0 items-center gap-2">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        aria-label="Ganti foto KTP"
                                                        onClick={() =>
                                                            fileInputRef.current?.click()
                                                        }
                                                    >
                                                        <RefreshCw />
                                                        <span className="hidden sm:inline">
                                                            Ganti
                                                        </span>
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="icon"
                                                        aria-label="Hapus foto KTP"
                                                        onClick={() =>
                                                            setRemoveIdentityCard(
                                                                true,
                                                            )
                                                        }
                                                    >
                                                        <Trash2 />
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    {customer?.identity_card_url &&
                                        !identityCardPreview &&
                                        removeIdentityCard && (
                                            <div className="flex items-center gap-3 rounded-md border border-border bg-card p-3">
                                                <p className="flex-1 text-xs text-muted-foreground">
                                                    Foto KTP akan dihapus saat
                                                    kamu menyimpan perubahan.
                                                </p>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    aria-label="Batalkan hapus foto KTP"
                                                    className="shrink-0"
                                                    onClick={() =>
                                                        setRemoveIdentityCard(
                                                            false,
                                                        )
                                                    }
                                                >
                                                    <X />
                                                    <span className="hidden sm:inline">
                                                        Batalkan
                                                    </span>
                                                </Button>
                                            </div>
                                        )}
                                    {identityCard && identityCardPreview ? (
                                        <div className="flex items-center gap-3 rounded-md border border-border bg-card p-3">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setKtpPreviewOpen(true)
                                                }
                                                aria-label="Pratinjau foto KTP"
                                                className="shrink-0 cursor-pointer rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                            >
                                                <img
                                                    src={identityCardPreview}
                                                    alt="Pratinjau foto KTP"
                                                    className="h-14 w-auto rounded-md object-cover"
                                                />
                                            </button>
                                            <p className="min-w-0 flex-1 truncate text-sm font-medium">
                                                {identityCard.name}
                                            </p>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="icon"
                                                aria-label="Hapus foto KTP"
                                                className="shrink-0"
                                                onClick={clearIdentityCard}
                                            >
                                                <X />
                                            </Button>
                                        </div>
                                    ) : (
                                        (!customer?.identity_card_url ||
                                            removeIdentityCard) && (
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
                                                onDragLeave={() =>
                                                    setDragActive(false)
                                                }
                                                onDrop={(event) => {
                                                    event.preventDefault();
                                                    setDragActive(false);
                                                    selectIdentityCard(
                                                        event.dataTransfer
                                                            .files?.[0],
                                                    );
                                                }}
                                                className={cn(
                                                    'flex cursor-pointer flex-col items-center gap-2 rounded-md border border-dashed border-input p-6 text-center outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                                                    dragActive &&
                                                        'border-ring bg-muted/50',
                                                )}
                                            >
                                                <ImagePlus className="size-8 text-muted-foreground" />
                                                <p className="text-sm font-medium">
                                                    Seret foto KTP ke sini atau
                                                    klik untuk memilih
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    JPG, PNG, atau WebP
                                                    maksimal 2 MB.
                                                </p>
                                            </div>
                                        )
                                    )}
                                    <input
                                        ref={fileInputRef}
                                        id="identity_card"
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
                                        message={errorFor('identity_card')}
                                    />
                                </div>

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

            <Dialog open={ktpPreviewOpen} onOpenChange={setKtpPreviewOpen}>
                <DialogContent className="flex max-h-[90dvh] flex-col overflow-hidden sm:max-w-2xl">
                    <DialogHeader className="shrink-0">
                        <DialogTitle>Foto KTP</DialogTitle>
                        <DialogDescription>
                            {auth.user.name}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="min-h-0 flex-1 [scrollbar-width:thin] [scrollbar-color:var(--color-border)_transparent] overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
                        {(identityCardPreview ??
                            (!removeIdentityCard
                                ? customer?.identity_card_url
                                : null)) && (
                            <img
                                src={
                                    (identityCardPreview ??
                                        (!removeIdentityCard
                                            ? customer?.identity_card_url
                                            : null)) as string
                                }
                                alt={`Foto KTP ${auth.user.name}`}
                                className="w-full rounded-md object-contain"
                            />
                        )}
                    </div>
                    <DialogFooter className="shrink-0">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setKtpPreviewOpen(false)}
                        >
                            Tutup
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

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
