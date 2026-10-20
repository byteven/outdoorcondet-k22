import { LegalShell } from '@/components/legal-shell';

export default function Policy() {
    return (
        <LegalShell
            title="Syarat & Ketentuan"
            description="Ketentuan penggunaan layanan sewa alat outdoor OutdoorCondet. Dengan menggunakan layanan ini, Anda menyatakan telah membaca dan menyetujui seluruh isi di bawah ini."
            updatedAt={new Date()}
        >
            <section className="space-y-3">
                <h2 className="text-lg font-semibold">1. Ruang lingkup</h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                    Ketentuan ini berlaku bagi seluruh pengguna layanan
                    OutdoorCondet, baik pelanggan yang menyewa alat secara
                    perorangan maupun pelanggan yang melakukan pemesanan di
                    outlet kami. Ketentuan berlaku sejak pemesanan dibuat hingga
                    masa sewa selesai dan barang dikembalikan.
                </p>
            </section>

            <section className="space-y-3">
                <h2 className="text-lg font-semibold">
                    2. Akun dan kelengkapan data
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                    Untuk menyewa, Anda wajib mendaftar dengan nama lengkap,
                    alamat email, dan nomor telepon yang aktif. Data kontak
                    darurat, alamat, dan tautan media sosial dapat diisi pada
                    halaman profil. Pemesanan hanya dapat diproses apabila data
                    kontak Anda dapat dihubungi.
                </p>
            </section>

            <section className="space-y-3">
                <h2 className="text-lg font-semibold">
                    3. Pemesanan dan ketersediaan barang
                </h2>
                <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
                    <li>
                        Pemesanan dianggap sah setelah pembayaran DP atau
                        pembayaran penuh terverifikasi oleh admin.
                    </li>
                    <li>
                        Ketersediaan barang dihitung berdasarkan stok fisik,
                        tanggal sewa, dan jeda pembersihan satu hari setelah
                        barang dikembalikan.
                    </li>
                    <li>
                        Harga sewa mengikuti durasi yang dipilih. Untuk durasi
                        tanpa harga khusus, sistem menghitung kombinasi durasi
                        termurah yang tersedia.
                    </li>
                    <li>
                        Bila bukti pembayaran ditolak, batas pembayaran tetap
                        berlaku dan pesanan dapat dibatalkan otomatis.
                    </li>
                </ul>
            </section>

            <section className="space-y-3">
                <h2 className="text-lg font-semibold">
                    4. Sistem sewa per tanggal
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                    Sewa dihitung per tanggal, bukan per 24 jam. Barang dapat
                    diambil antara pukul 06.00 sampai 23.30, dan barang wajib
                    dikembalikan paling lambat pukul 00.00 pada tanggal kembali
                    yang Anda pilih.
                </p>
                <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
                    <li>
                        Pengambilan pukul 06.00 sampai 17.59 dihitung pada
                        tanggal pengambilan yang sama.
                    </li>
                    <li>
                        Pengambilan pukul 18.00 ke atas dihitung mulai tanggal
                        berikutnya.
                    </li>
                    <li>
                        Durasi sewa dihitung inklusif dari tanggal mulai hitung
                        sampai tanggal kembali.
                    </li>
                </ul>
            </section>

            <section className="space-y-3">
                <h2 className="text-lg font-semibold">
                    5. Pembayaran, DP, dan deposit
                </h2>
                <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
                    <li>
                        Pembayaran online hanya berlaku untuk biaya sewa. Anda
                        dapat memilih DP 50% dari biaya sewa atau membayar
                        lunas.
                    </li>
                    <li>
                        Sisa biaya sewa yang belum dibayar dan deposit disetor
                        langsung di outlet saat barang diambil.
                    </li>
                    <li>
                        Deposit merupakan uang jaminan dan dikembalikan setelah
                        barang kembali dengan kondisi baik dan tepat waktu.
                    </li>
                </ul>
            </section>

            <section className="space-y-3">
                <h2 className="text-lg font-semibold">6. Pembatalan</h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                    Anda dapat membatalkan pesanan tanpa biaya selama status
                    pesanan masih menunggu pembayaran atau menunggu konfirmasi
                    admin. Setelah pembayaran dikonfirmasi, nilai pengembalian
                    dana ditentukan oleh admin sesuai kondisi barang dan biaya
                    yang telah terpakai.
                </p>
            </section>

            <section className="space-y-3">
                <h2 className="text-lg font-semibold">
                    7. Keterlambatan, kerusakan, dan kehilangan
                </h2>
                <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
                    <li>
                        Pengembalian yang melewati batas incurs denda harian
                        dengan nominal tetap yang ditetapkan layanan.{' '}
                    </li>
                    <li>
                        Denda keterlambatan dan potongan kerusakan dipotong dari
                        deposit. Bila total potongan melebihi deposit,
                        kekurangan dibayar saat pengembalian.
                    </li>
                    <li>
                        Barang yang hilang, rusak berat, atau tidak dikembalikan
                        tepat waktu dapat menyebabkan seluruh deposit hangus.
                    </li>
                </ul>
            </section>

            <section className="space-y-3">
                <h2 className="text-lg font-semibold">
                    8. Komunikasi dan perubahan ketentuan
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                    Informasi penting mengenai pesanan, pembayaran, dan
                    pengembalian dikirim melalui WhatsApp dan surel. Kami dapat
                    memperbarui ketentuan ini sewaktu-waktu, dan perubahan
                    berlaku sejak diumumkan pada halaman ini.
                </p>
            </section>
        </LegalShell>
    );
}
