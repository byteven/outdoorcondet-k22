import type { ReactNode } from 'react';
import { Head } from '@inertiajs/react';
import { LandingHeader } from '@/components/landing/landing-header';
import { SiteFooter } from '@/components/site-footer';
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
                <LandingHeader />

                <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-24 pb-10 md:pb-12">
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
