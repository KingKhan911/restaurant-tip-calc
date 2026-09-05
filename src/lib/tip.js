// Pure tip math in integer cents. No DOM, no formatting.
export function calcTotals({ billCents, feeCents = 0, pct, people, roundUp = false }) {
  const base = Math.max(0, Math.round(billCents));
  const fee = Math.max(0, Math.round(feeCents));
  const n = Math.min(99, Math.max(1, Math.floor(people)));
  const p = Math.min(999, Math.max(0, Number(pct) || 0));
  const tipCents = Math.round((base * p) / 100);
  const totalCents = base + fee + tipCents;
  if (roundUp) {
    // ponytail: whole-dollar ceil on exact share; receipt keeps unrounded tip/total
    const eachDollars = Math.ceil(totalCents / n / 100 - 1e-9);
    return { tipCents, totalCents, eachCents: eachDollars * 100, rounded: true, extraCents: eachDollars * 100 * n - totalCents, people: n, pct: p };
  }
  return { tipCents, totalCents, eachCents: totalCents / n, rounded: false, extraCents: 0, people: n, pct: p };
}
