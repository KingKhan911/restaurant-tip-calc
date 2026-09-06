import { test, expect } from '@playwright/test';

const base = process.env.RTC_BASE_URL || 'http://127.0.0.1:4322';

test('desktop rail boundary, common widths, geometry, and spacing stay safe', async ({ browser }) => {
  const breakpoint = 1240;
  const widths = [1180, 1200, 1239, 1240, 1260, 1280, 1366, 1439, 1440, 1536];
  const screenshotWidths = new Set([1239, 1240, 1280, 1366, 1440, 1536]);

  for (const width of widths) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    await page.goto(base + '/', { waitUntil: 'networkidle' });

    const rail = page.locator('.rail');
    const creative = page.locator('#ad-rail');
    if (width < breakpoint) {
      await expect(rail).toBeHidden();
      await expect(creative).toBeHidden();
    } else {
      await expect(rail).toBeVisible();
      await expect(creative).toBeVisible();

      const geometry = await page.evaluate(() => {
        const shell = document.querySelector('.shell');
        const wrap = document.querySelector('.wrap');
        const rail = document.querySelector('.rail');
        const creative = document.querySelector('#ad-rail');
        const calc = document.querySelector('.calc');
        const form = calc?.children[0];
        const receiptColumn = calc?.children[1];
        const receipt = document.querySelector('.receipt-wrap');
        const rect = (element) => element?.getBoundingClientRect();
        const shellStyle = getComputedStyle(shell);
        return {
          viewportWidth: document.documentElement.clientWidth,
          documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          shellGap: parseFloat(shellStyle.columnGap),
          wrap: rect(wrap),
          rail: rect(rail),
          creative: rect(creative),
          form: rect(form),
          receiptColumn: rect(receiptColumn),
          receipt: rect(receipt),
        };
      });

      expect(geometry.creative?.width).toBe(300);
      expect(geometry.creative?.height).toBe(250);
      expect(geometry.creative.left).toBeGreaterThanOrEqual(-1);
      expect(geometry.creative.right).toBeLessThanOrEqual(geometry.viewportWidth + 1);
      expect(geometry.wrap.right).toBeLessThanOrEqual(geometry.rail.left + 1);
      expect(geometry.documentOverflow).toBeLessThanOrEqual(1);
      expect(geometry.shellGap).toBe(width >= 1440 ? 48 : 24);

      if ([1240, 1280, 1366].includes(width)) {
        expect(geometry.form.width).toBeGreaterThanOrEqual(389);
        expect(geometry.receiptColumn.width).toBeGreaterThanOrEqual(350);
        expect(geometry.receipt.width).toBeGreaterThanOrEqual(350);
      }
    }

    if (screenshotWidths.has(width)) {
      await page.screenshot({
        path: `visual-qa/ad-enabled--home-${width}.jpg`,
        fullPage: true,
        type: 'jpeg',
        quality: 58,
      });
    }

    await context.close();
  }
});

test('intermediate desktop rail stays sticky on a long guide without colliding with footer', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 700 } });
  const page = await context.newPage();
  await page.goto(base + '/average-restaurant-tip/', { waitUntil: 'networkidle' });
  const rail = page.locator('.rail');
  const sticky = page.locator('.rail-sticky');
  const footer = page.locator('.site-foot');
  await expect(rail).toBeVisible();

  const initial = await sticky.boundingBox();
  expect(initial).not.toBeNull();
  await page.evaluate(() => window.scrollTo(0, 900));
  await page.waitForTimeout(100);
  const scrolled = await sticky.boundingBox();
  expect(scrolled).not.toBeNull();
  expect(scrolled.y).toBeGreaterThanOrEqual(19);
  expect(scrolled.y).toBeLessThanOrEqual(21);

  const overlap = await page.evaluate(() => {
    const sticky = document.querySelector('.rail-sticky').getBoundingClientRect();
    const footer = document.querySelector('.site-foot').getBoundingClientRect();
    const horizontalOverlap = Math.max(0, Math.min(sticky.right, footer.right) - Math.max(sticky.left, footer.left));
    return {
      horizontalOverlap,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  expect(overlap.horizontalOverlap).toBe(0);
  expect(overlap.overflow).toBeLessThanOrEqual(1);

  await page.screenshot({
    path: 'visual-qa/ad-enabled--guide-1280-sticky.jpg',
    fullPage: true,
    type: 'jpeg',
    quality: 58,
  });
  await context.close();
});

test('table-heavy guide pages remain coherent beside the rail at 1280 and 1366', async ({ browser }) => {
  for (const width of [1280, 1366]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();

    for (const route of ['/average-restaurant-tip/', '/service-charge-on-restaurant-bill/']) {
      await page.goto(base + route, { waitUntil: 'networkidle' });
      await expect(page.locator('.rail')).toBeVisible();
      const tableState = await page.locator('.table-scroll').evaluateAll((wrappers) => ({
        allFit: wrappers.every((wrapper) => wrapper.scrollWidth - wrapper.clientWidth <= 1),
        documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      }));
      expect(tableState.allFit).toBe(true);
      expect(tableState.documentOverflow).toBeLessThanOrEqual(1);
    }

    await context.close();
  }
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
