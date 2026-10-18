import { test, expect, Page } from '@playwright/test';
import { loginAsAdmin } from '../helper/login';

async function createTestAttribute(page: Page, name: string, description = '') {
    await page
        .getByRole('button', { name: /Tambah atribut/i })
        .first()
        .click();
    await page.locator('#attribute-name').fill(name);
    if (description) {
        await page.locator('#attribute-description').fill(description);
    }
    await page.locator('button[form="create-attribute-form"]').click();
    await expect(page.getByText(/berhasil ditambahkan/i)).toBeVisible({
        timeout: 15000,
    });
    await expect(
        page.locator('table').getByText(name, { exact: true }),
    ).toBeVisible({ timeout: 15000 });
}

test.describe('AD-04 Master Attributes', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto('/admin/attributes');
        await expect(page.locator('h1')).toContainText('Atribut');
    });

    test('TC.ADM.016.001 - Halaman daftar atribut tampil', async ({ page }) => {
        await expect(page.locator('table')).toBeVisible();
        await expect(page.getByText(/Total atribut/i)).toBeVisible();
    });

    test('TC.ADM.016.002 - Search atribut berdasarkan nama', async ({
        page,
    }) => {
        await page.getByPlaceholder(/Cari nama/).fill('Warna');
        await page.waitForTimeout(600);
        await expect(page.locator('table')).toBeVisible();
    });

    test('TC.ADM.017.001 - Tambah atribut baru berhasil (EP Valid)', async ({
        page,
    }) => {
        const uniqueName = `Bahan Frame ${Date.now()}`;
        await createTestAttribute(
            page,
            uniqueName,
            'Bahan rangka tenda outdoor',
        );
    });

    test('TC.ADM.017.002 - Validasi field wajib nama atribut (EP Invalid)', async ({
        page,
    }) => {
        await page
            .getByRole('button', { name: /Tambah atribut/i })
            .first()
            .click();
        await page.locator('button[form="create-attribute-form"]').click();
        await expect(page.getByText('Nama atribut wajib diisi.')).toBeVisible();
    });

    test('TC.ADM.017.003 - Tambah atribut nama duplikat (EP Invalid)', async ({
        page,
    }) => {
        const duplicateName = `Atribut Duplikat ${Date.now()}`;
        await createTestAttribute(page, duplicateName);

        // Coba tambah atribut baru dengan nama yang sama
        await page
            .getByRole('button', { name: /Tambah atribut/i })
            .first()
            .click();
        await page.locator('#attribute-name').fill(duplicateName);
        await page.locator('button[form="create-attribute-form"]').click();

        await expect(page.getByText(/sudah terdaftar/i)).toBeVisible();
    });

    test('TC.ADM.018.001 - Edit data atribut berhasil', async ({ page }) => {
        const editAttributeName = `Kapasitas Edit ${Date.now()}`;
        await createTestAttribute(page, editAttributeName);

        // Buka dialog detail dengan klik baris tabel
        await page
            .locator('table')
            .getByText(editAttributeName, { exact: true })
            .click();
        const detailDialog = page.locator('[role="dialog"]');
        await expect(detailDialog).toBeVisible();

        // Ubah deskripsi
        const descInput = page.locator('#edit-attribute-description');
        await descInput.fill('Deskripsi atribut berhasil diperbarui.');

        const saveBtn = detailDialog.getByRole('button', {
            name: /Simpan perubahan/i,
        });
        await expect(saveBtn).toBeEnabled();
        await saveBtn.click();

        await expect(page.getByText(/berhasil disimpan/i)).toBeVisible({
            timeout: 15000,
        });
    });

    test('TC.ADM.019.001 - Hapus atribut dengan konfirmasi dialog', async ({
        page,
    }) => {
        const deleteAttributeName = `Atribut Hapus ${Date.now()}`;
        await createTestAttribute(page, deleteAttributeName);

        // Buka dialog detail
        await page
            .locator('table')
            .getByText(deleteAttributeName, { exact: true })
            .click();
        const detailDialog = page.locator('[role="dialog"]');
        await expect(detailDialog).toBeVisible();

        // Klik tombol Hapus dalam detail dialog
        await detailDialog.getByRole('button', { name: /Hapus/i }).click();

        // Konfirmasi penghapusan pada modal konfirmasi
        const confirmDialog = page.locator('[role="dialog"]').last();
        await confirmDialog.getByRole('button', { name: /^Hapus$/i }).click();

        await expect(page.getByText(/berhasil dihapus/i)).toBeVisible({
            timeout: 15000,
        });
        await expect(
            page
                .locator('table')
                .getByText(deleteAttributeName, { exact: true }),
        ).not.toBeVisible({ timeout: 15000 });
    });
});
