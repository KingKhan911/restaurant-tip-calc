import assert from 'node:assert/strict';
import { access, readdir, readFile, stat } from 'node:fs/promises';

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

const dist = new URL('../dist/', import.meta.url);

async function exists(path) {
  try {
    await access(new URL(path, dist));
    return true;
  } catch {
    return false;
  }
}

for (const route of routes) {
  const built = route === '/' ? 'index.html' : `${route.slice(1)}index.html`;
  assert.equal(await exists(built), true, `Missing built route: ${route}`);
}

assert.equal(await exists('404.html'), true, 'Missing custom 404');
assert.equal(await exists('design_inspo.html'), false, 'Development design reference leaked into dist');
assert.equal(await exists('.env'), false, 'Environment file leaked into dist');

const sitemap = await readFile(new URL('sitemap.xml', dist), 'utf8');
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
assert.deepEqual(locs, routes.map((route) => new URL(route, canonicalBase).href));
assert.equal(new Set(locs).size, locs.length, 'Duplicate sitemap URL found');
assert.equal(sitemap.includes('/404/'), false);
assert.equal(sitemap.includes('<priority>'), false);
assert.equal(sitemap.includes('<changefreq>'), false);

const robots = await readFile(new URL('robots.txt', dist), 'utf8');
assert.match(robots, /Sitemap:\s*https:\/\/restauranttipcalculator\.com\/sitemap\.xml/);

const og = await stat(new URL('social/restaurant-tip-calculator-og.png', dist));
assert.ok(og.size < 200_000, `Social image too large: ${og.size} bytes`);

async function collectSizes(dirUrl, suffix) {
  const entries = await readdir(dirUrl, { withFileTypes: true });
  const sizes = [];
  for (const entry of entries) {
    const child = new URL(entry.name + (entry.isDirectory() ? '/' : ''), dirUrl);
    if (entry.isDirectory()) sizes.push(...await collectSizes(child, suffix));
    else if (entry.name.endsWith(suffix)) sizes.push((await stat(child)).size);
  }
  return sizes;
}

const jsSizes = await collectSizes(dist, '.js');
const cssSizes = await collectSizes(dist, '.css');
const jsBytes = jsSizes.reduce((sum, size) => sum + size, 0);
const cssBytes = cssSizes.reduce((sum, size) => sum + size, 0);
assert.ok(jsBytes < 150_000, `JavaScript budget exceeded: ${jsBytes} bytes`);
assert.ok(cssBytes < 150_000, `CSS budget exceeded: ${cssBytes} bytes`);

console.log(JSON.stringify({
  indexableRoutes: routes.length,
  ogImageBytes: og.size,
  jsFiles: jsSizes.length,
  jsBytes,
  cssFiles: cssSizes.length,
  cssBytes,
}, null, 2));
