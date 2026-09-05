export const MAX_MONEY_CENTS = 99_999_999_999;

function invalid(reason) {
  return { ok: false, reason };
}

function valid(cents, { incomplete = false } = {}) {
  return { ok: true, cents, incomplete, normalized: formatMoneyInput(cents) };
}

function validateGroupedInteger(value, separator) {
  if (!value.includes(separator)) return /^\d+$/.test(value);
  const groups = value.split(separator);
  if (!/^\d{1,3}$/.test(groups[0])) return false;
  return groups.slice(1).every((group) => /^\d{3}$/.test(group));
}

function centsFromParts(integerDigits, fractionDigits) {
  const integer = integerDigits === '' ? 0n : BigInt(integerDigits);
  const fraction = fractionDigits === '' ? 0n : BigInt(fractionDigits.padEnd(2, '0'));
  const cents = integer * 100n + fraction;
  if (cents > BigInt(MAX_MONEY_CENTS)) return invalid('too_large');
  return valid(Number(cents));
}

export function parseMoneyInput(input, { allowIncomplete = false } = {}) {
  if (typeof input !== 'string') return invalid('invalid_type');
  let value = input.trim();
  if (value === '') return invalid('empty');
  if (/[+-]/.test(value)) return invalid('negative_or_signed');
  if (/[eE]/.test(value)) return invalid('scientific_notation');

  if (value.startsWith('$')) value = value.slice(1).trim();
  if (value.includes('$')) return invalid('currency_symbol_position');
  if (value === '') return invalid('empty');
  if (/\s/.test(value)) return invalid('internal_whitespace');
  if (!/^[\d.,]+$/.test(value)) return invalid('invalid_characters');
  if (/^[.,]{2,}|[.,]{2,}|[.,]$/.test(value)) {
    if (allowIncomplete && /^[\d.,]+[.,]$/.test(value) && !/[.,]{2,}/.test(value)) {
      const base = value.slice(0, -1);
      const parsedBase = parseMoneyInput(base, { allowIncomplete: false });
      return parsedBase.ok ? { ...parsedBase, incomplete: true } : parsedBase;
    }
    return invalid('malformed_separators');
  }

  const commaCount = (value.match(/,/g) || []).length;
  const dotCount = (value.match(/\./g) || []).length;

  if (commaCount > 0 && dotCount > 0) {
    const decimalSeparator = value.lastIndexOf(',') > value.lastIndexOf('.') ? ',' : '.';
    const groupingSeparator = decimalSeparator === ',' ? '.' : ',';
    if ((value.match(new RegExp(`\\${decimalSeparator}`, 'g')) || []).length !== 1) {
      return invalid('multiple_decimal_separators');
    }
    const [integerPart, fractionPart = ''] = value.split(decimalSeparator);
    if (!/^\d{1,2}$/.test(fractionPart)) return invalid('invalid_fraction');
    if (!validateGroupedInteger(integerPart, groupingSeparator)) return invalid('invalid_grouping');
    const integerDigits = integerPart.split(groupingSeparator).join('');
    return centsFromParts(integerDigits, fractionPart);
  }

  if (commaCount > 0) {
    if (commaCount > 1) {
      if (!validateGroupedInteger(value, ',')) return invalid('invalid_grouping');
      return centsFromParts(value.replace(/,/g, ''), '');
    }
    const [left, right = ''] = value.split(',');
    if (!/^\d*$/.test(left) || !/^\d+$/.test(right)) return invalid('malformed_separators');
    if (right.length <= 2) return centsFromParts(left, right);
    if (right.length === 3 && /^\d{1,3}$/.test(left)) return centsFromParts(left + right, '');
    return invalid('ambiguous_comma');
  }

  if (dotCount > 0) {
    if (dotCount !== 1) return invalid('multiple_decimal_separators');
    const [left, right = ''] = value.split('.');
    if (!/^\d*$/.test(left) || !/^\d{1,2}$/.test(right)) return invalid('invalid_fraction');
    return centsFromParts(left, right);
  }

  if (!/^\d+$/.test(value)) return invalid('invalid_characters');
  return centsFromParts(value, '');
}

export function formatMoneyInput(cents) {
  if (!Number.isSafeInteger(cents) || cents < 0 || cents > MAX_MONEY_CENTS) {
    throw new RangeError('cents must be a supported non-negative integer');
  }
  const dollars = Math.floor(cents / 100);
  const fraction = String(cents % 100).padStart(2, '0');
  return `${dollars.toLocaleString('en-US')}.${fraction}`;
}

export function moneyErrorMessage(reason) {
  switch (reason) {
    case 'too_large':
      return 'Enter an amount below $1 billion.';
    case 'empty':
      return '';
    default:
      return 'Enter a valid non-negative dollar amount.';
  }
}
