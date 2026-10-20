import { LegalShell } from '@/components/legal-shell';

export default function Privacy() {
    return (
        <LegalShell
            title="Kebijakan Privasi"
            description="Penjelasan mengenai data pribadi yang kami kumpulkan, cara kami menggunakannya, dan hak Anda sebagai pengguna layanan OutdoorCondet."
            updatedAt={new Date()}
        >
            <section className="space-y-3">
                <h2 className="text-lg font-semibold">
                    1. Data yang kami kumpulkan
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                    Kami hanya mengumpulkan data yang diperlukan untuk
                    menjalankan proses sewa, yaitu:
                </p>
                <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
                    <li>
                        Data akun: nama lengkap, alamat email, dan kata sandi
                        yang tersimpan dalam bentuk terenkripsi.
                    </li>
                    <li>
                        Data transaksi: nomor telepon WhatsApp, alamat, kontak
                        darurat, dan tautan media sosial.
                    </li>
                    <li>
                        Data pesanan: barang yang disewa, jadwal ambil dan
                        kembali, riwayat pembayaran, serta bukti pembayaran yang
                        Anda unggah.
                    </li>
                    <li>
                        Data teknis dasar seperti alamat IP, jenis peramban, dan
                        catatan aktivitas pada halaman.
                    </li>
                </ul>
                <p className="text-sm leading-relaxed text-muted-foreground">
                    Kami tidak meminta dan tidak menyimpan nomor KTP atau NIK.
                    Identitas fisik diperiksa langsung di outlet pada saat
                    pengambilan barang.
                </p>
            </section>

            <section className="space-y-3">
                <h2 className="text-lg font-semibold">2. Pemakaian data</h2>
                <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
                    <li>
                        Memproses pemesanan, pembayaran, pengembalian, dan
                        penanganan deposit.
                    </li>
                    <li>
                        Mengirim informasi status pesanan, jadwal pengambilan,
                        dan pengingat pengembalian.
                    </li>
                    <li>
                        Menjaga keamanan akun, mencegah penyalahgunaan layanan,
                        dan mencatat riwayat transaksi.
                    </li>
                    <li>
                        Menyampaikan pembaruan penting terkait layanan. Pesan
                        promosi hanya dikirim bila Anda menyetujuinya.
                    </li>
                </ul>
            </section>

            <section className="space-y-3">
                <h2 className="text-lg font-semibold">
                    3. Penyimpanan dan keamanan
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                    Data disimpan pada server yang hanya dapat diakses oleh tim
                    yang relevan. Kata sandi disimpan dalam bentuk terenkripsi
                    dan tidak pernah ditampilkan kembali. Bukti pembayaran
                    disimpan pada penyimpanan privat dengan akses terbatas, dan
                    seluruh perubahan status transaksi tercatat dalam riwayat
                    aktivitas.
                </p>
            </section>

            <section className="space-y-3">
                <h2 className="text-lg font-semibold">
                    4. Berbagi data dengan pihak ketiga
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                    Kami tidak menjual atau menyewakan data pribadi Anda. Data
                    hanya dibagikan kepada pihak ketiga bila diperlukan untuk
                    menjalankan layanan, misalnya penyedia pembayaran atau
                    layanan pengiriman, atau bila diwajibkan oleh ketentuan
                    hukum yang berlaku.
                </p>
            </section>

            <section className="space-y-3">
                <h2 className="text-lg font-semibold">5. Masa simpan data</h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                    Data akun dan riwayat transaksi disimpan selama akun Anda
                    aktif dan tetap diperlukan untuk keperluan pembukuan serta
                    penyelesaian sengketa. Bila akun Anda dihapus, data
                    transaksi tetap disimpan dalam batas waktu yang diwajibkan
                    ketentuan yang berlaku.
                </p>
            </section>

            <section className="space-y-3">
                <h2 className="text-lg font-semibold">6. Hak Anda</h2>
                <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
                    <li>
                        Melihat dan memperbarui data profil pada halaman
                        pengaturan profil.
                    </li>
                    <li>
                        Meminta koreksi atas data yang tidak akurat atau tidak
                        lagi sesuai.
                    </li>
                    <li>
                        Menutup akun dan meminta penghapusan data yang tidak
                        wajib disimpan.
                    </li>
                    <li>
                        Menarik persetujuan terhadap pesan promosi kapan saja.
                    </li>
                </ul>
            </section>

            <section className="space-y-3">
                <h2 className="text-lg font-semibold">
                    7. Cookie dan teknologi lokal
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                    Situs ini memakai cookie yang diperlukan untuk menjaga sesi
                    login Anda tetap aman. Kami tidak memakai cookie untuk
                    melacak perilaku Anda di luar layanan ini.
                </p>
            </section>

            <section className="space-y-3">
                <h2 className="text-lg font-semibold">8. Kontak</h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                    Pertanyaan, masukan, atau permintaan terkait privasi data
                    dapat dikirim melalui WhatsApp atau surel ke alamat yang
                    tercantum pada bagian kontak di footer. Permintaan Anda akan
                    kami tindak lanjuti sesuai ketentuan yang berlaku.
                </p>
            </section>
        </LegalShell>
    );
}
