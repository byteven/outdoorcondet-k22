import { useState } from 'react';
import ReactImageMagnify from 'react-image-magnify';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import type { Swiper as SwiperClass } from 'swiper';
import { PackageIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import 'swiper/css';
import 'swiper/css/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type ImageGalleryProps = {
    images: string[];
    name: string;
    className?: string;
};

export function ImageGallery({ images, name, className }: ImageGalleryProps) {
    const [activeIndex, setActiveIndex] = useState(0);

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

    return (
        <div className={cn('flex flex-col gap-3', className)}>
            <div className="w-full overflow-hidden rounded-2xl border border-border/20 bg-card">
                <ReactImageMagnify
                    key={images[activeIndex]}
                    className="w-full"
                    smallImage={{
                        src: `/storage/${images[activeIndex]}`,
                        isFluidWidth: true,
                        alt: name,
                    }}
                    largeImage={{
                        src: `/storage/${images[activeIndex]}`,
                        alt: name,
                    }}
                    enlargedImageContainerStyle={{
                        zIndex: 50,
                        borderRadius: '0.75rem',
                        backgroundColor: '#fff',
                    }}
                    enlargedImageContainerDimensions={{
                        width: '150%',
                        height: '150%',
                    }}
                    cursorStyle={{ cursor: 'zoom-in' }}
                    shouldUsePositiveSpaceLens
                    isHintEnabled={false}
                />
            </div>

            {images.length > 1 && (
                <Thumbnails
                    images={images}
                    name={name}
                    activeIndex={activeIndex}
                    onSelect={setActiveIndex}
                />
            )}
        </div>
    );
}

type ThumbnailsProps = {
    images: string[];
    name: string;
    activeIndex: number;
    onSelect: (index: number) => void;
};

function Thumbnails({ images, name, activeIndex, onSelect }: ThumbnailsProps) {
    const [swiper, setSwiper] = useState<SwiperClass | null>(null);

    return (
        <div className="group relative">
            {/* Previous Button */}
            {images.length > 5 && (
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute -left-3 top-1/2 z-10 h-8 w-8 -translate-y-1/2 rounded-full border border-border bg-background shadow-sm opacity-0 transition-opacity group-hover:opacity-100 hover:bg-accent"
                    onClick={() => swiper?.slidePrev()}
                    aria-label="Previous images"
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>
            )}

            <Swiper
                onSwiper={setSwiper}
                modules={[Navigation]}
                slidesPerView={5}
                spaceBetween={8}
                watchSlidesProgress
                className="px-1"
            >
                {images.map((image, index) => (
                    <SwiperSlide key={image + index}>
                        <ThumbnailButton
                            image={image}
                            name={name}
                            active={index === activeIndex}
                            onClick={() => {
                                onSelect(index);
                                swiper?.slideTo(index);
                            }}
                        />
                    </SwiperSlide>
                ))}
            </Swiper>

            {/* Next Button */}
            {images.length > 5 && (
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute -right-3 top-1/2 z-10 h-8 w-8 -translate-y-1/2 rounded-full border border-border bg-background shadow-sm opacity-0 transition-opacity group-hover:opacity-100 hover:bg-accent"
                    onClick={() => swiper?.slideNext()}
                    aria-label="Next images"
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
            )}
        </div>
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
