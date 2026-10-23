import type { ReactNode } from 'react';
import { Head, Link } from '@inertiajs/react';
import { ArrowLeftIcon } from 'lucide-react';
import { SiteFooter } from '@/components/site-footer';
import { Button } from '@/components/ui/button';
import { home } from '@/routes';
import { formatDateID } from '@/lib/rental-date';

type Props = {
    title: string;
    description?: string;
    updatedAt?: Date;
    children: ReactNode;
};

export function LegalShell({ title, description, updatedAt, children }: Props) {
    return (
        <>
            <Head title={`${title} - OutdoorCondet`} />

            <div className="flex min-h-screen flex-col bg-background">
                <header className="border-b border-border">
                    <div className="mx-auto flex h-16 w-full max-w-4xl items-center justify-between gap-4 px-4">
                        <Link href={home()} className="flex items-center">
                            <img
                                src="/images/logo-landscape-transparent.webp"
                                alt="OutdoorCondet"
                                className="h-8 w-auto object-contain"
                            />
                        </Link>

                        <Button asChild variant="outline" size="sm">
                            <Link href={home()}>
                                <ArrowLeftIcon />
                                Kembali
                            </Link>
                        </Button>
                    </div>
                </header>

                <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 md:py-12">
                    <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                        {title}
                    </h1>
                    {description && (
                        <p className="mt-3 text-sm text-muted-foreground">
                            {description}
                        </p>
                    )}
                    {updatedAt && (
                        <p className="mt-2 text-xs text-muted-foreground">
                            Terakhir diperbarui: {formatDateID(updatedAt)}
                        </p>
                    )}

                    <div className="mt-8 space-y-8">{children}</div>
                </main>

                <SiteFooter />
            </div>
        </>
    );
}
