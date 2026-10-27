import { router, usePage } from '@inertiajs/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { register } from '@/routes';
import { store } from '@/routes/login';
import { request } from '@/routes/password';

const loginSchema = z.object({
    email: z
        .string({ error: 'Email wajib diisi.' })
        .trim()
        .min(1, 'Email wajib diisi.')
        .email('Format email tidak valid.'),
    password: z
        .string({ error: 'Password wajib diisi.' })
        .min(1, 'Password wajib diisi.'),
    remember: z.boolean(),
});

type LoginFormData = z.infer<typeof loginSchema>;

type LoginFormProps = {
    canResetPassword?: boolean;
    status?: string;
    /**
     * Path lokal untuk kembali setelah login berhasil
     * (dipakai modal login agar tetap di halaman semula).
     */
    redirectTo?: string;
    /**
     * Pertahankan state komponen selama request + redirect berlangsung,
     * dipakai modal login agar dialog tidak tertutup saat terjadi error.
     */
    preserveState?: boolean;
    /** Dipanggil setelah visit login selesai; cek errors sebelum menutup modal. */
    onSuccess?: () => void;
};

export function LoginForm({
    canResetPassword = true,
    status,
    redirectTo,
    preserveState = false,
    onSuccess,
}: LoginFormProps) {
    const [processing, setProcessing] = useState(false);
    const serverErrors = usePage().props.errors;

    const {
        register: registerField,
        handleSubmit,
        control,
        resetField,
        formState: { errors },
    } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: '',
            password: '',
            remember: false,
        },
    });

    const onSubmit = (data: LoginFormData) => {
        router.post(
            store.url(),
            {
                ...data,
                ...(redirectTo ? { redirect_to: redirectTo } : {}),
            },
            {
                preserveState,
                preserveScroll: preserveState,
                onStart: () => setProcessing(true),
                onFinish: () => setProcessing(false),
                onSuccess: () => {
                    resetField('password');
                    onSuccess?.();
                },
            },
        );
    };

    const emailError = errors.email?.message ?? serverErrors.email;
    const passwordError = errors.password?.message ?? serverErrors.password;

    return (
        <>
            <form
                onSubmit={handleSubmit(onSubmit)}
                noValidate
                className="flex flex-col gap-6"
            >
                <div className="grid gap-6">
                    <div className="grid gap-2">
                        <Label htmlFor="login-email">Email</Label>
                        <Input
                            id="login-email"
                            type="email"
                            autoFocus
                            tabIndex={1}
                            autoComplete="email"
                            placeholder="bagus@gmail.com"
                            aria-invalid={!!emailError}
                            {...registerField('email')}
                        />
                        <InputError message={emailError} />
                    </div>

                    <div className="grid gap-2">
                        <div className="flex items-center">
                            <Label htmlFor="login-password">Password</Label>
                            {canResetPassword && (
                                <TextLink
                                    href={request()}
                                    className="ml-auto text-sm"
                                    tabIndex={5}
                                >
                                    Lupa Password?
                                </TextLink>
                            )}
                        </div>
                        <PasswordInput
                            id="login-password"
                            tabIndex={2}
                            autoComplete="current-password"
                            placeholder="Password"
                            aria-invalid={!!passwordError}
                            {...registerField('password')}
                        />
                        <InputError message={passwordError} />
                    </div>

                    <div className="flex items-center space-x-3">
                        <Controller
                            name="remember"
                            control={control}
                            render={({ field }) => (
                                <Checkbox
                                    id="login-remember"
                                    tabIndex={3}
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                />
                            )}
                        />
                        <Label
                            htmlFor="login-remember"
                            className="cursor-pointer"
                        >
                            Ingat Saya
                        </Label>
                    </div>

                    <Button
                        type="submit"
                        className="mt-4 w-full"
                        tabIndex={4}
                        disabled={processing}
                        data-test="login-button"
                    >
                        {processing && <Spinner />}
                        Log in
                    </Button>
                </div>

                <div className="text-center text-sm text-muted-foreground">
                    Belum punya akun?{' '}
                    <TextLink href={register()} tabIndex={5}>
                        Daftar
                    </TextLink>
                </div>
            </form>

            {status && (
                <div className="mb-4 text-center text-sm font-medium text-green-600">
                    {status}
                </div>
            )}
        </>
    );
}
