import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const base = process.env.RTC_BASE_URL || 'http://127.0.0.1:4321';
const pages = [
  ['home', '/'],
  ['delivery', '/food-delivery-tip-calculator/'],
  ['average', '/average-restaurant-tip/'],
  ['service-charge', '/service-charge-on-restaurant-bill/'],
  ['methodology', '/methodology/'],
  ['about', '/about/'],
  ['privacy', '/privacy/'],
  ['404', '/this-page-does-not-exist/'],
];
const views = [
  ['mobile-390', 390, 900],
  ['desktop-1440', 1440, 1000],
];

await mkdir('visual-qa', { recursive: true });
const browser = await chromium.launch();
const metrics = [];

for (const [viewName, width, height] of views) {
  for (const [pageName, route] of pages) {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    const requests = [];

    await page.addInitScript(() => {
      window.__phase3Vitals = { cls: 0, lcp: 0 };
      try {
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) window.__phase3Vitals.cls += entry.value;
          }
        }).observe({ type: 'layout-shift', buffered: true });
      } catch {}
      try {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const last = entries[entries.length - 1];
          if (last) window.__phase3Vitals.lcp = last.startTime;
        }).observe({ type: 'largest-contentful-paint', buffered: true });
      } catch {}
    });

    page.on('request', (request) => requests.push({
      url: request.url(),
      resourceType: request.resourceType(),
    }));

    const response = await page.goto(base + route, { waitUntil: 'networkidle' });
    await page.waitForTimeout(250);

    const vitals = await page.evaluate(() => ({
      cls: Number((window.__phase3Vitals?.cls || 0).toFixed(4)),
      lcpMs: Math.round(window.__phase3Vitals?.lcp || 0),
      resourceCount: performance.getEntriesByType('resource').length,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));

    const externalHosts = [...new Set(
      requests
        .map(({ url }) => new URL(url))
        .filter((url) => url.origin !== base)
        .map((url) => url.hostname),
    )].sort();

    metrics.push({
      page: pageName,
      route,
      view: viewName,
      status: response?.status() ?? null,
      ...vitals,
      externalHosts,
      scriptRequests: requests.filter(({ resourceType }) => resourceType === 'script').length,
      fetchOrXhrRequests: requests.filter(({ resourceType }) => ['fetch', 'xhr'].includes(resourceType)).length,
    });

    await page.screenshot({
      path: `visual-qa/${pageName}--${viewName}.jpg`,
      fullPage: true,
      type: 'jpeg',
      quality: 58,
    });
    await context.close();
  }
}

await browser.close();
await writeFile('visual-qa/metrics.json', JSON.stringify(metrics, null, 2) + '\n');
console.log(JSON.stringify(metrics, null, 2));
