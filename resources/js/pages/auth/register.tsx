import { Head, router, usePage } from '@inertiajs/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { ImagePlus, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { FormStepper } from '@/components/form-stepper';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { login } from '@/routes';
import { store } from '@/routes/register';

const registerSchema = z
    .object({
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
        password: z
            .string({ error: 'Password wajib diisi.' })
            .min(8, 'Password minimal 8 karakter.')
            .max(100, 'Password maksimal 100 karakter.'),
        password_confirmation: z
            .string({ error: 'Konfirmasi password wajib diisi.' })
            .min(1, 'Konfirmasi password wajib diisi.'),
        identity_number: z
            .string()
            .max(32, 'NIK maksimal 32 karakter.')
            .optional(),
        address: z
            .string()
            .max(2000, 'Alamat maksimal 2000 karakter.')
            .optional(),
    })
    .refine((data) => data.password === data.password_confirmation, {
        message: 'Konfirmasi password tidak sama.',
        path: ['password_confirmation'],
    });

type RegisterFormData = z.infer<typeof registerSchema>;

const STEP_FIELDS = [
    ['name', 'email', 'phone_number', 'password', 'password_confirmation'],
    ['identity_number', 'address'],
] as const;

const STEPS = [{ label: 'Akun' }, { label: 'Data pribadi' }];

const MAX_IDENTITY_CARD_SIZE = 2 * 1024 * 1024;
const IDENTITY_CARD_ACCEPT = 'image/jpeg,image/png,image/webp';

type Props = {
    passwordRules: string;
};

export default function Register({ passwordRules }: Props) {
    const [step, setStep] = useState(0);
    const [processing, setProcessing] = useState(false);
    const [identityCard, setIdentityCard] = useState<File | null>(null);
    const [identityCardPreview, setIdentityCardPreview] = useState<
        string | null
    >(null);
    const [identityCardError, setIdentityCardError] = useState<string>();
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const serverErrors = usePage().props.errors as Record<string, string>;

    const {
        register,
        handleSubmit,
        trigger,
        formState: { errors },
    } = useForm<RegisterFormData>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            name: '',
            email: '',
            phone_number: '',
            password: '',
            password_confirmation: '',
            identity_number: '',
            address: '',
        },
    });

    const errorFor = (
        field: keyof RegisterFormData | 'identity_card',
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
    };

    const normalizePhoneRest = (value: string): string => {
        const digits = value.replace(/\D/g, '').slice(0, 13).replace(/^0+/, '');

        if (digits.startsWith('62')) {
            return digits.slice(2);
        }

        return digits;
    };

    const goNext = async () => {
        const valid = await trigger([...STEP_FIELDS[0]]);

        if (valid) {
            setStep(1);
        }
    };

    const onSubmit = (data: RegisterFormData) => {
        router.post(
            store.url(),
            {
                name: data.name,
                email: data.email,
                phone_number: `62${normalizePhoneRest(data.phone_number)}`,
                password: data.password,
                password_confirmation: data.password_confirmation,
                identity_number: data.identity_number || undefined,
                address: data.address || undefined,
                identity_card: identityCard ?? undefined,
            },
            {
                onStart: () => setProcessing(true),
                onFinish: () => setProcessing(false),
                onError: (formErrors) => {
                    if (
                        STEP_FIELDS[0].some(
                            (field) => formErrors[field] !== undefined,
                        )
                    ) {
                        setStep(0);
                    }
                },
            },
        );
    };

    return (
        <>
            <Head title="Daftar" />
            <FormStepper steps={STEPS} currentStep={step} />

            <form
                onSubmit={handleSubmit(onSubmit)}
                noValidate
                className="flex flex-col gap-6"
            >
                {step === 0 && (
                    <div className="grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Nama</Label>
                            <Input
                                id="name"
                                type="text"
                                autoFocus
                                autoComplete="name"
                                placeholder="Nama lengkap"
                                aria-invalid={!!errorFor('name')}
                                {...register('name')}
                            />
                            <InputError message={errorFor('name')} />
                        </div>

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
                            <Label htmlFor="phone_number">Nomor telepon</Label>
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
                                    aria-invalid={!!errorFor('phone_number')}
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
                            <InputError message={errorFor('phone_number')} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="password">Password</Label>
                            <PasswordInput
                                id="password"
                                autoComplete="new-password"
                                placeholder="Minimal 8 karakter"
                                aria-invalid={!!errorFor('password')}
                                passwordrules={passwordRules}
                                {...register('password')}
                            />
                            <InputError message={errorFor('password')} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="password_confirmation">
                                Konfirmasi password
                            </Label>
                            <PasswordInput
                                id="password_confirmation"
                                autoComplete="new-password"
                                placeholder="Ulangi password"
                                aria-invalid={
                                    !!errorFor('password_confirmation')
                                }
                                passwordrules={passwordRules}
                                {...register('password_confirmation')}
                            />
                            <InputError
                                message={errorFor('password_confirmation')}
                            />
                        </div>

                        <Button
                            type="button"
                            className="mt-2 w-full"
                            onClick={goNext}
                        >
                            Lanjut
                        </Button>
                    </div>
                )}

                {step === 1 && (
                    <div className="grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="identity_number">
                                NIK (opsional)
                            </Label>
                            <Input
                                id="identity_number"
                                autoFocus
                                inputMode="numeric"
                                placeholder="Nomor induk kependudukan"
                                aria-invalid={!!errorFor('identity_number')}
                                {...register('identity_number')}
                            />
                            <InputError message={errorFor('identity_number')} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="address">Alamat (opsional)</Label>
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

                        <div className="grid gap-2">
                            <Label htmlFor="identity_card">
                                Foto KTP (opsional)
                            </Label>
                            <div
                                role="button"
                                tabIndex={0}
                                aria-label="Unggah foto KTP"
                                onClick={() => fileInputRef.current?.click()}
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
                                            JPG, PNG, atau WebP maksimal 2 MB.
                                        </p>
                                    </>
                                )}
                            </div>
                            <input
                                ref={fileInputRef}
                                id="identity_card"
                                type="file"
                                accept={IDENTITY_CARD_ACCEPT}
                                className="hidden"
                                onChange={(event) =>
                                    selectIdentityCard(event.target.files?.[0])
                                }
                            />
                            <InputError message={errorFor('identity_card')} />
                            <p className="text-xs text-muted-foreground">
                                NIK, Alamat, dan KTP menjadi wajib ketika kamu
                                mulai menyewa alat.
                            </p>
                        </div>

                        <div className="mt-2 grid grid-cols-2 gap-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setStep(0)}
                            >
                                Kembali
                            </Button>
                            <Button type="submit" disabled={processing}>
                                {processing && <Spinner />}
                                Buat akun
                            </Button>
                        </div>
                    </div>
                )}

                <div className="text-center text-sm text-muted-foreground">
                    Sudah punya akun? <TextLink href={login()}>Masuk</TextLink>
                </div>
            </form>
        </>
    );
}

Register.layout = {
    title: 'Buat akun',
    description: 'Daftar untuk mulai menyewa alat outdoor',
};
