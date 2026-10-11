import { router, usePage } from '@inertiajs/react';
import { Eye } from 'lucide-react';
import { useEffect, useState } from 'react';
import { z } from 'zod';
import { EditableField } from '@/components/editable-field';
import { DeleteConfirmDialog } from '@/components/delete-confirm-dialog';
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
import { cn } from '@/lib/utils';
import { destroy, update } from '@/routes/admin/customers';

export type ProfileCustomer = {
    id: number;
    identity_number: string | null;
    identity_card_path: string | null;
    identity_card_url: string | null;
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
        .string({ error: 'Nama wajib diisi.' })
        .trim()
        .min(1, 'Nama wajib diisi.')
        .max(255, 'Nama maksimal 255 karakter.'),
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
    identity_number: z.string().max(32, 'NIK maksimal 32 karakter.').optional(),
    address: z.string().max(2000, 'Alamat maksimal 2000 karakter.').optional(),
    is_active: z.boolean(),
});

type Drafts = z.infer<typeof updateCustomerSchema>;
type EditableField = 'name' | 'email' | 'phone_number' | 'identity_number' | 'address';

const EDITABLE_FIELDS: EditableField[] = [
    'name',
    'email',
    'phone_number',
    'identity_number',
    'address',
];

const FIELD_LABELS: Record<EditableField, string> = {
    name: 'Nama',
    email: 'Email',
    phone_number: 'Telepon',
    identity_number: 'NIK',
    address: 'Alamat',
};

const dateFormatter = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
});

function stripPhonePrefix(value: string): string {
    return value
        .replace(/\D/g, '')
        .replace(/^0+/, '')
        .replace(/^62/, '');
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
        identity_number: customer.identity_number ?? '',
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
            aria-label="Status aktif pelanggan"
            disabled={disabled}
            onClick={() => onChange(!checked)}
            className={cn(
                'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50',
                checked ? 'bg-success' : 'bg-input',
            )}
        >
            <span
                className={cn(
                    'pointer-events-none block size-5 rounded-full bg-white transition-transform',
                    checked ? 'translate-x-[22px]' : 'translate-x-0.5',
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
    const [drafts, setDrafts] = useState<Drafts | null>(null);
    const [editing, setEditing] = useState<EditableField | null>(null);
    const [ktpOpen, setKtpOpen] = useState(false);
    const [clientErrors, setClientErrors] = useState<Partial<Record<EditableField, string>>>({});
    const [processing, setProcessing] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const serverErrors = usePage().props.errors;
    const updateErrors = (serverErrors.updateCustomer ?? {}) as Record<string, string>;

    useEffect(() => {
        if (customer) {
            setDrafts(toDrafts(customer));
            setEditing(null);
            setClientErrors({});
        }
    }, [customer?.id]);

    if (!customer || !drafts) {
        return (
            <Dialog open={customer !== null} onOpenChange={(open) => !open && onClose()}>
                <DialogContent className="max-h-[90dvh] overflow-y-auto" />
            </Dialog>
        );
    }

    const original = toDrafts(customer);
    const dirty = EDITABLE_FIELDS.some((field) => drafts[field] !== original[field]) ||
        drafts.is_active !== original.is_active;

    const toggleEdit = (field: EditableField) => {
        if (editing === field) {
            setDrafts((prev) => (prev ? { ...prev, [field]: original[field] } : prev));
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

            const firstInvalid = EDITABLE_FIELDS.find((field) => fieldErrors[field]);
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
                identity_number: result.data.identity_number || undefined,
                address: result.data.address || undefined,
                is_active: result.data.is_active,
            },
            {
                errorBag: 'updateCustomer',
                preserveState: true,
                onStart: () => setProcessing(true),
                onFinish: () => setProcessing(false),
                onSuccess: () => setEditing(null),
            },
        );
    };

    return (
        <>
            <Dialog open={customer !== null} onOpenChange={(open) => !open && onClose()}>
                <DialogContent className="flex max-h-[90dvh] flex-col overflow-hidden">
                    <DialogHeader className="shrink-0">
                        <DialogTitle>Profil pelanggan</DialogTitle>
                        <DialogDescription>
                            Pratinjau dan edit profil pelanggan
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex shrink-0 items-center gap-4">
                        <UserAvatar name={customer.user.name} className="size-12" />
                        <div>
                            <p className="flex items-center gap-2 text-lg font-semibold">
                                {customer.user.name}
                                <span className="inline-flex items-center gap-1.5 text-sm font-normal">
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
                            </p>
                            <p className="text-sm text-muted-foreground">{customer.user.email}</p>
                        </div>
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto px-1 [scrollbar-width:thin] [scrollbar-color:var(--color-border)_transparent] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
                        <div className="flex flex-col gap-1">
                            {EDITABLE_FIELDS.map((field) => (
                                <EditableField
                                    key={field}
                                    label={FIELD_LABELS[field]}
                                    id={`profile-${field}`}
                                    display={
                                        <span className="block truncate text-sm">
                                            {field === 'phone_number' && drafts[field] !== ''
                                                ? `+62${drafts[field]}`
                                                : drafts[field] === ''
                                                    ? '-'
                                                    : drafts[field]}
                                        </span>
                                    }
                                    editing={editing === field}
                                    onToggleEdit={() => toggleEdit(field)}
                                    copyValue={
                                        drafts[field] === ''
                                            ? undefined
                                            : field === 'phone_number'
                                                ? `+62${drafts[field]}`
                                                : drafts[field]
                                    }
                                    error={errorFor(field)}
                                >
                                    {field === 'phone_number' ? (
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
                                                        [field]: event.target.value
                                                            .replace(/\D/g, '')
                                                            .slice(0, 13),
                                                    })
                                                }
                                            />
                                        </div>
                                    ) : (
                                        <Input
                                            id={`profile-${field}`}
                                            autoFocus
                                            aria-invalid={!!errorFor(field)}
                                            value={drafts[field] ?? ''}
                                            onChange={(event) =>
                                                setDrafts({ ...drafts, [field]: event.target.value })
                                            }
                                        />
                                    )}
                                </EditableField>
                            ))}
                            <div className="grid gap-1 rounded-md px-4 py-2">
                                <span className="text-sm font-medium">Foto KTP</span>
                                {customer.identity_card_url ? (
                                    <div>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setKtpOpen(true)}
                                        >
                                            <Eye />
                                            Pratinjau
                                        </Button>
                                    </div>
                                ) : (
                                    <span className="text-sm text-muted-foreground">
                                        Belum ada foto KTP
                                    </span>
                                )}
                            </div>
                            <div className="grid gap-1 rounded-md px-4 py-2">
                                <span className="text-sm font-medium">Terdaftar</span>
                                <span className="text-sm">
                                    {customer.created_at
                                        ? dateFormatter.format(new Date(customer.created_at))
                                        : '-'}
                                </span>
                            </div>
                            <div className="grid gap-2 rounded-md bg-muted p-4">
                                <span className="text-sm font-medium">Status akun</span>
                                <div className="flex items-center gap-3">
                                    <ActiveSwitch
                                        checked={drafts.is_active}
                                        disabled={processing}
                                        onChange={(next) => setDrafts({ ...drafts, is_active: next })}
                                    />
                                    <span className="text-sm">
                                        {drafts.is_active ? 'Aktif' : 'Nonaktif'}
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Pelanggan yang dinonaktifkan tidak bisa login{' '}
                                    <strong className="font-semibold">(blacklist).</strong>{' '}

                                </p>
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="shrink-0 sm:justify-between">
                        <DeleteConfirmDialog
                            title={`Hapus ${customer.user.name}?`}
                            description="Akun pelanggan akan dinonaktifkan dan dihapus dari daftar."
                            processing={deleting}
                            onConfirm={() => {
                                router.delete(destroy(customer.id).url, {
                                    preserveState: true,
                                    onStart: () => setDeleting(true),
                                    onFinish: () => setDeleting(false),
                                });
                            }}
                        />
                        <div className="flex flex-col-reverse gap-2 sm:flex-row">
                            <Button type="button" variant="outline" onClick={onClose}>
                                Tutup
                            </Button>
                            {(editing !== null || dirty) && (
                                <Button type="button" onClick={handleSave} disabled={processing}>
                                    {processing && <Spinner />}
                                    Simpan
                                </Button>
                            )}
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <Dialog open={ktpOpen} onOpenChange={setKtpOpen}>
                <DialogContent className="flex max-h-[90dvh] flex-col overflow-hidden sm:max-w-2xl">
                    <DialogHeader className="shrink-0">
                        <DialogTitle>Foto KTP</DialogTitle>
                        <DialogDescription>{customer.user.name}</DialogDescription>
                    </DialogHeader>
                    <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:var(--color-border)_transparent] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
                        {customer.identity_card_url && (
                            <img
                                src={customer.identity_card_url}
                                alt={`Foto KTP ${customer.user.name}`}
                                className="w-full rounded-md object-contain"
                            />
                        )}
                    </div>
                    <DialogFooter className="shrink-0">
                        <Button type="button" variant="outline" onClick={() => setKtpOpen(false)}>
                            Tutup
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
