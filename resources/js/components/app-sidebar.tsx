import { Link } from '@inertiajs/react';
import {
    Boxes,
    House,
    FolderTree,
    LayoutGrid,
    Package,
    ReceiptText,
    SlidersHorizontal,
    Users,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { dashboard } from '@/routes/admin';
import { index as attributesIndex } from '@/routes/admin/attributes';
import { index as categoriesIndex } from '@/routes/admin/categories';
import { index as customersIndex } from '@/routes/admin/customers';
import { index as packagesIndex } from '@/routes/admin/packages';
import { index as productsIndex } from '@/routes/admin/products';
import { index as rentalsIndex } from '@/routes/admin/rentals';
import { home } from '@/routes';
import type { NavItem } from '@/types';

const dashboardNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: dashboard(),
        icon: LayoutGrid,
    },
];

const transactionNavItems: NavItem[] = [
    {
        title: 'Monitoring Rental',
        href: rentalsIndex(),
        icon: ReceiptText,
    },
];

const manageNavItems: NavItem[] = [
    {
        title: 'Pelanggan',
        href: customersIndex(),
        icon: Users,
    },
    {
        title: 'Kategori',
        href: categoriesIndex(),
        icon: FolderTree,
    },
    {
        title: 'Atribut',
        href: attributesIndex(),
        icon: SlidersHorizontal,
    },
    {
        title: 'Produk',
        href: productsIndex(),
        icon: Package,
    },
    {
        title: 'Paket',
        href: packagesIndex(),
        icon: Boxes,
    },
];

const footerNavItems: NavItem[] = [];

export function AppSidebar() {
    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={dashboardNavItems} />
                <NavMain items={transactionNavItems} label="Transaksi" />
                <NavMain items={manageNavItems} label="Kelola Data" />
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild tooltip="Landing Page">
                            <Link href={home()} prefetch>
                                <House />
                                <span>Pratinjau Toko</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
