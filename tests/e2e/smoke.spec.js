import { test, expect } from '@playwright/test';

test('user app loads', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/localhost:5173/);
});
