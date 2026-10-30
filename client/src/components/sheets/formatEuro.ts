/** Whole-euro display. Amounts stay strings across the socket; this is presentation only. */
export function formatEuro(amount: string): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return `${amount} €`;
  return `${new Intl.NumberFormat('ru-RU').format(n)} €`;
}

export function formatCount(amount: string): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return amount;
  return new Intl.NumberFormat('ru-RU').format(n);
}
