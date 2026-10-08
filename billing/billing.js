// Shared by /subscribe and /account. Founding Member payments happen here,
// never inside the TopLink Call app (founder decision, 2026-10-08; see
// docs/engineering-decisions.md in Ebongest/toplink-call).
//
// The site has no accounts. The app opens these pages with ?t=<token>, a
// 30-minute link token from create_billing_link(); the web-billing Supabase
// edge function is the only thing that can turn it into a TopLink ID. The
// token is moved out of the address bar into sessionStorage straight away,
// so it doesn't end up in screenshots, shared links or browser history,
// and survives the round trip to Stripe / Paystack in the same tab.

const BILLING_FN = 'https://zrvpjoaxkvkpewjhebdv.supabase.co/functions/v1/web-billing';
const TOKEN_KEY = 'tlc-billing-token';

function takeToken() {
  const url = new URL(location.href);
  const fromUrl = url.searchParams.get('t');
  if (fromUrl) {
    try { sessionStorage.setItem(TOKEN_KEY, fromUrl); } catch { /* private mode: keep it in memory */ }
    url.searchParams.delete('t');
    history.replaceState(null, '', url.pathname + url.search + url.hash);
    return fromUrl;
  }
  try { return sessionStorage.getItem(TOKEN_KEY); } catch { return null; }
}

const billingToken = takeToken();

async function billing(action, extra = {}) {
  if (!billingToken) {
    return { ok: false, data: { reason: 'invalid_link', error: 'Open this page from the TopLink Call app (More → Founding Member).' } };
  }
  try {
    const res = await fetch(BILLING_FN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, token: billingToken, ...extra }),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data };
  } catch {
    return { ok: false, data: { error: 'Could not reach TopLink Call. Check your connection and try again.' } };
  }
}

// Render helpers. Text is set with textContent only.
function show(id) {
  document.querySelectorAll('[data-view]').forEach(el => { el.hidden = el.dataset.view !== id; });
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function busy(button, on, label) {
  button.disabled = on;
  if (label) button.textContent = label;
}

// Same wording as the app (lib/callCredits.ts creditEquivalents).
function creditEquivalents(credits) {
  return `${credits} credits = ${credits} min voice / ${Math.floor(credits / 3)} min video`;
}
