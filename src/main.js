import './style.css';
import { PaintedTearEngine } from './engine/PaintedTearEngine.js';
import { ChamberScore } from './audio/ChamberScore.js';
import { mountOrnaments } from './ui/ornaments.js';
import { GLOSS_LEXICON, PROLOGUE_COUPLETS, DUAL_ANCHORS, ANCHOR_LAYOUT } from './data/act1Content.js';
import londonUrl from './assets/london-street.jpg';
import parisUrl from './assets/paris-street.jpg';
import prologueUrl from './assets/prologue-channel.jpg';

const $ = (id) => document.getElementById(id);
const app = $('app');
const stage = $('stage');
const canvas = $('stage-canvas');
const seamEl = $('seam');
const seamHandle = $('seam-handle');
const anchorsLayer = $('anchors-layer');
const dossier = $('dossier');
const dossierScroll = dossier.querySelector('.dossier-scroll');
const vocab = $('vocab');
const cipher = $('cipher');

const IMAGES = { london: londonUrl, paris: parisUrl };
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'];

const state = {
  beat: 'prologue',
  seam: 1,
  coupletIndex: 0,
  lang: 'bilingual',
  mono: false,
  visited: new Set(),
  active: null, // { id, side }
  sides: {},
  tween: null,
  speak: '',
  solved: false,
  imgAspect: 1672 / 941
};

const audio = new ChamberScore();
mountOrnaments();

const esc = (s) => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const rich = (raw) => esc(raw).replace(/\{\{([a-z0-9_]+)\|([^}]+)\}\}/gi, (_, k, label) => `<span class="gloss-term" data-term="${k}" role="button" tabindex="0">${label}</span>`);

// ============================ ENGINE ============================
let engine;
try {
  engine = new PaintedTearEngine(canvas, {
    onFrame: () => {
      stepTween();
      layoutAnchors();
    },
    onProgress: (p) => ($('curtain-bar').style.width = `${Math.round(p * 100)}%`)
  });
  engine.setSeam(1);
  engine
    .load({ london: londonUrl, paris: parisUrl, prologue: prologueUrl })
    .then(() => {
      state.imgAspect = engine.imgAspect;
      setTimeout(() => $('curtain').classList.add('gone'), 350);
    })
    .catch(() => $('curtain').classList.add('gone'));
} catch (err) {
  console.error(err);
  $('curtain').classList.add('gone');
  stage.style.background = `center / cover no-repeat url(${prologueUrl})`;
}

// ============================ SEAM ============================
function applySeam(x, vel = 0) {
  const c = Math.max(0, Math.min(1, x));
  state.seam = c;
  engine?.setSeam(c, vel);
  audio.updateSeam(c);
  seamEl.style.left = `${c * 100}%`;
  const L = Math.round(c * 100);
  seamEl.setAttribute('aria-valuenow', String(L));
  $('meter-london').style.width = `${L}%`;
  $('meter-paris').style.width = `${100 - L}%`;
  $('caption-meta').textContent = `LONDON ${L} · PARIS ${100 - L}`;
}

function tweenSeam(to, ms = 700) {
  state.tween = { from: state.seam, to: Math.max(0, Math.min(1, to)), t0: performance.now(), ms };
}

function stepTween() {
  const tw = state.tween;
  if (!tw) return;
  const p = Math.min(1, (performance.now() - tw.t0) / tw.ms);
  const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
  applySeam(tw.from + (tw.to - tw.from) * e, (tw.to - tw.from) * 0.03);
  if (p >= 1) state.tween = null;
}

let drag = null;
seamHandle.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  e.stopPropagation();
  state.tween = null;
  drag = { kind: 'seam', lastX: e.clientX };
  seamEl.classList.add('dragging');
  seamHandle.setPointerCapture(e.pointerId);
});

stage.addEventListener('pointerdown', (e) => {
  if (state.beat !== 'theatre' || e.target.closest('.anchor, .seam')) return;
  if (!engine || engine.panLimit() <= 0) return;
  drag = { kind: 'pan', lastX: e.clientX };
});

window.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const rect = stage.getBoundingClientRect();
  const dx = e.clientX - drag.lastX;
  drag.lastX = e.clientX;
  if (drag.kind === 'seam') {
    applySeam((e.clientX - rect.left) / rect.width, dx / rect.width);
  } else if (drag.kind === 'pan') {
    const k = engine._fit(engine.imgAspect)[0];
    engine.setPan(engine.panTarget - (dx / rect.width) * k);
  }
});

const endDrag = () => {
  if (!drag) return;
  drag = null;
  seamEl.classList.remove('dragging');
};
window.addEventListener('pointerup', endDrag);
window.addEventListener('pointercancel', endDrag);

seamEl.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft') applySeam(state.seam - 0.03, -0.02);
  if (e.key === 'ArrowRight') applySeam(state.seam + 0.03, 0.02);
});

// ============================ ANCHORS ============================
const anchorEls = {};

function buildAnchors() {
  DUAL_ANCHORS.forEach((a) => {
    const lay = ANCHOR_LAYOUT[a.id];
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'anchor london';
    el.innerHTML = `<span class="anchor-mark">${lay.numeral}</span><span class="anchor-plate"><b></b><small></small></span>`;
    el.addEventListener('click', () => openDossier(a.id, state.sides[a.id] || 'london'));
    el.addEventListener('pointerenter', () => engine?.setFocus(lay.uv));
    el.addEventListener('pointerleave', () => {
      if (!state.active || state.active.id !== a.id) engine?.setFocus(null);
    });
    anchorsLayer.appendChild(el);
    anchorEls[a.id] = el;
  });
}

function layoutAnchors() {
  if (!engine) return;
  DUAL_ANCHORS.forEach((a) => {
    const lay = ANCHOR_LAYOUT[a.id];
    const el = anchorEls[a.id];
    const p = engine.imageToScreen(lay.uv[0], lay.uv[1]);
    const off = p.nx < 0.02 || p.nx > 0.98 || p.ny < 0.05 || p.ny > 0.95;
    el.style.visibility = off ? 'hidden' : 'visible';
    const flipLeft = p.nx > 0.62;
    el.style.flexDirection = flipLeft ? 'row-reverse' : 'row';
    el.style.transform = flipLeft
      ? `translate(${p.x}px, ${p.y}px) translate(calc(-100% + 17px), -50%)`
      : `translate(${p.x}px, ${p.y}px) translate(-17px, -50%)`;

    const side = p.nx < state.seam ? 'london' : 'paris';
    const prev = state.sides[a.id];
    if (prev !== side) {
      state.sides[a.id] = side;
      el.classList.toggle('london', side === 'london');
      el.classList.toggle('paris', side === 'paris');
      el.querySelector('b').textContent = a[side].pinLabel;
      el.querySelector('small').textContent = lay.en[side];
      if (prev && state.beat === 'theatre') {
        el.classList.remove('flip');
        void el.offsetWidth;
        el.classList.add('flip');
        audio.playMirrorFlip(side);
        if (state.active && state.active.id === a.id) openDossier(a.id, side, true);
      }
    }
    el.classList.toggle('visited', state.visited.has(`${a.id}:${side}`));
  });
}

// ============================ DOSSIER ============================
function setPlate(id, side) {
  const plate = $('dossier-plate');
  const [u, v] = ANCHOR_LAYOUT[id].uv;
  const w = plate.clientWidth || 380;
  const h = plate.clientHeight || 196;
  const imgW = w * 2.5;
  const imgH = imgW / state.imgAspect;
  const x = Math.min(0, Math.max(w - imgW, w / 2 - u * imgW));
  const y = Math.min(0, Math.max(h - imgH, h / 2 - v * imgH));
  plate.style.backgroundImage = `url(${IMAGES[side]})`;
  plate.style.backgroundSize = `${imgW}px ${imgH}px`;
  plate.style.backgroundPosition = `${x}px ${y}px`;
}

function openDossier(id, side, live = false) {
  const a = DUAL_ANCHORS.find((x) => x.id === id);
  if (!a) return;
  const doc = a[side];
  const wasOpen = app.classList.contains('panel-open');
  state.active = { id, side };
  state.visited.add(`${id}:${side}`);
  updateProgress();
  Object.entries(anchorEls).forEach(([k, el]) => el.classList.toggle('active', k === id));

  const render = () => {
    $('dossier-badge').textContent = side === 'london' ? 'LONDON · 1775' : 'PARIS · 1775';
    $('dossier-badge').className = `plate-badge ${side}`;
    $('dossier-chapter').textContent = doc.chapter;
    $('dossier-title').textContent = doc.title;
    $('dossier-en').innerHTML = rich(doc.quoteEn);
    $('dossier-zh').textContent = doc.quoteZh;
    $('dossier-notes').textContent = doc.notes;
    $('dossier-mirror').textContent = doc.mirrorHint.replace(/[→←]/g, '').trim();
    const flip = $('btn-flip');
    flip.className = `btn-ledger ${side === 'london' ? 'to-paris' : 'to-london'}`;
    flip.innerHTML = side === 'london' ? '<span>撕到对岸 · 看巴黎的同一处</span><span>→</span>' : '<span>← 撕回伦敦 · 看雾夜里的同一处</span><span></span>';
    setPlate(id, side);
  };

  if (live && wasOpen) {
    dossierScroll.classList.remove('turn');
    void dossierScroll.offsetWidth;
    dossierScroll.classList.add('turn');
    setTimeout(render, 180);
  } else {
    render();
    dossierScroll.scrollTop = 0;
  }

  app.classList.add('panel-open');
  dossier.setAttribute('aria-hidden', 'false');
  if (!live) audio.playPageTurn();
  engine?.setFocus(ANCHOR_LAYOUT[id].uv);

  // On narrow screens, bring the relic into view
  if (engine && engine.panLimit() > 0) {
    engine.setPan(ANCHOR_LAYOUT[id].uv[0] - 0.5);
  }
  setTimeout(() => {
    setPlate(id, side); // re-measure after panel animation
    if (engine && state.active && state.active.id === id) engine.setPan(ANCHOR_LAYOUT[id].uv[0] - 0.5);
  }, 650);
}

function closeDossier() {
  app.classList.remove('panel-open');
  dossier.setAttribute('aria-hidden', 'true');
  state.active = null;
  Object.values(anchorEls).forEach((el) => el.classList.remove('active'));
  engine?.setFocus(null);
}

$('btn-close-dossier').addEventListener('click', closeDossier);

$('btn-flip').addEventListener('click', () => {
  if (!state.active || !engine) return;
  const [u, v] = ANCHOR_LAYOUT[state.active.id].uv;
  const nx = engine.imageToScreen(u, v).nx;
  tweenSeam(state.active.side === 'london' ? Math.max(0.03, nx - 0.13) : Math.min(0.97, nx + 0.13), 900);
});

function updateProgress() {
  const n = state.visited.size;
  $('progress-text').textContent = String(n);
  $('finale-count').textContent = `${n} / 8`;
  const ready = n >= 4;
  $('btn-open-cipher').classList.toggle('ready', ready);
  $('btn-cipher-label').textContent = ready ? '密信已共鸣 · 启封' : `启封多佛密信 · ${n}/4`;
  $('caption-text').textContent =
    n === 0
      ? engine && engine.panLimit() > 0
        ? '拖封蜡撕开两座城；拖动画面左右平移，找齐四件信物。'
        : '按住中央封蜡左右拖动，撕开同一条街的两个世界；点选画中信物翻阅档案。'
      : ready
        ? '两座城的回声已经足够响亮——右下角的火漆密信可以启封了。'
        : `已翻阅 ${n} 份档案。试着把裂隙拖过同一件信物，看它在对岸变成什么。`;
}

// ============================ GLOSS ============================
function openVocab(key, trigger) {
  const g = GLOSS_LEXICON[key];
  if (!g) return;
  $('vocab-word').textContent = g.word;
  $('vocab-ipa').textContent = g.ipa ? `  ${g.ipa}` : '';
  $('vocab-meaning').textContent = g.meaning;
  $('vocab-context').textContent = g.context;
  if (state.beat === 'prologue') state.speak = PROLOGUE_COUPLETS[state.coupletIndex].speak;
  else if (state.active) state.speak = DUAL_ANCHORS.find((a) => a.id === state.active.id)[state.active.side].speak;
  else state.speak = g.word;
  vocab.classList.remove('hidden');
  const r = trigger.getBoundingClientRect();
  const w = vocab.offsetWidth;
  const h = vocab.offsetHeight;
  let left = Math.max(12, Math.min(window.innerWidth - w - 12, r.left + r.width / 2 - w / 2));
  let top = r.top - h - 10;
  if (top < 70) top = Math.min(window.innerHeight - h - 12, r.bottom + 10);
  vocab.style.left = `${left}px`;
  vocab.style.top = `${top}px`;
}

document.addEventListener('click', (e) => {
  const g = e.target.closest('.gloss-term');
  if (g) {
    e.stopPropagation();
    openVocab(g.dataset.term, g);
    return;
  }
  if (!vocab.classList.contains('hidden') && !vocab.contains(e.target)) vocab.classList.add('hidden');
});
$('btn-close-vocab').addEventListener('click', () => vocab.classList.add('hidden'));
$('btn-speak').addEventListener('click', () => audio.speakEnglishSnippet(state.speak));

// ============================ PROLOGUE ============================
function buildTabs() {
  const box = $('couplet-tabs');
  PROLOGUE_COUPLETS.forEach((_, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'couplet-tab';
    b.textContent = ROMAN[i];
    b.addEventListener('click', () => {
      state.coupletIndex = i;
      renderCouplet();
      audio.playPageTurn();
    });
    box.appendChild(b);
  });
}

function renderCouplet() {
  const c = PROLOGUE_COUPLETS[state.coupletIndex];
  $('couplet-counter').textContent = `${ROMAN[state.coupletIndex]} / VI`;
  $('couplet-en').innerHTML = `<span class="clause-london">${rich(c.enLeft)}</span> <span class="clause-paris">${rich(c.enRight)}</span>`;
  $('couplet-zh').innerHTML = `<span class="clause-london">${esc(c.zhLeft)}</span><span class="clause-paris">${esc(c.zhRight)}</span>`;
  document.querySelectorAll('.couplet-tab').forEach((t, i) => t.classList.toggle('active', i === state.coupletIndex));
}

const stepCouplet = (d) => {
  state.coupletIndex = (state.coupletIndex + d + PROLOGUE_COUPLETS.length) % PROLOGUE_COUPLETS.length;
  renderCouplet();
  audio.playPageTurn();
};
$('btn-prev-couplet').addEventListener('click', () => stepCouplet(-1));
$('btn-next-couplet').addEventListener('click', () => stepCouplet(1));

// ============================ BEATS ============================
let revealTimer = null;
function setBeat(beat) {
  state.beat = beat;
  app.dataset.beat = beat;
  clearTimeout(revealTimer);
  if (beat === 'prologue') {
    closeDossier();
    engine?.setScene(0);
    tweenSeam(1, 600);
  } else {
    engine?.setScene(1);
    applySeam(1);
    revealTimer = setTimeout(() => tweenSeam(0.52, 1800), 1500);
  }
}

$('btn-enter').addEventListener('click', () => {
  audio.playPageTurn();
  setBeat('theatre');
});
$('btn-back-prologue').addEventListener('click', () => setBeat('prologue'));
$('home-link').addEventListener('click', (e) => {
  e.preventDefault();
  setBeat('prologue');
});

// ============================ TOOLS ============================
const LANGS = [
  { key: 'bilingual', label: '中英对照' },
  { key: 'en', label: '英文原著' },
  { key: 'zh', label: '中文译本' }
];
$('btn-lang').addEventListener('click', () => {
  const i = LANGS.findIndex((l) => l.key === state.lang);
  const next = LANGS[(i + 1) % LANGS.length];
  state.lang = next.key;
  app.dataset.lang = next.key;
  $('btn-lang').textContent = next.label;
});

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

// ============================ CIPHER ============================
const PHRASE = 'RECALLED TO LIFE';
const TARGET = 56.25; // 1775 on a 1757–1789 dial
const yearOf = (v) => Math.round(1757 + v * 0.32);

function showStep(step) {
  ['seal', 'decode', 'finale'].forEach((s) => $(`step-${s}`).classList.toggle('hidden', s !== step));
}

$('btn-open-cipher').addEventListener('click', () => {
  closeDossier();
  vocab.classList.add('hidden');
  cipher.classList.remove('hidden');
  showStep(state.solved ? 'finale' : 'seal');
  audio.playPageTurn();
});
$('btn-close-cipher').addEventListener('click', () => cipher.classList.add('hidden'));
cipher.addEventListener('click', (e) => {
  if (e.target === cipher) cipher.classList.add('hidden');
});

$('btn-break-seal').addEventListener('click', () => {
  audio.playWaxShatter();
  $('btn-break-seal').classList.add('broken');
  setTimeout(() => {
    $('btn-break-seal').classList.remove('broken');
    $('resonance').value = '18';
    readDial(18);
    showStep('decode');
  }, 380);
});

function readDial(v) {
  const year = yearOf(v);
  const diff = Math.abs(v - TARGET);
  const ratio = Math.max(0, 1 - diff / 45);
  $('res-percent').textContent = String(year);
  let idx = 0;
  const out = PHRASE.split(' ')
    .map((w) => [...w].map((ch) => (((idx++ * 37) % 100) / 100 < ratio ? ch : '_')).join(' '))
    .join('   ');
  const preview = $('cipher-preview');
  preview.textContent = out;
  preview.classList.remove('solved');
  if (year === 1775 && !state.solved) {
    state.solved = true;
    preview.textContent = 'R E C A L L E D   T O   L I F E';
    preview.classList.add('solved');
    audio.playUnlockChime();
    setTimeout(() => showStep('finale'), 900);
  }
}
$('resonance').addEventListener('input', (e) => readDial(Number(e.target.value)));

$('btn-free-explore').addEventListener('click', () => {
  cipher.classList.add('hidden');
  if (state.beat !== 'theatre') setBeat('theatre');
});
$('btn-replay').addEventListener('click', () => {
  cipher.classList.add('hidden');
  state.solved = false;
  state.coupletIndex = 0;
  renderCouplet();
  setBeat('prologue');
});

window.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (!cipher.classList.contains('hidden')) cipher.classList.add('hidden');
  else if (!vocab.classList.contains('hidden')) vocab.classList.add('hidden');
  else closeDossier();
});

// ============================ INIT ============================
buildTabs();
renderCouplet();
buildAnchors();
applySeam(1);
updateProgress();
