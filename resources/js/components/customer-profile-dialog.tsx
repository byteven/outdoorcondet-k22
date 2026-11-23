import { router, usePage } from '@inertiajs/react';
import { ExternalLink } from 'lucide-react';
import { useEffect, useState } from 'react';
import { z } from 'zod';
import { DeleteConfirmDialog } from '@/components/delete-confirm-dialog';
import { EditableField } from '@/components/editable-field';
import { EmergencyContactInput } from '@/components/emergency-contact-input';
import {
    getSocialMediaMeta,
    SocialMediaInput,
} from '@/components/social-media-input';
import { UserAvatar } from '@/components/user-avatar';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { destroy, update } from '@/routes/admin/customers';

export type ProfileCustomer = {
    id: number;
    emergency_contact: string | null;
    social_media: string | null;
    phone_number: string;
    address: string | null;
    is_verified: boolean;
    is_active: boolean;
    created_at: string | null;
    user: {
        id: number;
        name: string;
        email: string;
    };
};

const updateCustomerSchema = z.object({
    name: z
        .string({ error: 'Nama lengkap wajib diisi.' })
        .trim()
        .min(1, 'Nama lengkap wajib diisi.')
        .max(255, 'Nama lengkap maksimal 255 karakter.'),
    email: z
        .string({ error: 'Email wajib diisi.' })
        .trim()
        .min(1, 'Email wajib diisi.')
        .email('Format email tidak valid.')
        .max(255, 'Email maksimal 255 karakter.'),
    phone_number: z
        .string({ error: 'Nomor telepon wajib diisi.' })
        .trim()
        .min(9, 'Nomor telepon minimal 9 digit.')
        .max(13, 'Nomor telepon maksimal 13 digit.'),
    emergency_contact: z
        .string({ error: 'Kontak darurat wajib diisi.' })
        .trim()
        .min(1, 'Kontak darurat wajib diisi.')
        .max(255, 'Kontak darurat maksimal 255 karakter.'),
    social_media: z
        .string({ error: 'Sosial media wajib diisi.' })
        .trim()
        .min(1, 'Sosial media wajib diisi.')
        .max(255, 'Sosial media maksimal 255 karakter.'),
    address: z
        .string({ error: 'Alamat wajib diisi.' })
        .trim()
        .min(1, 'Alamat wajib diisi.')
        .max(2000, 'Alamat maksimal 2000 karakter.'),
    is_active: z.boolean(),
});

type Drafts = z.infer<typeof updateCustomerSchema>;
type EditableField =
    | 'name'
    | 'email'
    | 'phone_number'
    | 'emergency_contact'
    | 'social_media'
    | 'address';

const EDITABLE_FIELDS: EditableField[] = [
    'name',
    'email',
    'phone_number',
    'emergency_contact',
    'social_media',
    'address',
];

const FIELD_LABELS: Record<EditableField, string> = {
    name: 'Nama Lengkap',
    email: 'Email',
    phone_number: 'Telepon',
    emergency_contact: 'Kontak Darurat',
    social_media: 'Sosial Media',
    address: 'Alamat',
};

const dateFormatter = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
});

const PLUS_PREFIX = '+';

function formatFieldValue(
    field: EditableField,
    raw: string | undefined | null,
): string {
    if (!raw || raw === '') {
        return '-';
    }

    if (field === 'phone_number') {
        return `${PLUS_PREFIX}62${raw}`;
    }

    if (field === 'emergency_contact') {
        return raw.startsWith(PLUS_PREFIX) ? raw : `${PLUS_PREFIX}${raw}`;
    }

    return raw;
}

function getCopyValue(
    field: EditableField,
    raw: string | undefined | null,
): string | undefined {
    if (!raw || raw === '') {
        return undefined;
    }

    if (field === 'phone_number') {
        return `${PLUS_PREFIX}62${raw}`;
    }

    if (field === 'emergency_contact') {
        return raw.startsWith(PLUS_PREFIX) ? raw : `${PLUS_PREFIX}${raw}`;
    }

    return raw;
}

function stripPhonePrefix(value: string): string {
    return value.replace(/\D/g, '').replace(/^0+/, '').replace(/^62/, '');
}

function normalizePhoneRest(value: string): string {
    const digits = stripPhonePrefix(value);

    return `62${digits}`;
}

function toDrafts(customer: ProfileCustomer): Drafts {
    return {
        name: customer.user.name,
        email: customer.user.email,
        phone_number: stripPhonePrefix(customer.phone_number),
        emergency_contact: customer.emergency_contact ?? '',
        social_media: customer.social_media ?? '',
        address: customer.address ?? '',
        is_active: customer.is_active,
    };
}

function ActiveSwitch({
    checked,
    onChange,
    disabled,
}: {
    checked: boolean;
    onChange: (next: boolean) => void;
    disabled?: boolean;
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            disabled={disabled}
            onClick={() => onChange(!checked)}
            className={cn(
                'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
                checked ? 'bg-primary' : 'bg-muted-foreground/30',
            )}
        >
            <span
                aria-hidden="true"
                className={cn(
                    'pointer-events-none inline-block size-5 rounded-full bg-background shadow-xs ring-0 transition duration-200 ease-in-out',
                    checked ? 'translate-x-5' : 'translate-x-0',
                )}
            />
        </button>
    );
}

export function CustomerProfileDialog({
    customer,
    onClose,
}: {
    customer: ProfileCustomer | null;
    onClose: () => void;
}) {
    if (!customer) {
        return null;
    }

    const [drafts, setDrafts] = useState<Drafts>(() => toDrafts(customer));
    const [editing, setEditing] = useState<EditableField | null>(null);
    const [clientErrors, setClientErrors] = useState<
        Partial<Record<EditableField, string>>
    >({});
    const [processing, setProcessing] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const serverErrors = usePage().props.errors;
    const updateErrors = ((serverErrors.updateCustomer ?? {}) as Record<
        string,
        string
    >) as Record<string, string>;

    useEffect(() => {
        setDrafts(toDrafts(customer));
        setEditing(null);
        setClientErrors({});
    }, [customer]);

    useEffect(() => {
        const firstErrorField = EDITABLE_FIELDS.find(
            (field) => updateErrors[field] !== undefined,
        );

        if (firstErrorField) {
            setEditing(firstErrorField);
        }
    }, [serverErrors]);

    const dirty =
        drafts.name !== customer.user.name ||
        drafts.email !== customer.user.email ||
        normalizePhoneRest(drafts.phone_number) !== customer.phone_number ||
        (drafts.emergency_contact || '') !== (customer.emergency_contact || '') ||
        (drafts.social_media || '') !== (customer.social_media || '') ||
        (drafts.address || '') !== (customer.address || '') ||
        drafts.is_active !== customer.is_active;

    const toggleEdit = (field: EditableField) => {
        if (editing === field) {
            setEditing(null);

            return;
        }

        setEditing(field);
    };

    const errorFor = (field: EditableField): string | undefined =>
        clientErrors[field] ?? updateErrors[field];

    const handleSave = () => {
        const result = updateCustomerSchema.safeParse(drafts);

        if (!result.success) {
            const fieldErrors: Partial<Record<EditableField, string>> = {};

            for (const issue of result.error.issues) {
                const field = issue.path[0] as EditableField;

                if (EDITABLE_FIELDS.includes(field) && !fieldErrors[field]) {
                    fieldErrors[field] = issue.message;
                }
            }

            setClientErrors(fieldErrors);

            const firstInvalid = EDITABLE_FIELDS.find(
                (field) => fieldErrors[field],
            );
            setEditing(firstInvalid ?? editing);

            return;
        }

        setClientErrors({});

        router.put(
            update(customer.id).url,
            {
                name: result.data.name,
                email: result.data.email,
                phone_number: normalizePhoneRest(result.data.phone_number),
                emergency_contact: result.data.emergency_contact,
                social_media: result.data.social_media,
                address: result.data.address,
                is_active: result.data.is_active,
            },
            {
                errorBag: 'updateCustomer',
                preserveState: true,
                onStart: () => setProcessing(true),
                onFinish: () => setProcessing(false),
                onSuccess: () => {
                    setEditing(null);
                    router.reload();
                },
            },
        );
    };

    return (
        <Dialog
            open={customer !== null}
            onOpenChange={(open) => !open && onClose()}
        >
            <DialogContent className="flex max-h-[90dvh] flex-col overflow-hidden sm:max-w-lg">
                <DialogHeader className="shrink-0">
                    <DialogTitle>Profil pelanggan</DialogTitle>
                    <DialogDescription>
                        Pratinjau dan edit profil pelanggan
                    </DialogDescription>
                </DialogHeader>
                <div className="flex shrink-0 items-center gap-4 min-w-0 px-4">
                    <UserAvatar
                        name={customer.user.name}
                        className="size-12 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 min-w-0">
                            <span
                                className="truncate text-lg font-semibold"
                                title={customer.user.name}
                            >
                                {customer.user.name}
                            </span>
                            <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-normal">
                                <span
                                    aria-hidden="true"
                                    className={
                                        customer.is_active
                                            ? 'size-2 rounded-full bg-success'
                                            : 'size-2 rounded-full bg-destructive'
                                    }
                                />
                                {customer.is_active ? 'Aktif' : 'Nonaktif'}
                            </span>
                        </div>
                        <p
                            className="truncate text-sm text-muted-foreground"
                            title={customer.user.email}
                        >
                            {customer.user.email}
                        </p>
                    </div>
                </div>
                <div className="min-h-0 flex-1 min-w-0 [scrollbar-width:thin] [scrollbar-color:var(--color-border)_transparent] overflow-y-auto py-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
                    <div className="flex flex-col gap-1 pb-6 min-w-0 w-full">
                        {EDITABLE_FIELDS.map((field) => (
                            <EditableField
                                key={field}
                                label={FIELD_LABELS[field]}
                                id={`profile-${field}`}
                                display={
                                    field === 'social_media' ? (
                                        drafts[field] ? (
                                            (() => {
                                                const meta = getSocialMediaMeta(drafts[field]);
                                                return meta ? (
                                                    <a
                                                        href={meta.url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline hover:underline-offset-4"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <img
                                                            src={meta.icon}
                                                            alt=""
                                                            className="size-3.5 shrink-0"
                                                        />
                                                        <span className="truncate">{meta.url}</span>
                                                        <ExternalLink className="size-3 shrink-0" />
                                                    </a>
                                                ) : (
                                                    <span className="block truncate text-sm" title={drafts[field] ?? ''}>{drafts[field]}</span>
                                                );
                                            })()
                                        ) : (
                                            <span className="text-sm text-muted-foreground">-</span>
                                        )
                                    ) : (
                                        <span
                                            title={formatFieldValue(field, drafts[field])}
                                            className={
                                                field === 'address'
                                                    ? 'block text-sm break-words whitespace-pre-wrap'
                                                    : 'block truncate text-sm'
                                            }
                                        >
                                            {formatFieldValue(field, drafts[field])}
                                        </span>
                                    )
                                }
                                editing={editing === field}
                                onToggleEdit={() => toggleEdit(field)}
                                copyValue={getCopyValue(field, drafts[field])}
                                error={errorFor(field)}
                            >
                                {field === 'address' ? (
                                    <Textarea
                                        id={`profile-${field}`}
                                        rows={3}
                                        autoFocus
                                        aria-invalid={!!errorFor(field)}
                                        value={drafts[field] ?? ''}
                                        onChange={(event) =>
                                            setDrafts({
                                                ...drafts,
                                                [field]: event.target.value,
                                            })
                                        }
                                    />
                                ) : field === 'phone_number' ? (
                                    <div className="relative">
                                        <span
                                            aria-hidden="true"
                                            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground"
                                        >
                                            +62
                                        </span>
                                        <Input
                                            id={`profile-${field}`}
                                            inputMode="numeric"
                                            autoFocus
                                            aria-invalid={!!errorFor(field)}
                                            className="pl-12"
                                            value={drafts[field] ?? ''}
                                            onChange={(event) =>
                                                setDrafts({
                                                    ...drafts,
                                                    [field]:
                                                        event.target.value
                                                            .replace(
                                                                /\D/g,
                                                                '',
                                                            )
                                                            .slice(0, 13),
                                                })
                                            }
                                        />
                                    </div>
                                ) : field === 'emergency_contact' ? (
                                    <EmergencyContactInput
                                        id={`profile-${field}`}
                                        hideLabel
                                        value={drafts[field]}
                                        onChange={(val) =>
                                            setDrafts({
                                                ...drafts,
                                                [field]: val,
                                            })
                                        }
                                        error={errorFor(field)}

                                    />
                                ) : field === 'social_media' ? (
                                    <SocialMediaInput
                                        id={`profile-${field}`}
                                        hideLabel
                                        value={drafts[field]}
                                        onChange={(val) =>
                                            setDrafts({
                                                ...drafts,
                                                [field]: val,
                                            })
                                        }
                                        error={errorFor(field)}
                                    />
                                ) : (
                                    <Input
                                        id={`profile-${field}`}
                                        autoFocus
                                        aria-invalid={!!errorFor(field)}
                                        value={drafts[field] ?? ''}
                                        onChange={(event) =>
                                            setDrafts({
                                                ...drafts,
                                                [field]: event.target.value,
                                            })
                                        }
                                    />
                                )}
                            </EditableField>
                        ))}
                        <div className="grid gap-1.5 rounded-md px-4 py-2">
                            <span className="text-sm font-medium leading-normal">
                                Terdaftar
                            </span>
                            <span className="text-sm">
                                {customer.created_at
                                    ? dateFormatter.format(
                                        new Date(customer.created_at),
                                    )
                                    : '-'}
                            </span>
                        </div>
                        <div className="grid gap-2 rounded-md bg-muted p-4">
                            <span className="text-sm font-medium">
                                Status akun
                            </span>
                            <div className="flex items-center gap-3">
                                <ActiveSwitch
                                    checked={drafts.is_active}
                                    disabled={processing}
                                    onChange={(next) =>
                                        setDrafts({
                                            ...drafts,
                                            is_active: next,
                                        })
                                    }
                                />
                                <span className="text-sm">
                                    {drafts.is_active
                                        ? 'Aktif'
                                        : 'Nonaktif'}
                                </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Pelanggan yang dinonaktifkan tidak bisa
                                login{' '}
                                <strong className="font-semibold">
                                    (blacklist)
                                </strong>{' '}
                            </p>
                        </div>
                    </div>
                </div>
                <DialogFooter className="shrink-0 sm:justify-between text-truncate">
                    <DeleteConfirmDialog
                        title={`Hapus ${customer.user.name}?`}
                        description="Akun pelanggan akan dinonaktifkan dan dihapus dari daftar."
                        processing={deleting}
                        onConfirm={() => {
                            router.delete(destroy(customer.id).url, {
                                preserveState: true,
                                onStart: () => setDeleting(true),
                                onFinish: () => setDeleting(false),
                                onSuccess: () => {
                                    router.reload();
                                },
                            });
                        }}
                    />
                    <div className="flex flex-col-reverse gap-2 sm:flex-row">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                        >
                            Tutup
                        </Button>
                        {(editing !== null || dirty) && (
                            <Button
                                type="button"
                                onClick={handleSave}
                                disabled={processing}
                            >
                                {processing && <Spinner />}
                                Simpan
                            </Button>
                        )}
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
