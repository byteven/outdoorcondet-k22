import { Page, expect } from '@playwright/test';

const ADMIN_EMAIL = 'admin@gmail.com';
const ADMIN_PASSWORD = 'Admin123321@';

export async function loginAsAdmin(page: Page) {
    await page.goto('/admin/dashboard');
    if (page.url().includes('/login')) {
        await page.locator('#email').fill(ADMIN_EMAIL);
        await page.locator('#password').fill(ADMIN_PASSWORD);
        await page.locator('[data-test="login-button"]').click();
        await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 10000 });
    }
}

export { ADMIN_EMAIL, ADMIN_PASSWORD };
