/**
 * Minimal, privacy-friendly event beacon (no cookies, no PII).
 * Endpoint is injected at build time via VITE_TRACK_URL; no-op when unset.
 */
const ENDPOINT = import.meta.env.VITE_TRACK_URL || '';

function id(key) {
  try {
    let v = localStorage.getItem(key);
    if (!v) {
      v = Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(key, v);
    }
    return v;
  } catch {
    return 'anon';
  }
}

const uid = id('ttc.uid');
const sid = Math.random().toString(36).slice(2, 10);

export function track(ev, props = {}) {
  if (!ENDPOINT) return;
  const body = JSON.stringify({ ev, props, uid, sid, t: Date.now(), ref: document.referrer.slice(0, 120), w: innerWidth });
  try {
    if (navigator.sendBeacon) navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'text/plain' }));
    else fetch(ENDPOINT, { method: 'POST', body, keepalive: true, mode: 'no-cors' });
  } catch {
    /* ignore */
  }
}
