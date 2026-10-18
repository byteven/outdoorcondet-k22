/// <reference types="node" />
import { test, expect, Page } from '@playwright/test';
import { loginAsAdmin } from '../helper/login';

async function createTestProduct(
    page: Page,
    name: string,
    price = '20000',
    stock = '10',
) {
    await page
        .getByRole('button', { name: /Tambah produk/i })
        .first()
        .click();

    // Step 0: Informasi dasar
    await page.locator('#product-category').click();
    await page.locator('[role="option"]').first().click();
    await page.locator('#product-name').fill(name);
    await page.getByRole('button', { name: /Lanjut/i }).click();

    // Step 1: Varian & stok
    await expect(page.locator('#variant-sku-0')).toBeVisible({
        timeout: 10000,
    });
    await page.locator('#variant-sku-0').fill(`SKU-${Date.now()}`);
    await page.locator('#variant-stock-0').fill(stock);
    await page.locator('#variant-price-0').fill(price);
    await page.getByRole('button', { name: /Lanjut/i }).click();

    // Step 2: Gambar & Publikasi
    await expect(page.locator('#product-images')).toBeVisible({
        timeout: 10000,
    });
    const submitBtn = page.getByRole('button', { name: /Simpan produk/i });
    await expect(submitBtn).toBeVisible({ timeout: 10000 });
    await expect(submitBtn).toBeEnabled({ timeout: 10000 });
    await submitBtn.click();
    await expect(
        page.locator('table').getByText(name, { exact: true }),
    ).toBeVisible({ timeout: 15000 });
}

test.describe('AD-05 Product Management (Manajemen Data Barang)', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto('/admin/products');
        await expect(page.locator('h1')).toContainText('Produk');
    });

    test('TC.ADM.009.001 - Halaman daftar data barang tampil', async ({
        page,
    }) => {
        await expect(page.locator('table')).toBeVisible();
    });

    test('TC.ADM.009.002 - Search data barang berdasarkan nama', async ({
        page,
    }) => {
        await page.getByPlaceholder(/Cari nama/).fill('Consina');
        await page.waitForTimeout(600);
        await expect(page.locator('table')).toBeVisible();
    });

    test('TC.ADM.009.003 - Filter data barang berdasarkan status', async ({
        page,
    }) => {
        const aktifBtn = page.getByRole('button', {
            name: 'Aktif',
            exact: true,
        });
        if (await aktifBtn.isVisible()) {
            await aktifBtn.click();
            await expect(page.locator('table')).toBeVisible();
        }

        const semuaBtn = page.getByRole('button', {
            name: 'Semua',
            exact: true,
        });
        if (await semuaBtn.isVisible()) {
            await semuaBtn.click();
            await expect(page.locator('table')).toBeVisible();
        }
    });

    test('TC.ADM.010.001 - Tambah data barang baru beserta tarif multi-durasi dan deposit berhasil (EP Valid)', async ({
        page,
    }) => {
        const uniqueName = `Tenda Dome ${Date.now()}`;
        await createTestProduct(page, uniqueName, '25000', '10');
    });

    test('TC.ADM.010.002 - Validasi field wajib tambah barang (EP Invalid)', async ({
        page,
    }) => {
        await page
            .getByRole('button', { name: /Tambah produk/i })
            .first()
            .click();
        await page.getByRole('button', { name: /Lanjut/i }).click();
        await expect(page.getByText('Kategori wajib dipilih.')).toBeVisible();
    });

    test('TC.ADM.010.003 - Tambah barang nama duplikat (EP Invalid)', async ({
        page,
    }) => {
        const duplicateName = `Barang Duplikat ${Date.now()}`;
        await createTestProduct(page, duplicateName);

        // Coba buat produk kedua dengan nama yang sama
        await page
            .getByRole('button', { name: /Tambah produk/i })
            .first()
            .click();
        await page.locator('#product-category').click();
        await page.locator('[role="option"]').first().click();
        await page.locator('#product-name').fill(duplicateName);
        await page.getByRole('button', { name: /Lanjut/i }).click();

        await expect(page.locator('#variant-sku-0')).toBeVisible({
            timeout: 10000,
        });
        await page.locator('#variant-sku-0').fill(`SKU-DUP-${Date.now()}`);
        await page.locator('#variant-stock-0').fill('10');
        await page.locator('#variant-price-0').fill('20000');
        await page.getByRole('button', { name: /Lanjut/i }).click();

        await expect(page.locator('#product-images')).toBeVisible({
            timeout: 10000,
        });
        const submitBtn = page.getByRole('button', { name: /Simpan produk/i });
        await expect(submitBtn).toBeVisible({ timeout: 10000 });
        await expect(submitBtn).toBeEnabled({ timeout: 10000 });
        await submitBtn.click();

        await expect(page.getByText(/sudah digunakan/i)).toBeVisible();
    });

    test('TC.ADM.010.004 - Uji nilai batas stok barang = 0 (BVA Minimum Valid)', async ({
        page,
    }) => {
        const zeroStockName = `Barang Stok Nol ${Date.now()}`;
        await createTestProduct(page, zeroStockName, '20000', '0');
    });

    test('TC.ADM.010.005 - Uji nilai batas stok barang = -1 (BVA Below Minimum / Invalid)', async ({
        page,
    }) => {
        await page
            .getByRole('button', { name: /Tambah produk/i })
            .first()
            .click();
        await page.locator('#product-category').click();
        await page.locator('[role="option"]').first().click();
        await page.locator('#product-name').fill(`Stok Negatif ${Date.now()}`);
        await page.getByRole('button', { name: /Lanjut/i }).click();

        await page.locator('#variant-sku-0').fill(`SKU-NEG-${Date.now()}`);
        await page.locator('#variant-stock-0').fill('-1');
        await page.locator('#variant-price-0').fill('20000');
        await page.getByRole('button', { name: /Lanjut/i }).click();
        await expect(page.getByText(/Stok minimal 0/i)).toBeVisible();
    });

    test('TC.ADM.010.006 - Uji nilai batas tarif sewa < 0 (BVA Invalid)', async ({
        page,
    }) => {
        await page
            .getByRole('button', { name: /Tambah produk/i })
            .first()
            .click();
        await page.locator('#product-category').click();
        await page.locator('[role="option"]').first().click();
        await page.locator('#product-name').fill(`Tarif Negatif ${Date.now()}`);
        await page.getByRole('button', { name: /Lanjut/i }).click();

        await page.locator('#variant-sku-0').fill(`SKU-TNEG-${Date.now()}`);
        await page.locator('#variant-stock-0').fill('5');
        await page.locator('#variant-price-0').fill('-500');
        await page.getByRole('button', { name: /Lanjut/i }).click();
        await expect(page.getByText(/Harga minimal 0/i)).toBeVisible();
    });

    test('TC.ADM.010.007 - Validasi format file foto alat (.pdf ditolak)', async ({
        page,
    }) => {
        await page
            .getByRole('button', { name: /Tambah produk/i })
            .first()
            .click();
        await page.locator('#product-category').click();
        await page.locator('[role="option"]').first().click();
        await page.locator('#product-name').fill(`Foto PDF Test ${Date.now()}`);
        await page.getByRole('button', { name: /Lanjut/i }).click();

        await page.locator('#variant-sku-0').fill(`SKU-PDF-${Date.now()}`);
        await page.locator('#variant-stock-0').fill('5');
        await page.locator('#variant-price-0').fill('20000');
        await page.getByRole('button', { name: /Lanjut/i }).click();

        // Step 2: Gambar
        const fileInput = page.locator('#product-images');
        await fileInput.setInputFiles({
            name: 'katalog.pdf',
            mimeType: 'application/pdf',
            buffer: Buffer.from('%PDF-1.4 dummy'),
        });
        await expect(
            page.getByText(/Format katalog\.pdf harus JPG, PNG, atau WebP/i),
        ).toBeVisible();
    });

    test('TC.ADM.011.001 - Edit data barang berhasil', async ({ page }) => {
        const editProductName = `Matras Edit ${Date.now()}`;
        await createTestProduct(page, editProductName);

        // Buka detail dialog dengan klik baris tabel
        await page
            .locator('table')
            .getByText(editProductName, { exact: true })
            .click();
        const detailDialog = page.locator('[role="dialog"]');
        await expect(detailDialog).toBeVisible();

        // Klik tombol Ubah untuk masuk mode edit
        await detailDialog.getByRole('button', { name: /Ubah/i }).click();

        // Ubah deskripsi
        const descInput = page.locator('#edit-product-description');
        await descInput.fill('Deskripsi produk telah berhasil diperbarui.');

        const saveChangesBtn = detailDialog.getByRole('button', {
            name: /Simpan perubahan/i,
        });
        await expect(saveChangesBtn).toBeEnabled();
        await saveChangesBtn.click();

        await expect(page.getByText(/berhasil disimpan/i)).toBeVisible({
            timeout: 15000,
        });
        await expect(
            detailDialog.getByText(
                'Deskripsi produk telah berhasil diperbarui.',
            ),
        ).toBeVisible();
    });

    test('TC.ADM.012.001 - Hapus data barang yang tidak terikat paket/transaksi aktif', async ({
        page,
    }) => {
        const deleteProductName = `Lampu Hapus ${Date.now()}`;
        await createTestProduct(page, deleteProductName);

        // Buka detail dialog
        await page
            .locator('table')
            .getByText(deleteProductName, { exact: true })
            .click();
        const detailDialog = page.locator('[role="dialog"]');
        await expect(detailDialog).toBeVisible();

        // Klik tombol Hapus dalam detail dialog
        await detailDialog.getByRole('button', { name: /Hapus/i }).click();

        // Konfirmasi dialog hapus
        const confirmDialog = page.locator('[role="dialog"]').last();
        await confirmDialog.getByRole('button', { name: /^Hapus$/i }).click();

        await expect(
            page.locator('table').getByText(deleteProductName, { exact: true }),
        ).not.toBeVisible({ timeout: 15000 });
    });
});
