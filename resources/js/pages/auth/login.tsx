import { Head } from '@inertiajs/react';
import { LoginForm } from '@/components/auth/login-form';

type Props = {
    status?: string;
    canResetPassword: boolean;
};

export default function Login({ status, canResetPassword }: Props) {
    return (
        <>
            <Head title="Log in" />

            <LoginForm status={status} canResetPassword={canResetPassword} />
        </>
    );
}

Login.layout = {
    title: 'Selamat Datang, Outdoorian!',
    description: 'Masuk untuk mulai menyewa alat yang kamu butuh.',
};
