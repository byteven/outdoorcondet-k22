import { X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import InputError from '@/components/input-error';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export const EMERGENCY_RELATIONSHIPS = [
    'Orang Tua',
    'Kerabat',
    'Saudara Kandung',
    'Pasangan',
    'Teman Dekat',
    'Lainnya',
] as const;

export type EmergencyRelationship = (typeof EMERGENCY_RELATIONSHIPS)[number];

export function parseEmergencyContact(val: string | null | undefined): {
    phone: string;
    relationship: EmergencyRelationship;
} {
    if (!val) {
        return { phone: '', relationship: 'Orang Tua' };
    }

    const trimmed = val.trim();
    const match = trimmed.match(/^(.*?)(?:\s*\((.*?)\))?$/);
    const rawNumber = match?.[1]?.trim() ?? '';
    const rawRel = match?.[2]?.trim() ?? '';

    // Match relationship or default to Orang Tua
    const foundRel = EMERGENCY_RELATIONSHIPS.find(
        (r) => r.toLowerCase() === rawRel.toLowerCase(),
    );
    const relationship: EmergencyRelationship = foundRel ?? 'Orang Tua';

    // Normalize phone number for the input (strip leading 62 or 0)
    let digits = rawNumber.replace(/\D/g, '');
    if (digits.startsWith('62')) {
        digits = digits.slice(2);
    } else if (digits.startsWith('0')) {
        digits = digits.slice(1);
    }

    return {
        phone: digits,
        relationship,
    };
}

export function buildEmergencyContact(
    phone: string,
    relationship: string,
): string {
    const digits = phone.replace(/\D/g, '').replace(/^0+/, '');
    if (!digits) {
        return '';
    }

    const fullPhone = digits.startsWith('62') ? digits : `62${digits}`;
    const rel = relationship.trim() || 'Orang Tua';

    return `${fullPhone} (${rel})`;
}

function renderLabelWithOptional(label: React.ReactNode) {
    if (typeof label !== 'string') {
        return label;
    }

    if (label.includes('(opsional)')) {
        const [main] = label.split('(opsional)');
        return (
            <>
                {main.trim()}{' '}
                <span className="text-xs font-normal text-muted-foreground">
                    (opsional)
                </span>
            </>
        );
    }

    return label;
}

type EmergencyContactInputProps = {
    id?: string;
    label?: React.ReactNode;
    value?: string | null;
    onChange: (value: string) => void;
    error?: string;
    disabled?: boolean;
    className?: string;
    hideLabel?: boolean;
};

export function EmergencyContactInput({
    id = 'emergency_contact',
    label = 'Kontak darurat',
    value,
    onChange,
    error,
    disabled = false,
    className,
    hideLabel = false,
}: EmergencyContactInputProps) {
    const parsed = parseEmergencyContact(value);
    const [relationship, setRelationship] = useState<EmergencyRelationship>(
        parsed.relationship,
    );
    const [phone, setPhone] = useState<string>(parsed.phone);

    useEffect(() => {
        const next = parseEmergencyContact(value);
        setRelationship(next.relationship);
        setPhone(next.phone);
    }, [value]);

    const handleRelationshipChange = (nextRel: EmergencyRelationship) => {
        setRelationship(nextRel);
        if (phone.trim()) {
            onChange(buildEmergencyContact(phone, nextRel));
        }
    };

    const handlePhoneChange = (raw: string) => {
        const clean = raw.replace(/\D/g, '').slice(0, 13);
        setPhone(clean);
        onChange(clean ? buildEmergencyContact(clean, relationship) : '');
    };

    const handleClear = () => {
        setPhone('');
        onChange('');
    };

    return (
        <div className={cn('grid gap-2', className)}>
            {!hideLabel && (
                <div className="flex items-center justify-between">
                    <Label htmlFor={id}>{renderLabelWithOptional(label)}</Label>
                    {phone && (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                            Hapus
                        </button>
                    )}
                </div>
            )}

            {/* Combined relationship dropdown + phone input */}
            <div
                className={cn(
                    'flex items-center rounded-md border border-input bg-background focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px] transition-[color,box-shadow] overflow-hidden text-sm',
                    error && 'border-destructive aria-invalid:ring-destructive/20',
                    disabled && 'opacity-50',
                )}
            >
                {/* Relationship dropdown on the left using shadcn Select */}
                <Select
                    value={relationship}
                    onValueChange={(val) =>
                        handleRelationshipChange(val as EmergencyRelationship)
                    }
                    disabled={disabled}
                >
                    <SelectTrigger
                        aria-label="Hubungan kontak darurat"
                        className="h-9 rounded-none rounded-l-md border-0 border-r border-border bg-muted/40 hover:bg-muted/70 px-3 text-xs md:text-sm font-medium focus-visible:ring-0 focus-visible:border-border shadow-none shrink-0 w-auto gap-1.5 focus:outline-none"
                    >
                        <SelectValue placeholder="Hubungan" />
                    </SelectTrigger>
                    <SelectContent>
                        {EMERGENCY_RELATIONSHIPS.map((rel) => (
                            <SelectItem key={rel} value={rel}>
                                {rel}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {/* +62 country code prefix without vertical border to phone number */}
                <span className="flex items-center pl-3 pr-1 text-xs md:text-sm text-muted-foreground select-none shrink-0 font-normal">
                    +62
                </span>

                {/* Phone number input */}
                <input
                    id={id}
                    type="tel"
                    inputMode="numeric"
                    placeholder="81234567890"
                    value={phone}
                    disabled={disabled}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    aria-invalid={!!error}
                    className="flex-1 bg-transparent px-1 py-2 text-sm outline-none placeholder:text-muted-foreground min-w-0 font-normal"
                />

                {/* Inline clear button */}
                {phone && (
                    <button
                        type="button"
                        onClick={handleClear}
                        className="p-1 mr-1 text-muted-foreground hover:text-foreground cursor-pointer rounded"
                        title="Hapus"
                        aria-label="Hapus nilai kontak darurat"
                    >
                        <X className="size-3.5" />
                    </button>
                )}
            </div>

            <InputError message={error} />
        </div>
    );
}
