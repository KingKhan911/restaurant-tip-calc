import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const pagePaths = [
  'src/pages/index.astro',
  'src/pages/average-restaurant-tip.astro',
  'src/pages/how-much-tip-waitress-waiter.astro',
  'src/pages/buffet-tipping-guide.astro',
  'src/pages/food-delivery-tip-calculator.astro',
  'src/pages/service-charge-on-restaurant-bill.astro',
  'src/pages/methodology.astro',
];

async function read(path) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8');
}

test('all public pages avoid deprecated FAQPage and HowTo structured data', async () => {
  for (const path of pagePaths) {
    const source = await read(path);
    assert.equal(source.includes('FAQPage'), false, `${path} still contains FAQPage schema`);
    assert.equal(/['"]@type['"]\s*:\s*['"]HowTo['"]/.test(source), false, `${path} still contains HowTo schema`);
  }
});

test('known misleading or SEO-insertion phrases are absent', async () => {
  const combined = (await Promise.all([
    ...pagePaths.map(read),
    read('src/components/Related.astro'),
  ])).join('\n');

  const forbidden = [
    'Whether you searched',
    'most Americans tip around 20%',
    'tips are most of their pay',
    'bulk of your waiter',
    'service charge is almost always',
    'most regulars landing around 10–12%',
    'cash guarantees',
    'delivery fee is a separate charge that rarely reaches the driver',
    'Service fees, small-order fees, and priority fees go to the platform',
  ];

  for (const phrase of forbidden) {
    assert.equal(combined.toLowerCase().includes(phrase.toLowerCase()), false, `Forbidden legacy wording remains: ${phrase}`);
  }
});

test('average-tip evidence keeps observed, stated, and recommended evidence distinct', async () => {
  const source = await read('src/pages/average-restaurant-tip.astro');
  for (const required of [
    '19.3% full-service',
    '15.8% quick-service',
    '18.8% overall',
    '13.7% takeout',
    '57% said 15% or less',
    '12% said 18%',
    '25% said 20% or more',
    'Cash tips are not included',
    'Observed transactions',
    'Stated behavior',
    'Etiquette recommendation',
  ]) {
    assert.ok(source.includes(required), `Average page is missing: ${required}`);
  }
});

test('service-charge page does not infer gratuity status from fee percentage', async () => {
  const source = await read('src/pages/service-charge-on-restaurant-bill.astro');
  assert.ok(source.includes('The percentage is not a reliable shortcut.'));
  assert.ok(source.includes('The percentage alone does not identify it as a gratuity.'));
  assert.ok(source.includes('federal tax purposes'));
  assert.ok(source.includes('do not'));
  assert.equal(/under\s*~?10%/i.test(source), false);
});

test('tipped-wage copy includes the federal floor, make-up obligation, and state variation', async () => {
  const waiter = await read('src/pages/how-much-tip-waitress-waiter.astro');
  const average = await read('src/pages/average-restaurant-tip.astro');
  const combined = waiter + average;
  assert.ok(combined.includes('$2.13 per hour'));
  assert.ok(combined.includes('must make up the difference'));
  assert.ok(combined.includes('State law can require a higher'));
});

test('research review date is a maintained literal, not a dynamic today value', async () => {
  const source = await read('src/lib/editorial.js');
  assert.ok(source.includes("RESEARCH_REVIEW_DATE = 'September 5, 2026'"));
  assert.equal(source.includes('new Date('), false);
});

test('methodology route documents calculator semantics and research policy', async () => {
  const source = await read('src/pages/methodology.astro');
  for (const required of [
    'deterministic',
    'half-up rounding',
    'Exact cent-reconciled split',
    'Whole-dollar round-up',
    'Observed behavior',
    'Stated behavior',
    'Etiquette guidance',
    'Source hierarchy',
  ]) {
    assert.ok(source.includes(required), `Methodology page is missing: ${required}`);
  }
});

test('titles and H1s are unique across the seven public routes', async () => {
  const titles = [];
  const h1s = [];
  for (const path of pagePaths) {
    const source = await read(path);
    const title = source.match(/const title = '([^']+)'/);
    const h1 = source.match(/<h1>([^<]+)<\/h1>/);
    assert.ok(title, `${path} is missing a simple title declaration`);
    assert.ok(h1, `${path} is missing one plain-text H1`);
    assert.equal((source.match(/<h1/g) || []).length, 1, `${path} must have exactly one H1`);
    titles.push(title[1]);
    h1s.push(h1[1]);
  }
  assert.equal(new Set(titles).size, pagePaths.length, 'Page titles must be distinct');
  assert.equal(new Set(h1s).size, pagePaths.length, 'H1s must be distinct');
});

test('sitemap contains exactly the intentional seven-route architecture', async () => {
  const sitemap = await read('public/sitemap.xml');
  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  assert.deepEqual(locs, [
    'https://restauranttipcalculator.com/',
    'https://restauranttipcalculator.com/average-restaurant-tip/',
    'https://restauranttipcalculator.com/how-much-tip-waitress-waiter/',
    'https://restauranttipcalculator.com/buffet-tipping-guide/',
    'https://restauranttipcalculator.com/food-delivery-tip-calculator/',
    'https://restauranttipcalculator.com/service-charge-on-restaurant-bill/',
    'https://restauranttipcalculator.com/methodology/',
  ]);
  assert.equal(sitemap.includes('<priority>'), false);
  assert.equal(sitemap.includes('<changefreq>'), false);
});

test('robots policy remains simple and does not block OAI-SearchBot', async () => {
  const robots = await read('public/robots.txt');
  assert.match(robots, /User-agent:\s*\*/);
  assert.match(robots, /Allow:\s*\//);
  assert.equal(/User-agent:\s*OAI-SearchBot[\s\S]*?Disallow:\s*\//i.test(robots), false);
});
