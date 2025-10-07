/**
 * Multi-Currency Support Utilities
 * Comprehensive currency handling with formatting and conversion
 */

// Supported currencies with metadata
export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
  decimals: number;
  locale: string;
  region: string;
}

export const SUPPORTED_CURRENCIES: Record<string, CurrencyInfo> = {
  // Major currencies
  usd: {
    code: "USD",
    name: "US Dollar",
    symbol: "$",
    decimals: 2,
    locale: "en-US",
    region: "North America",
  },
  eur: {
    code: "EUR",
    name: "Euro",
    symbol: "€",
    decimals: 2,
    locale: "en-EU",
    region: "Europe",
  },
  gbp: {
    code: "GBP",
    name: "British Pound",
    symbol: "£",
    decimals: 2,
    locale: "en-GB",
    region: "Europe",
  },
  jpy: {
    code: "JPY",
    name: "Japanese Yen",
    symbol: "¥",
    decimals: 0,
    locale: "ja-JP",
    region: "Asia",
  },
  cad: {
    code: "CAD",
    name: "Canadian Dollar",
    symbol: "C$",
    decimals: 2,
    locale: "en-CA",
    region: "North America",
  },
  aud: {
    code: "AUD",
    name: "Australian Dollar",
    symbol: "A$",
    decimals: 2,
    locale: "en-AU",
    region: "Oceania",
  },
  chf: {
    code: "CHF",
    name: "Swiss Franc",
    symbol: "CHF",
    decimals: 2,
    locale: "de-CH",
    region: "Europe",
  },

  // Nordic currencies
  sek: {
    code: "SEK",
    name: "Swedish Krona",
    symbol: "kr",
    decimals: 2,
    locale: "sv-SE",
    region: "Europe",
  },
  nok: {
    code: "NOK",
    name: "Norwegian Krone",
    symbol: "kr",
    decimals: 2,
    locale: "nb-NO",
    region: "Europe",
  },
  dkk: {
    code: "DKK",
    name: "Danish Krone",
    symbol: "kr",
    decimals: 2,
    locale: "da-DK",
    region: "Europe",
  },

  // Eastern European currencies
  pln: {
    code: "PLN",
    name: "Polish Złoty",
    symbol: "zł",
    decimals: 2,
    locale: "pl-PL",
    region: "Europe",
  },
  czk: {
    code: "CZK",
    name: "Czech Koruna",
    symbol: "Kč",
    decimals: 2,
    locale: "cs-CZ",
    region: "Europe",
  },
  huf: {
    code: "HUF",
    name: "Hungarian Forint",
    symbol: "Ft",
    decimals: 0,
    locale: "hu-HU",
    region: "Europe",
  },

  // Asian currencies
  cny: {
    code: "CNY",
    name: "Chinese Yuan",
    symbol: "¥",
    decimals: 2,
    locale: "zh-CN",
    region: "Asia",
  },
  inr: {
    code: "INR",
    name: "Indian Rupee",
    symbol: "₹",
    decimals: 2,
    locale: "en-IN",
    region: "Asia",
  },
  krw: {
    code: "KRW",
    name: "South Korean Won",
    symbol: "₩",
    decimals: 0,
    locale: "ko-KR",
    region: "Asia",
  },
  sgd: {
    code: "SGD",
    name: "Singapore Dollar",
    symbol: "S$",
    decimals: 2,
    locale: "en-SG",
    region: "Asia",
  },
  hkd: {
    code: "HKD",
    name: "Hong Kong Dollar",
    symbol: "HK$",
    decimals: 2,
    locale: "en-HK",
    region: "Asia",
  },

  // Latin American currencies
  brl: {
    code: "BRL",
    name: "Brazilian Real",
    symbol: "R$",
    decimals: 2,
    locale: "pt-BR",
    region: "South America",
  },
  mxn: {
    code: "MXN",
    name: "Mexican Peso",
    symbol: "$",
    decimals: 2,
    locale: "es-MX",
    region: "North America",
  },
};

// Currency conversion rates cache
interface ExchangeRates {
  base: string;
  rates: Record<string, number>;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

let exchangeRatesCache: ExchangeRates | null = null;

// Format amount with currency
export function formatCurrency(
  amount: number,
  currencyCode: string,
  options: {
    locale?: string;
    showSymbol?: boolean;
    showCode?: boolean;
    precision?: number;
  } = {},
): string {
  const currency = SUPPORTED_CURRENCIES[currencyCode.toLowerCase()];
  if (!currency) {
    throw new Error(`Unsupported currency: ${currencyCode}`);
  }

  const {
    locale = currency.locale,
    showSymbol = true,
    showCode = false,
    precision = currency.decimals,
  } = options;

  // Convert from smallest unit (cents) to major unit for display
  const displayAmount = precision === 0 ? amount : amount / 100;

  try {
    const formatter = new Intl.NumberFormat(locale, {
      style: showSymbol ? "currency" : "decimal",
      currency: currency.code,
      minimumFractionDigits: precision,
      maximumFractionDigits: precision,
    });

    let formatted = formatter.format(displayAmount);

    if (showCode && !showSymbol) {
      formatted += ` ${currency.code}`;
    }

    return formatted;
  } catch (error) {
    // Fallback formatting
    const formattedAmount = displayAmount.toFixed(precision);
    if (showSymbol) {
      return `${currency.symbol}${formattedAmount}`;
    }
    return showCode ? `${formattedAmount} ${currency.code}` : formattedAmount;
  }
}

// Parse currency string to amount in smallest unit
export function parseCurrency(
  currencyString: string,
  currencyCode: string,
): number {
  const currency = SUPPORTED_CURRENCIES[currencyCode.toLowerCase()];
  if (!currency) {
    throw new Error(`Unsupported currency: ${currencyCode}`);
  }

  // Remove currency symbols and non-numeric characters except decimal point
  const cleanString = currencyString
    .replace(new RegExp(`[${currency.symbol}${currency.code}\\s,]`, "gi"), "")
    .trim();

  const amount = parseFloat(cleanString);
  if (isNaN(amount)) {
    throw new Error(`Invalid currency string: ${currencyString}`);
  }

  // Convert to smallest unit (cents)
  return currency.decimals === 0 ? amount : Math.round(amount * 100);
}

// Get exchange rates from external API
async function fetchExchangeRates(
  baseCurrency: string = "usd",
): Promise<ExchangeRates> {
  try {
    const response = await fetch(
      `/api/currency/rates?base=${baseCurrency.toUpperCase()}`,
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch exchange rates: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      base: baseCurrency.toUpperCase(),
      rates: data.rates,
      timestamp: Date.now(),
      ttl: 60 * 60 * 1000, // 1 hour
    };
  } catch (error) {
    console.error("Error fetching exchange rates:", error);
    throw error;
  }
}

// Get cached or fresh exchange rates
async function getExchangeRates(
  baseCurrency: string = "usd",
): Promise<ExchangeRates> {
  const now = Date.now();

  // Check if cache is valid
  if (
    exchangeRatesCache &&
    exchangeRatesCache.base === baseCurrency.toUpperCase() &&
    now - exchangeRatesCache.timestamp < exchangeRatesCache.ttl
  ) {
    return exchangeRatesCache;
  }

  // Fetch fresh rates
  exchangeRatesCache = await fetchExchangeRates(baseCurrency);
  return exchangeRatesCache;
}

// Convert between currencies
export async function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
): Promise<number> {
  const from = fromCurrency.toLowerCase();
  const to = toCurrency.toLowerCase();

  // Same currency, no conversion needed
  if (from === to) {
    return amount;
  }

  // Validate currencies
  if (!SUPPORTED_CURRENCIES[from]) {
    throw new Error(`Unsupported source currency: ${fromCurrency}`);
  }
  if (!SUPPORTED_CURRENCIES[to]) {
    throw new Error(`Unsupported target currency: ${toCurrency}`);
  }

  try {
    const rates = await getExchangeRates(from);
    const rate = rates.rates[to.toUpperCase()];

    if (!rate) {
      throw new Error(
        `Exchange rate not available for ${fromCurrency} to ${toCurrency}`,
      );
    }

    return Math.round(amount * rate);
  } catch (error) {
    console.error("Currency conversion error:", error);
    throw error;
  }
}

// Get currency info
export function getCurrencyInfo(currencyCode: string): CurrencyInfo {
  const currency = SUPPORTED_CURRENCIES[currencyCode.toLowerCase()];
  if (!currency) {
    throw new Error(`Unsupported currency: ${currencyCode}`);
  }
  return currency;
}

// Get all supported currencies
export function getSupportedCurrencies(): CurrencyInfo[] {
  return Object.values(SUPPORTED_CURRENCIES);
}

// Get currencies by region
export function getCurrenciesByRegion(region: string): CurrencyInfo[] {
  return Object.values(SUPPORTED_CURRENCIES).filter(
    (currency) => currency.region.toLowerCase() === region.toLowerCase(),
  );
}

// Validate currency code
export function isValidCurrency(currencyCode: string): boolean {
  return currencyCode.toLowerCase() in SUPPORTED_CURRENCIES;
}

// Get user's preferred currency based on locale
export function getPreferredCurrency(locale?: string): string {
  if (!locale) {
    locale = typeof navigator !== "undefined" ? navigator.language : "en-US";
  }

  const currencyMap: Record<string, string> = {
    "en-US": "usd",
    "en-CA": "cad",
    "en-GB": "gbp",
    "en-AU": "aud",
    "en-EU": "eur",
    de: "eur",
    fr: "eur",
    es: "eur",
    it: "eur",
    ja: "jpy",
    ko: "krw",
    zh: "cny",
    "pt-BR": "brl",
    "es-MX": "mxn",
  };

  // Try exact match first
  if (currencyMap[locale]) {
    return currencyMap[locale];
  }

  // Try language code only
  const languageCode = locale.split("-")[0];
  if (currencyMap[languageCode]) {
    return currencyMap[languageCode];
  }

  // Default to USD
  return "usd";
}

// Currency comparison utilities
export function compareCurrencyAmounts(
  amount1: number,
  currency1: string,
  amount2: number,
  currency2: string,
): Promise<number> {
  // If same currency, compare directly
  if (currency1.toLowerCase() === currency2.toLowerCase()) {
    return Promise.resolve(amount1 - amount2);
  }

  // Convert second amount to first currency for comparison
  return convertCurrency(amount2, currency2, currency1).then(
    (convertedAmount2) => {
      return amount1 - convertedAmount2;
    },
  );
}

// Format currency range
export function formatCurrencyRange(
  minAmount: number,
  maxAmount: number,
  currencyCode: string,
  options?: Parameters<typeof formatCurrency>[2],
): string {
  const min = formatCurrency(minAmount, currencyCode, options);
  const max = formatCurrency(maxAmount, currencyCode, options);
  return `${min} - ${max}`;
}
