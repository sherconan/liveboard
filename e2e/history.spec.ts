import { test, expect } from '@playwright/test';

test.describe('History drawer', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to ensure clean state
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('open history drawer and verify empty state', async ({ page }) => {
    // Click the history button in the header
    const historyButton = page.locator('header button', { hasText: /历史/ });
    await expect(historyButton).toBeVisible();
    await historyButton.click();

    // The drawer should open with empty state text
    const emptyText = page.getByText('暂无历史分析');
    await expect(emptyText).toBeVisible({ timeout: 5000 });

    // The hint text should also be visible
    const hintText = page.getByText('完成一次分析后，结果会自动保存到这里');
    await expect(hintText).toBeVisible();
  });

  test('close history drawer', async ({ page }) => {
    // Open drawer
    const historyButton = page.locator('header button', { hasText: /历史/ });
    await historyButton.click();

    const emptyText = page.getByText('暂无历史分析');
    await expect(emptyText).toBeVisible({ timeout: 5000 });

    // Close drawer via the X button inside the drawer
    const closeButton = page.locator('.fixed.left-0 button').filter({ has: page.locator('svg') }).last();
    await closeButton.click();

    // Empty text should no longer be visible
    await expect(emptyText).not.toBeVisible({ timeout: 5000 });
  });
});
