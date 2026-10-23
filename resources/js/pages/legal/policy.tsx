import { LegalDocument } from '@/components/legal-document';
import { LegalShell } from '@/components/legal-shell';
import syaratKetentuan from '@/content/syarat-ketentuan.md?raw';

export default function Policy() {
    return (
        <LegalShell
            title="Syarat & Ketentuan"
            description="Ketentuan penggunaan layanan sewa alat outdoor OutdoorCondet. Dengan menggunakan layanan ini, Anda menyatakan telah membaca dan menyetujui seluruh isi di bawah ini."
            updatedAt={new Date()}
        >
            <LegalDocument source={syaratKetentuan} />
        </LegalShell>
    );
}
