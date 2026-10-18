import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helper/login';

test.describe('AD-03 Master Catalog', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto('/admin/categories');
        await expect(page.locator('h1')).toContainText('Kategori');
    });

    test('TC.ADM.005.001 - Halaman daftar kategori tampil', async ({
        page,
    }) => {
        await expect(page.locator('table')).toBeVisible();
    });

    test('TC.ADM.005.002 - Search kategori berdasarkan nama', async ({
        page,
    }) => {
        await page.getByPlaceholder(/Cari nama/).fill('Tenda');
        await page.waitForTimeout(600);
        await expect(page.locator('table tbody tr').first()).toBeVisible();
    });

    test('TC.ADM.006.001 - Tambah kategori berhasil (EP Valid)', async ({
        page,
    }) => {
        const categoryName = `Perlengkapan Tidur ${Date.now()}`;
        await page
            .getByRole('button', { name: /Tambah kategori/ })
            .first()
            .click();
        await page.locator('#category-name').fill(categoryName);
        await page
            .locator('#category-description')
            .fill('Matras, sleeping bag, dan hammock');
        await page.getByRole('button', { name: /Simpan kategori/ }).click();

        await expect(
            page.locator('table').getByText(categoryName, { exact: true }),
        ).toBeVisible({ timeout: 15000 });
    });

    test('TC.ADM.006.002 - Validasi field wajib tambah kategori (EP Invalid)', async ({
        page,
    }) => {
        await page
            .getByRole('button', { name: /Tambah kategori/ })
            .first()
            .click();
        await page.locator('#category-name').fill('');
        await page.getByRole('button', { name: /Simpan kategori/ }).click();
        await expect(
            page.getByText('Nama kategori wajib diisi.'),
        ).toBeVisible();
    });

    test('TC.ADM.006.003 - Tambah kategori nama duplikat (EP Invalid)', async ({
        page,
    }) => {
        // Buat kategori pertama
        const duplicateName = `Kategori Duplikat ${Date.now()}`;
        await page
            .getByRole('button', { name: /Tambah kategori/ })
            .first()
            .click();
        await page.locator('#category-name').fill(duplicateName);
        await page.getByRole('button', { name: /Simpan kategori/ }).click();
        await expect(
            page.locator('table').getByText(duplicateName, { exact: true }),
        ).toBeVisible({ timeout: 15000 });

        // Coba buat kategori kedua dengan nama yang sama
        await page
            .getByRole('button', { name: /Tambah kategori/ })
            .first()
            .click();
        await page.locator('#category-name').fill(duplicateName);
        await page.getByRole('button', { name: /Simpan kategori/ }).click();
        await expect(page.getByText(/sudah digunakan/i)).toBeVisible({
            timeout: 15000,
        });
    });

    test('TC.ADM.007.001 - Edit data kategori berhasil', async ({ page }) => {
        const initialName = `Alat Masak ${Date.now()}`;
        const updatedName = `Kompor Masak ${Date.now()}`;

        await page
            .getByRole('button', { name: /Tambah kategori/ })
            .first()
            .click();
        await page.locator('#category-name').fill(initialName);
        await page.getByRole('button', { name: /Simpan kategori/ }).click();
        await expect(
            page.locator('table').getByText(initialName, { exact: true }),
        ).toBeVisible({ timeout: 15000 });

        // Buka detail dialog dengan klik baris tabel
        await page
            .locator('table')
            .getByText(initialName, { exact: true })
            .click();
        const editDialog = page.locator('[role="dialog"]');
        await expect(editDialog).toBeVisible();

        await page.locator('#edit-category-name').fill(updatedName);
        await page
            .locator('#edit-category-slug')
            .fill(updatedName.toLowerCase().replace(/\s+/g, '-'));
        await editDialog
            .getByRole('button', { name: /Simpan Perubahan/i })
            .click();

        await expect(
            page.locator('table').getByText(updatedName, { exact: true }),
        ).toBeVisible({ timeout: 15000 });
    });

    test('TC.ADM.008.001 - Hapus kategori kosong berhasil', async ({
        page,
    }) => {
        const deleteName = `Aksesoris ${Date.now()}`;
        await page
            .getByRole('button', { name: /Tambah kategori/ })
            .first()
            .click();
        await page.locator('#category-name').fill(deleteName);
        await page.getByRole('button', { name: /Simpan kategori/ }).click();
        await expect(
            page.locator('table').getByText(deleteName, { exact: true }),
        ).toBeVisible({ timeout: 15000 });

        // Klik baris kategori untuk buka detail dialog
        await page
            .locator('table')
            .getByText(deleteName, { exact: true })
            .click();
        const detailDialog = page.locator('[role="dialog"]');
        await expect(detailDialog).toBeVisible();

        // Klik Hapus di dalam dialog detail
        await detailDialog.getByRole('button', { name: /Hapus/i }).click();

        // Konfirmasi dialog hapus
        const confirmDialog = page.locator('[role="dialog"]').last();
        await confirmDialog.getByRole('button', { name: /^Hapus$/i }).click();

        await expect(
            page.locator('table').getByText(deleteName, { exact: true }),
        ).not.toBeVisible({ timeout: 15000 });
    });
});
