import { Link } from '@inertiajs/react';
import { ClockIcon, MapPinIcon } from 'lucide-react';
import { policy, privacy } from '@/routes/legal';
import { SITE } from '@/lib/site';

type Props = {
    className?: string;
};

export function SiteFooter({ className }: Props) {
    const year = new Date().getFullYear();

    return (
        <footer
            className={`bg-primary text-primary-foreground ${className ?? ''}`}
        >
            <div className="mx-auto w-full max-w-6xl px-4 py-10 md:px-6 md:py-12">
                <div className="grid gap-8 md:grid-cols-3">
                    <div className="space-y-3">
                        <Link href="/" className="flex items-center gap-2.5">
                            <span className="flex size-9 items-center justify-center rounded-md bg-background">
                                <img
                                    src="/images/logo-transparent.webp"
                                    alt="OutdoorCondet"
                                    className="size-8 object-contain"
                                />
                            </span>
                            <span className="flex flex-col leading-tight">
                                <span className="font-semibold">
                                    {SITE.legalName}
                                </span>
                                <span className="text-xs text-primary-foreground/70">
                                    {SITE.tagline}
                                </span>
                            </span>
                        </Link>
                        <a
                            href={SITE.addressUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2 text-xs text-primary-foreground/70 transition-colors hover:text-primary-foreground"
                        >
                            <MapPinIcon className="size-4 shrink-0" />
                            {SITE.address}
                        </a>
                        <p className="flex items-center gap-2 text-xs text-primary-foreground/70">
                            <ClockIcon className="size-4 shrink-0" />
                            {SITE.operatingHours}
                        </p>
                    </div>

                    <nav
                        aria-label="Tautan footer"
                        className="space-y-3 text-sm"
                    >
                        <p className="font-semibold">Informasi</p>
                        <ul className="space-y-2">
                            <li>
                                <Link
                                    href={policy()}
                                    prefetch
                                    className="text-primary-foreground/80 transition-colors hover:text-primary-foreground"
                                >
                                    Kebijakan
                                </Link>
                            </li>
                            <li>
                                <Link
                                    href={privacy()}
                                    prefetch
                                    className="text-primary-foreground/80 transition-colors hover:text-primary-foreground"
                                >
                                    Privasi
                                </Link>
                            </li>
                        </ul>
                    </nav>

                    <div className="space-y-3 text-sm">
                        <p className="font-semibold">Hubungi kami</p>
                        <ul className="space-y-2">
                            <li>
                                <a
                                    href={SITE.whatsappUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-2 text-primary-foreground/80 transition-colors hover:text-primary-foreground"
                                >
                                    <img
                                        src="/images/whatsapp.svg"
                                        alt="WhatsApp"
                                        className="size-4 object-contain"
                                    />
                                    {SITE.whatsappDisplay}
                                </a>
                            </li>
                            <li>
                                <a
                                    href={SITE.instagramUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-2 text-primary-foreground/80 transition-colors hover:text-primary-foreground"
                                >
                                    <img
                                        src="/images/instagram.svg"
                                        alt="Instagram"
                                        className="size-4 object-contain"
                                    />
                                    {SITE.instagramHandle}
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="mt-8 flex flex-col gap-1 border-t border-primary-foreground/20 pt-4 text-xs text-primary-foreground/70 sm:flex-row sm:items-center sm:justify-between">
                    <p>
                        © {year} {SITE.legalName}. Seluruh hak cipta dilindungi.
                    </p>
                    <p>
                        Sewa alat camping dan outdoor dengan harga terjangkau.
                    </p>
                </div>
            </div>
        </footer>
    );
}
