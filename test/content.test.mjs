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
  'src/pages/about.astro',
  'src/pages/privacy.astro',
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

test('delivery page surfaces its sourced etiquette quick answer before the calculator', async () => {
  const source = await read('src/pages/food-delivery-tip-calculator.astro');
  const quickAnswerIndex = source.indexOf('<strong>Quick answer:</strong>');
  const calculatorIndex = source.indexOf('<Calculator mode="delivery" />');

  assert.ok(quickAnswerIndex >= 0, 'Delivery page is missing the quick answer');
  assert.ok(calculatorIndex >= 0, 'Delivery page is missing the delivery calculator');
  assert.ok(quickAnswerIndex < calculatorIndex, 'Delivery quick answer must appear before the calculator');

  const earlyAnswer = source.slice(quickAnswerIndex, calculatorIndex);
  for (const required of [
    '10–15%',
    'SOURCES.emilyPost',
    'etiquette guidance',
    'not a measured national average or universal rule',
    'custom dollar',
  ]) {
    assert.ok(earlyAnswer.includes(required), `Delivery quick answer is missing: ${required}`);
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
  assert.ok(source.includes("RESEARCH_REVIEW_DATE = 'September 6, 2026'"));
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

test('titles and H1s are unique across the nine indexable public routes', async () => {
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

test('site configuration contains exactly the intentional nine-route indexable architecture', async () => {
  const source = await read('src/lib/site.js');
  const routes = [...source.matchAll(/\n  '([^']+)',/g)].map((match) => match[1]);
  assert.deepEqual(routes, [
    '/',
    '/average-restaurant-tip/',
    '/how-much-tip-waitress-waiter/',
    '/buffet-tipping-guide/',
    '/food-delivery-tip-calculator/',
    '/service-charge-on-restaurant-bill/',
    '/methodology/',
    '/about/',
    '/privacy/',
  ]);
  assert.equal(routes.includes('/404/'), false);
});

test('robots policy remains simple and does not block OAI-SearchBot', async () => {
  const robots = await read('public/robots.txt');
  assert.match(robots, /User-agent:\s*\*/);
  assert.match(robots, /Allow:\s*\//);
  assert.equal(/User-agent:\s*OAI-SearchBot[\s\S]*?Disallow:\s*\//i.test(robots), false);
});


test('homepage is the single universal English calculator with sourced country context', async () => {
  const source = await read('src/pages/index.astro');
  for (const required of [
    '<Calculator mode="dinein" currencySelector />',
    'Currency changes display only; no exchange-rate conversion',
    'Tipping customs vary by country',
    'United States',
    'Canada',
    'United Kingdom',
    'Australia',
    'New Zealand',
    'South Africa',
    'SOURCES.canadaGratuities',
    'SOURCES.visitBritain',
    'SOURCES.tourismAustralia',
    'SOURCES.tourismNewZealand',
    'SOURCES.southAfricanTourism',
  ]) {
    assert.ok(source.includes(required), `Universal homepage is missing: ${required}`);
  }
  assert.equal(source.includes('custom dollar amount, add tax and fees'), false);
});

test('country clones, translated public routes, and premature hreflang are absent', async () => {
  const site = await read('src/lib/site.js');
  const layout = await read('src/layouts/Layout.astro');
  for (const route of ['/ca/', '/uk/', '/au/', '/nz/', '/za/', '/de/', '/fr/', '/it/', '/es/', '/pt/']) {
    assert.equal(site.includes(`'${route}'`), false, `Unexpected public route: ${route}`);
  }
  assert.equal(/hreflang/i.test(layout), false, 'hreflang must wait for real alternate-language pages');
});

test('homepage static dollar examples are explicitly scoped as USD examples', async () => {
  const source = await read('src/pages/index.astro');
  assert.ok(source.includes('USD example: a $60 bill'));
  assert.ok(source.includes('USD example: on a $60 bill'));
  assert.ok(source.includes('In this USD example, a 15% tip is $7.50'));
  assert.ok(source.includes('In this USD example, if $10.00 is split three ways'));
});
