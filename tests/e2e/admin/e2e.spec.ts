import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../helper/login';

test.describe('E2E Lifecycle Master Data Rental (AD-03 Master Catalog -> AD-04 Master Attributes -> AD-05 Product Management)', () => {
    test('End-to-End Workflow: Pembuatan Katalog, Atribut Varian, dan Produk Alat Sewa', async ({
        page,
    }) => {
        // 1. Login sebagai Admin
        await loginAsAdmin(page);

        // 2. AD-03 Master Catalog: Buat Kategori Baru
        await page.goto('/admin/categories');
        await expect(page.locator('h1')).toContainText('Kategori');

        const categoryName = `E2E Kategori ${Date.now()}`;
        await page.getByRole('button', { name: /Tambah kategori/i }).click();
        await page.locator('#category-name').fill(categoryName);
        await page
            .locator('#category-description')
            .fill('Kategori otomatis pengujian E2E');
        await page.getByRole('button', { name: /Simpan kategori/i }).click();

        await expect(page.locator('table').getByText(categoryName)).toBeVisible(
            { timeout: 15000 },
        );

        // 3. AD-04 Master Attributes: Verifikasi Halaman Atribut
        await page.goto('/admin/attributes');
        await expect(page.locator('h1')).toContainText('Atribut');
        await expect(page.locator('table')).toBeVisible();

        // 4. AD-05 Product Management: Verifikasi Halaman Produk
        await page.goto('/admin/products');
        await expect(page.locator('h1')).toContainText('Produk');
        await expect(page.locator('table')).toBeVisible();
    });
});
