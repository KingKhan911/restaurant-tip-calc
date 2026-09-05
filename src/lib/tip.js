function nonNegativeCents(value, name) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${name} must be a non-negative integer number of cents`);
  }
  return value;
}

function normalizePeople(value) {
  const n = Number.isFinite(Number(value)) ? Math.trunc(Number(value)) : 1;
  return Math.min(99, Math.max(1, n));
}

function percentHundredths(value) {
  if (!Number.isSafeInteger(value) || value < 0 || value > 99_900) {
    throw new RangeError('tipPercentHundredths must be an integer from 0 to 99900');
  }
  return value;
}

function roundedRatio(numerator, denominator) {
  const n = BigInt(numerator);
  const d = BigInt(denominator);
  return Number((n + d / 2n) / d);
}

export function parsePercentInput(input, { allowIncomplete = false } = {}) {
  if (typeof input !== 'string') return { ok: false, reason: 'invalid_type' };
  const raw = input.trim();
  if (raw === '') return { ok: false, reason: 'empty' };
  if (/[+\-eE]/.test(raw) || /[^\d.,]/.test(raw)) return { ok: false, reason: 'invalid' };
  if ((raw.match(/[.,]/g) || []).length > 1) return { ok: false, reason: 'invalid' };
  if (/[.,]$/.test(raw)) {
    if (!allowIncomplete) return { ok: false, reason: 'invalid' };
    const base = raw.slice(0, -1);
    if (!/^\d+$/.test(base)) return { ok: false, reason: 'invalid' };
    const whole = Number(base);
    if (whole > 999) return { ok: false, reason: 'too_large' };
    return { ok: true, hundredths: whole * 100, incomplete: true, normalized: `${whole}` };
  }
  const normalized = raw.replace(',', '.');
  const match = /^(\d{1,3})(?:\.(\d{1,2}))?$/.exec(normalized);
  if (!match) return { ok: false, reason: 'invalid' };
  const whole = Number(match[1]);
  const fraction = Number((match[2] || '').padEnd(2, '0') || 0);
  const hundredths = whole * 100 + fraction;
  if (hundredths > 99_900) return { ok: false, reason: 'too_large' };
  return {
    ok: true,
    hundredths,
    incomplete: false,
    normalized: `${whole}${fraction ? `.${String(fraction).padStart(2, '0').replace(/0$/, '')}` : ''}`,
  };
}

export function splitCentsExactly(totalCents, people) {
  const total = nonNegativeCents(totalCents, 'totalCents');
  const n = normalizePeople(people);
  const lowShareCents = Math.floor(total / n);
  const remainder = total % n;
  const highShareCents = remainder > 0 ? lowShareCents + 1 : lowShareCents;
  const highShareCount = remainder;
  const lowShareCount = n - remainder;
  return {
    lowShareCents,
    lowShareCount,
    highShareCents,
    highShareCount,
    remainderCents: remainder,
    reconcilesExactly:
      lowShareCents * lowShareCount + highShareCents * highShareCount === total,
  };
}

export function calcTotals({
  billCents,
  taxCents = 0,
  otherFeeCents = 0,
  deliveryFeeCents = 0,
  tipPercentHundredths = 2_000,
  customTipCents = null,
  includeTaxInTipBasis = false,
  people = 1,
  roundUp = false,
}) {
  const bill = nonNegativeCents(billCents, 'billCents');
  const tax = nonNegativeCents(taxCents, 'taxCents');
  const otherFee = nonNegativeCents(otherFeeCents, 'otherFeeCents');
  const deliveryFee = nonNegativeCents(deliveryFeeCents, 'deliveryFeeCents');
  const n = normalizePeople(people);

  let tipCents;
  const tipBasisCents = bill + (includeTaxInTipBasis ? tax : 0);
  let tipMethod;
  let pctHundredths = null;

  if (customTipCents !== null && customTipCents !== undefined) {
    tipCents = nonNegativeCents(customTipCents, 'customTipCents');
    tipMethod = 'amount';
  } else {
    pctHundredths = percentHundredths(tipPercentHundredths);
    tipCents = roundedRatio(BigInt(tipBasisCents) * BigInt(pctHundredths), 10_000n);
    tipMethod = 'percentage';
  }

  const totalCents = bill + tax + otherFee + deliveryFee + tipCents;
  if (!Number.isSafeInteger(totalCents)) throw new RangeError('calculated total exceeds supported range');

  const split = splitCentsExactly(totalCents, n);
  const roundedShareCents = Math.floor((totalCents + n * 100 - 1) / (n * 100)) * 100;
  const roundedCollectedCents = roundedShareCents * n;
  const extraCents = roundedCollectedCents - totalCents;

  return {
    billCents: bill,
    taxCents: tax,
    otherFeeCents: otherFee,
    deliveryFeeCents: deliveryFee,
    tipBasisCents,
    tipCents,
    tipMethod,
    tipPercentHundredths: pctHundredths,
    totalCents,
    people: n,
    split,
    roundUp: {
      enabled: Boolean(roundUp),
      roundedShareCents,
      roundedCollectedCents,
      extraCents,
    },
  };
}
