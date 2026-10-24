import { Deferred, Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import {
    CircleUserRoundIcon,
    MenuIcon,
    ShoppingCartIcon,
    UserRoundIcon,
} from 'lucide-react';
import {
    CatalogSection,
    CatalogSkeleton,
    type CatalogData,
    type CatalogFilters,
} from '@/components/catalog-section';
import { RentalRange } from '@/components/rental-range';
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
import { home } from '@/routes';
import { login } from '@/routes';
import { register } from '@/routes';
import { dashboard } from '@/routes/admin';
import { edit as editProfile } from '@/routes/profile';

type RentalFilter = {
    pickupDate?: Date;
    returnDate?: Date;
    totalDays?: number;
};

type Props = {
    catalog?: CatalogData;
    filters: CatalogFilters;
};

export default function Landing({ catalog, filters }: Props) {
    const { auth } = usePage().props;
    const isAdmin = auth.user?.role === 'admin';
    const getInitials = useInitials();
    const [rentalFilter, setRentalFilter] = useState<RentalFilter | null>(null);
    const [scrolled, setScrolled] = useState(false);
    const [catalogLoading, setCatalogLoading] = useState(false);
    const filterRef = useRef(filters);
    filterRef.current = filters;

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 8);

        handleScroll();
        window.addEventListener('scroll', handleScroll, { passive: true });

        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleFilterChange = (
        params: Partial<CatalogFilters> & { page?: number },
    ) => {
        const next = {
            tab: filterRef.current.tab,
            search: filterRef.current.search,
            category: filterRef.current.category,
            page: filterRef.current.page,
            per_page: filterRef.current.per_page,
            ...params,
        };

        const query: Record<string, string | number> = {
            tab: next.tab,
            per_page: next.per_page,
            page: next.page ?? 1,
        };

        if (next.search) {
            query.search = next.search;
        }

        if (next.category !== null && next.category !== undefined) {
            query.category = next.category;
        }

        // Add rental range to query params
        if (rentalFilter?.pickupDate) {
            query.pickup_date = rentalFilter.pickupDate.toISOString().split('T')[0];
        }

        if (rentalFilter?.returnDate) {
            query.return_date = rentalFilter.returnDate.toISOString().split('T')[0];
        }

        const catalogEl = document.getElementById('katalog');
        const scrollYBefore = window.scrollY;

        router.get(home.url(), query, {
            preserveState: true,
            replace: true,
            only: ['catalog', 'filters'],
            onStart: () => {
                setCatalogLoading(true);
            },
            onFinish: () => {
                setCatalogLoading(false);
                requestAnimationFrame(() => {
                    if (catalogEl) {
                        const headerOffset = 96;
                        const rect = catalogEl.getBoundingClientRect();
                        const targetTop = rect.top + window.scrollY - headerOffset;
                        // If user was scrolled down past or near catalog, keep them aligned to catalog top area
                        if (scrollYBefore > 200) {
                            window.scrollTo({ top: targetTop, behavior: 'auto' });
                        }
                    }
                });
            },
        });
    };

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
                        <Link href="/" className="flex items-center">
                            <img
                                src="/images/logo-landscape-transparent.webp"
                                alt="OutdoorCondet"
                                className="h-10 w-auto object-contain"
                            />
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

                                    <DropdownMenu modal={false}>
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
                                    variant="ghost"
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

                <main className="bg-[#fbfbfc]">
                    <section
                        id="beranda"
                        className="relative isolate scroll-mt-20 overflow-hidden bg-[#fbfbfc]"
                    >
                        <div
                            aria-hidden="true"
                            className="absolute inset-0 -z-10 "
                        >
                            <img
                                src="/images/mount-landscape.webp"
                                alt=""
                                className="size-full [mask-image:linear-gradient(to_bottom,black_80%,transparent_100%)] object-cover object-[5%_100%] opacity-100 [-webkit-mask-image:linear-gradient(to_bottom,black_80%,transparent_100%)]"
                            />
                        </div>

                        <div className="mx-auto w-full max-w-4xl px-4 pt-24 pb-48 text-center md:pt-56 md:pb-80">
                            <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
                                Kegiatan outdoor dengan{' '}
                                <span className="text-primary">
                                    Perlengkapan Terbaik
                                </span>
                            </h1>

                            <div className="mt-10 flex flex-nowrap items-center justify-center gap-3 text-left sm:gap-6">
                                <div className="flex items-center -space-x-2">
                                    <div className="flex -space-x-4">
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
                                        5K+
                                    </span>
                                </div>
                                <span className="hidden h-10 w-px bg-border sm:block" />
                                <div className="min-w-0">
                                    <p className="text-xs font-semibold sm:text-sm">
                                        5.000+ Pelanggan
                                    </p>
                                    <p className="text-[11px] leading-snug text-muted-foreground sm:text-xs">
                                        Melayani lebih dari 5.000 pelanggan
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="relative z-10 mx-auto -mt-16 w-full max-w-5xl px-4 md:-mt-28">
                        <RentalRange
                            onSearch={(params) => {
                                setRentalFilter({
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
                        className="scroll-mt-20 bg-[#fbfbfc]"
                    >
                        <div className="mx-auto w-full max-w-6xl px-4 py-16 md:px-6 md:py-20">
                            <div className="max-w-2xl">
                                <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
                                    Katalog Peralatan
                                </h2>
                                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                                    Cari tenda, carrier, dan perlengkapan
                                    camping lain yang kamu butuhkan.
                                </p>
                            </div>

                            <Deferred
                                data="catalog"
                                fallback={
                                    <CatalogSection
                                        catalog={{
                                            categories: [],
                                            products: null,
                                            packages: null,
                                            pagination: {
                                                current_page: 1,
                                                last_page: 1,
                                                per_page: 12,
                                                total: 0,
                                                from: null,
                                                to: null,
                                            },
                                        }}
                                        filters={filters}
                                        onFilterChange={handleFilterChange}
                                        loading
                                    />
                                }
                            >
                                <CatalogSection
                                    catalog={catalog!}
                                    filters={filters}
                                    onFilterChange={handleFilterChange}
                                    loading={catalogLoading}
                                />
                            </Deferred>
                        </div>
                    </section>
                </main>

                <SiteFooter />
            </div>
        </>
    );
}
