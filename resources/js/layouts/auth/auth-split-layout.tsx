import { Link } from '@inertiajs/react';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';

export default function AuthSplitLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    return (
        <div className="grid min-h-dvh grid-cols-1 lg:grid-cols-2">
            <div
                className="relative hidden overflow-hidden bg-cover bg-center bg-no-repeat lg:flex lg:min-h-dvh lg:flex-col"
                style={{
                    backgroundImage: "url('/images/bg-mount-logo.webp')",
                }}
                aria-hidden="true"
            />
            <div className="flex w-full items-center justify-center p-8">
                <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
                    <div className="flex flex-col items-center gap-2 text-center">
                        <Link
                            href={home()}
                            aria-label="Kembali ke beranda"
                            className="mx-auto mb-2"
                        >
                            <img
                                src="/images/logo-transparent.webp"
                                alt="OutdoorCondet Logo"
                                className="h-14 w-auto object-contain"
                            />
                        </Link>
                        <h1 className="text-2xl font-bold">{title}</h1>
                        <p className="text-sm text-muted-foreground">
                            {description}
                        </p>
                    </div>
                    {children}
                </div>
            </div>
        </div>
    );
}
