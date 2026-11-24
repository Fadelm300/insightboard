/** Payment completion, clamped to 0..100 and rounded once to one decimal. */
export function paymentProgressPercent
(revenue: number, price: number | null | undefined): number | null
{
  if (price === null) return null;
  if (price === undefined || !Number.isFinite(price) || price <= 0 || !Number.isFinite(revenue)
  ) return 0;
  return Math.round(Math.min(Math.max(
    (revenue / price) * 100, 0), 100) * 10) / 10;
}

export function projectPaymentBalance(revenue: number, price: number | null | undefined) {
  if (price == null) {
    return { remainingBalance: null, overpayment: null };
  }

  const difference = Number((price - revenue).toFixed(2));

  return {
    remainingBalance: Math.max(difference, 0),
    overpayment: Math.max(-difference, 0),
  };
}
