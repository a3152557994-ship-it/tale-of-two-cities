/**
 * Mini-tool only: tiny local fallbacks for the post-ES2017 runtime APIs this game
 * actually calls (Android 8.1 / Chrome 61 baseline). Syntax is transpiled by Vite;
 * these cover runtime methods only. Not a general polyfill bundle.
 *
 *   Object.fromEntries        — main.js (portrait map), GameCore.js (meters)   [Chrome 73]
 *   String#replaceAll         — main.js esc()                                  [Chrome 85]
 *   String#trimStart          — ShareCard.js wrap()                            [Chrome 66]
 */
function define(target, name, value) {
  if (typeof target[name] === 'function') return;
  Object.defineProperty(target, name, { value, configurable: true, writable: true, enumerable: false });
}

define(Object, 'fromEntries', function fromEntries(iterable) {
  const out = {};
  for (const pair of iterable) out[pair[0]] = pair[1];
  return out;
});

define(String.prototype, 'replaceAll', function replaceAll(search, replacement) {
  if (search instanceof RegExp) {
    if (!search.global) throw new TypeError('replaceAll must be called with a global RegExp');
    return String(this).replace(search, replacement);
  }
  const escaped = String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return String(this).replace(new RegExp(escaped, 'g'), replacement);
});

define(String.prototype, 'trimStart', function trimStart() {
  return String(this).replace(/^[\s\uFEFF\xA0]+/, '');
});
