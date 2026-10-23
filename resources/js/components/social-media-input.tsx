import { ExternalLink, Link as LinkIcon, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import InputError from '@/components/input-error';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export type SocialPlatform = 'instagram' | 'tiktok' | 'facebook';

export const SOCIAL_PLATFORMS: {
    id: SocialPlatform;
    name: string;
    icon: string;
    prefix: string;
    domain: string;
    placeholder: string;
}[] = [
    {
        id: 'instagram',
        name: 'Instagram',
        icon: '/images/instagram.svg',
        prefix: 'instagram.com/',
        domain: 'https://instagram.com/',
        placeholder: 'username',
    },
    {
        id: 'tiktok',
        name: 'TikTok',
        icon: '/images/tiktok.svg',
        prefix: 'tiktok.com/@',
        domain: 'https://tiktok.com/@',
        placeholder: 'username',
    },
    {
        id: 'facebook',
        name: 'Facebook',
        icon: '/images/facebook.svg',
        prefix: 'facebook.com/',
        domain: 'https://facebook.com/',
        placeholder: 'username',
    },
];

export function parseSocialUrl(url: string | null | undefined): {
    platform: SocialPlatform;
    handle: string;
} {
    if (!url) {
        return { platform: 'instagram', handle: '' };
    }

    const lower = url.toLowerCase();

    if (lower.includes('tiktok.com')) {
        const match = url.match(/tiktok\.com\/(?:@)?([^/?#]+)/i);
        return { platform: 'tiktok', handle: match ? match[1] : url };
    }

    if (lower.includes('facebook.com')) {
        const match = url.match(/facebook\.com\/([^/?#]+)/i);
        return { platform: 'facebook', handle: match ? match[1] : url };
    }

    if (lower.includes('instagram.com')) {
        const match = url.match(/instagram\.com\/([^/?#]+)/i);
        return { platform: 'instagram', handle: match ? match[1] : url };
    }

    return { platform: 'instagram', handle: url };
}

export function buildSocialUrl(
    platform: SocialPlatform,
    handle: string,
): string {
    const trimmed = handle.trim();
    if (!trimmed) {
        return '';
    }

    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        return trimmed;
    }

    const clean = trimmed.replace(/^@/, '').replace(/^\/+/, '');
    const meta = SOCIAL_PLATFORMS.find((p) => p.id === platform);

    return meta ? `${meta.domain}${clean}` : clean;
}

export function getSocialMediaMeta(url: string | null | undefined) {
    if (!url) {
        return null;
    }

    const { platform, handle } = parseSocialUrl(url);
    const meta = SOCIAL_PLATFORMS.find((p) => p.id === platform);

    return {
        platform,
        handle,
        name: meta?.name ?? 'Sosial Media',
        icon: meta?.icon ?? '/images/instagram.svg',
        url: buildSocialUrl(platform, handle),
    };
}

function renderLabelWithOptional(label: React.ReactNode) {
    return label;
}

type SocialMediaInputProps = {
    id?: string;
    label?: React.ReactNode;
    value?: string | null;
    onChange: (value: string) => void;
    error?: string;
    disabled?: boolean;
    className?: string;
    hideLabel?: boolean;
};

export function SocialMediaInput({
    id = 'social_media',
    label = 'Sosial media (opsional)',
    value,
    onChange,
    error,
    disabled = false,
    className,
    hideLabel = false,
}: SocialMediaInputProps) {
    const parsed = parseSocialUrl(value);
    const [platform, setPlatform] = useState<SocialPlatform>(parsed.platform);
    const [handle, setHandle] = useState<string>(parsed.handle);

    useEffect(() => {
        const next = parseSocialUrl(value);
        setPlatform(next.platform);
        setHandle(next.handle);
    }, [value]);

    const activeMeta =
        SOCIAL_PLATFORMS.find((p) => p.id === platform) ?? SOCIAL_PLATFORMS[0];

    const handlePlatformChange = (nextPlatform: SocialPlatform) => {
        setPlatform(nextPlatform);
        if (handle.trim()) {
            onChange(buildSocialUrl(nextPlatform, handle));
        }
    };

    const handleInputChange = (raw: string) => {
        let clean = raw;
        let detectedPlatform = platform;

        if (raw.toLowerCase().includes('tiktok.com')) {
            detectedPlatform = 'tiktok';
            const m = raw.match(/tiktok\.com\/(?:@)?([^/?#]+)/i);
            clean = m ? m[1] : raw;
        } else if (raw.toLowerCase().includes('facebook.com')) {
            detectedPlatform = 'facebook';
            const m = raw.match(/facebook\.com\/([^/?#]+)/i);
            clean = m ? m[1] : raw;
        } else if (raw.toLowerCase().includes('instagram.com')) {
            detectedPlatform = 'instagram';
            const m = raw.match(/instagram\.com\/([^/?#]+)/i);
            clean = m ? m[1] : raw;
        }

        setPlatform(detectedPlatform);
        setHandle(clean);
        onChange(clean.trim() ? buildSocialUrl(detectedPlatform, clean) : '');
    };

    const fullUrl = buildSocialUrl(platform, handle);

    return (
        <div className={cn('grid gap-2', className)}>
            {!hideLabel && (
                <div className="flex items-center justify-between">
                    <Label htmlFor={id}>{renderLabelWithOptional(label)}</Label>
                    {handle.trim() && (
                        <button
                            type="button"
                            onClick={() => {
                                setHandle('');
                                onChange('');
                            }}
                            className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                            Hapus
                        </button>
                    )}
                </div>
            )}

            {/* Platform Selection using radio button style */}
            <div
                role="radiogroup"
                aria-label="Pilih sosial media"
                className="grid grid-cols-3 gap-2"
            >
                {SOCIAL_PLATFORMS.map((p) => {
                    const isSelected = platform === p.id;
                    return (
                        <button
                            key={p.id}
                            type="button"
                            role="radio"
                            aria-checked={isSelected}
                            disabled={disabled}
                            onClick={() => handlePlatformChange(p.id)}
                            className={cn(
                                'flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-xs font-medium cursor-pointer select-none',
                                isSelected
                                    ? 'border-foreground/30 bg-muted text-foreground'
                                    : 'border-border bg-background text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                                disabled && 'cursor-not-allowed opacity-50',
                            )}
                        >
                            <div className="flex items-center gap-2 min-w-0">
                                <img
                                    src={p.icon}
                                    alt={p.name}
                                    className="size-4 shrink-0"
                                />
                                <span className="truncate">{p.name}</span>
                            </div>

                            {/* Radio button indicator on the right */}
                            <span
                                aria-hidden="true"
                                className={cn(
                                    'flex size-3.5 shrink-0 items-center justify-center rounded-full border',
                                    isSelected
                                        ? 'border-foreground bg-foreground'
                                        : 'border-muted-foreground/40 bg-background',
                                )}
                            >
                                {isSelected && (
                                    <span className="size-1.5 rounded-full bg-background" />
                                )}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Link-style Input Field with default Inter font */}
            <div
                className={cn(
                    'flex items-center rounded-md border border-input bg-background focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px] transition-[color,box-shadow] overflow-hidden text-sm',
                    error &&
                        'border-destructive aria-invalid:ring-destructive/20',
                    disabled && 'opacity-50',
                )}
            >
                <div className="flex items-center gap-1.5 border-r border-border bg-muted/60 px-3 py-2 text-xs md:text-sm text-muted-foreground select-none shrink-0 font-normal">
                    <img
                        src={activeMeta.icon}
                        alt=""
                        className="size-3.5 shrink-0"
                    />
                    <span>{activeMeta.prefix}</span>
                </div>
                <input
                    id={id}
                    type="text"
                    value={handle}
                    disabled={disabled}
                    onChange={(e) => handleInputChange(e.target.value)}
                    placeholder={activeMeta.placeholder}
                    aria-invalid={!!error}
                    className="flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground min-w-0 font-normal"
                />
                {handle.trim() && (
                    <button
                        type="button"
                        onClick={() => {
                            setHandle('');
                            onChange('');
                        }}
                        className="p-1 mr-1 text-muted-foreground hover:text-foreground cursor-pointer rounded"
                        title="Hapus"
                        aria-label="Hapus nilai"
                    >
                        <X className="size-3.5" />
                    </button>
                )}
                {fullUrl ? (
                    <a
                        href={fullUrl}
                        target="_blank"
                        rel="noreferrer"
                        title="Buka link"
                        className="flex items-center px-3 text-muted-foreground hover:text-primary shrink-0"
                    >
                        <ExternalLink className="size-4" />
                    </a>
                ) : (
                    <div className="flex items-center px-3 text-muted-foreground shrink-0 pointer-events-none">
                        <LinkIcon className="size-3.5 opacity-50" />
                    </div>
                )}
            </div>

            <InputError message={error} />
        </div>
    );
}
