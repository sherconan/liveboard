import { test, expect } from '@playwright/test';

test.describe('Navigation - Compare mode', () => {
  test('switch to compare mode and back', async ({ page }) => {
    await page.goto('/');

    // Seed localStorage with 2 fake history items so the Compare button appears
    await page.evaluate(() => {
      const fakeItems = [
        {
          id: 'test-1',
          timestamp: Date.now() - 60000,
          hotspot: 'Fed rate hike',
          eventTitle: 'Fed rate hike',
          data: {
            scenarios: [],
            nodes: [{ id: 'n1', label: 'Fed', type: 'hotspot' }],
            edges: [],
            summary: 'test',
            coreActions: [],
          },
          meta: {
            nodeCount: 1, edgeCount: 0, scenarioCount: 0,
            sectors: [], assets: [],
            sentiments: { positive: 0, negative: 0, neutral: 0 },
            chainDepth: 1,
          },
        },
        {
          id: 'test-2',
          timestamp: Date.now(),
          hotspot: 'Oil price surge',
          eventTitle: 'Oil price surge',
          data: {
            scenarios: [],
            nodes: [{ id: 'n2', label: 'Oil', type: 'hotspot' }],
            edges: [],
            summary: 'test',
            coreActions: [],
          },
          meta: {
            nodeCount: 1, edgeCount: 0, scenarioCount: 0,
            sectors: [], assets: [],
            sentiments: { positive: 0, negative: 0, neutral: 0 },
            chainDepth: 1,
          },
        },
      ];
      localStorage.setItem('liveboard-history', JSON.stringify(fakeItems));
    });

    // Reload to pick up the seeded history
    await page.reload();

    // The compare button should now be visible in the header (historyCount >= 2)
    const compareButton = page.locator('header button', { hasText: /对比/ });
    await expect(compareButton).toBeVisible({ timeout: 5000 });

    // Click compare to open compare mode
    await compareButton.click();

    // Compare mode overlay should appear with the title
    const compareTitle = page.getByText('对比分析').first();
    await expect(compareTitle).toBeVisible({ timeout: 5000 });

    // The prompt text should be visible (no items selected yet)
    const promptText = page.getByText('请从上方选择两个事件进行对比');
    await expect(promptText).toBeVisible();

    // Close compare mode via the X button
    const closeButton = page.locator('.fixed.inset-0 button').filter({ has: page.locator('svg.lucide-x') }).first();
    await closeButton.click();

    // Compare overlay should be gone
    await expect(promptText).not.toBeVisible({ timeout: 5000 });
  });
});
