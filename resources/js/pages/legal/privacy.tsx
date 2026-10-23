import { LegalDocument } from '@/components/legal-document';
import { LegalShell } from '@/components/legal-shell';
import kebijakanPrivasi from '@/content/kebijakan-privasi.md?raw';

export default function Privacy() {
    return (
        <LegalShell
            title="Kebijakan Privasi"
            description="Penjelasan mengenai data pribadi yang kami kumpulkan, cara kami menggunakannya, dan hak Anda sebagai pengguna layanan OutdoorCondet."
            updatedAt={new Date()}
        >
            <LegalDocument source={kebijakanPrivasi} />
        </LegalShell>
    );
}
