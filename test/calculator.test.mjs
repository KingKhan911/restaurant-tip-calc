import test from 'node:test';
import assert from 'node:assert/strict';
import { calcTotals, splitCentsExactly, parsePercentInput } from '../src/lib/tip.js';
import { parseMoneyInput, formatMoneyInput, MAX_MONEY_CENTS } from '../src/lib/money.js';

const total = (args) => calcTotals(args);

test('basic percentage tip', () => {
  const t = total({ billCents: 6000, tipPercentHundredths: 2000 });
  assert.equal(t.tipCents, 1200);
  assert.equal(t.totalCents, 7200);
});

test('decimal percentage is rounded deterministically', () => {
  const t = total({ billCents: 10000, tipPercentHundredths: 1750 });
  assert.equal(t.tipCents, 1750);
  assert.equal(t.totalCents, 11750);
});

test('zero percentage tip is valid', () => {
  const t = total({ billCents: 4000, tipPercentHundredths: 0 });
  assert.equal(t.tipCents, 0);
  assert.equal(t.totalCents, 4000);
});

test('custom dollar tip', () => {
  const t = total({ billCents: 4000, customTipCents: 700 });
  assert.equal(t.tipCents, 700);
  assert.equal(t.totalCents, 4700);
});

test('exact divisible split', () => {
  const s = splitCentsExactly(7200, 3);
  assert.equal(s.lowShareCents, 2400);
  assert.equal(s.highShareCount, 0);
  assert.equal(s.lowShareCount, 3);
  assert.equal(s.reconcilesExactly, true);
});

test('remainder-cent split $10 / 3', () => {
  const s = splitCentsExactly(1000, 3);
  assert.deepEqual(
    { high: [s.highShareCount, s.highShareCents], low: [s.lowShareCount, s.lowShareCents] },
    { high: [1, 334], low: [2, 333] },
  );
  assert.equal(s.highShareCount * s.highShareCents + s.lowShareCount * s.lowShareCents, 1000);
});

test('remainder-cent split $10 / 6', () => {
  const s = splitCentsExactly(1000, 6);
  assert.deepEqual(
    { high: [s.highShareCount, s.highShareCents], low: [s.lowShareCount, s.lowShareCents] },
    { high: [4, 167], low: [2, 166] },
  );
  assert.equal(s.highShareCount * s.highShareCents + s.lowShareCount * s.lowShareCents, 1000);
});

test('tax excluded from percentage tip basis by default', () => {
  const t = total({ billCents: 6000, taxCents: 480, tipPercentHundredths: 2000, includeTaxInTipBasis: false });
  assert.equal(t.tipBasisCents, 6000);
  assert.equal(t.tipCents, 1200);
  assert.equal(t.totalCents, 7680);
});

test('tax can be included in percentage tip basis', () => {
  const t = total({ billCents: 6000, taxCents: 480, tipPercentHundredths: 2000, includeTaxInTipBasis: true });
  assert.equal(t.tipBasisCents, 6480);
  assert.equal(t.tipCents, 1296);
  assert.equal(t.totalCents, 7776);
});

test('other fee is excluded from tip basis', () => {
  const t = total({ billCents: 10000, otherFeeCents: 500, tipPercentHundredths: 2000 });
  assert.equal(t.tipCents, 2000);
  assert.equal(t.totalCents, 12500);
});

test('delivery fee is excluded from tip basis', () => {
  const t = total({ billCents: 3200, deliveryFeeCents: 299, tipPercentHundredths: 2000 });
  assert.equal(t.tipCents, 640);
  assert.equal(t.totalCents, 4139);
});

test('delivery tax is payable but excluded from tip basis by default', () => {
  const t = total({ billCents: 3200, deliveryFeeCents: 299, taxCents: 256, tipPercentHundredths: 2000 });
  assert.equal(t.tipCents, 640);
  assert.equal(t.totalCents, 4395);
});

test('round-up keeps exact payable total and reports higher collected amount', () => {
  const t = total({ billCents: 6050, tipPercentHundredths: 2000, people: 3, roundUp: true });
  assert.equal(t.tipCents, 1210);
  assert.equal(t.totalCents, 7260);
  assert.equal(t.roundUp.roundedShareCents, 2500);
  assert.equal(t.roundUp.roundedCollectedCents, 7500);
  assert.equal(t.roundUp.extraCents, 240);
});

test('99-person non-even split always reconciles exactly', () => {
  const t = total({ billCents: 12345, tipPercentHundredths: 1837, people: 99 });
  const s = t.split;
  assert.notEqual(t.totalCents % 99, 0);
  assert.equal(s.reconcilesExactly, true);
  assert.equal(s.highShareCount * s.highShareCents + s.lowShareCount * s.lowShareCents, t.totalCents);
});

const moneyCases = [
  ['12.50', 1250],
  ['12,50', 1250],
  ['1,234.56', 123456],
  ['1.234,56', 123456],
  ['$1,234.56', 123456],
  ['  $1,234.56  ', 123456],
  ['1,234', 123400],
  ['0', 0],
  ['0.50', 50],
  ['0,50', 50],
];
for (const [input, cents] of moneyCases) {
  test(`money parser: ${input}`, () => {
    const p = parseMoneyInput(input);
    assert.equal(p.ok, true);
    assert.equal(p.cents, cents);
  });
}

test('money parser preserves safe transient trailing separators', () => {
  assert.deepEqual(parseMoneyInput('12,', { allowIncomplete: true }), {
    ok: true,
    cents: 1200,
    incomplete: true,
    normalized: '12.00',
  });
  assert.equal(parseMoneyInput('12.', { allowIncomplete: true }).cents, 1200);
});

for (const input of ['-$25', '-25', '1,2,3', '1.2.3', 'abc', '1e3', '$12x', '12,3456', '1,23.45']) {
  test(`money parser rejects malformed value: ${input}`, () => {
    assert.equal(parseMoneyInput(input).ok, false);
  });
}

test('money parser rejects excessive size', () => {
  assert.equal(parseMoneyInput('1,000,000,000.00').ok, false);
  assert.equal(formatMoneyInput(MAX_MONEY_CENTS), '999,999,999.99');
});

test('percentage parser supports decimal percent and deliberate zero', () => {
  assert.deepEqual(parsePercentInput('17.5'), { ok: true, hundredths: 1750, incomplete: false, normalized: '17.5' });
  assert.equal(parsePercentInput('0').hundredths, 0);
  assert.equal(parsePercentInput('12,5').hundredths, 1250);
  assert.equal(parsePercentInput('12.', { allowIncomplete: true }).hundredths, 1200);
});
