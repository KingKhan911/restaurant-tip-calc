export const DEFAULT_CURRENCY = 'USD';

export const CURRENCY_CODES = ['USD', 'CAD', 'GBP', 'EUR', 'AUD', 'NZD', 'ZAR', 'INR', 'AED'];

export const CURRENCIES = Object.freeze({
  USD: Object.freeze({ code: 'USD', name: 'US Dollar', locale: 'en-US', inputSymbol: '$' }),
  CAD: Object.freeze({ code: 'CAD', name: 'Canadian Dollar', locale: 'en-CA', displayLocale: 'en-US', inputSymbol: 'CA$' }),
  GBP: Object.freeze({ code: 'GBP', name: 'British Pound', locale: 'en-GB', inputSymbol: '£' }),
  EUR: Object.freeze({ code: 'EUR', name: 'Euro', locale: 'en-IE', inputSymbol: '€' }),
  AUD: Object.freeze({ code: 'AUD', name: 'Australian Dollar', locale: 'en-AU', displayLocale: 'en-US', inputSymbol: 'A$' }),
  NZD: Object.freeze({ code: 'NZD', name: 'New Zealand Dollar', locale: 'en-NZ', displayLocale: 'en-US', inputSymbol: 'NZ$' }),
  ZAR: Object.freeze({ code: 'ZAR', name: 'South African Rand', locale: 'en-ZA', inputSymbol: 'R' }),
  INR: Object.freeze({ code: 'INR', name: 'Indian Rupee', locale: 'en-IN', inputSymbol: '₹' }),
  AED: Object.freeze({ code: 'AED', name: 'UAE Dirham', locale: 'en-AE', inputSymbol: 'AED' }),
});

export function isSupportedCurrency(code) {
  return typeof code === 'string' && Object.prototype.hasOwnProperty.call(CURRENCIES, code);
}

export function getCurrencyConfig(code) {
  return CURRENCIES[isSupportedCurrency(code) ? code : DEFAULT_CURRENCY];
}

export function createCurrencyFormatter(code, { wholeUnits = false, accessible = false } = {}) {
  const config = getCurrencyConfig(code);
  return new Intl.NumberFormat(config.displayLocale || config.locale, {
    style: 'currency',
    currency: config.code,
    currencyDisplay: accessible ? 'name' : 'symbol',
    minimumFractionDigits: wholeUnits ? 0 : 2,
    maximumFractionDigits: wholeUnits ? 0 : 2,
  });
}

export function formatCurrency(cents, code, options = {}) {
  if (!Number.isSafeInteger(cents) || cents < 0) {
    throw new RangeError('cents must be a non-negative safe integer');
  }
  return createCurrencyFormatter(code, options).format(cents / 100);
}
