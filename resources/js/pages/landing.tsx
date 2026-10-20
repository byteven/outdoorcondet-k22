import { Head, Link, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import {
    CircleUserRoundIcon,
    MenuIcon,
    ShoppingCartIcon,
    UserRoundIcon,
} from 'lucide-react';
import { RentalSearch } from '@/components/rental-search';
import { SiteFooter } from '@/components/site-footer';
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
import { formatDateID } from '@/lib/rental-date';
import { login } from '@/routes';
import { register } from '@/routes';
import { dashboard } from '@/routes/admin';
import { edit as editProfile } from '@/routes/profile';

const CATALOG_PLACEHOLDERS = [0, 1, 2, 3, 4, 5];

type CatalogFilter = {
    pickupDate?: Date;
    returnDate?: Date;
    totalDays?: number;
};

export default function Landing() {
    const { auth } = usePage().props;
    const isAdmin = auth.user?.role === 'admin';
    const getInitials = useInitials();
    const [filter, setFilter] = useState<CatalogFilter | null>(null);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 8);

        handleScroll();
        window.addEventListener('scroll', handleScroll, { passive: true });

        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <>
            <Head title="OutdoorCondet - Sewa Alat Outdoor Condet" />

            <div className="min-h-screen bg-background">
                <header
                    className={cn(
                        'fixed inset-x-0 top-0 z-40 transition-colors duration-300',
                        scrolled ? 'bg-background' : 'bg-transparent',
                    )}
                >
                    <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-6 px-4 md:px-6">
                        <Link href="/" className="flex items-center gap-2.5">
                            <img
                                src="/images/logo-transparent.webp"
                                alt="OutdoorCondet"
                                className="size-10 object-contain"
                            />
                            <span className="flex flex-col leading-tight">
                                <span className="text-base font-bold tracking-tight">
                                    outdoorcondet
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    Sewa Alat Outdoor
                                </span>
                            </span>
                        </Link>

                        {auth.user ? (
                            isAdmin ? (
                                <Button asChild className="rounded-full px-5">
                                    <Link href={dashboard()}>Dashboard</Link>
                                </Button>
                            ) : (
                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-10 rounded-full"
                                        aria-label="Keranjang"
                                        title="Keranjang"
                                    >
                                        <ShoppingCartIcon className="size-5" />
                                    </Button>

                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                className="size-10 rounded-full p-1"
                                                aria-label="Menu profil"
                                            >
                                                <Avatar className="size-8 overflow-hidden rounded-full">
                                                    <AvatarImage
                                                        src={auth.user.avatar}
                                                        alt={auth.user.name}
                                                    />
                                                    <AvatarFallback className="rounded-lg bg-neutral-200 text-black">
                                                        {getInitials(
                                                            auth.user.name ??
                                                            '',
                                                        )}
                                                    </AvatarFallback>
                                                </Avatar>
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent
                                            className="w-56"
                                            align="end"
                                        >
                                            <UserMenuContent user={auth.user} />
                                        </DropdownMenuContent>
                                    </DropdownMenu>

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
                                                <SheetTitle>
                                                    Menu navigasi
                                                </SheetTitle>
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
                                </div>
                            )
                        ) : (
                            <div className="flex items-center gap-2">
                                <Button
                                    asChild
                                    variant="outline"
                                    className="rounded-full px-5"
                                >
                                    <Link href={register()}>Daftar</Link>
                                </Button>
                                <Button asChild className="rounded-full px-5">
                                    <Link href={login()}>Masuk</Link>
                                </Button>
                            </div>
                        )}
                    </div>
                </header>

                <main>
                    <section
                        id="beranda"
                        className="relative isolate scroll-mt-20 overflow-hidden"
                    >
                        <div
                            aria-hidden="true"
                            className="absolute inset-0 -z-10"
                        >
                            <img
                                src="/images/mount-landscape.webp"
                                alt=""
                                className="size-full [mask-image:linear-gradient(to_bottom,black_80%,transparent_100%)] object-cover object-[5%_100%] opacity-100 [-webkit-mask-image:linear-gradient(to_bottom,black_80%,transparent_100%)]"
                            />
                            <div className="absolute inset-0 bg-background/20" />
                        </div>

                        <div className="mx-auto w-full max-w-4xl px-4 pt-24 pb-48 text-center md:pt-56 md:pb-80">
                            <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
                                Kegiatan outdoor dengan{' '}
                                <span className="text-primary">
                                    Perlengkapan Terbaik
                                </span>
                            </h1>

                            <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-left">
                                <div className="flex items-center gap-3">
                                    <div className="flex -space-x-3">
                                        {[0, 1, 2].map((item) => (
                                            <span
                                                key={item}
                                                className="flex size-9 items-center justify-center rounded-full border-2 border-background bg-muted text-muted-foreground"
                                            >
                                                <CircleUserRoundIcon className="size-5" />
                                            </span>
                                        ))}
                                    </div>
                                    <span className="flex size-9 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background">
                                        100+
                                    </span>
                                </div>
                                <span className="hidden h-10 w-px bg-border sm:block" />
                                <div>
                                    <p className="text-sm font-semibold">
                                        100+ Pelanggan
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Melayani lebih dari 100 pelanggan
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="relative z-10 mx-auto -mt-16 w-full max-w-5xl px-4 md:-mt-28">
                        <RentalSearch
                            onSearch={(params) => {
                                setFilter({
                                    pickupDate: params.pickupDate,
                                    returnDate: params.returnDate,
                                    totalDays: params.totalDays,
                                });

                                document
                                    .getElementById('katalog')
                                    ?.scrollIntoView({ behavior: 'smooth' });
                            }}
                        />
                    </section>

                    <section
                        id="katalog"
                        className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 py-16 md:px-6 md:py-20"
                    >
                        <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
                            Produk katalog
                        </h2>

                        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {CATALOG_PLACEHOLDERS.map((item) => (
                                <div
                                    key={item}
                                    className="h-44 rounded-2xl border border-dashed border-border bg-muted/30"
                                />
                            ))}
                        </div>

                        {filter && (
                            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                                {filter.pickupDate && (
                                    <span className="rounded-full border border-border/60 bg-card px-3 py-1">
                                        Ambil {formatDateID(filter.pickupDate)}
                                    </span>
                                )}
                                {filter.returnDate && (
                                    <span className="rounded-full border border-border/60 bg-card px-3 py-1">
                                        Kembali{' '}
                                        {formatDateID(filter.returnDate)}
                                        {filter.totalDays
                                            ? ` (${filter.totalDays} hari)`
                                            : ''}
                                    </span>
                                )}
                            </div>
                        )}
                    </section>
                </main>

                <SiteFooter />
            </div>
        </>
    );
}
