import { test, expect } from '@playwright/test';

const base = process.env.RTC_BASE_URL || 'http://127.0.0.1:4322';

test('desktop rail appears only when there is genuinely enough width', async ({ browser }) => {
  const narrow = await browser.newContext({ viewport: { width: 1240, height: 900 } });
  const narrowPage = await narrow.newPage();
  await narrowPage.goto(base + '/');
  await expect(narrowPage.locator('#ad-rail')).toBeHidden();
  expect(await narrowPage.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  await narrow.close();

  const wide = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await wide.newPage();
  await page.goto(base + '/');
  await expect(page.locator('#ad-rail')).toBeVisible();
  const box = await page.locator('#ad-rail').boundingBox();
  expect(box?.width).toBe(300);
  expect(box?.height).toBe(250);
  const railLabelStyle = await page.locator('.rail .ad-label').evaluate((element) => {
    const style = getComputedStyle(element);
    return { color: style.color, fontSize: parseFloat(style.fontSize) };
  });
  expect(railLabelStyle.color).toBe('rgb(99, 90, 76)');
  expect(railLabelStyle.fontSize).toBeGreaterThanOrEqual(10.5);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  await page.screenshot({
    path: 'visual-qa/ad-enabled--desktop-1440.jpg',
    fullPage: true,
    type: 'jpeg',
    quality: 58,
  });
  await wide.close();
});

test('mobile anchor reserves space, remains closable, and does not cover focused fields', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 760 } });
  const page = await context.newPage();
  await page.goto(base + '/');
  const anchor = page.locator('#ad-anchor');
  await expect(anchor).toBeVisible();
  const anchorLabelStyle = await page.locator('.anchor-label').evaluate((element) => {
    const style = getComputedStyle(element);
    return { color: style.color, fontSize: parseFloat(style.fontSize) };
  });
  expect(anchorLabelStyle.color).toBe('rgb(99, 90, 76)');
  expect(anchorLabelStyle.fontSize).toBeGreaterThanOrEqual(10.4);
  await page.screenshot({
    path: 'visual-qa/ad-enabled--mobile-390.jpg',
    fullPage: true,
    type: 'jpeg',
    quality: 58,
  });

  const bodyPaddingBottom = await page.evaluate(() => parseFloat(getComputedStyle(document.body).paddingBottom));
  const anchorHeight = await anchor.evaluate((element) => element.getBoundingClientRect().height);
  expect(bodyPaddingBottom).toBeGreaterThanOrEqual(anchorHeight);

  await page.locator('.more-options summary').click();
  const field = page.locator('#otherFee');
  await field.scrollIntoViewIfNeeded();
  await field.focus();
  const fieldBox = await field.boundingBox();
  const anchorBox = await anchor.boundingBox();
  expect(fieldBox).not.toBeNull();
  expect(anchorBox).not.toBeNull();
  expect(fieldBox.y + fieldBox.height).toBeLessThanOrEqual(anchorBox.y + 1);

  await page.locator('#anchorClose').focus();
  await expect(page.locator('#anchorClose')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(anchor).toBeHidden();
  expect(await page.evaluate(() => parseFloat(getComputedStyle(document.body).paddingBottom))).toBe(0);
  await context.close();
});

test('in-content slots reserve their declared dimensions', async ({ browser }) => {
  const desktop = await browser.newContext({ viewport: { width: 1024, height: 900 } });
  const page = await desktop.newPage();
  await page.goto(base + '/food-delivery-tip-calculator/');
  const leaderboard = page.locator('#ad-below');
  await expect(leaderboard).toBeVisible();
  const leaderboardBox = await leaderboard.boundingBox();
  expect(leaderboardBox?.height).toBe(90);

  const native = page.locator('#ad-native');
  await expect(native).toBeVisible();
  const nativeBox = await native.boundingBox();
  expect(nativeBox?.height).toBe(280);

  const labels = page.locator('.ad-label');
  expect(await labels.count()).toBeGreaterThanOrEqual(2);
  for (let index = 0; index < await labels.count(); index += 1) {
    await expect(labels.nth(index)).toHaveText('Advertisement');
  }
  await desktop.close();
});

test('404 never renders ad slots even when placeholders are enabled', async ({ page }) => {
  const response = await page.goto(base + '/this-page-does-not-exist/');
  expect(response?.status()).toBe(404);
  await expect(page.locator('[data-ad-slot]')).toHaveCount(0);
});
