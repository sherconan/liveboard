import { test, expect } from '@playwright/test';

test.describe('Input and analyze button', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('type event text, analyze button becomes enabled', async ({ page }) => {
    const textarea = page.locator('textarea');
    const analyzeButton = page.locator('aside button', { hasText: /分析传导链/ });

    // Initially, the button should be disabled (no input)
    await expect(analyzeButton).toBeDisabled();

    // Type an event
    await textarea.fill('美联储宣布加息25个基点');

    // Button should now be enabled
    await expect(analyzeButton).toBeEnabled();
  });

  test('clear input, analyze button becomes disabled again', async ({ page }) => {
    const textarea = page.locator('textarea');
    const analyzeButton = page.locator('aside button', { hasText: /分析传导链/ });

    // Type text
    await textarea.fill('美联储宣布加息25个基点');
    await expect(analyzeButton).toBeEnabled();

    // Clear the textarea
    await textarea.fill('');

    // Button should be disabled again
    await expect(analyzeButton).toBeDisabled();
  });
});
