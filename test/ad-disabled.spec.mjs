import { test, expect } from '@playwright/test';

const base = process.env.RTC_BASE_URL || 'http://127.0.0.1:4322';
const routes = ['/', '/food-delivery-tip-calculator/', '/about/', '/privacy/'];

for (const route of routes) {
  test(`${route} hides all placeholders when PUBLIC_ADS_ENABLED=false`, async ({ browser }) => {
    for (const width of [390, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      const page = await context.newPage();
      const response = await page.goto(base + route, { waitUntil: 'networkidle' });
      expect(response?.ok()).toBeTruthy();
      await expect(page.locator('body')).not.toHaveClass(/ads-enabled/);
      await expect(page.locator('[data-ad-slot]')).toHaveCount(0);
      expect(await page.evaluate(() => parseFloat(getComputedStyle(document.body).paddingBottom))).toBe(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
      await context.close();
    }
  });
}

test('404 remains ad-free in the explicit disabled state', async ({ page }) => {
  const response = await page.goto(base + '/this-page-does-not-exist/');
  expect(response?.status()).toBe(404);
  await expect(page.locator('[data-ad-slot]')).toHaveCount(0);
});
