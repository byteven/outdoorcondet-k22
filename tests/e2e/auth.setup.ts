import { test as setup, expect } from '@playwright/test';

const adminFile = 'playwright/.auth/admin.json';

setup('authenticate as admin', async ({ page }) => {
    await page.goto('/login');
    await page.locator('#email').fill('admin@gmail.com');
    await page.locator('#password').fill('Admin123321@');
    await page.locator('[data-test="login-button"]').click();
    await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 15000 });

    await page.context().storageState({ path: adminFile });
});
