import { Link, usePage } from '@inertiajs/react';
import type { PropsWithChildren } from 'react';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { cn, toUrl } from '@/lib/utils';
import { edit } from '@/routes/profile';
import { edit as editSecurity } from '@/routes/security';
import type { Auth, NavItem } from '@/types';

export default function SettingsLayout({ children }: PropsWithChildren) {
    const { isCurrentOrParentUrl } = useCurrentUrl();
    const { auth } = usePage<{ auth: Auth }>().props;
    const isCustomer = (auth.user.role ?? 'customer') === 'customer';

    const sidebarNavItems: NavItem[] = [
        ...(isCustomer
            ? [
                {
                    title: 'Profil',
                    href: edit(),
                    icon: null,
                },
            ]
            : []),
        {
            title: 'Ganti password',
            href: editSecurity(),
            icon: null,
        },
    ];

    return (
        <div className="px-4 py-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:gap-12">
                <aside className="w-full shrink-0 lg:w-56">
                    <Heading
                        title="Pengaturan"
                        description={
                            isCustomer
                                ? 'Kelola profil akunmu'
                                : 'Kelola keamanan akunmu'
                        }
                    />

                    <nav
                        className="mt-4 flex flex-col space-y-1"
                        aria-label="Pengaturan"
                    >
                        {sidebarNavItems.map((item, index) => (
                            <Button
                                key={`${toUrl(item.href)}-${index}`}
                                size="sm"
                                variant="ghost"
                                asChild
                                className={cn('w-full justify-start', {
                                    'bg-muted': isCurrentOrParentUrl(item.href),
                                })}
                            >
                                <Link href={item.href}>
                                    {item.icon && (
                                        <item.icon className="h-4 w-4" />
                                    )}
                                    {item.title}
                                </Link>
                            </Button>
                        ))}
                    </nav>
                </aside>

                <Separator className="lg:hidden" />

                <div className="min-w-0 flex-1 md:max-w-2xl">
                    <section className="max-w-xl space-y-12">
                        {children}
                    </section>
                </div>
            </div>
        </div>
    );
}
