const SYMBOL_OVERRIDES: Record<string, string> = {
  SRD: 'SRD',
  CAD: 'CA$',
  AUD: 'A$',
  NZD: 'NZ$',
  SGD: 'S$',
  HKD: 'HK$',
  JMD: 'J$',
  TTD: 'TT$',
  GYD: 'GY$',
  BBD: 'Bds$',
  BZD: 'BZ$',
};

export function resolveCurrencySymbol(currencyCode?: string, currencySymbol?: string): string {
  const code = (currencyCode || '').trim().toUpperCase();
  const symbol = (currencySymbol || '').trim();

  if (code && SYMBOL_OVERRIDES[code]) {
    return SYMBOL_OVERRIDES[code];
  }

  if (symbol) {
    if (symbol === '$' && code && code !== 'USD') {
      return `${code}$`;
    }
    return symbol;
  }

  return code;
}

export function formatCurrencyAmount(
  amount: number,
  options?: {
    currencyCode?: string;
    currencySymbol?: string;
    locale?: string;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    preferCurrencyCode?: boolean;
  },
): string {
  const {
    currencyCode,
    currencySymbol,
    locale,
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
    preferCurrencyCode = true,
  } = options || {};

  const formatted = amount.toLocaleString(locale, {
    minimumFractionDigits,
    maximumFractionDigits,
  });

  const code = (currencyCode || '').trim().toUpperCase();
  if (preferCurrencyCode && code && code !== 'UNKNOWN') {
    return `${code} ${formatted}`;
  }

  const displaySymbol = resolveCurrencySymbol(currencyCode, currencySymbol);
  return displaySymbol ? `${displaySymbol} ${formatted}` : formatted;
}
