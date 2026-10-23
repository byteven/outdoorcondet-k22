import { Link, usePage } from '@inertiajs/react';
import { House, LayoutGrid, Menu, UserRound } from 'lucide-react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    NavigationMenu,
    NavigationMenuItem,
    NavigationMenuList,
    navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { UserMenuContent } from '@/components/user-menu-content';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { useInitials } from '@/hooks/use-initials';
import { cn } from '@/lib/utils';
import { home } from '@/routes';
import { dashboard } from '@/routes/admin';
import { edit as editProfile } from '@/routes/profile';
import type { Auth, BreadcrumbItem, NavItem } from '@/types';

type Props = {
    breadcrumbs?: BreadcrumbItem[];
};

const adminNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: dashboard(),
        icon: LayoutGrid,
    },
];

const customerNavItems: NavItem[] = [
    {
        title: 'Beranda',
        href: home(),
        icon: House,
    },
    {
        title: 'Profil',
        href: editProfile(),
        icon: UserRound,
    },
];

const activeItemStyles = 'text-neutral-900';

export function AppHeader({ breadcrumbs = [] }: Props) {
    const page = usePage<{ auth: Auth }>();
    const { auth } = page.props;
    const getInitials = useInitials();
    const { isCurrentUrl, whenCurrentUrl } = useCurrentUrl();

    const isCustomer = (auth.user?.role ?? 'customer') === 'customer';
    const mainNavItems = isCustomer ? customerNavItems : adminNavItems;
    const logoHref = isCustomer ? home() : dashboard();

    return (
        <>
            <div className="border-b border-sidebar-border/80">
                <div className="mx-auto flex h-16 items-center px-4 md:max-w-7xl">
                    {/* Mobile Menu: customer dibuka dari atas, admin dari kiri */}
                    <div className="lg:hidden">
                        <Sheet>
                            <SheetTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="mr-2 h-[34px] w-[34px]"
                                    aria-label="Buka menu navigasi"
                                >
                                    <Menu className="h-5 w-5" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent
                                side={isCustomer ? 'top' : 'left'}
                                className={cn(
                                    'flex flex-col bg-sidebar',
                                    isCustomer
                                        ? 'inset-x-0 top-0 h-auto max-h-[85vh] border-b'
                                        : 'h-full w-64 items-stretch justify-between',
                                )}
                            >
                                <SheetTitle className="sr-only">
                                    Menu navigasi
                                </SheetTitle>
                                <SheetHeader className="flex flex-row items-center gap-2 border-b border-sidebar-border/60 px-4 py-3 text-left">
                                    <img
                                        src="/images/logo-landscape-transparent.webp"
                                        alt="OutdoorCondet"
                                        className="h-7 w-auto object-contain"
                                    />
                                </SheetHeader>
                                <nav
                                    aria-label="Navigasi seluler"
                                    className="flex flex-col gap-1 overflow-y-auto p-4"
                                >
                                    {mainNavItems.map((item) => {
                                        const active = isCurrentUrl(item.href);

                                        return (
                                            <Link
                                                key={item.title}
                                                href={item.href}
                                                aria-current={
                                                    active ? 'page' : undefined
                                                }
                                                className={cn(
                                                    'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted',
                                                    active &&
                                                        'bg-muted text-foreground',
                                                )}
                                            >
                                                {item.icon && (
                                                    <item.icon className="h-5 w-5 shrink-0" />
                                                )}
                                                <span>{item.title}</span>
                                            </Link>
                                        );
                                    })}
                                </nav>
                            </SheetContent>
                        </Sheet>
                    </div>

                    <Link
                        href={logoHref}
                        prefetch
                        className="flex items-center space-x-2"
                    >
                        <img
                            src="/images/logo-landscape-transparent.webp"
                            alt="OutdoorCondet"
                            className="h-8 w-auto object-contain"
                        />
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="ml-6 hidden h-full items-center space-x-6 lg:flex">
                        <NavigationMenu className="flex h-full items-stretch">
                            <NavigationMenuList className="flex h-full items-stretch space-x-2">
                                {mainNavItems.map((item, index) => (
                                    <NavigationMenuItem
                                        key={index}
                                        className="relative flex h-full items-center"
                                    >
                                        <Link
                                            href={item.href}
                                            className={cn(
                                                navigationMenuTriggerStyle(),
                                                whenCurrentUrl(
                                                    item.href,
                                                    activeItemStyles,
                                                ),
                                                'h-9 cursor-pointer px-3',
                                            )}
                                        >
                                            {item.icon && (
                                                <item.icon className="mr-2 h-4 w-4" />
                                            )}
                                            {item.title}
                                        </Link>
                                        {isCurrentUrl(item.href) && (
                                            <div className="absolute bottom-0 left-0 h-0.5 w-full translate-y-px bg-black"></div>
                                        )}
                                    </NavigationMenuItem>
                                ))}
                            </NavigationMenuList>
                        </NavigationMenu>
                    </div>

                    <div className="ml-auto flex items-center">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    className="size-10 rounded-full p-1"
                                >
                                    <Avatar className="size-8 overflow-hidden rounded-full">
                                        <AvatarImage
                                            src={auth.user?.avatar}
                                            alt={auth.user?.name}
                                        />
                                        <AvatarFallback className="rounded-lg bg-neutral-200 text-black">
                                            {getInitials(auth.user?.name ?? '')}
                                        </AvatarFallback>
                                    </Avatar>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56" align="end">
                                {auth.user && (
                                    <UserMenuContent user={auth.user} />
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>
            {breadcrumbs.length > 1 && (
                <div className="flex w-full border-b border-sidebar-border/70">
                    <div className="mx-auto flex h-12 w-full items-center justify-start px-4 text-neutral-500 md:max-w-7xl">
                        <Breadcrumbs breadcrumbs={breadcrumbs} />
                    </div>
                </div>
            )}
        </>
    );
}
