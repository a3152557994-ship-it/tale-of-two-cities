import './style.css';
import { PaintedTearEngine } from './engine/PaintedTearEngine.js';
import { ChamberScore } from './audio/ChamberScore.js';
import { mountOrnaments } from './ui/ornaments.js';
import { DAILY_ORDERS, VERDICT_ENDINGS } from './data/gateCases.js';
import { GatekeeperCore } from './game/GatekeeperCore.js';
import { renderShareCard } from './game/ShareCard.js';
import { track } from './game/track.js';
import londonUrl from './assets/london-street.jpg';
import parisUrl from './assets/paris-street.jpg';
import prologueUrl from './assets/prologue-channel.jpg';
import { createFallbackStage } from './minitool/FallbackStage.js';
import * as mt from './minitool/platform.js';

const IS_MINITOOL = import.meta.env.VITE_TARGET === 'minitool';
const GAME_URL = IS_MINITOOL ? '' : 'https://a3152557994-ship-it.github.io/tale-of-two-cities/';

const PORTRAITS = Object.fromEntries(
  Object.entries(import.meta.glob('./assets/portraits/*.jpg', { eager: true, import: 'default' })).map(([k, v]) => [
    k.replace(/^.*portrait-(.+)\.jpg$/, '$1'),
    v
  ])
);

const VERDICT_PORTRAIT = {
  fired_guillotine: 'mme_defarge',
  night_watchman: 'carton',
  iron_hound: 'defarge',
  clever_survivor: 'noble_disguise'
};

const $ = (id) => document.getElementById(id);
const app = $('app');
const stage = $('stage');

const core = new GatekeeperCore();
const audio = new ChamberScore();
mountOrnaments();

// ---------------- persistence ----------------
const STORE = 'ttc.gatekeeper.v1';
const album = (() => {
  if (IS_MINITOOL) return { endings: [], runs: 0, bestClues: 0 };
  try {
    return { endings: [], runs: 0, bestClues: 0, ...JSON.parse(localStorage.getItem(STORE) || '{}') };
  } catch (e) {
    return { endings: [], runs: 0, bestClues: 0 };
  }
})();

function saveAlbum() {
  if (IS_MINITOOL) {
    mt.setLocalData(STORE, album);
    return;
  }
  try {
    localStorage.setItem(STORE, JSON.stringify(album));
  } catch (e) {
    /* ignore */
  }
}

if (IS_MINITOOL) {
  mt.getLocalData(STORE).then((saved) => {
    if (saved && typeof saved === 'object') {
      if (Array.isArray(saved.endings)) album.endings = saved.endings;
      if (typeof saved.runs === 'number') album.runs = saved.runs;
      if (typeof saved.bestClues === 'number') album.bestClues = saved.bestClues;
      updateAlbumCount();
    }
  });
}

const state = {
  beat: 'prologue',
  lang: 'zh',
  mono: false,
  busy: false,
  activeTab: 'passport',
  timerSec: 60,
  timerHandle: null,
  lastVerdict: null,
  pendingResult: null,
  shareUrl: ''
};

const esc = (s) =>
  String(s == null ? '' : s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
const L = (zh, en) => (state.lang === 'en' && en ? en : zh);

// ---------------- WebGL / Fallback background ----------------
let engine = null;
let seam = 0.28;
let seamTarget = 0.28;

function stepSeam() {
  const prev = seam;
  seam += (seamTarget - seam) * 0.06;
  if (engine) engine.setSeam(seam, (seam - prev) * 1.8);
  audio.updateSeam(seam);
}

function useFallbackStage(seamNow = 0.28) {
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
    return new Promise((r) => setTimeout(r, 1000)).then(() => loadPaintings(sources, tries - 1));
  });
}

function loadTheatre() {
  loadPaintings({ london: londonUrl, paris: parisUrl }).catch(() => {
    if (engine && engine.isFallback) return;
    mt.showNotice('部分油画没能装裱好', '重试', loadTheatre);
  });
}

if (IS_MINITOOL) {
  try {
    engine = new PaintedTearEngine(stage.querySelector('canvas'), {
      onFrame: stepSeam,
      onProgress: (p) => ($('curtain-bar').style.width = `${Math.round(p * 100)}%`),
      budget: { maxDpr: 1.5, maxPixels: 2e6, adaptive: true },
      onFallback: () => useFallbackStage(seam)
    });
    engine.setSeam(0.28);
    loadPaintings({ prologue: prologueUrl })
      .catch(() => mt.showNotice('扉页油画没能装裱好', '重试', () => loadPaintings({ prologue: prologueUrl }).catch(() => {})))
      .then(() => setTimeout(() => $('curtain').classList.add('gone'), 260));
    loadTheatre();
  } catch (e) {
    useFallbackStage(0.28);
  }
} else {
  try {
    engine = new PaintedTearEngine(stage.querySelector('canvas'), {
      onFrame: stepSeam,
      onProgress: (p) => ($('curtain-bar').style.width = `${Math.round(p * 100)}%`)
    });
    engine.setSeam(0.28);
    engine
      .load({ london: londonUrl, paris: parisUrl, prologue: prologueUrl })
      .then(() => setTimeout(() => $('curtain').classList.add('gone'), 260))
      .catch(() => $('curtain').classList.add('gone'));
  } catch (e) {
    $('curtain').classList.add('gone');
    stage.style.background = `center / cover no-repeat url(${prologueUrl})`;
  }
}

document.addEventListener('visibilitychange', () => {
  if (!audio.ctx) return;
  if (document.hidden && audio.ctx.state === 'running') audio.ctx.suspend().catch(() => {});
  else if (!document.hidden && audio.enabled && audio.ctx.state === 'suspended') audio.ctx.resume().catch(() => {});
});

// ---------------- UI Helpers ----------------
function setBeat(b) {
  state.beat = b;
  app.dataset.beat = b;
  if (engine) engine.setScene(b === 'prologue' ? 0 : 1);
  if (b !== 'game') stopCaseTimer();
}

function switchTab(tabName) {
  state.activeTab = tabName;
  document.querySelectorAll('.desk-tab').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  document.querySelectorAll('.desk-panel').forEach((pan) => {
    pan.classList.toggle('active', pan.dataset.panel === tabName);
  });
}

document.querySelectorAll('.desk-tab').forEach((btn) => {
  btn.addEventListener('click', () => {
    switchTab(btn.dataset.tab);
    audio.playPageTurn();
  });
});

function renderOrders() {
  $('orders-list').innerHTML = DAILY_ORDERS.map(
    (o) => `<li><b>${esc(L(o.tag, o.tagEn))}：</b>${esc(L(o.text, o.textEn))}</li>`
  ).join('');
}

function updateHud() {
  const c = core.currentCase;
  if (!c) return;
  $('hud-case').textContent = L(c.banner, c.bannerEn);
  $('hud-gold').innerHTML = `💰 ${L('金币', 'Gold')} <b>${core.gold}</b>`;
  const stEl = $('hud-strikes');
  stEl.innerHTML = `⚠️ ${L('记过', 'Strikes')} <b>${core.strikes}/2</b>`;
  stEl.classList.toggle('danger', core.strikes >= 1);
  const foundN = core.foundClues.length;
  $('hud-clues').innerHTML = `🔍 ${L('破绽', 'Clues')} <b>${foundN}/${c.clues.length}</b>`;
  $('tab-clue-num').textContent = String(foundN);

  const trunkDone = core.trunkOpened[c.id];
  $('btn-trunk').disabled = trunkDone;
  $('btn-trunk').textContent = trunkDone ? L('🧳 已搜查行李', '🧳 Trunk Searched') : L('🧳 撬箱搜身', '🧳 Search Trunk');

  $('btn-informant').disabled = core.informantLeft <= 0;
  $('btn-informant').textContent =
    core.informantLeft > 0 ? L(`👁 透视破绽 (${core.informantLeft})`, `👁 Scan (${core.informantLeft})`) : L('👁 透视已用', '👁 Used');
}

function renderEvidenceList() {
  const list = core.foundClues;
  const box = $('evidence-list');
  if (!list.length) {
    box.innerHTML = `<p class="ev-empty">${esc(
      L('尚未锁定破绽——请拖动放大镜照嫌犯，核验通行证印章，或点击「撬箱搜身」。', 'No clues yet — drag the magnifier over the suspect, inspect the seal, or search the trunk.')
    )}</p>`;
    return;
  }
  box.innerHTML = list
    .map(
      (cl) =>
        `<div class="ev-item ${cl.severity}"><b>${cl.itemIcon ? cl.itemIcon + ' ' : ''}${esc(L(cl.label, cl.labelEn))}</b>${esc(
          L(cl.detail, cl.detailEn)
        )}</div>`
    )
    .join('');
}

function renderBribeIfActive(playSfx = false) {
  const c = core.currentCase;
  const bar = $('bribe-bar');
  if (!c || !core.isBribeActive || !c.bribe) {
    bar.classList.add('hidden');
    return;
  }
  const wasHidden = bar.classList.contains('hidden');
  $('bribe-amt').textContent = String(c.bribe.amount);
  $('bribe-pitch').textContent = L(c.bribe.pitch, c.bribe.pitchEn);
  bar.classList.remove('hidden');
  if (wasHidden && playSfx) audio.playCoinPouch();
}

// ---------------- Case Rendering & Hotspots ----------------
function renderCurrentCase() {
  const c = core.currentCase;
  if (!c) return;
  state.busy = false;
  seamTarget = c.order === 3 ? 0.45 : 0.24;

  const pImg = PORTRAITS[c.portrait] || PORTRAITS.citizen;
  $('suspect-img').src = pImg;
  $('mag-inner').style.backgroundImage = `url(${pImg})`;
  $('lens-hint').classList.remove('hidden');

  // Wanted poster (Case 3)
  const wp = $('wanted-poster');
  if (c.wantedPortrait) {
    $('wanted-img').src = PORTRAITS[c.wantedPortrait];
    $('wanted-name').textContent = L(c.wantedName, c.wantedNameEn);
    wp.classList.remove('hidden');
  } else {
    wp.classList.add('hidden');
  }

  // Portrait clue hotspots
  const layer = $('hotspot-layer');
  layer.innerHTML = '';
  c.clues
    .filter((cl) => cl.where === 'portrait')
    .forEach((cl) => {
      const spot = document.createElement('div');
      spot.className = 'clue-spot';
      spot.id = `spot-${cl.id}`;
      spot.style.left = `${cl.x * 100}%`;
      spot.style.top = `${cl.y * 100}%`;
      spot.dataset.tag = L(cl.label, cl.labelEn);
      if (core.hasClue(cl.id)) spot.classList.add('found');
      layer.appendChild(spot);
    });

  // Dialogue & Bribe
  $('speech-line').textContent = L(c.openingLine, c.openingLineEn);
  $('bribe-bar').classList.add('hidden');
  renderBribeIfActive(false);

  // Passport
  $('doc-num').textContent = c.docNumber;
  $('doc-photo').src = PORTRAITS[c.docPortrait] || pImg;
  $('doc-name').textContent = L(c.name, c.nameEn);
  $('doc-role').textContent = L(c.claimedRole, c.claimedRoleEn);
  $('doc-dest').textContent = L(c.destination, c.destinationEn);
  $('doc-year').textContent = L(c.docYearText, c.docYearTextEn);
  $('doc-seal-label').textContent = L(c.docSealLabel, c.docSealLabelEn);

  const sealBtn = $('btn-doc-seal');
  sealBtn.classList.remove('checked-bad', 'checked-ok');
  const passClue = c.clues.find((cl) => cl.where === 'passport');
  if (passClue && core.hasClue(passClue.id)) {
    sealBtn.classList.add(c.docSealFake || passClue.severity !== 'clear' ? 'checked-bad' : 'checked-ok');
  }

  $('slammed-stamp').classList.add('hidden');
  switchTab('passport');
  renderOrders();
  renderEvidenceList();
  updateHud();
  startCaseTimer();
}

// ---------------- Timer ----------------
function stopCaseTimer() {
  if (state.timerHandle) {
    clearInterval(state.timerHandle);
    state.timerHandle = null;
  }
}

function startCaseTimer() {
  stopCaseTimer();
  state.timerSec = 60;
  const pill = $('hud-timer');
  const num = $('timer-sec');
  num.textContent = '60';
  pill.classList.remove('danger');

  state.timerHandle = setInterval(() => {
    if (state.beat !== 'game' || state.busy) return;
    state.timerSec = Math.max(0, state.timerSec - 1);
    num.textContent = String(state.timerSec);
    pill.classList.toggle('danger', state.timerSec <= 15);
    if (state.timerSec <= 0) {
      stopCaseTimer();
      executeStamp('pass');
    }
  }, 1000);
}

// ---------------- Magnifying Glass Interaction ----------------
const pFrame = $('portrait-frame');
const magLens = $('mag-lens');
const magInner = $('mag-inner');
let inspecting = false;

function handleLensAt(clientX, clientY) {
  if (state.beat !== 'game' || state.busy) return;
  const rect = pFrame.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
  const y = Math.max(0, Math.min(rect.height, clientY - rect.top));
  const nx = x / rect.width;
  const ny = y / rect.height;

  magLens.classList.remove('hidden');
  $('lens-hint').classList.add('hidden');
  magLens.style.left = `${x}px`;
  magLens.style.top = `${y}px`;

  const zoom = 2.25;
  const lensSize = magLens.offsetWidth || 120;
  magInner.style.backgroundSize = `${rect.width * zoom}px ${rect.height * zoom}px`;
  magInner.style.backgroundPosition = `${lensSize / 2 - x * zoom}px ${lensSize / 2 - y * zoom}px`;

  const hit = core.probePortrait(nx, ny, 0.135);
  if (hit && hit.isNew) {
    onClueUnlocked(hit);
  }
}

function onClueUnlocked(res) {
  const cl = res.clue;
  audio.playClueFound();
  const spot = $(`spot-${cl.id}`);
  if (spot) {
    spot.classList.remove('reveal');
    spot.classList.add('found');
    spot.dataset.tag = L(cl.label, cl.labelEn);
  }
  if (cl.reaction) {
    $('speech-line').textContent = L(cl.reaction, cl.reactionEn);
  }
  renderEvidenceList();
  updateHud();
  if (res.bribeUnlocked) {
    renderBribeIfActive(true);
  }
}

pFrame.addEventListener('pointerdown', (e) => {
  if (state.beat !== 'game' || state.busy) return;
  inspecting = true;
  if (pFrame.setPointerCapture) {
    try {
      pFrame.setPointerCapture(e.pointerId);
    } catch (err) {
      /* ignore */
    }
  }
  handleLensAt(e.clientX, e.clientY);
});

pFrame.addEventListener('pointermove', (e) => {
  if (!inspecting && e.pointerType === 'touch') return;
  if (e.pointerType !== 'touch' || inspecting) {
    handleLensAt(e.clientX, e.clientY);
  }
});

function stopLens() {
  inspecting = false;
  magLens.classList.add('hidden');
}
pFrame.addEventListener('pointerup', stopLens);
pFrame.addEventListener('pointercancel', stopLens);
pFrame.addEventListener('pointerleave', () => {
  if (!inspecting) magLens.classList.add('hidden');
});

// ---------------- Passport Seal, Trunk & Informant ----------------
$('btn-doc-seal').addEventListener('click', () => {
  if (state.busy || !core.currentCase) return;
  const c = core.currentCase;
  const passClue = c.clues.find((cl) => cl.where === 'passport');
  if (!passClue) return;
  const res = core.inspectClue(passClue.id);
  const btn = $('btn-doc-seal');
  btn.classList.add(c.docSealFake || passClue.severity !== 'clear' ? 'checked-bad' : 'checked-ok');
  $('doc-seal-label').textContent = `${L(passClue.label, passClue.labelEn)} — ${L(passClue.detail, passClue.detailEn)}`;
  if (res && res.isNew) {
    onClueUnlocked(res);
  } else {
    audio.playPageTurn();
  }
});

$('btn-trunk').addEventListener('click', () => {
  if (state.busy || !core.currentCase) return;
  audio.playTrunkOpen();
  const res = core.openTrunk();
  if (res && res.clue) {
    if (res.isNew) onClueUnlocked(res);
    switchTab('evidence');
  }
  updateHud();
});

$('btn-informant').addEventListener('click', () => {
  if (state.busy || !core.currentCase) return;
  const info = core.useInformant();
  if (!info) return;
  audio.playUnlockChime();
  info.remaining.forEach((cl) => {
    if (cl.where === 'portrait') {
      const spot = $(`spot-${cl.id}`);
      if (spot) spot.classList.add('reveal');
    } else if (cl.where === 'passport') {
      switchTab('passport');
      $('btn-doc-seal').classList.add('checked-bad');
    }
  });
  $('speech-line').textContent = L(
    `【线人密报】此人身上或证件仍有 ${info.remaining.length} 处关键线索未查验（已用金圈标出）！`,
    `[Informant] ${info.remaining.length} hidden clues remain — check the glowing rings & trunk!`
  );
  updateHud();
  track('use_informant', { caseId: core.currentCase.id });
});

// ---------------- Stamp Slam & Round Resolution ----------------
function executeStamp(action) {
  if (state.busy || !core.currentCase) return;
  state.busy = true;
  stopCaseTimer();

  const isDetain = action === 'detain';
  audio.playStampSlam(isDetain);

  const stampEl = $('slammed-stamp');
  stampEl.textContent = isDetain ? L('押赴断头台', 'GUILLOTINE') : L('准予出关', 'APPROVED');
  stampEl.className = `slammed-stamp ${isDetain ? 'detain' : 'pass'}`;
  switchTab('passport');

  stage.classList.remove('shake');
  void stage.offsetWidth;
  stage.classList.add('shake');

  seamTarget = isDetain ? 0.06 : 0.86;

  const res = core.stamp(action);
  state.pendingResult = res;
  track('case_stamp', { caseId: res.record.caseId, action, tag: res.record.tag });

  setTimeout(() => {
    const rec = res.record;
    $('round-kicker').textContent = L(`第 ${core.history.length} 审结案单`, `CASE ${core.history.length} REPORT`);
    $('round-title').textContent = `${rec.name} · ${rec.tag}`;
    $('round-desc').textContent = L(rec.summary, rec.summaryEn);

    const goldStr = rec.goldDelta >= 0 ? `+${rec.goldDelta}` : String(rec.goldDelta);
    $('round-deltas').innerHTML = `
      <span class="delta-tag">💰 ${L('金币', 'Gold')} ${goldStr}</span>
      <span class="delta-tag">⚠️ ${L('督察记过', 'Strikes')} +${rec.strikeDelta}</span>
      <span class="delta-tag">🔍 ${L('查出破绽', 'Clues')} ${rec.cluesFound}/${rec.cluesTotal}</span>
    `;

    $('btn-next-case').textContent = res.verdict
      ? L('宣读最终审判官鉴定书 →', 'Read Final Verdict →')
      : L('传下一名过关者 →', 'Call Next Suspect →');
    $('round-modal').classList.remove('hidden');
  }, 680);
}

$('btn-stamp-pass').addEventListener('click', () => executeStamp('pass'));
$('btn-stamp-detain').addEventListener('click', () => executeStamp('detain'));

$('btn-next-case').addEventListener('click', () => {
  $('round-modal').classList.add('hidden');
  audio.playPageTurn();
  const pending = state.pendingResult;
  state.pendingResult = null;
  if (!pending) return;
  if (pending.verdict) {
    showFinalVerdict(pending.verdict);
  } else {
    renderCurrentCase();
  }
});

// ---------------- Final Verdict & Share Card ----------------
function showFinalVerdict(v) {
  state.lastVerdict = v;
  state.busy = false;
  album.runs += 1;
  album.bestClues = Math.max(album.bestClues, v.cluesFound);
  if (album.endings.indexOf(v.key) === -1) album.endings.push(v.key);
  saveAlbum();
  updateAlbumCount();
  track('shift_end', { ending: v.key, gold: v.gold, clues: v.cluesFound });

  seamTarget = v.city === 'paris' ? 0.08 : 0.88;
  $('ending-kicker').textContent = L(v.rank, v.rankEn);
  $('ending-title').textContent = L(v.title, v.titleEn);
  $('ending-stats').textContent = L(
    `共检出破绽 ${v.cluesFound}/${v.cluesPossible} 处 · 结余 ${v.gold} 金币 · 督察记过 ${v.strikes}/2`,
    `Clues: ${v.cluesFound}/${v.cluesPossible} · Gold: ${v.gold} · Strikes: ${v.strikes}/2`
  );
  $('ending-epitaph').textContent = L(v.epitaph, v.epitaphEn);

  $('verdict-log').innerHTML = v.history
    .map(
      (h, idx) =>
        `<div class="vlog-row"><span>${idx + 1}. ${esc(h.name)}（${esc(h.tag)}）</span><b class="${h.action}">${
          h.action === 'detain' ? L('🔴 红章扣押', '🔴 GUILLOTINE') : L('🟢 绿章放行', '🟢 APPROVED')
        }</b></div>`
    )
    .join('');

  $('ending').classList.remove('hidden');
  setBeat('ending');
  audio.playUnlockChime();
}

function startNewShift() {
  core.reset();
  $('ending').classList.add('hidden');
  $('round-modal').classList.add('hidden');
  setBeat('game');
  renderCurrentCase();
  track('shift_start', { runs: album.runs });
}

$('btn-enter').addEventListener('click', async () => {
  if (!audio.enabled) {
    const on = await audio.toggle();
    $('btn-audio').setAttribute('aria-pressed', String(on));
    $('btn-audio').textContent = on ? L('声音开', 'Sound On') : L('声音关', 'Sound Off');
  } else {
    audio.playPageTurn();
  }
  startNewShift();
});

$('btn-again').addEventListener('click', () => {
  audio.playPageTurn();
  startNewShift();
});

$('home-link').addEventListener('click', (e) => {
  e.preventDefault();
  $('ending').classList.add('hidden');
  $('round-modal').classList.add('hidden');
  setBeat('prologue');
});

// Share modal
$('btn-share').addEventListener('click', async () => {
  const v = state.lastVerdict;
  if (!v) return;
  const btn = $('btn-share');
  btn.disabled = true;
  btn.textContent = L('正在钤印鉴定书…', 'Sealing Verdict…');
  try {
    const url = await renderShareCard({
      verdict: v,
      cityImage: v.city === 'paris' ? parisUrl : londonUrl,
      portrait: PORTRAITS[VERDICT_PORTRAIT[v.key] || 'lorry'],
      url: GAME_URL,
      lang: state.lang
    });
    $('share-img').src = url;
    if (IS_MINITOOL) {
      state.shareUrl = url;
      $('share-tip').textContent = L('点「保存到相册」，把鉴定书存进手机', 'Tap “Save to album” to keep this card');
    } else {
      $('share-download').href = url;
    }
    $('share').classList.remove('hidden');
    track('share_verdict', { ending: v.key });
  } catch (err) {
    console.error(err);
  }
  btn.disabled = false;
  btn.textContent = L('生成审判官鉴定书', 'Generate Verdict Card');
});

$('btn-close-share').addEventListener('click', () => $('share').classList.add('hidden'));

if (IS_MINITOOL) {
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
    const text = `1792 加来城门，这三个人里谁是伪装贵族？90% 的人第一审就盖错章：${GAME_URL}`;
    try {
      await navigator.clipboard.writeText(text);
      $('btn-copy-link').textContent = '已复制';
    } catch (e) {
      prompt('复制这段链接：', text);
    }
    track('copy_link', {});
  });
}

// Album modal
function updateAlbumCount() {
  $('album-count').textContent = String(album.endings.length);
  $('album-total').textContent = `/${Object.keys(VERDICT_ENDINGS).length}`;
}

$('btn-album').addEventListener('click', () => {
  const keys = Object.keys(VERDICT_ENDINGS);
  $('album-desc').textContent = `已解锁 ${album.endings.length}/${keys.length} 种审判结局 · 累计执勤 ${album.runs} 班 · 单班最高查出 ${album.bestClues} 处破绽`;
  $('album-endings').innerHTML = keys
    .map((k) => {
      const e = VERDICT_ENDINGS[k];
      const got = album.endings.indexOf(k) !== -1;
      return got
        ? `<div class="album-item"><b>${esc(L(e.title, e.titleEn))}</b><span>${esc(L(e.epitaph, e.epitaphEn))}</span></div>`
        : `<div class="album-item locked"><b>？？？</b><span>${esc(L(e.rank, e.rankEn))}</span></div>`;
    })
    .join('');
  $('album').classList.remove('hidden');
});

$('btn-close-album').addEventListener('click', () => $('album').classList.add('hidden'));
['share', 'album'].forEach((id) => {
  $(id).addEventListener('click', (e) => {
    if (e.target.id === id) $(id).classList.add('hidden');
  });
});

// Top Tools
$('btn-lang').addEventListener('click', () => {
  state.lang = state.lang === 'zh' ? 'en' : 'zh';
  app.dataset.lang = state.lang;
  $('btn-lang').textContent = state.lang === 'zh' ? '中文' : 'English';
  $('lbl-pass-main').textContent = L('盖绿章 · 准予出关', 'GREEN STAMP · PASS');
  $('lbl-pass-sub').textContent = L('放行登船前往多佛', 'Clear for Dover Boat');
  $('lbl-detain-main').textContent = L('盖红章 · 押上断头台', 'RED STAMP · DETAIN');
  $('lbl-detain-sub').textContent = L('卫兵锁拿严办', 'Arrest & Guillotine');
  if (state.beat === 'game') renderCurrentCase();
  if (state.beat === 'ending' && state.lastVerdict) showFinalVerdict(state.lastVerdict);
});

$('btn-style').addEventListener('click', () => {
  state.mono = !state.mono;
  if (engine) engine.setMono(state.mono);
  $('btn-style').setAttribute('aria-pressed', String(state.mono));
  $('btn-style').textContent = state.mono ? '油画' : '铜版画';
});

async function toggleAudio() {
  const on = await audio.toggle();
  $('btn-audio').setAttribute('aria-pressed', String(on));
  $('btn-audio').textContent = on ? '声音开' : '声音关';
  $('btn-pro-audio').textContent = on ? '声效已开启' : '开启声效与配乐';
}
$('btn-audio').addEventListener('click', toggleAudio);
$('btn-pro-audio').addEventListener('click', toggleAudio);

updateAlbumCount();
renderOrders();
track('visit_gatekeeper', { returning: album.runs > 0 });
