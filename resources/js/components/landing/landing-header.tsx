import { Link, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { MenuIcon, ShoppingCartIcon, UserRoundIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Sheet,
    SheetClose,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { UserMenuContent } from '@/components/user-menu-content';
import { useInitials } from '@/hooks/use-initials';
import { cn } from '@/lib/utils';
import { login, register } from '@/routes';
import { dashboard } from '@/routes/admin';
import { index as cartIndex } from '@/routes/cart';
import { edit as editProfile } from '@/routes/profile';
import type { User } from '@/types';

const SCROLL_TRIGGER_PX = 8;

export function LandingHeader() {
    const { auth } = usePage().props;
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () =>
            setScrolled(window.scrollY > SCROLL_TRIGGER_PX);

        handleScroll();
        window.addEventListener('scroll', handleScroll, { passive: true });

        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <header
            className={cn(
                'fixed inset-x-0 top-0 z-40 transition-colors duration-300',
                scrolled ? 'bg-background' : 'bg-transparent',
            )}
        >
            <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-6 px-4 md:px-6">
                <LogoLink />
                {auth.user ? (
                    <UserActions user={auth.user} />
                ) : (
                    <GuestActions />
                )}
            </div>
        </header>
    );
}

function LogoLink() {
    return (
        <Link href="/" className="flex items-center">
            <img
                src="/images/logo-landscape-transparent.webp"
                alt="OutdoorCondet"
                className="h-10 w-auto object-contain"
            />
        </Link>
    );
}

function UserActions({ user }: { user: User }) {
    return user.role === 'admin' ? (
        <Button asChild className="rounded-full px-5">
            <Link href={dashboard()}>Dashboard</Link>
        </Button>
    ) : (
        <div className="flex items-center gap-1">
            <CartButton />
            <ProfileMenu user={user} />
            <MobileNavSheet />
        </div>
    );
}

function CartButton() {
    const { cart } = usePage().props;
    const count = (cart as { count?: number } | null)?.count ?? 0;

    return (
        <Button
            asChild
            variant="ghost"
            size="icon"
            className="relative size-10 rounded-full"
            aria-label="Keranjang"
            title="Keranjang"
        >
            <Link href={cartIndex.url()}>
                <ShoppingCartIcon className="size-5" />
                {count > 0 && (
                    <span
                        className="absolute -top-0.5 -right-0.5 flex size-4.5 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-white"
                        aria-label={`${count} item di keranjang`}
                    >
                        {count > 9 ? '9+' : count}
                    </span>
                )}
            </Link>
        </Button>
    );
}

function ProfileMenu({ user }: { user: User }) {
    const getInitials = useInitials();

    return (
        <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    className="size-10 rounded-full p-1"
                    aria-label="Menu profil"
                >
                    <Avatar className="size-8 overflow-hidden rounded-full">
                        <AvatarImage src={user.avatar} alt={user.name} />
                        <AvatarFallback className="rounded-lg bg-neutral-200 text-black">
                            {getInitials(user.name ?? '')}
                        </AvatarFallback>
                    </Avatar>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
                <UserMenuContent user={user} />
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

function MobileNavSheet() {
    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="size-10 shrink-0 md:hidden"
                    aria-label="Buka menu navigasi"
                >
                    <MenuIcon className="size-5" />
                </Button>
            </SheetTrigger>
            <SheetContent side="right">
                <SheetHeader>
                    <SheetTitle>Menu navigasi</SheetTitle>
                </SheetHeader>

                <nav
                    aria-label="Navigasi seluler"
                    className="flex flex-col gap-1 px-4"
                >
                    <SheetClose asChild>
                        <Link
                            href={editProfile()}
                            prefetch
                            className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
                        >
                            <UserRoundIcon className="size-5 shrink-0" />
                            Profil
                        </Link>
                    </SheetClose>
                </nav>
            </SheetContent>
        </Sheet>
    );
}

function GuestActions() {
    return (
        <div className="flex items-center gap-2">
            <Button asChild variant="ghost" className="rounded-full px-5">
                <Link href={register()}>Daftar</Link>
            </Button>
            <Button asChild className="rounded-full px-5">
                <Link href={login()}>Masuk</Link>
            </Button>
        </div>
    );
}
