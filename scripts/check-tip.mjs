// ponytail: the one runnable check for money math. Run: node scripts/check-tip.mjs
import { strict as assert } from 'node:assert';
import { calcTotals } from '../src/lib/tip.js';

let t = calcTotals({ billCents: 6000, pct: 20, people: 1 });
assert.equal(t.tipCents, 1200);
assert.equal(t.totalCents, 7200);
assert.equal(t.eachCents, 7200);

t = calcTotals({ billCents: 6000, pct: 20, people: 3 });
assert.equal(t.tipCents, 1200);
assert.equal(t.eachCents, 2400);

t = calcTotals({ billCents: 6050, pct: 20, people: 3, roundUp: true });
assert.equal(t.tipCents, 1210);
assert.equal(t.totalCents, 7260);
assert.equal(t.eachCents, 2500);
assert.equal(t.extraCents, 240);

t = calcTotals({ billCents: 3000, feeCents: 299, pct: 20, people: 1 });
assert.equal(t.tipCents, 600);
assert.equal(t.totalCents, 3899);

t = calcTotals({ billCents: 10000, pct: 18, people: 6 });
assert.equal(t.tipCents, 1800);
assert.equal(t.totalCents, 11800);

console.log('tip checks passed');
