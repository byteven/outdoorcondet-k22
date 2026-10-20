import { Head, router, usePage } from '@inertiajs/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { InfoIcon } from 'lucide-react';
import { EmergencyContactInput } from '@/components/emergency-contact-input';
import { FormStepper } from '@/components/form-stepper';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { SocialMediaInput } from '@/components/social-media-input';
import TextLink from '@/components/text-link';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { login } from '@/routes';
import { policy, privacy } from '@/routes/legal';
import { store } from '@/routes/register';

const registerSchema = z
    .object({
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
        password: z
            .string({ error: 'Password wajib diisi.' })
            .min(8, 'Password minimal 8 karakter.')
            .max(100, 'Password maksimal 100 karakter.'),
        password_confirmation: z
            .string({ error: 'Konfirmasi password wajib diisi.' })
            .min(1, 'Konfirmasi password wajib diisi.'),
        emergency_contact: z
            .string()
            .max(255, 'Kontak darurat maksimal 255 karakter.')
            .optional(),
        address: z
            .string()
            .max(2000, 'Alamat maksimal 2000 karakter.')
            .optional(),
        social_media: z
            .string()
            .max(255, 'Sosial media maksimal 255 karakter.')
            .optional(),
        terms: z.boolean().refine((value) => value === true, {
            message:
                'Anda wajib menyetujui Kebijakan dan Privasi sebelum mendaftar.',
        }),
    })
    .refine((data) => data.password === data.password_confirmation, {
        message: 'Konfirmasi password tidak sama.',
        path: ['password_confirmation'],
    });

type RegisterFormData = z.infer<typeof registerSchema>;

const STEP_FIELDS = [
    ['name', 'email', 'phone_number', 'password', 'password_confirmation'],
    ['emergency_contact', 'address', 'social_media', 'terms'],
] as const;

const STEPS = [{ label: 'Data Akun' }, { label: 'Data Pendukung' }];

type Props = {
    passwordRules: string;
};

export default function Register({ passwordRules }: Props) {
    const [step, setStep] = useState(0);
    const [processing, setProcessing] = useState(false);
    const serverErrors = usePage().props.errors as Record<string, string>;

    const {
        register,
        handleSubmit,
        trigger,
        setValue,
        watch,
        control,
        formState: { errors },
    } = useForm<RegisterFormData>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            name: '',
            email: '',
            phone_number: '',
            password: '',
            password_confirmation: '',
            emergency_contact: '',
            address: '',
            social_media: '',
            terms: false,
        },
    });

    const emergencyContactValue = watch('emergency_contact');
    const socialMediaValue = watch('social_media');
    const addressValue = watch('address');

    const hasSupportingData = Boolean(
        addressValue?.trim() ||
        emergencyContactValue?.trim() ||
        socialMediaValue?.trim(),
    );

    const errorFor = (field: keyof RegisterFormData): string | undefined =>
        errors[field]?.message ?? serverErrors[field];

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
                emergency_contact: data.emergency_contact || undefined,
                address: data.address || undefined,
                social_media: data.social_media || undefined,
                terms: data.terms,
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
                            <Label htmlFor="name">Nama Lengkap</Label>
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
                        <Alert className="items-center border-0 bg-info-muted text-info [&>svg]:translate-y-0">
                            <InfoIcon />
                            <p className="text-xs">
                                Data pendukung wajib diisi ketika mulai menyewa,
                                ya.
                            </p>
                        </Alert>

                        <div className="grid gap-2">
                            <Label htmlFor="address">Alamat</Label>
                            <Textarea
                                id="address"
                                rows={3}
                                autoFocus
                                autoComplete="street-address"
                                placeholder="Alamat domisili"
                                aria-invalid={!!errorFor('address')}
                                {...register('address')}
                            />
                            <InputError message={errorFor('address')} />
                        </div>

                        <EmergencyContactInput
                            id="emergency_contact"
                            label="Kontak darurat"
                            value={emergencyContactValue}
                            onChange={(val) =>
                                setValue('emergency_contact', val, {
                                    shouldValidate: true,
                                })
                            }
                            error={errorFor('emergency_contact')}
                        />

                        <SocialMediaInput
                            id="social_media"
                            label="Sosial media"
                            value={socialMediaValue}
                            onChange={(val) => setValue('social_media', val)}
                            error={errorFor('social_media')}
                        />

                        <div className="grid gap-2">
                            <div className="flex items-center gap-3">
                                <Controller
                                    name="terms"
                                    control={control}
                                    render={({ field }) => (
                                        <Checkbox
                                            id="terms"
                                            checked={field.value}
                                            onCheckedChange={(checked) =>
                                                field.onChange(checked === true)
                                            }
                                            aria-invalid={!!errorFor('terms')}
                                            aria-label="Setuju dengan Kebijakan dan Privasi"
                                        />
                                    )}
                                />
                                <Label
                                    htmlFor="terms"
                                    className="cursor-pointer text-xs font-normal leading-snug text-muted-foreground"
                                >
                                    Saya menyetujui{' '}
                                    <TextLink
                                        href={policy()}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-xs"
                                        onClick={(event) =>
                                            event.stopPropagation()
                                        }
                                    >
                                        Kebijakan
                                    </TextLink>{' '}
                                    dan{' '}
                                    <TextLink
                                        href={privacy()}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-xs"
                                        onClick={(event) =>
                                            event.stopPropagation()
                                        }
                                    >
                                        Privasi
                                    </TextLink>{' '}
                                    OutdoorCondet.
                                </Label>
                            </div>
                            <InputError message={errorFor('terms')} />
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
                                {hasSupportingData
                                    ? 'Daftar'
                                    : 'Lewati & Daftar'}
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
