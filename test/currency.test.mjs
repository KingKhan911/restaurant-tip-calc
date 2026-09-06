import test from 'node:test';
import assert from 'node:assert/strict';
import { calcTotals } from '../src/lib/tip.js';
import { moneyErrorMessage, parseMoneyInput } from '../src/lib/money.js';
import {
  CURRENCIES,
  CURRENCY_CODES,
  DEFAULT_CURRENCY,
  formatCurrency,
  getCurrencyConfig,
  isSupportedCurrency,
} from '../src/lib/currency.js';

const expectedCodes = ['USD', 'CAD', 'GBP', 'EUR', 'AUD', 'NZD', 'ZAR', 'INR', 'AED'];

test('supported currency configuration is explicit and defaults to USD', () => {
  assert.equal(DEFAULT_CURRENCY, 'USD');
  assert.deepEqual(CURRENCY_CODES, expectedCodes);
  assert.equal(Object.keys(CURRENCIES).length, expectedCodes.length);
  for (const code of expectedCodes) {
    assert.equal(isSupportedCurrency(code), true);
    assert.equal(getCurrencyConfig(code).code, code);
    assert.ok(getCurrencyConfig(code).name);
    assert.ok(getCurrencyConfig(code).inputSymbol);
  }
  assert.equal(isSupportedCurrency('JPY'), false);
  assert.equal(getCurrencyConfig('JPY').code, 'USD');
});

for (const code of expectedCodes) {
  test(`currency matrix keeps 100.00 at 20% mathematically identical for ${code}`, () => {
    const result = calcTotals({ billCents: 10000, tipPercentHundredths: 2000 });
    assert.equal(result.tipCents, 2000);
    assert.equal(result.totalCents, 12000);
    assert.ok(formatCurrency(result.tipCents, code).length > 0);
    assert.ok(formatCurrency(result.totalCents, code).length > 0);
  });
}

test('ambiguous dollar-family currencies use unambiguous input symbols', () => {
  assert.equal(CURRENCIES.USD.inputSymbol, '$');
  assert.equal(CURRENCIES.CAD.inputSymbol, 'CA$');
  assert.equal(CURRENCIES.AUD.inputSymbol, 'A$');
  assert.equal(CURRENCIES.NZD.inputSymbol, 'NZ$');
  assert.equal(CURRENCIES.GBP.inputSymbol, '£');
  assert.equal(CURRENCIES.EUR.inputSymbol, '€');
  assert.equal(CURRENCIES.INR.inputSymbol, '₹');
  assert.equal(CURRENCIES.ZAR.inputSymbol, 'R');
  assert.equal(CURRENCIES.AED.inputSymbol, 'AED');
});

test('certified money parser behavior remains intact and errors are currency-neutral', () => {
  for (const [input, cents] of [
    ['12.50', 1250],
    ['12,50', 1250],
    ['1,234.56', 123456],
    ['1.234,56', 123456],
    ['$1,234.56', 123456],
  ]) {
    const parsed = parseMoneyInput(input);
    assert.equal(parsed.ok, true, input);
    assert.equal(parsed.cents, cents, input);
  }
  assert.equal(parseMoneyInput('£12.50').ok, false);
  assert.equal(moneyErrorMessage('invalid_characters').includes('dollar'), false);
  assert.equal(moneyErrorMessage('too_large').includes('$'), false);
});
