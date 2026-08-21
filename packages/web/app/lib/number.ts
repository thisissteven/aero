/**
 * Formats large numbers into compact strings with unit suffixes (e.g., 1.5k, 2M, 10B).
 */
export function formatCompactNumber(
  value: number,
  decimals: number = 1,
): string {
  if (value === 0 || isNaN(value)) return '0';

  const lookup = [
    { value: 1e12, symbol: 'T' },
    { value: 1e9, symbol: 'B' },
    { value: 1e6, symbol: 'M' },
    { value: 1e3, symbol: 'k' },
    { value: 1, symbol: '' },
  ];

  const item =
    lookup.find((i) => Math.abs(value) >= i.value) || lookup[lookup.length - 1];
  const formatted = (value / item.value).toFixed(decimals);

  // Strip unnecessary trailing zeroes after the decimal (e.g., 20.0k -> 20k)
  const cleanNumber = parseFloat(formatted).toString();

  return `${cleanNumber}${item.symbol}`;
}
