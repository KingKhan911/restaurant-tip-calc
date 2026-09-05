// Lightweight direct smoke check. Full coverage: npm test
import { strict as assert } from 'node:assert';
import { calcTotals } from '../src/lib/tip.js';

const result = calcTotals({
  billCents: 6050,
  tipPercentHundredths: 2000,
  people: 3,
  roundUp: true,
});

assert.equal(result.tipCents, 1210);
assert.equal(result.totalCents, 7260);
assert.equal(result.roundUp.roundedShareCents, 2500);
assert.equal(result.roundUp.roundedCollectedCents, 7500);
assert.equal(result.roundUp.extraCents, 240);
assert.equal(result.split.reconcilesExactly, true);

console.log('tip smoke check passed');
