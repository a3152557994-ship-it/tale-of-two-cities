import './style.css';
import { PaintedTearEngine } from './engine/PaintedTearEngine.js';
import { ChamberScore } from './audio/ChamberScore.js';
import { mountOrnaments } from './ui/ornaments.js';
import { GLOSS_LEXICON, PROLOGUE_COUPLETS } from './data/act1Content.js';
import { METERS, CHARACTERS, ENDINGS, PERSONAS } from './data/cards.js';
import { GameCore, TOTAL_STEPS } from './game/GameCore.js';
import { renderShareCard } from './game/ShareCard.js';
import { track } from './game/track.js';
import londonUrl from './assets/london-street.jpg';
import parisUrl from './assets/paris-street.jpg';
import prologueUrl from './assets/prologue-channel.jpg';
import { createFallbackStage } from './minitool/FallbackStage.js';
import * as mt from './minitool/platform.js';

// Xiaohongshu mini-tool build (vite.minitool.config.js). Constant-folded: the website
// build drops every `if (IS_MINITOOL)` branch and the minitool modules above.
const IS_MINITOOL = import.meta.env.VITE_TARGET === 'minitool';
// The website link is never embedded in the mini-tool package (no outbound links there).
const GAME_URL = IS_MINITOOL ? '' : 'https://a3152557994-ship-it.github.io/tale-of-two-cities/';

const PORTRAITS = Object.fromEntries(
  Object.entries(import.meta.glob('./assets/portraits/*.jpg', { eager: true, import: 'default' })).map(([k, v]) => [
    k.replace(/^.*portrait-(.+)\.jpg$/, '$1'),
    v
  ])
);
const PERSONA_WHO = { sacrifice: 'carton', mercy: 'lucie', revenge: 'mme_defarge', cold: 'marquis', prudent: 'lorry', idealist: 'darnay', opportunist: 'jerry' };
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'];

const $ = (id) => document.getElementById(id);
const app = $('app');
const stage = $('stage');
const cardEl = $('card');
const vocab = $('vocab');

const core = new GameCore();
const audio = new ChamberScore();
mountOrnaments();

// ---------------- persistence ----------------
const STORE = 'ttc.album.v1';
const album = (() => {
  if (IS_MINITOOL) return { endings: [], personas: [], runs: 0, best: 0 }; // filled async by Storage API
  try {
    return { endings: [], personas: [], runs: 0, best: 0, ...JSON.parse(localStorage.getItem(STORE) || '{}') };
  } catch {
    return { endings: [], personas: [], runs: 0, best: 0 };
  }
})();
const saveAlbum = () => {
  if (IS_MINITOOL) {
    mt.setLocalData(STORE, album); // resolves false on failure; album stays in memory
    return;
  }
  try {
    localStorage.setItem(STORE, JSON.stringify(album));
  } catch {
    /* private mode */
  }
};

const state = {
  beat: 'prologue',
  lang: 'zh',
  mono: false,
  seamRest: 0.5,
  rewindUsed: false,
  busy: false,
  lastEnding: null,
  runCards: 0
};

const esc = (s) => String(s ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const rich = (raw) => esc(raw).replace(/\{\{([a-z0-9_]+)\|([^}]+)\}\}/gi, (_, k, l) => `<span class="gloss-term" data-term="${k}" role="button" tabindex="0">${l}</span>`);
const L = (zh, en) => (state.lang === 'en' && en ? en : zh);

// ---------------- engine ----------------
let engine = null;
if (IS_MINITOOL) {
  bootMiniToolStage();
} else try {
  engine = new PaintedTearEngine(stage.querySelector('canvas'), {
    onFrame: stepSeam,
    onProgress: (p) => ($('curtain-bar').style.width = `${Math.round(p * 100)}%`)
  });
  engine.setSeam(0.5);
  engine
    .load({ london: londonUrl, paris: parisUrl, prologue: prologueUrl })
    .then(() => setTimeout(() => $('curtain').classList.add('gone'), 300))
    .catch(() => $('curtain').classList.add('gone'));
} catch (e) {
  console.error(e);
  $('curtain').classList.add('gone');
  stage.style.background = `center / cover no-repeat url(${prologueUrl})`;
}

// Mini-tool: GPU budget + tiering, two-phase painting load with retry, DOM fallback stage.
function useFallbackStage(seamNow = 0.5) {
  if (engine && engine.isFallback) return;
  engine = createFallbackStage(stage, { onFrame: stepSeam });
  engine.setSeam(seamNow);
  engine.setScene(state.beat === 'prologue' ? 0 : 1);
  engine.setMono(state.mono);
  engine.load({ london: londonUrl, paris: parisUrl, prologue: prologueUrl });
  $('curtain').classList.add('gone');
}

function loadPaintings(sources, tries = 2) {
  const target = engine;
  return target.load(sources).catch((err) => {
    if (tries <= 1 || engine !== target) throw err;
    return new Promise((r) => setTimeout(r, 1200)).then(() => loadPaintings(sources, tries - 1));
  });
}

function loadTheatre() {
  loadPaintings({ london: londonUrl, paris: parisUrl }).catch(() => {
    if (engine && engine.isFallback) return; // DOM stage shows its own painted base colours
    mt.showNotice('部分油画没能装裱好', '重试', loadTheatre);
  });
}

function bootMiniToolStage() {
  try {
    engine = new PaintedTearEngine(stage.querySelector('canvas'), {
      onFrame: stepSeam,
      onProgress: (p) => ($('curtain-bar').style.width = `${Math.round(p * 100)}%`),
      budget: { maxDpr: 1.5, maxPixels: 2e6, adaptive: true },
      onFallback: () => useFallbackStage(seam)
    });
    engine.setSeam(0.5);
    // First screen only needs the prologue painting; the two city paintings follow.
    loadPaintings({ prologue: prologueUrl })
      .catch(() => mt.showNotice('扉页油画没能装裱好', '重试', () => loadPaintings({ prologue: prologueUrl }).catch(() => {})))
      .then(() => setTimeout(() => $('curtain').classList.add('gone'), 300));
    loadTheatre();
  } catch (e) {
    console.error(e);
    useFallbackStage(0.5);
  }
}

// Seam: eases toward a target; dragging sets it directly.
let seam = 0.5;
let seamTarget = 0.5;
let seamDirect = false;
function stepSeam() {
  if (!seamDirect) {
    const prev = seam;
    seam += (seamTarget - seam) * 0.08;
    engine?.setSeam(seam, (seam - prev) * 2);
  }
  audio.updateSeam(seam);
}
function setSeamDirect(x, vel) {
  seam = Math.max(0.02, Math.min(0.98, x));
  engine?.setSeam(seam, vel);
}
const restFromFury = () => Math.max(0.16, Math.min(0.84, 0.5 + ((50 - core.meters.fury) / 100) * 0.7));

// ---------------- meters ----------------
const ICONS = {
  bread: 'M3.5 14.5c0-4.6 3.8-8 8.5-8s8.5 3.4 8.5 8v2.8a2.2 2.2 0 0 1-2.2 2.2H5.7a2.2 2.2 0 0 1-2.2-2.2z M8.2 10.4l1.2 3.2 M12 9.6l1.2 3.4 M15.8 10.4l1 3',
  gold: 'M12 3.5a8.5 8.5 0 1 0 0 17a8.5 8.5 0 1 0 0-17z M12 6.6a5.4 5.4 0 1 0 0 10.8a5.4 5.4 0 1 0 0-10.8z',
  heart: 'M12 2.6c1.7 2.1 2.3 3.4 2.3 4.5A2.3 2.3 0 0 1 12 9.4a2.3 2.3 0 0 1-2.3-2.3c0-1.1.6-2.4 2.3-4.5z M8.8 11h6.4v9H8.8z M6.5 21h11',
  fury: 'M12 2.2c1.2 3.2 5.6 5.3 5.6 10.6a5.6 5.6 0 0 1-11.2 0c0-2.8 1.6-4.4 2.8-5.5.3 1.9 1.1 2.9 2.2 3.3 0-3.3-1.1-6 .6-8.4z'
};

function buildMeters() {
  const box = $('meters');
  box.innerHTML = METERS.map(
    (m) => `
    <div class="meter" id="meter-${m.key}" title="${m.name}">
      <span class="meter-dot" id="dot-${m.key}"></span>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <defs><clipPath id="clip-${m.key}" class="m-clip"><rect x="0" y="12" width="24" height="12" /></clipPath></defs>
        <path class="m-out" d="${ICONS[m.key]}" />
        <path class="m-fill" d="${ICONS[m.key]}" clip-path="url(#clip-${m.key})" />
      </svg>
      <span class="meter-name" data-zh="${m.name}" data-en="${m.nameEn}">${m.name}</span>
    </div>`
  ).join('');
}

function renderMeters(delta) {
  METERS.forEach((m) => {
    const v = core.meters[m.key];
    const r = document.querySelector(`#clip-${m.key} rect`);
    const top = 2 + (1 - v / 100) * 20;
    r.setAttribute('y', String(top));
    r.setAttribute('height', String(24 - top));
    const el = $(`meter-${m.key}`);
    el.classList.toggle('danger', v <= 15 || v >= 85);
    if (delta && delta[m.key]) {
      const cls = delta[m.key] > 0 ? 'up' : 'down';
      el.classList.remove('up', 'down');
      void el.offsetWidth;
      el.classList.add(cls);
    }
  });
}

function showPreview(side) {
  const p = side ? core.preview(side) : {};
  METERS.forEach((m) => {
    const d = $(`dot-${m.key}`);
    d.classList.toggle('s1', p[m.key] === 1);
    d.classList.toggle('s2', p[m.key] === 2);
  });
}

// ---------------- card ----------------
function renderCard() {
  const c = core.card;
  if (!c) return;
  const who = CHARACTERS[c.who] || { name: c.who, nameEn: c.who, role: '', roleEn: '' };
  const prompt = $('prompt');
  prompt.classList.add('swap');
  setTimeout(() => {
    $('who-name').textContent = L(who.name, who.nameEn);
    $('who-role').textContent = L(who.role, who.roleEn);
    const tag = $('city-tag');
    tag.textContent = c.city === 'paris' ? 'PARIS' : 'LONDON';
    tag.className = `city-tag ${c.city}`;
    $('prompt-text').innerHTML = rich(L(c.text, c.textEn));
    prompt.classList.remove('swap');
  }, 160);

  $('card-art').style.backgroundImage = `url(${PORTRAITS[c.who] || PORTRAITS.citizen})`;
  $('card-name').textContent = L(who.name, who.nameEn);
  $('choice-left').innerHTML = `<small>LONDON</small>${esc(L(c.left.label, c.left.labelEn))}`;
  $('choice-right').innerHTML = `<small>PARIS</small>${esc(L(c.right.label, c.right.labelEn))}`;
  cardEl.className = `card city-${c.city}`;
  cardEl.style.transition = 'none';
  cardEl.style.transform = '';
  void cardEl.offsetWidth;
  cardEl.classList.add('enter');
  if (core.step === 0 && album.runs === 0) setTimeout(teach, 900);

  const ph = core.phase;
  $('era-year').textContent = String(core.year);
  $('era-book').textContent = L(ph.title, ph.titleEn);
  $('era-progress').style.width = `${(core.step / TOTAL_STEPS) * 100}%`;
  $('step-count').textContent = state.lang === 'en' ? `Card ${core.step + 1}` : `第 ${core.step + 1} 张`;
  state.seamRest = restFromFury();
  seamTarget = state.seamRest;
}

function teach() {
  if (state.busy || drag) return;
  const seq = [
    [-46, 0.45],
    [46, 0.9],
    [0, 0.5]
  ];
  let i = 0;
  const go = () => {
    if (drag || i >= seq.length) return;
    const [dx] = seq[i++];
    cardEl.style.transition = 'transform 0.45s ease';
    cardEl.style.transform = `translateX(${dx}px) rotate(${dx * 0.06}deg)`;
    lean(dx / threshold());
    setTimeout(go, 520);
    if (i === seq.length) setTimeout(() => lean(0), 520);
  };
  go();
}

const threshold = () => Math.min(130, Math.max(70, stage.clientWidth * 0.14));

function lean(t) {
  const k = Math.max(-1, Math.min(1, t));
  $('choice-left').style.opacity = String(Math.max(0, -k * 1.4));
  $('choice-right').style.opacity = String(Math.max(0, k * 1.4));
  showPreview(Math.abs(k) > 0.22 ? (k < 0 ? 'left' : 'right') : null);
  seamTarget = state.seamRest + -k * 0.34;
}

// drag
let drag = null;
cardEl.addEventListener('pointerdown', (e) => {
  if (state.busy || state.beat !== 'game') return;
  drag = { x0: e.clientX, y0: e.clientY, dx: 0, lastX: e.clientX };
  cardEl.setPointerCapture(e.pointerId);
  cardEl.style.transition = 'none';
  cardEl.classList.remove('enter');
  seamDirect = true;
});

cardEl.addEventListener('pointermove', (e) => {
  if (!drag) return;
  drag.dx = e.clientX - drag.x0;
  const dy = (e.clientY - drag.y0) * 0.25;
  const vel = (e.clientX - drag.lastX) / Math.max(1, stage.clientWidth);
  drag.lastX = e.clientX;
  cardEl.style.transform = `translate(${drag.dx}px, ${dy}px) rotate(${drag.dx * 0.06}deg)`;
  const t = drag.dx / threshold();
  lean(t);
  setSeamDirect(state.seamRest + -Math.max(-1.3, Math.min(1.3, t)) * 0.34, -vel);
});

function endDrag() {
  if (!drag) return;
  const t = drag.dx / threshold();
  drag = null;
  seamDirect = false;
  if (Math.abs(t) >= 1) commit(t < 0 ? 'left' : 'right');
  else {
    cardEl.style.transition = 'transform 0.4s cubic-bezier(0.2, 1.4, 0.4, 1)';
    cardEl.style.transform = '';
    lean(0);
  }
}
cardEl.addEventListener('pointerup', endDrag);
cardEl.addEventListener('pointercancel', endDrag);

function commit(side) {
  if (state.busy || !core.card) return;
  state.busy = true;
  const dir = side === 'left' ? -1 : 1;
  cardEl.style.transition = 'transform 0.38s cubic-bezier(0.5, 0, 0.9, 0.6), opacity 0.38s';
  cardEl.style.transform = `translate(${dir * stage.clientWidth * 0.75}px, 60px) rotate(${dir * 32}deg)`;
  seamTarget = state.seamRest + -dir * 0.5;
  audio.playMirrorFlip(side === 'left' ? 'london' : 'paris');
  showPreview(null);

  setTimeout(() => {
    const res = core.choose(side);
    state.runCards = core.step;
    renderMeters(res.delta);
    const after = L(res.after, res.afterEn);
    if (after) flashAfter(after);
    if (res.ending) {
      setTimeout(() => showEnding(res.ending), after ? 1300 : 600);
    } else {
      lean(0);
      renderCard();
      state.busy = false;
    }
  }, 360);
}

let afterTimer = null;
function flashAfter(text) {
  const el = $('after');
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(afterTimer);
  afterTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    ['share', 'album'].forEach((id) => $(id).classList.add('hidden'));
    vocab.classList.add('hidden');
    return;
  }
  if (state.beat !== 'game' || state.busy) return;
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    const side = e.key === 'ArrowLeft' ? 'left' : 'right';
    lean(side === 'left' ? -1 : 1);
    cardEl.style.transition = 'transform 0.2s ease';
    cardEl.style.transform = `translateX(${side === 'left' ? -40 : 40}px) rotate(${side === 'left' ? -3 : 3}deg)`;
    setTimeout(() => commit(side), 220);
  }
});

// ---------------- run lifecycle ----------------
function newRun() {
  core.start();
  state.rewindUsed = false;
  state.busy = false;
  $('ending').classList.add('hidden');
  setBeat('game');
  renderMeters();
  renderCard();
  track('run_start', { runs: album.runs });
}

function showEnding(e) {
  state.lastEnding = e;
  state.busy = false;
  album.runs += 1;
  album.best = Math.max(album.best, e.cards);
  if (!album.endings.includes(e.key)) album.endings.push(e.key);
  if (e.persona && !album.personas.includes(e.persona.id)) album.personas.push(e.persona.id);
  saveAlbum();
  updateAlbumCount();
  track('run_end', { ending: e.key, cards: e.cards, persona: e.persona && e.persona.id });

  seamTarget = e.city === 'paris' ? 0 : 1;
  const city = e.city === 'paris' ? L('巴黎', 'Paris') : L('伦敦', 'London');
  $('ending-kicker').textContent = state.lang === 'en' ? `${e.year} · ${city} · ${e.cards} cards` : `${e.year} 年 · ${city} · 撑过 ${e.cards} 张牌`;
  $('ending-title').textContent = L(e.title, e.titleEn);
  const death = L(e.death, e.deathEn);
  $('ending-death').textContent = death ? (state.lang === 'en' ? `Died of: ${death}` : `死于：${death}`) : L('你活过了恐怖时代。', 'You outlived the Terror.');
  $('ending-epitaph').textContent = L(e.epitaph, e.epitaphEn);
  const p = e.persona || {};
  $('persona-art').style.backgroundImage = `url(${PORTRAITS[PERSONA_WHO[p.tag]] || PORTRAITS.lorry})`;
  $('persona-name').textContent = L(p.name, p.nameEn);
  $('persona-line').textContent = L(p.line, p.lineEn);
  $('persona-quote').textContent = p.quote ? `“${p.quote}”` : '';
  $('btn-rewind').classList.toggle('hidden', state.rewindUsed || e.survived);
  $('ending').classList.remove('hidden');
  setBeat('ending');
  audio.playUnlockChime();
}

$('btn-again').addEventListener('click', () => {
  track('again', {});
  newRun();
});

$('btn-rewind').addEventListener('click', () => {
  if (state.rewindUsed || !core.undo()) return;
  state.rewindUsed = true;
  track('rewind', { ending: state.lastEnding && state.lastEnding.key });
  $('ending').classList.add('hidden');
  setBeat('game');
  renderMeters();
  renderCard();
});

$('btn-share').addEventListener('click', async () => {
  const e = state.lastEnding;
  if (!e) return;
  const btn = $('btn-share');
  btn.disabled = true;
  btn.textContent = L('正在印制…', 'Printing…');
  try {
    const url = await renderShareCard({
      ending: e,
      cityImage: e.city === 'paris' ? parisUrl : londonUrl,
      portrait: PORTRAITS[PERSONA_WHO[e.persona && e.persona.tag]],
      url: GAME_URL,
      lang: state.lang
    });
    $('share-img').src = url;
    if (IS_MINITOOL) {
      state.shareUrl = url;
      $('share-tip').textContent = L('点「保存到相册」，把结局卡存进手机', 'Tap “Save to album” to keep this card');
    } else $('share-download').href = url;
    $('share').classList.remove('hidden');
    track('share_card', { ending: e.key });
  } catch (err) {
    console.error(err);
  }
  btn.disabled = false;
  btn.textContent = L('保存结局卡', 'Save fate card');
});
$('btn-close-share').addEventListener('click', () => $('share').classList.add('hidden'));
if (IS_MINITOOL) {
  // <a download> and the clipboard are blocked in the container: save via the album API,
  // and share the mini-tool card instead of copying a web link (button shown only if supported).
  $('share-download').addEventListener('click', async () => {
    const btn = $('share-download');
    if (btn.disabled || !state.shareUrl) return;
    btn.disabled = true;
    const r = await mt.saveImageToAlbum(state.shareUrl);
    $('share-tip').textContent = r.ok
      ? L('已保存到系统相册', 'Saved to your photo album')
      : r.reason === 'unsupported'
        ? L('请在新版小红书 App 内打开后保存', 'Open in the latest Xiaohongshu app to save')
        : L('没能保存，请允许访问相册后再试', 'Could not save — allow photo access and retry');
    btn.disabled = false;
  });
  mt.canShareCard().then((ok) => $('btn-copy-link').classList.toggle('hidden', !ok));
  $('btn-copy-link').addEventListener('click', async () => {
    const r = await mt.shareCard();
    if (!r.ok && r.errCode === 15503) $('share-tip').textContent = L('今天分享次数已达上限', 'Daily share limit reached');
  });
} else {
  $('share-download').addEventListener('click', () => track('share_download', {}));
  $('btn-copy-link').addEventListener('click', async () => {
    const text = `这是最好的时代，也是最坏的时代——每一张牌，你撕向伦敦还是巴黎？${GAME_URL}`;
    try {
      await navigator.clipboard.writeText(text);
      $('btn-copy-link').textContent = '已复制';
    } catch {
      prompt('复制这段链接：', text);
    }
    track('copy_link', {});
  });
}

// ---------------- album ----------------
function updateAlbumCount() {
  $('album-count').textContent = String(album.endings.length);
  $('album-total').textContent = `/${Object.keys(ENDINGS).length}`;
}

function openAlbum() {
  const keys = Object.keys(ENDINGS);
  $('album-desc').textContent = `已解锁 ${album.endings.length} / ${keys.length} 个结局、${album.personas.length} / ${PERSONAS.length} 种人格 · 共撕了 ${album.runs} 局 · 最长撑过 ${album.best} 张牌`;
  $('album-endings').innerHTML = keys
    .map((k) => {
      const e = ENDINGS[k];
      const got = album.endings.includes(k);
      return got
        ? `<div class="album-item city-${e.city}"><b>${esc(L(e.title, e.titleEn))}</b><span>${esc(L(e.epitaph, e.epitaphEn))}</span></div>`
        : `<div class="album-item locked"><b>？？？</b><span>${k.startsWith('secret') ? '隐藏结局' : k.startsWith('survive') ? '活到 1793 年' : '某样东西耗尽或爆表'}</span></div>`;
    })
    .join('');
  $('album-personas').innerHTML = PERSONAS.map((p) => {
    const got = album.personas.includes(p.id);
    return `<div class="album-item ${got ? '' : 'locked'}"><i style="background-image:url(${PORTRAITS[PERSONA_WHO[p.tag]]})"></i><div><b>${got ? esc(L(p.name, p.nameEn)) : '？？？'}</b><span>${got ? esc(L(p.line, p.lineEn)) : ''}</span></div></div>`;
  }).join('');
  $('album').classList.remove('hidden');
  track('album', {});
}
$('btn-album').addEventListener('click', openAlbum);
$('btn-close-album').addEventListener('click', () => $('album').classList.add('hidden'));
['share', 'album'].forEach((id) =>
  $(id).addEventListener('click', (e) => {
    if (e.target.id === id) $(id).classList.add('hidden');
  })
);

// ---------------- beats ----------------
function setBeat(b) {
  state.beat = b;
  app.dataset.beat = b;
  if (b === 'prologue') {
    engine?.setScene(0);
    seamTarget = 0.5;
  } else engine?.setScene(1);
}

$('btn-enter').addEventListener('click', () => {
  audio.playPageTurn();
  newRun();
});
$('home-link').addEventListener('click', (e) => {
  e.preventDefault();
  $('ending').classList.add('hidden');
  setBeat('prologue');
});

// ---------------- prologue couplets ----------------
let ci = 0;
function renderCouplet() {
  const c = PROLOGUE_COUPLETS[ci];
  $('couplet-counter').textContent = `${ROMAN[ci]} / VI`;
  $('couplet-en').innerHTML = `<span class="clause-london">${rich(c.enLeft)}</span> <span class="clause-paris">${rich(c.enRight)}</span>`;
  $('couplet-zh').innerHTML = `<span class="clause-london">${esc(c.zhLeft)}</span><span class="clause-paris">${esc(c.zhRight)}</span>`;
  document.querySelectorAll('.couplet-tab').forEach((t, i) => t.classList.toggle('active', i === ci));
}
PROLOGUE_COUPLETS.forEach((_, i) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'couplet-tab';
  b.textContent = ROMAN[i];
  b.addEventListener('click', () => {
    ci = i;
    renderCouplet();
    audio.playPageTurn();
  });
  $('couplet-tabs').appendChild(b);
});
$('btn-prev-couplet').addEventListener('click', () => {
  ci = (ci + 5) % 6;
  renderCouplet();
});
$('btn-next-couplet').addEventListener('click', () => {
  ci = (ci + 1) % 6;
  renderCouplet();
});

// ---------------- gloss ----------------
let speakText = '';
document.addEventListener('click', (e) => {
  const g = e.target.closest('.gloss-term');
  if (g) {
    const d = GLOSS_LEXICON[g.dataset.term];
    if (!d) return;
    e.stopPropagation();
    $('vocab-word').textContent = d.word;
    $('vocab-ipa').textContent = d.ipa ? `  ${d.ipa}` : '';
    $('vocab-meaning').textContent = d.meaning;
    $('vocab-context').textContent = d.context;
    speakText = state.beat === 'prologue' ? PROLOGUE_COUPLETS[ci].speak : d.word;
    vocab.classList.remove('hidden');
    const r = g.getBoundingClientRect();
    const w = vocab.offsetWidth;
    const h = vocab.offsetHeight;
    vocab.style.left = `${Math.max(12, Math.min(innerWidth - w - 12, r.left + r.width / 2 - w / 2))}px`;
    let top = r.top - h - 10;
    if (top < 60) top = Math.min(innerHeight - h - 12, r.bottom + 10);
    vocab.style.top = `${top}px`;
    return;
  }
  if (!vocab.classList.contains('hidden') && !vocab.contains(e.target)) vocab.classList.add('hidden');
});
$('btn-close-vocab').addEventListener('click', () => vocab.classList.add('hidden'));
$('btn-speak').addEventListener('click', () => audio.speakEnglishSnippet(speakText));
if (IS_MINITOOL && !('speechSynthesis' in window)) $('btn-speak').classList.add('hidden');

// ---------------- tools ----------------
$('btn-lang').addEventListener('click', () => {
  state.lang = state.lang === 'zh' ? 'en' : 'zh';
  app.dataset.lang = state.lang;
  $('btn-lang').textContent = state.lang === 'zh' ? '中文' : 'English';
  document.querySelectorAll('.meter-name').forEach((n) => (n.textContent = n.dataset[state.lang]));
  document.querySelector('.side-l').textContent = L('← 撕向伦敦', '← Tear to London');
  document.querySelector('.side-r').textContent = L('撕向巴黎 →', 'Tear to Paris →');
  if (state.beat === 'game') renderCard();
  if (state.beat === 'ending' && state.lastEnding) showEndingText();
});

function showEndingText() {
  // re-render ending copy in the new language without re-counting the run
  const e = state.lastEnding;
  $('ending-title').textContent = L(e.title, e.titleEn);
  $('ending-epitaph').textContent = L(e.epitaph, e.epitaphEn);
  $('persona-name').textContent = L(e.persona.name, e.persona.nameEn);
  $('persona-line').textContent = L(e.persona.line, e.persona.lineEn);
}

$('btn-style').addEventListener('click', () => {
  state.mono = !state.mono;
  engine?.setMono(state.mono);
  $('btn-style').setAttribute('aria-pressed', String(state.mono));
  $('btn-style').textContent = state.mono ? '油画' : '铜版画';
});

async function toggleAudio() {
  const on = await audio.toggle();
  $('btn-audio').setAttribute('aria-pressed', String(on));
  $('btn-audio').textContent = on ? '声音开' : '声音关';
  $('btn-pro-audio').textContent = on ? '室内乐 · 已开启' : '开启室内乐';
}
$('btn-audio').addEventListener('click', toggleAudio);
$('btn-pro-audio').addEventListener('click', toggleAudio);

// ---------------- init ----------------
buildMeters();
renderMeters();
renderCouplet();
updateAlbumCount();
track('visit', { returning: album.runs > 0 });

if (IS_MINITOOL) {
  // Album from Storage API (9.46+) or browser storage; merge in case a run already ended.
  mt.getLocalData(STORE).then((d) => {
    if (!d || typeof d !== 'object') return;
    const union = (a, b) => a.concat((Array.isArray(b) ? b : []).filter((x) => a.indexOf(x) < 0));
    album.endings = union(album.endings, d.endings);
    album.personas = union(album.personas, d.personas);
    album.runs += Number(d.runs) || 0;
    album.best = Math.max(album.best, Number(d.best) || 0);
    updateAlbumCount();
  });
  // Pause Web Audio while the container is hidden; resume only if the player had it on.
  document.addEventListener('visibilitychange', () => {
    const ctx = audio.ctx;
    if (!ctx) return;
    if (document.hidden) ctx.suspend().catch(() => {});
    else if (audio.enabled) ctx.resume().catch(() => {});
  });
}
