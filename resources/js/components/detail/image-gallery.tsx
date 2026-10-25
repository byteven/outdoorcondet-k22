
import { useEffect, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import type { Swiper as SwiperClass } from 'swiper';
import {
    PackageIcon,
    ChevronLeft,
    ChevronRight,
    ImageIcon,
} from 'lucide-react';
import 'swiper/css';
import 'swiper/css/navigation';
import { cn } from '@/lib/utils';

type ImageGalleryProps = {
    images: string[];
    name: string;
    className?: string;
};

const navButtonClass =
    'absolute top-1/2 z-10 flex size-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-all hover:bg-black/70 active:scale-95';

export function ImageGallery({
    images,
    name,
    className,
}: ImageGalleryProps) {
    const [mounted, setMounted] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const [mainSwiper, setMainSwiper] =
        useState<SwiperClass | null>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (images.length === 0) {
        return (
            <div
                className={cn(
                    'flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl border border-border/20 bg-muted',
                    className,
                )}
            >
                <PackageIcon
                    className="size-16 text-muted-foreground/40"
                    strokeWidth={1.5}
                />
            </div>
        );
    }

    const hasMultiple = images.length > 1;

    return (
        <div
            className={cn(
                'flex min-w-0 flex-col gap-3',
                className,
            )}
        >
            {/* Main Image Viewer */}
            <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-border/20 bg-card">
                {!mounted ? (
                    <img
                        src={`/storage/${images[0]}`}
                        alt={`${name} - 1`}
                        className="h-full w-full object-cover"
                    />
                ) : (
                    <Swiper
                        className="h-full w-full"
                        onSwiper={setMainSwiper}
                        modules={[Navigation]}
                        spaceBetween={0}
                        slidesPerView={1}
                        loop={hasMultiple}
                        speed={400}
                        onSlideChange={(swiper) => {
                            setActiveIndex(swiper.realIndex);
                        }}
                    >
                        {images.map((image, index) => (
                            <SwiperSlide
                                key={image + index}
                                className="!h-full"
                            >
                                <img
                                    src={`/storage/${image}`}
                                    alt={`${name} - ${index + 1}`}
                                    className="h-full w-full object-cover"
                                />
                            </SwiperSlide>
                        ))}
                    </Swiper>
                )}

                {/* Navigation Buttons */}
                {hasMultiple && (
                    <>
                        <button
                            type="button"
                            className={cn(navButtonClass, 'left-3')}
                            onClick={() => mainSwiper?.slidePrev()}
                            aria-label="Previous image"
                        >
                            <ChevronLeft className="size-5" />
                        </button>

                        <button
                            type="button"
                            className={cn(navButtonClass, 'right-3')}
                            onClick={() => mainSwiper?.slideNext()}
                            aria-label="Next image"
                        >
                            <ChevronRight className="size-5" />
                        </button>

                        {/* Image Counter */}
                        <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
                            <ImageIcon className="size-3.5" />
                            <span>
                                {activeIndex + 1} / {images.length}
                            </span>
                        </div>
                    </>
                )}
            </div>

            {/* Thumbnails */}
            {hasMultiple && (
                <Thumbnails
                    mounted={mounted}
                    images={images}
                    name={name}
                    activeIndex={activeIndex}
                    onSelect={(index) => {
                        setActiveIndex(index);

                        if (mainSwiper) {
                            if (hasMultiple) {
                                mainSwiper.slideToLoop(index);
                            } else {
                                mainSwiper.slideTo(index);
                            }
                        }
                    }}
                />
            )}
        </div>
    );
}

type ThumbnailsProps = {
    mounted: boolean;
    images: string[];
    name: string;
    activeIndex: number;
    onSelect: (index: number) => void;
};

function Thumbnails({
    mounted,
    images,
    name,
    activeIndex,
    onSelect,
}: ThumbnailsProps) {
    const [thumbSwiper, setThumbSwiper] =
        useState<SwiperClass | null>(null);

    // Geser thumbnail agar gambar aktif tetap terlihat
    useEffect(() => {
        if (!thumbSwiper) return;

        const slidesPerView =
            typeof thumbSwiper.params.slidesPerView === 'number'
                ? thumbSwiper.params.slidesPerView
                : 4;

        const targetIndex = Math.max(
            0,
            activeIndex - Math.floor(slidesPerView / 2),
        );

        thumbSwiper.slideTo(targetIndex);
    }, [activeIndex, thumbSwiper]);

    if (!mounted) {
        return (
            <div className="grid grid-cols-4 gap-2 overflow-hidden px-1 sm:grid-cols-5">
                {images.slice(0, 5).map((image, index) => (
                    <ThumbnailButton
                        key={image + index}
                        image={image}
                        name={name}
                        active={index === activeIndex}
                        onClick={() => onSelect(index)}
                    />
                ))}
            </div>
        );
    }

    return (
        <Swiper
            onSwiper={setThumbSwiper}
            slidesPerView={4}
            spaceBetween={8}
            breakpoints={{
                640: {
                    slidesPerView: 5,
                },
            }}
            watchSlidesProgress
            className="w-full px-1"
        >
            {images.map((image, index) => (
                <SwiperSlide key={image + index}>
                    <ThumbnailButton
                        image={image}
                        name={name}
                        active={index === activeIndex}
                        onClick={() => onSelect(index)}
                    />
                </SwiperSlide>
            ))}
        </Swiper>
    );
}

function ThumbnailButton({
    image,
    name,
    active,
    onClick,
}: {
    image: string;
    name: string;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={`Lihat ${name}`}
            aria-current={active}
            className={cn(
                'aspect-square w-full cursor-pointer overflow-hidden rounded-xl border-2 bg-muted transition-colors',
                active
                    ? 'border-primary'
                    : 'border-transparent hover:border-border',
            )}
        >
            <img
                src={`/storage/${image}`}
                alt=""
                loading="lazy"
                className="size-full object-cover"
            />
        </button>
    );
}
