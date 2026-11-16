/**
 * Mini-tool only: thin wrappers around the Xiaohongshu container JS API
 * (window.xhs.miniTool), following the online doc
 * https://miniapp-sandbox.xiaohongshu.com/minitool/doc (fetched 2026-11-16, last updated 2026-11-10).
 *
 * Every call: check window.xhs / miniTool / method, check the client version the doc
 * requires, handle failure, and degrade. No module-level side effects (tree-shakeable).
 */

const STORAGE_MIN = 9460; // §3.7 setStorage / getStorage: client 9.46+
const SAVE_IMAGE_MIN = 9420; // §3.4 saveImageToPhotosAlbum: client 9.42+
const WINDOW_INFO_MIN = 9490; // §3.11 getWindowInfo: client 9.49+
const SHARE_MIN = 9530; // §3.18 share: client 9.53+, full-screen container only

function api() {
  return (window.xhs && window.xhs.miniTool) || null;
}

function hasFn(name) {
  const m = api();
  return !!m && typeof m[name] === 'function';
}

// ---------------- §3.6 client version ----------------
function readBuildVersion(launchOptions) {
  const env = launchOptions && launchOptions.miniToolEnv;
  return Number(env && env.buildVersion) || 0;
}

let buildVersionPromise = null;
export function getBuildVersion() {
  if (!buildVersionPromise) {
    buildVersionPromise = (async () => {
      const xhs = window.xhs;
      const sync = readBuildVersion(xhs && xhs.launchOptions);
      if (sync) return sync;
      if (!hasFn('getLaunchOptions')) return 0;
      try {
        return readBuildVersion(await api().getLaunchOptions());
      } catch (e) {
        return 0;
      }
    })();
  }
  return buildVersionPromise;
}

function atLeast(buildVersion, min) {
  return Math.floor(buildVersion / 1000) >= min;
}

// ---------------- §3.7 Storage (fallback: browser storage, may be lost) ----------------
function readBrowser(key) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw == null ? null : JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function writeBrowser(key, serialized) {
  try {
    window.localStorage.setItem(key, serialized);
    return true;
  } catch (e) {
    return false;
  }
}

async function useNativeStorage() {
  return hasFn('setStorage') && hasFn('getStorage') && atLeast(await getBuildVersion(), STORAGE_MIN);
}

/** Read a JSON value. Migrates a legacy browser-storage copy into Storage API once. */
export async function getLocalData(key) {
  if (await useNativeStorage()) {
    try {
      const res = await api().getStorage({ key });
      const raw = res && res.data;
      if (raw != null && raw !== '') return JSON.parse(raw);
      const legacy = readBrowser(key);
      if (legacy != null) {
        try {
          await api().setStorage({ key, data: JSON.stringify(legacy) });
        } catch (e) {
          /* keep legacy copy; retry on next save */
        }
      }
      return legacy;
    } catch (e) {
      return readBrowser(key);
    }
  }
  return readBrowser(key);
}

/** Persist a JSON value. Resolves false when it could not be stored (caller tolerates loss). */
export async function setLocalData(key, data) {
  let serialized;
  try {
    serialized = JSON.stringify(data);
  } catch (e) {
    return false;
  }
  if (typeof serialized !== 'string') return false;
  if (await useNativeStorage()) {
    try {
      await api().setStorage({ key, data: serialized });
      return true;
    } catch (e) {
      return false;
    }
  }
  return writeBrowser(key, serialized);
}

// ---------------- §3.4 / §3.5 save image to album ----------------
/** @returns {Promise<{ok: boolean, reason?: 'unsupported'|'fail', errMsg?: string}>} */
export async function saveImageToAlbum(dataUrl) {
  if (!hasFn('saveImageToPhotosAlbum') || !atLeast(await getBuildVersion(), SAVE_IMAGE_MIN)) {
    return { ok: false, reason: 'unsupported' };
  }
  const m = api();
  let filePath = dataUrl;
  // Large base64: write a temp file first (doc recommendation), fall back to the data URI.
  if (typeof m.writeTempFile === 'function') {
    try {
      const res = await m.writeTempFile({ data: dataUrl });
      if (res && res.filePath) filePath = res.filePath;
    } catch (e) {
      /* use data URI */
    }
  }
  try {
    await m.saveImageToPhotosAlbum({ filePath });
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: 'fail', errMsg: (e && e.errMsg) || '' };
  }
}

// ---------------- §3.18 share mini-tool card ----------------
export async function canShareCard() {
  return hasFn('share') && atLeast(await getBuildVersion(), SHARE_MIN);
}

/** @returns {Promise<{ok: boolean, errCode?: number}>} */
export async function shareCard() {
  if (!(await canShareCard())) return { ok: false };
  try {
    await api().share({ type: 'card' });
    return { ok: true };
  } catch (e) {
    return { ok: false, errCode: e && e.errCode };
  }
}

// ---------------- layout: safe area + host buttons (§3.11), flex-gap detection ----------------
function cssInset(side) {
  const probe = document.createElement('div');
  probe.style.cssText =
    'position:absolute;visibility:hidden;pointer-events:none;top:0;left:0;width:0;height:0;' +
    `padding-top:var(--safe-area-inset-${side}, env(safe-area-inset-${side}, 0px))`;
  document.body.appendChild(probe);
  const v = parseFloat(window.getComputedStyle(probe).paddingTop) || 0;
  probe.parentNode.removeChild(probe);
  return v;
}

async function applyWindowInsets() {
  let top = cssInset('top');
  let bottom = cssInset('bottom');
  if (hasFn('getWindowInfo') && atLeast(await getBuildVersion(), WINDOW_INFO_MIN)) {
    try {
      const info = await api().getWindowInfo();
      const winH = (info && info.windowHeight) || window.innerHeight;
      const safe = info && info.safeArea;
      if (safe && isFinite(safe.top)) top = Math.max(top, safe.top);
      if (safe && isFinite(safe.bottom) && safe.bottom > 0 && safe.bottom <= winH) bottom = Math.max(bottom, winH - safe.bottom);
      // Host buttons (back / me / share) overlapping our top bar: move the bar below them.
      const barH = parseFloat(window.getComputedStyle(document.documentElement).getPropertyValue('--bar-h')) || 52;
      const btns = (info && info.menuButtons) || {};
      ['back', 'me', 'share'].forEach((k) => {
        const r = btns[k];
        if (r && isFinite(r.top) && isFinite(r.bottom) && r.top < top + barH) top = Math.max(top, r.bottom + 6);
      });
      top = Math.min(top, winH * 0.3);
    } catch (e) {
      /* keep CSS insets */
    }
  }
  const root = document.documentElement.style;
  root.setProperty('--mt-top', `${Math.round(top)}px`);
  root.setProperty('--mt-bottom', `${Math.round(bottom)}px`);
}

/** css-compatibility.md: Flex gap must be detected by measuring layout, not by @supports. */
function supportsFlexGap() {
  const flex = document.createElement('div');
  flex.style.position = 'absolute';
  flex.style.visibility = 'hidden';
  flex.style.display = 'flex';
  flex.style.flexDirection = 'column';
  flex.style.rowGap = '1px';
  flex.appendChild(document.createElement('div'));
  flex.appendChild(document.createElement('div'));
  document.body.appendChild(flex);
  const supported = flex.scrollHeight === 1;
  flex.parentNode.removeChild(flex);
  return supported;
}

// ---------------- lightweight notice with optional action (asset retry etc.) ----------------
let noticeEl = null;
export function showNotice(text, actionLabel, onAction) {
  if (!noticeEl) {
    noticeEl = document.createElement('div');
    noticeEl.className = 'mt-notice';
    noticeEl.setAttribute('role', 'status');
    document.body.appendChild(noticeEl);
  }
  noticeEl.textContent = '';
  const span = document.createElement('span');
  span.textContent = text;
  noticeEl.appendChild(span);
  if (actionLabel && onAction) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = actionLabel;
    btn.addEventListener('click', () => {
      hideNotice();
      onAction();
    });
    noticeEl.appendChild(btn);
  }
  noticeEl.classList.remove('hidden');
}

export function hideNotice() {
  if (noticeEl) noticeEl.classList.add('hidden');
}

/** Called once from the mini-tool entry, before the game boots. */
export function initPlatform() {
  if (!supportsFlexGap()) document.documentElement.classList.add('no-flex-gap');
  document.documentElement.classList.add('is-minitool');
  applyWindowInsets();
  let t = 0;
  window.addEventListener('resize', () => {
    clearTimeout(t);
    t = setTimeout(applyWindowInsets, 200);
  });
}
