/* ═══════════════════════════════════════════════════════════════════
   CiteSite — IP-localised display pricing
   ───────────────────────────────────────────────────────────────────
   Canonical price is CHF 49 (one-off). On the pricing page and
   payment modal we DETECT the visitor's currency from their IP,
   convert via the daily ECB-sourced rate, and round UP to the
   nearest .99 for display only.

   IMPORTANT — FX policy:
   The customer is CHARGED IN CHF when Stripe processes the order.
   Localised display is purely a shoppability feature; Stripe handles
   the FX on the customer's card. This avoids absorbing FX risk and
   keeps reporting in a single currency.

   Network failures degrade silently to CHF 49.99.
   ═══════════════════════════════════════════════════════════════════ */

const CANONICAL_CHF = 49;
const FALLBACK = Object.freeze({ amount: 49.99, currency: 'CHF', symbol: 'CHF ' });

const CURRENCY_SYMBOLS = {
  USD: '$',  EUR: '€',  GBP: '£',  JPY: '¥',  CNY: '¥',
  CHF: 'CHF ', AUD: 'A$', CAD: 'C$', NZD: 'NZ$', HKD: 'HK$',
  SGD: 'S$', INR: '₹',  KRW: '₩',  BRL: 'R$', MXN: 'MX$',
  ZAR: 'R',  TRY: '₺',  PLN: 'zł', SEK: 'kr ', NOK: 'kr ',
  DKK: 'kr ', CZK: 'Kč ', ILS: '₪',  AED: 'AED ', SAR: 'SAR ',
  THB: '฿',  PHP: '₱',  IDR: 'Rp ', MYR: 'RM ', RUB: '₽',
};

function symbolFor(code) {
  return CURRENCY_SYMBOLS[code] ?? `${code} `;
}

// Round UP to nearest .99.
//   49.00  → 49.99
//   55.23  → 55.99
//   55.99  → 55.99
//   56.00  → 56.99
//   55.998 → 56.99
export function roundUpToNinetyNine(raw) {
  const ceil = Math.ceil(raw);
  const candidate = ceil - 1 + 0.99;
  return candidate >= raw ? candidate : ceil + 0.99;
}

async function fetchJSON(url, timeoutMs = 4000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

let _cached = null;

export async function getLocalPrice() {
  if (_cached) return _cached;
  try {
    const geo = await fetchJSON('https://ipapi.co/json/');
    const currency = String(geo.currency || '').toUpperCase();

    if (!currency || currency === 'CHF') {
      _cached = FALLBACK;
      return FALLBACK;
    }

    const fx = await fetchJSON(
      `https://api.frankfurter.app/latest?from=CHF&to=${currency}`
    );
    const rate = fx.rates && fx.rates[currency];
    if (!rate || !Number.isFinite(rate) || rate <= 0) {
      _cached = FALLBACK;
      return FALLBACK;
    }

    const raw = CANONICAL_CHF * rate;
    const result = {
      amount: roundUpToNinetyNine(raw),
      currency,
      symbol: symbolFor(currency),
    };
    _cached = result;
    return result;
  } catch {
    _cached = FALLBACK;
    return FALLBACK;
  }
}

// Format for display: "CHF 49.99", "$54.99", "£43.99", "kr 599.99"
export function formatPrice(price) {
  if (!price) return 'CHF 49.99';
  return `${price.symbol}${price.amount.toFixed(2)}`;
}
