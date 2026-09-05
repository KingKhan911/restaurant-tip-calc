import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';

async function read(path) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8');
}

test('Phase-3 trust routes and generated sitemap source exist', async () => {
  for (const path of ['src/pages/about.astro', 'src/pages/privacy.astro', 'src/pages/404.astro', 'src/pages/sitemap.xml.ts']) {
    await access(new URL(`../${path}`, import.meta.url), constants.R_OK);
  }
});

test('shared layout contains one complete social metadata set and brand assets', async () => {
  const layout = await read('src/layouts/Layout.astro');
  for (const token of [
    'property="og:image"',
    'property="og:image:width"',
    'property="og:image:height"',
    'property="og:image:alt"',
    'name="twitter:card" content="summary_large_image"',
    'name="twitter:image"',
    'name="twitter:image:alt"',
    'href="/favicon.svg"',
    'href="/favicon.ico"',
    'href="/apple-touch-icon.png"',
  ]) {
    assert.ok(layout.includes(token), `Missing metadata token: ${token}`);
  }
  assert.equal((layout.match(/rel="canonical"/g) || []).length, 1);
  assert.equal((layout.match(/property="og:title"/g) || []).length, 1);
});

test('ads are disabled by default and no live ad or analytics vendor is installed', async () => {
  const site = await read('src/lib/site.js');
  assert.ok(site.includes("PUBLIC_ADS_ENABLED === 'true'"));
  const combined = (await Promise.all([
    read('src/layouts/Layout.astro'),
    read('src/components/AdSlot.astro'),
    read('src/pages/index.astro'),
    read('src/pages/food-delivery-tip-calculator.astro'),
  ])).join('\n');
  for (const vendor of ['googlesyndication', 'doubleclick.net', 'adsterra', 'monetag', 'media.net', 'googletagmanager', 'google-analytics.com', 'clarity.ms', 'connect.facebook.net']) {
    assert.equal(combined.toLowerCase().includes(vendor), false, `Unexpected live vendor reference: ${vendor}`);
  }
});

test('privacy copy matches browser storage and external font behavior', async () => {
  const privacy = await read('src/pages/privacy.astro');
  const calculator = await read('src/components/Calculator.astro');
  for (const key of ['rtc:tip', 'rtc:round', 'rtc:includeTax']) assert.ok(calculator.includes(key));
  assert.ok(privacy.includes('localStorage'));
  assert.ok(privacy.includes('Google Fonts'));
  assert.ok(privacy.includes('No live advertising vendor, analytics platform'));
});

test('package and README are project-specific', async () => {
  const pkg = JSON.parse(await read('package.json'));
  const readme = await read('README.md');
  assert.equal(pkg.name, 'restaurant-tip-calculator');
  assert.equal(readme.includes('Astro Starter Kit'), false);
  assert.ok(readme.includes('PUBLIC_ADS_ENABLED=true'));
});

test('tracking parameters and javascript URLs are absent from site source', async () => {
  const paths = [
    'src/layouts/Layout.astro',
    'src/pages/index.astro',
    'src/pages/average-restaurant-tip.astro',
    'src/pages/how-much-tip-waitress-waiter.astro',
    'src/pages/buffet-tipping-guide.astro',
    'src/pages/food-delivery-tip-calculator.astro',
    'src/pages/service-charge-on-restaurant-bill.astro',
    'src/pages/methodology.astro',
    'src/pages/about.astro',
    'src/pages/privacy.astro',
  ];
  const combined = (await Promise.all(paths.map(read))).join('\n').toLowerCase();
  assert.equal(combined.includes('utm_source=chatgpt'), false);
  assert.equal(combined.includes('javascript:'), false);
});
