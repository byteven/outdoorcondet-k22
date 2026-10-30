import { usePage } from '@inertiajs/react';
import { LandingHeader } from '@/components/landing/landing-header';
import { SiteFooter } from '@/components/site-footer';
import AppSidebarLayout from '@/layouts/app/app-sidebar-layout';
import type { Auth, BreadcrumbItem } from '@/types';

export default function AppLayout({
    breadcrumbs = [],
    children,
}: {
    breadcrumbs?: BreadcrumbItem[];
    children: React.ReactNode;
}) {
    const { auth } = usePage<{ auth: Auth }>().props;
    const isCustomer = (auth?.user?.role ?? 'customer') === 'customer';

    // CU-02: customer memakai header landing yang sama dengan halaman
    // publik (cart, checkout). Admin tetap memakai sidebar layout.
    if (isCustomer) {
        return (
            <div className="flex min-h-screen flex-col bg-background">
                <LandingHeader />
                <main className="flex-1 pt-16">{children}</main>
                <SiteFooter />
            </div>
        );
    }

    return (
        <AppSidebarLayout breadcrumbs={breadcrumbs}>
            {children}
        </AppSidebarLayout>
    );
}
