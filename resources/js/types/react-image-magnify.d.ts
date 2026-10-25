declare module 'react-image-magnify' {
    import type { CSSProperties } from 'react';
    import type { ComponentType } from 'react';

    export type MagnifyImageSpec = {
        src: string;
        width?: number;
        height?: number;
        isFluidWidth?: boolean;
        alt?: string;
        onLoad?: (event: Event) => void;
    };

    export type MagnifyLensStyle = {
        cursorStyle?: CSSProperties;
        position?: CSSProperties;
    };

    export type MagnifyEnlargedImageProps = {
        containerStyle?: CSSProperties;
        imageStyle?: CSSProperties;
        fadeDuration?: number;
    };

    export type ReactImageMagnifyProps = {
        smallImage: MagnifyImageSpec;
        largeImage: MagnifyImageSpec;
        cursorStyle?: CSSProperties;
        lensStyle?: CSSProperties;
        enlargedImageContainerDimensions?: {
            width?: string | number;
            height?: string | number;
        };
        enlargedImageContainerStyle?: CSSProperties;
        enlargedImageContainerClassName?: string;
        isHintEnabled?: boolean;
        hintText?: string;
        shouldUsePositiveSpaceLens?: boolean;
        isEnlargedImagePortalEnabled?: boolean;
        isTouchEnabled?: boolean;
        isDetachedMagnification?: boolean;
        className?: string;
        style?: CSSProperties;
    };

    const ReactImageMagnify: ComponentType<ReactImageMagnifyProps>;

    export default ReactImageMagnify;
}
