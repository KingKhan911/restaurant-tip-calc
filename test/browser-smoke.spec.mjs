import { test, expect } from '@playwright/test';

const base = 'http://127.0.0.1:4321';
const canonicalBase = 'https://restauranttipcalculator.com';
const routes = [
  '/',
  '/average-restaurant-tip/',
  '/how-much-tip-waitress-waiter/',
  '/buffet-tipping-guide/',
  '/food-delivery-tip-calculator/',
  '/service-charge-on-restaurant-bill/',
  '/methodology/',
  '/about/',
  '/privacy/',
];
const widths = [320, 390, 768, 1024, 1240, 1440];

function captureConsole(page, errors) {
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
}

test.describe('all routes and representative widths', () => {
  for (const route of routes) {
    for (const width of widths) {
      test(`${route} has no overflow or console errors at ${width}px`, async ({ browser }) => {
        const context = await browser.newContext({ viewport: { width, height: 900 } });
        const page = await context.newPage();
        const errors = [];
        captureConsole(page, errors);
        const response = await page.goto(base + route, { waitUntil: 'networkidle' });
        expect(response?.ok()).toBeTruthy();
        await expect(page.locator('#main-content')).toBeVisible();
        const overflowState = await page.evaluate(() => {
          const viewportWidth = document.documentElement.clientWidth;
          const overflow = document.documentElement.scrollWidth - viewportWidth;
          const offenders = Array.from(document.querySelectorAll('body *'))
            .map((element) => {
              const rect = element.getBoundingClientRect();
              return {
                tag: element.tagName.toLowerCase(),
                id: element.id || '',
                className: typeof element.className === 'string' ? element.className : '',
                text: (element.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 80),
                left: Math.round(rect.left),
                right: Math.round(rect.right),
                width: Math.round(rect.width),
              };
            })
            .filter((item) => item.right > viewportWidth + 1 || item.left < -1)
            .slice(0, 12);
          return { overflow, offenders };
        });
        expect(
          overflowState.overflow,
          'Horizontal overflow offenders: ' + JSON.stringify(overflowState.offenders),
        ).toBeLessThanOrEqual(1);
        expect(errors).toEqual([]);
        await context.close();
      });
    }
  }
});

const complexTableRoutes = [
  { route: '/average-restaurant-tip/', expectedTables: 1 },
  { route: '/service-charge-on-restaurant-bill/', expectedTables: 2 },
];

test('complex comparison tables scroll internally instead of crushing columns on narrow screens', async ({ browser }) => {
  for (const width of [320, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();

    for (const { route, expectedTables } of complexTableRoutes) {
      await page.goto(base + route, { waitUntil: 'networkidle' });
      const wrappers = page.locator('.table-scroll');
      await expect(wrappers).toHaveCount(expectedTables);

      for (let index = 0; index < expectedTables; index += 1) {
        const state = await wrappers.nth(index).evaluate((wrapper) => {
          const table = wrapper.querySelector('table.worked-wide');
          const wrapperRect = wrapper.getBoundingClientRect();
          const tableRect = table?.getBoundingClientRect();
          return {
            hasNativeTable: Boolean(table && table.tagName === 'TABLE'),
            clientWidth: wrapper.clientWidth,
            scrollWidth: wrapper.scrollWidth,
            tableWidth: tableRect?.width ?? 0,
            wrapperLeft: wrapperRect.left,
            wrapperRight: wrapperRect.right,
            viewportWidth: document.documentElement.clientWidth,
            documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          };
        });

        expect(state.hasNativeTable).toBe(true);
        expect(state.scrollWidth).toBeGreaterThan(state.clientWidth);
        expect(state.tableWidth).toBeGreaterThan(state.clientWidth);
        expect(state.wrapperLeft).toBeGreaterThanOrEqual(-1);
        expect(state.wrapperRight).toBeLessThanOrEqual(state.viewportWidth + 1);
        expect(state.documentOverflow).toBeLessThanOrEqual(1);
      }
    }

    await context.close();
  }
});

test('complex comparison tables fit without internal scrolling at tablet and desktop widths', async ({ browser }) => {
  for (const width of [768, 1024, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();

    for (const { route, expectedTables } of complexTableRoutes) {
      await page.goto(base + route, { waitUntil: 'networkidle' });
      const wrappers = page.locator('.table-scroll');
      await expect(wrappers).toHaveCount(expectedTables);

      for (let index = 0; index < expectedTables; index += 1) {
        const state = await wrappers.nth(index).evaluate((wrapper) => ({
          overflow: wrapper.scrollWidth - wrapper.clientWidth,
          documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        }));
        expect(state.overflow).toBeLessThanOrEqual(1);
        expect(state.documentOverflow).toBeLessThanOrEqual(1);
      }
    }

    await context.close();
  }
});

test('global skip link targets main content on every route', async ({ page }) => {
  for (const route of routes) {
    await page.goto(base + route);
    await page.keyboard.press('Tab');
    const skip = page.locator('.skip');
    await expect(skip).toBeFocused();
    await expect(skip).toHaveText('Skip to content');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(new RegExp('#main-content$'));
    await expect(page.locator('#main-content')).toBeFocused();
  }
});

test('comma-decimal typing stays safe and normalizes only on blur', async ({ page }) => {
  await page.goto(base + '/');
  const bill = page.locator('#bill');
  await bill.fill('12,50');
  await expect(bill).toHaveValue('12,50');
  await expect(page.locator('#rTip')).toHaveText('$2.50');
  await expect(page.locator('#rTotal')).toHaveText('$15.00');
  await bill.press('Tab');
  await expect(bill).toHaveValue('12.50');
});

test('remainder-cent splitting reconciles visibly', async ({ page }) => {
  await page.goto(base + '/');
  await page.locator('#bill').fill('10');
  await page.locator('#customTip').fill('0');
  await page.locator('#ppl').fill('3');
  await expect(page.locator('#rTotal')).toHaveText('$10.00');
  await expect(page.locator('#rEach')).toHaveText('$3.33–$3.34');
  await expect(page.locator('#rNote')).toHaveText('1 pays $3.34 · 2 pay $3.33');

  await page.locator('#ppl').fill('6');
  await expect(page.locator('#rEach')).toHaveText('$1.66–$1.67');
  await expect(page.locator('#rNote')).toHaveText('4 pay $1.67 · 2 pay $1.66');
});

test('tax, fee, percentage basis toggle, and custom dollar tip are deterministic', async ({ page }) => {
  await page.goto(base + '/');
  await page.locator('#bill').fill('60');
  await page.locator('.more-options summary').click();
  await expect(page.locator('.more-options')).toHaveAttribute('open', '');
  await page.locator('#tax').fill('4.80');
  await page.locator('#otherFee').fill('5');
  await expect(page.locator('#rTip')).toHaveText('$12.00');
  await expect(page.locator('#rTotal')).toHaveText('$81.80');
  await expect(page.locator('#rTaxRow')).toBeVisible();
  await expect(page.locator('#rOtherFeeRow')).toBeVisible();

  await page.locator('#includeTax').check();
  await expect(page.locator('#rTip')).toHaveText('$12.96');
  await expect(page.locator('#rTotal')).toHaveText('$82.76');

  await page.locator('#bill').fill('40');
  await page.locator('#tax').fill('');
  await page.locator('#otherFee').fill('');
  await page.locator('#customTip').fill('7');
  await expect(page.locator('#rTip')).toHaveText('$7.00');
  await expect(page.locator('#rTotal')).toHaveText('$47.00');
  await page.locator('input[name="tipPreset"][value="20"]').check();
  await expect(page.locator('#customTip')).toHaveValue('');
  await expect(page.locator('#rTip')).toHaveText('$8.00');
  await expect(page.locator('#rTotal')).toHaveText('$48.00');
});

test('delivery fees remain outside the percentage tip basis', async ({ page }) => {
  await page.goto(base + '/food-delivery-tip-calculator/');
  await page.locator('#bill').fill('32');
  await page.locator('#deliveryFee').fill('2.99');
  await expect(page.locator('#rTip')).toHaveText('$6.40');
  await expect(page.locator('#rTotal')).toHaveText('$41.39');
  await page.locator('.more-options summary').click();
  await page.locator('#tax').fill('2.56');
  await expect(page.locator('#rTip')).toHaveText('$6.40');
  await expect(page.locator('#rTotal')).toHaveText('$43.95');
});

test('whole-dollar round-up reports exact total and higher collected amount', async ({ page }) => {
  await page.goto(base + '/');
  await page.locator('#bill').fill('60.50');
  await page.locator('#ppl').fill('3');
  await page.locator('#roundUp').check();
  await expect(page.locator('#rTip')).toHaveText('$12.10');
  await expect(page.locator('#rTotal')).toHaveText('$72.60');
  await expect(page.locator('#rEach')).toHaveText('$25');
  await expect(page.locator('#rNote')).toContainText('Collecting $75.00');
  await expect(page.locator('#rNote')).toContainText('$2.40 extra');
});

test('invalid negative money is not silently converted', async ({ page }) => {
  await page.goto(base + '/');
  await page.locator('#bill').fill('-$25');
  await expect(page.locator('#bill')).toHaveValue('-$25');
  await expect(page.locator('#bill')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#billError')).toBeVisible();
  await expect(page.locator('#rTotal')).toHaveText('—');
});

test('people input preserves last valid count and handles 99 people', async ({ page }) => {
  await page.goto(base + '/');
  await page.locator('#bill').fill('10');
  await page.locator('#customTip').fill('0');
  await page.locator('#ppl').fill('99');
  await expect(page.locator('#rNote')).toHaveText('10 pay $0.11 · 89 pay $0.10');
  await page.locator('#ppl').fill('');
  await page.locator('#ppl').blur();
  await expect(page.locator('#ppl')).toHaveValue('99');
  await page.locator('#pplPlus').click();
  await expect(page.locator('#ppl')).toHaveValue('99');
});

test('More options and tip presets are keyboard operable', async ({ page }) => {
  await page.goto(base + '/');
  const summary = page.locator('.more-options summary');
  await summary.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.more-options')).toHaveAttribute('open', '');

  const radio = page.locator('input[name="tipPreset"][value="18"]');
  await radio.focus();
  await page.keyboard.press('Space');
  await expect(radio).toBeChecked();
});

test('noscript fallback is visible and static page content remains readable', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 900 } });
  const page = await context.newPage();
  await page.goto(base + '/');
  const fallback = page.locator('.noscript-note');
  await expect(fallback).toBeVisible();
  await expect(fallback).toContainText('The interactive calculator requires JavaScript.');
  await expect(page.locator('h1')).toContainText('Restaurant Tip Calculator');
  await page.goto(base + '/buffet-tipping-guide/');
  await expect(page.locator('h1')).toBeVisible();
  await context.close();
});

test('reduced-motion preference is honored while results stay correct', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 390, height: 900 } });
  const page = await context.newPage();
  await page.goto(base + '/');
  expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
  await page.locator('#bill').fill('60');
  await expect(page.locator('#rTotal')).toHaveText('$72.00');
  await context.close();
});


test('debounced live region announces exact split reconciliation', async ({ page }) => {
  await page.goto(base + '/');
  await page.locator('#bill').fill('10');
  await page.locator('#customTip').fill('0');
  await page.locator('#ppl').fill('3');
  await expect(page.locator('#announce')).toContainText(
    '1 person pays $3.34 and 2 people pay $3.33',
    { timeout: 2500 },
  );
});

test('core paper, receipt, and display-type visual identity remains intact', async ({ page }) => {
  await page.goto(base + '/');
  const identity = await page.evaluate(() => {
    const body = getComputedStyle(document.body);
    const receipt = getComputedStyle(document.querySelector('.receipt'));
    const heading = getComputedStyle(document.querySelector('h1'));
    const money = getComputedStyle(document.querySelector('#rTotal'));
    return {
      bodyBackground: body.backgroundColor,
      receiptBackground: receipt.backgroundColor,
      headingFamily: heading.fontFamily,
      moneyFamily: money.fontFamily,
      hasTableDiagram: Boolean(document.querySelector('#diagWrap ellipse')),
      hasTornReceipt: Boolean(document.querySelector('.tear')),
    };
  });
  expect(identity.bodyBackground).toBe('rgb(246, 241, 231)');
  expect(identity.receiptBackground).toBe('rgb(255, 253, 248)');
  expect(identity.headingFamily).toContain('Fraunces');
  expect(identity.moneyFamily).toContain('Spline Sans Mono');
  expect(identity.hasTableDiagram).toBe(true);
  expect(identity.hasTornReceipt).toBe(true);
});


test('default calculator stays simple and optional rows stay hidden until used', async ({ page }) => {
  await page.goto(base + '/');
  await expect(page.locator('.more-options')).not.toHaveAttribute('open', '');
  await expect(page.locator('#rTaxRow')).toBeHidden();
  await expect(page.locator('#rOtherFeeRow')).toBeHidden();
});

test('mobile money inputs keep decimal keyboards and default build includes reserved ad chrome', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 320, height: 700 } });
  const page = await context.newPage();
  await page.goto(base + '/');
  const bill = page.locator('#bill');
  expect(await bill.getAttribute('inputmode')).toBe('decimal');
  const fontSize = await bill.evaluate((element) => parseFloat(getComputedStyle(element).fontSize));
  expect(fontSize).toBeGreaterThanOrEqual(16);
  await expect(page.locator('body')).toHaveClass(/ads-enabled/);
  const anchor = page.locator('#ad-anchor');
  await expect(anchor).toBeVisible();
  await expect(page.locator('[data-ad-slot]')).not.toHaveCount(0);
  const bodyPaddingBottom = await page.evaluate(() => parseFloat(getComputedStyle(document.body).paddingBottom));
  const anchorHeight = await anchor.evaluate((element) => element.getBoundingClientRect().height);
  expect(bodyPaddingBottom).toBeGreaterThanOrEqual(anchorHeight);
  await context.close();
});

test('important rendered routes contain no duplicate ids', async ({ page }) => {
  for (const route of routes) {
    await page.goto(base + route);
    const duplicates = await page.evaluate(() => {
      const counts = new Map();
      document.querySelectorAll('[id]').forEach((element) => counts.set(element.id, (counts.get(element.id) || 0) + 1));
      return Array.from(counts.entries()).filter(([, count]) => count > 1);
    });
    expect(duplicates).toEqual([]);
  }
});


test('retained JSON-LD parses, matches supported types, and canonicals are exact', async ({ page }) => {
  for (const route of routes) {
    await page.goto(base + route);
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
    expect(canonical).toBe(new URL(route, canonicalBase).href);
    await expect(page.locator('h1')).toHaveCount(1);

    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(blocks.length).toBeGreaterThan(0);
    for (const block of blocks) {
      const parsed = JSON.parse(block);
      const types = [];
      const visit = (value) => {
        if (!value || typeof value !== 'object') return;
        if (Array.isArray(value)) {
          value.forEach(visit);
          return;
        }
        if (typeof value['@type'] === 'string') types.push(value['@type']);
        Object.values(value).forEach(visit);
      };
      visit(parsed);
      expect(types).not.toContain('FAQPage');
      expect(types).not.toContain('HowTo');
    }
  }
});

test('all same-page navigation fragments resolve to real ids', async ({ page }) => {
  for (const route of routes) {
    await page.goto(base + route);
    const fragments = await page.locator('a[href^="#"]').evaluateAll((anchors) =>
      anchors.map((anchor) => anchor.getAttribute('href')).filter(Boolean),
    );
    for (const fragment of fragments) {
      const target = page.locator(fragment);
      await expect(target, `Missing fragment ${fragment} on ${route}`).toHaveCount(1);
    }
  }
});

test('all rendered internal page links resolve', async ({ page, request }) => {
  const paths = new Set();
  for (const route of routes) {
    await page.goto(base + route);
    const hrefs = await page.locator('a[href]').evaluateAll((anchors) =>
      anchors.map((anchor) => anchor.getAttribute('href')).filter(Boolean),
    );
    for (const href of hrefs) {
      const url = new URL(href, canonicalBase + route);
      if (url.origin === canonicalBase) paths.add(url.pathname);
    }
  }

  for (const path of paths) {
    const response = await request.get(base + path);
    expect(response.ok(), `Internal link failed: ${path} -> ${response.status()}`).toBeTruthy();
  }
});

test('research-heavy pages expose visible source links and review context', async ({ page }) => {
  await page.goto(base + '/average-restaurant-tip/');
  await expect(page.locator('#sources')).toBeVisible();
  expect(await page.locator('#sources a[href^="https://"]').count()).toBeGreaterThanOrEqual(5);
  await expect(page.locator('body')).toContainText('Research last reviewed: September 5, 2026');

  await page.goto(base + '/methodology/');
  await expect(page.locator('#research-method')).toBeVisible();
  await expect(page.locator('#sources')).toBeVisible();
  expect(await page.locator('#sources a[href^="https://"]').count()).toBeGreaterThanOrEqual(6);
});


test('social metadata, canonicals, and favicon references are complete on representative routes', async ({ page, request }) => {
  const representative = ['/', '/average-restaurant-tip/', '/food-delivery-tip-calculator/', '/methodology/', '/about/', '/privacy/'];
  for (const route of representative) {
    await page.goto(base + route);
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
    await expect(page.locator('meta[property="og:title"]')).toHaveCount(1);
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', new URL(route, canonicalBase).href);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', canonicalBase + '/social/restaurant-tip-calculator-og.png');
    await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute('content', '1200');
    await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute('content', '630');
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
  }
  for (const asset of ['/favicon.svg', '/favicon.ico', '/apple-touch-icon.png', '/social/restaurant-tip-calculator-og.png']) {
    const response = await request.get(base + asset);
    expect(response.ok(), `Missing brand/social asset: ${asset}`).toBeTruthy();
  }
});

test('generated sitemap and robots expose the intentional crawl surface', async ({ request }) => {
  const sitemapResponse = await request.get(base + '/sitemap.xml');
  expect(sitemapResponse.ok()).toBeTruthy();
  const xml = await sitemapResponse.text();
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  expect(locs).toEqual(routes.map((route) => new URL(route, canonicalBase).href));
  expect(new Set(locs).size).toBe(locs.length);
  expect(xml).not.toContain('/404/');
  expect(xml).not.toContain('<priority>');
  expect(xml).not.toContain('<changefreq>');

  const robotsResponse = await request.get(base + '/robots.txt');
  expect(robotsResponse.ok()).toBeTruthy();
  const robots = await robotsResponse.text();
  expect(robots).toContain('User-agent: *');
  expect(robots).toContain('Allow: /');
  expect(robots).toContain('Sitemap: https://restauranttipcalculator.com/sitemap.xml');
  expect(robots).not.toMatch(/User-agent:\s*OAI-SearchBot[\s\S]*?Disallow:\s*\//i);
});

test('custom 404 returns HTTP 404, stays noindex, links home, and has no ad shell', async ({ page }) => {
  const response = await page.goto(base + '/this-page-does-not-exist/');
  expect(response?.status()).toBe(404);
  await expect(page.locator('h1')).toHaveText('That page could not be found');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,follow');
  await expect(page.locator('a[href="/"]').first()).toBeVisible();
  await expect(page.locator('[data-ad-slot]')).toHaveCount(0);
});

test('supporting pages remain readable with JavaScript disabled', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 900 } });
  const page = await context.newPage();
  for (const route of ['/about/', '/privacy/', '/methodology/']) {
    const response = await page.goto(base + route);
    expect(response?.ok()).toBeTruthy();
    await expect(page.locator('h1')).toBeVisible();
  }
  await context.close();
});

test('development-only design reference is not exposed as a production route', async ({ request }) => {
  const response = await request.get(base + '/design_inspo.html');
  expect(response.status()).toBe(404);
});


test('head metadata stays singular and URL-consistent on every indexable route', async ({ page }) => {
  for (const route of routes) {
    await page.goto(base + route);
    const expected = new URL(route, canonicalBase).href;

    await expect(page.locator('title')).toHaveCount(1);
    await expect(page.locator('meta[name="description"]')).toHaveCount(1);
    await expect(page.locator('meta[name="robots"]')).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
    await expect(page.locator('meta[property="og:title"]')).toHaveCount(1);
    await expect(page.locator('meta[property="og:description"]')).toHaveCount(1);
    await expect(page.locator('meta[property="og:url"]')).toHaveCount(1);
    await expect(page.locator('meta[property="og:image"]')).toHaveCount(1);

    expect(await page.locator('link[rel="canonical"]').getAttribute('href')).toBe(expected);
    expect(await page.locator('meta[property="og:url"]').getAttribute('content')).toBe(expected);

    const schemaText = (await page.locator('script[type="application/ld+json"]').allTextContents()).join('\n');
    expect(schemaText).toContain(expected);
    expect(schemaText).not.toContain('localhost');
  }
});

test('default network surface has no unexpected third-party requests or external calculation APIs', async ({ browser }) => {
  for (const route of ['/', '/about/', '/privacy/']) {
    const context = await browser.newContext({ viewport: { width: 390, height: 900 } });
    const page = await context.newPage();
    const requests = [];
    page.on('request', (request) => requests.push({
      url: request.url(),
      resourceType: request.resourceType(),
    }));
    await page.goto(base + route, { waitUntil: 'networkidle' });

    const externalHosts = [...new Set(
      requests
        .map(({ url }) => new URL(url))
        .filter((url) => url.origin !== base)
        .map((url) => url.hostname),
    )].sort();

    for (const host of externalHosts) {
      expect(['fonts.googleapis.com', 'fonts.gstatic.com']).toContain(host);
    }

    const apiRequests = requests.filter(({ resourceType }) => ['xhr', 'fetch'].includes(resourceType));
    expect(apiRequests, `Unexpected API requests on ${route}: ${JSON.stringify(apiRequests)}`).toEqual([]);

    if (route !== '/') {
      const scripts = requests.filter(({ resourceType }) => resourceType === 'script');
      expect(scripts, `Static trust page unexpectedly loaded JavaScript: ${JSON.stringify(scripts)}`).toEqual([]);
    }
    await context.close();
  }
});

test('social preview raster has the declared 1200 by 630 dimensions', async ({ page }) => {
  await page.goto(base + '/');
  const dimensions = await page.evaluate((src) => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve([image.naturalWidth, image.naturalHeight]);
    image.onerror = reject;
    image.src = src;
  }), '/social/restaurant-tip-calculator-og.png');
  expect(dimensions).toEqual([1200, 630]);
});
