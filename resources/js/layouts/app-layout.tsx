import { usePage } from '@inertiajs/react';
import AppHeaderLayout from '@/layouts/app/app-header-layout';
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

    // CU-02: customer tidak memakai sidebar admin, pakai header layout.
    // Admin tetap memakai sidebar layout.
    if (isCustomer) {
        return (
            <AppHeaderLayout breadcrumbs={breadcrumbs}>
                {children}
            </AppHeaderLayout>
        );
    }

    return (
        <AppSidebarLayout breadcrumbs={breadcrumbs}>
            {children}
        </AppSidebarLayout>
    );
}
