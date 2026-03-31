import { test, expect } from '@playwright/test';

test.describe('Smoke tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('page loads successfully', async ({ page }) => {
    await expect(page).toHaveTitle(/LiveBoard/i);
  });

  test('header renders with brand name "LiveBoard"', async ({ page }) => {
    const brand = page.locator('header').getByText('LiveBoard', { exact: true });
    await expect(brand).toBeVisible();
  });

  test('input area (textarea) is visible', async ({ page }) => {
    const textarea = page.locator('textarea');
    await expect(textarea).toBeVisible();
  });

  test('language switch works - click to EN, verify English text', async ({ page }) => {
    // Default is Chinese. The language switch button has "中 / EN".
    const langButton = page.locator('button', { has: page.locator('text=EN') }).first();
    await expect(langButton).toBeVisible();

    // Click to switch to English
    await langButton.click();

    // After switching to EN, the empty state title should be in English
    const englishText = page.getByText('Select a news event from the left panel to begin');
    await expect(englishText).toBeVisible({ timeout: 5000 });

    // Switch back to Chinese
    await langButton.click();
    const chineseText = page.getByText('从左侧选择一条新闻开始分析');
    await expect(chineseText).toBeVisible({ timeout: 5000 });
  });
});
