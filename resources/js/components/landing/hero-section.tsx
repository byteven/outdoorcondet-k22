import { CircleUserRoundIcon } from 'lucide-react';

export function HeroSection() {
    return (
        <section
            id="beranda"
            className="relative isolate scroll-mt-20 overflow-hidden bg-[#fbfbfc]"
        >
            <div aria-hidden="true" className="absolute inset-0 -z-10">
                <img
                    src="/images/mount-landscape.webp"
                    alt=""
                    className="size-full [mask-image:linear-gradient(to_bottom,black_80%,transparent_100%)] object-cover object-[5%_100%] opacity-100 [-webkit-mask-image:linear-gradient(to_bottom,black_80%,transparent_100%)]"
                />
            </div>

            <div className="mx-auto w-full max-w-4xl px-4 pt-24 pb-48 text-center md:pt-56 md:pb-80">
                <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
                    Kegiatan outdoor dengan{' '}
                    <span className="text-primary">Perlengkapan Terbaik</span>
                </h1>

                <SocialProof />
            </div>
        </section>
    );
}

function SocialProof() {
    return (
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
    );
}
