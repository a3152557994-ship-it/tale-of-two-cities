import './style.css';
import { DualWorldEngine } from './engine/DualWorldEngine.js';
import { ChamberScore } from './audio/ChamberScore.js';
import { GLOSS_LEXICON, PROLOGUE_COUPLETS, DUAL_ANCHORS } from './data/act1Content.js';

const app = document.getElementById('app');
const canvas = document.getElementById('stage-canvas');
const loadingCurtain = document.getElementById('loading-curtain');

// HUD & Seam
const seamDivider = document.getElementById('seam-divider');
const seamHandle = document.getElementById('seam-handle');
const hudCityStatus = document.getElementById('hud-city-status');
const progressText = document.getElementById('progress-text');
const btnStyle = document.getElementById('btn-style');
const btnStyleLabel = document.getElementById('btn-style-label');
const btnLang = document.getElementById('btn-lang');
const btnLangLabel = document.getElementById('btn-lang-label');
const btnAudio = document.getElementById('btn-audio');
const btnAudioLabel = document.getElementById('btn-audio-label');

// Beat 1: Prologue
const prologuePanel = document.getElementById('prologue-panel');
const coupletStage = document.getElementById('couplet-stage');
const coupletEn = document.getElementById('couplet-en');
const coupletZh = document.getElementById('couplet-zh');
const coupletCounter = document.getElementById('couplet-counter');
const coupletDots = document.getElementById('couplet-dots');
const polLondonLabel = document.getElementById('pol-london-label');
const polParisLabel = document.getElementById('pol-paris-label');
const btnPrevCouplet = document.getElementById('btn-prev-couplet');
const btnNextCouplet = document.getElementById('btn-next-couplet');
const btnEnterDiorama = document.getElementById('btn-enter-diorama');

// Beat 2: Diorama & Anchors
const dioramaHud = document.getElementById('diorama-hud');
const anchorsLayer = document.getElementById('anchors-layer');
const btnBackPrologue = document.getElementById('btn-back-prologue');
const btnOpenCipher = document.getElementById('btn-open-cipher');
const btnCipherLabel = document.getElementById('btn-cipher-label');

// Dossier Drawer
const dossierDrawer = document.getElementById('dossier-drawer');
const btnCloseDossier = document.getElementById('btn-close-dossier');
const dossierSideBadge = document.getElementById('dossier-side-badge');
const dossierChapter = document.getElementById('dossier-chapter');
const dossierTitle = document.getElementById('dossier-title');
const dossierMirrorHint = document.getElementById('dossier-mirror-hint');
const dossierQuoteEn = document.getElementById('dossier-quote-en');
const dossierQuoteZh = document.getElementById('dossier-quote-zh');
const dossierNotes = document.getElementById('dossier-notes');
const btnFlipMirror = document.getElementById('btn-flip-mirror');

// Vocab Popover
const vocabPopover = document.getElementById('vocab-popover');
const vocabWord = document.getElementById('vocab-word');
const vocabIpa = document.getElementById('vocab-ipa');
const vocabMeaning = document.getElementById('vocab-meaning');
const vocabContext = document.getElementById('vocab-context');
const btnSpeakVocab = document.getElementById('btn-speak-vocab');
const btnCloseVocab = document.getElementById('btn-close-vocab');

// Beat 3: Cipher Modal
const cipherModal = document.getElementById('cipher-modal');
const btnCloseCipher = document.getElementById('btn-close-cipher');
const cipherStepSeal = document.getElementById('cipher-step-seal');
const cipherStepDecode = document.getElementById('cipher-step-decode');
const cipherStepFinale = document.getElementById('cipher-step-finale');
const btnBreakSeal = document.getElementById('btn-break-seal');
const resonanceSlider = document.getElementById('resonance-slider');
const resPercent = document.getElementById('res-percent');
const cipherRevealPreview = document.getElementById('cipher-reveal-preview');
const finaleDossierCount = document.getElementById('finale-dossier-count');
const btnFreeExplore = document.getElementById('btn-free-explore');
const btnReplayAct1 = document.getElementById('btn-replay-act1');

// State
const state = {
  beat: 'prologue', // 'prologue' | 'diorama' | 'finale'
  seamX: 0.5,
  coupletIndex: 0,
  langMode: 'bilingual', // 'bilingual' | 'en' | 'zh'
  monoMode: false,
  visitedDossiers: new Set(),
  activeAnchorId: null,
  activeDossierSide: null,
  lastPinSides: {},
  lastProjected: [],
  currentSpeakText: '',
  seamTween: null,
  cipherSolved: false
};

const audio = new ChamberScore();

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function renderRichText(raw) {
  return escapeHtml(raw).replace(/\{\{([a-z0-9_]+)\|([^}]+)\}\}/gi, (_, key, label) => {
    return `<span class="gloss-term" data-term="${key}" role="button" tabindex="0">${label}</span>`;
  });
}

// ==================== ENGINE BOOT ====================
let hideTimer = setTimeout(() => {
  loadingCurtain.classList.add('fade-out');
}, 4800);

const engine = new DualWorldEngine(canvas, {
  onLoaded: () => {
    clearTimeout(hideTimer);
    setTimeout(() => {
      loadingCurtain.classList.add('fade-out');
    }, 240);
  },
  onError: () => {
    clearTimeout(hideTimer);
    loadingCurtain.classList.add('fade-out');
  },
  onFrame: () => {
    updateSeamAnimation();
    updateProjectedAnchors();
  }
});

// ==================== SEAM CONTROL ====================
function applySeam(x, velocity = 0) {
  const clamped = Math.max(0.04, Math.min(0.96, x));
  state.seamX = clamped;
  engine.setSeam(clamped, velocity);
  audio.updateSeam(clamped);

  const pctLondon = Math.round(clamped * 100);
  const pctParis = 100 - pctLondon;
  seamDivider.style.left = `${clamped * 100}%`;
  seamDivider.setAttribute('aria-valuenow', String(pctLondon));
  hudCityStatus.textContent = `伦敦 LONDON ${pctLondon}% — 巴黎 PARIS ${pctParis}%`;

  // Update prologue polarity visual emphasis
  coupletStage.classList.remove('polarity-london', 'polarity-paris');
  if (clamped > 0.56) {
    coupletStage.classList.add('polarity-london');
  } else if (clamped < 0.44) {
    coupletStage.classList.add('polarity-paris');
  }
}

function animateSeamTo(targetX, durationMs = 520) {
  state.seamTween = {
    startX: state.seamX,
    targetX: Math.max(0.05, Math.min(0.95, targetX)),
    startTime: performance.now(),
    duration: durationMs
  };
}

function updateSeamAnimation() {
  if (!state.seamTween) return;
  const elapsed = performance.now() - state.seamTween.startTime;
  const p = Math.min(1, elapsed / state.seamTween.duration);
  const ease = 1 - Math.pow(1 - p, 3);
  const nextX = state.seamTween.startX + (state.seamTween.targetX - state.seamTween.startX) * ease;
  applySeam(nextX, (state.seamTween.targetX - state.seamTween.startX) * 0.04);
  if (p >= 1) {
    state.seamTween = null;
  }
}

// Seam dragging (mouse & touch via Pointer Events)
let draggingSeam = false;
let lastPointerX = 0;

seamHandle.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  e.stopPropagation();
  draggingSeam = true;
  state.seamTween = null;
  lastPointerX = e.clientX;
  seamDivider.classList.add('dragging');
  engine.setOrbitEnabled(false);
  seamHandle.setPointerCapture(e.pointerId);
});

window.addEventListener('pointermove', (e) => {
  if (!draggingSeam) return;
  const dx = e.clientX - lastPointerX;
  lastPointerX = e.clientX;
  const normX = e.clientX / Math.max(1, window.innerWidth);
  const velocity = dx / Math.max(1, window.innerWidth);
  applySeam(normX, velocity);
});

const stopSeamDrag = () => {
  if (!draggingSeam) return;
  draggingSeam = false;
  seamDivider.classList.remove('dragging');
  engine.setOrbitEnabled(true);
};

window.addEventListener('pointerup', stopSeamDrag);
window.addEventListener('pointercancel', stopSeamDrag);

// Shift + drag anywhere on canvas also moves seam
canvas.addEventListener('pointerdown', (e) => {
  if (e.shiftKey) {
    draggingSeam = true;
    state.seamTween = null;
    lastPointerX = e.clientX;
    seamDivider.classList.add('dragging');
    engine.setOrbitEnabled(false);
  }
});

seamDivider.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft') {
    applySeam(state.seamX - 0.04, -0.02);
  } else if (e.key === 'ArrowRight') {
    applySeam(state.seamX + 0.04, 0.02);
  }
});

// ==================== BEAT 1: PROLOGUE COUPLETS ====================
function buildCoupletDots() {
  coupletDots.innerHTML = '';
  PROLOGUE_COUPLETS.forEach((c, idx) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'couplet-dot';
    dot.setAttribute('aria-label', `第 ${idx + 1} 句`);
    dot.addEventListener('click', () => {
      state.coupletIndex = idx;
      renderCouplet();
      audio.playPageTurn();
    });
    coupletDots.appendChild(dot);
  });
}

function renderCouplet() {
  const c = PROLOGUE_COUPLETS[state.coupletIndex];
  coupletCounter.textContent = `${String(state.coupletIndex + 1).padStart(2, '0')} / ${String(
    PROLOGUE_COUPLETS.length
  ).padStart(2, '0')}`;

  coupletEn.innerHTML = `<span class="clause-london">${renderRichText(c.enLeft)}</span> <span class="clause-paris">${renderRichText(
    c.enRight
  )}</span>`;
  coupletZh.innerHTML = `<span class="clause-london">${escapeHtml(c.zhLeft)}</span><span class="clause-paris">${escapeHtml(
    c.zhRight
  )}</span>`;

  polLondonLabel.textContent = c.londonTag;
  polParisLabel.textContent = c.parisTag;

  const dots = coupletDots.querySelectorAll('.couplet-dot');
  dots.forEach((d, idx) => d.classList.toggle('active', idx === state.coupletIndex));
}

btnPrevCouplet.addEventListener('click', () => {
  state.coupletIndex = (state.coupletIndex - 1 + PROLOGUE_COUPLETS.length) % PROLOGUE_COUPLETS.length;
  renderCouplet();
  audio.playPageTurn();
});

btnNextCouplet.addEventListener('click', () => {
  state.coupletIndex = (state.coupletIndex + 1) % PROLOGUE_COUPLETS.length;
  renderCouplet();
  audio.playPageTurn();
});

// ==================== BEAT TRANSITIONS ====================
function setBeat(beat) {
  state.beat = beat;
  app.dataset.beat = beat;

  if (beat === 'prologue') {
    prologuePanel.classList.remove('hidden');
    dioramaHud.classList.add('hidden');
    anchorsLayer.classList.add('hidden');
    closeDossier();
    engine.focusPreset('prologue', 1.1);
  } else if (beat === 'diorama') {
    prologuePanel.classList.add('hidden');
    dioramaHud.classList.remove('hidden');
    anchorsLayer.classList.remove('hidden');
    engine.focusPreset('diorama', 1.05);
  } else if (beat === 'finale') {
    prologuePanel.classList.add('hidden');
    dioramaHud.classList.remove('hidden');
    anchorsLayer.classList.remove('hidden');
    engine.focusPreset('finale', 1.2);
  }
}

btnEnterDiorama.addEventListener('click', () => {
  audio.playPageTurn();
  setBeat('diorama');
});

btnBackPrologue.addEventListener('click', () => {
  audio.playPageTurn();
  setBeat('prologue');
});

// ==================== BEAT 2: DUAL-WORLD ANCHORS ====================
const anchorButtons = {};

function createAnchorButtons() {
  anchorsLayer.innerHTML = '';
  DUAL_ANCHORS.forEach((anchor) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'anchor-pin side-london';
    btn.dataset.anchorId = anchor.id;
    btn.innerHTML = `<span class="anchor-orb"></span><span class="anchor-label">${anchor.london.pinLabel}</span>`;
    btn.addEventListener('click', () => {
      const proj = state.lastProjected.find((p) => p.id === anchor.id);
      const side = proj ? proj.side : 'london';
      openDossier(anchor.id, side, true);
    });
    anchorsLayer.appendChild(btn);
    anchorButtons[anchor.id] = btn;
  });
}

function updateProjectedAnchors() {
  if (state.beat === 'prologue') return;
  const projected = engine.projectAnchors(DUAL_ANCHORS);
  state.lastProjected = projected;

  projected.forEach((item) => {
    const anchor = DUAL_ANCHORS.find((a) => a.id === item.id);
    const btn = anchorButtons[item.id];
    if (!anchor || !btn) return;

    if (!item.visible) {
      btn.classList.add('hidden');
      return;
    }

    btn.classList.remove('hidden');
    btn.style.left = `${item.sx * 100}%`;
    btn.style.top = `${item.sy * 100}%`;

    const prevSide = state.lastPinSides[item.id];
    if (prevSide && prevSide !== item.side) {
      audio.playMirrorFlip(item.side);
      // If user has this dossier open and drags seam across it, live-flip the open parchment!
      if (state.activeAnchorId === item.id && !dossierDrawer.classList.contains('hidden')) {
        openDossier(item.id, item.side, false);
      }
    }
    state.lastPinSides[item.id] = item.side;

    btn.classList.toggle('side-london', item.side === 'london');
    btn.classList.toggle('side-paris', item.side === 'paris');
    btn.classList.toggle('visited', state.visitedDossiers.has(`${item.id}:${item.side}`));
    const labelSpan = btn.querySelector('.anchor-label');
    const desiredLabel = anchor[item.side].pinLabel;
    if (labelSpan && labelSpan.textContent !== desiredLabel) {
      labelSpan.textContent = desiredLabel;
    }
  });
}

function openDossier(anchorId, side, shouldFocusCamera = false) {
  const anchor = DUAL_ANCHORS.find((a) => a.id === anchorId);
  if (!anchor) return;
  const doc = anchor[side];
  state.activeAnchorId = anchorId;
  state.activeDossierSide = side;

  state.visitedDossiers.add(`${anchorId}:${side}`);
  updateProgressUI();

  dossierSideBadge.textContent = doc.badge;
  dossierSideBadge.className = `dossier-side-badge ${side}`;
  dossierChapter.textContent = doc.chapter;
  dossierTitle.textContent = doc.title;
  dossierMirrorHint.textContent = doc.mirrorHint;
  dossierQuoteEn.innerHTML = renderRichText(doc.quoteEn);
  dossierQuoteZh.textContent = doc.quoteZh;
  dossierNotes.textContent = doc.notes;

  btnFlipMirror.textContent =
    side === 'london' ? '拉动裂隙覆入巴黎夜色，翻看对岸镜像 →' : '← 拉动裂隙退回伦敦雾夜，翻看对岸镜像';

  dossierDrawer.classList.remove('hidden');
  app.classList.add('drawer-open');
  audio.playPageTurn();

  if (shouldFocusCamera) {
    engine.focusWorldPoint(anchor.pos, 0.85);
  }
}

function closeDossier() {
  dossierDrawer.classList.add('hidden');
  app.classList.remove('drawer-open');
  state.activeAnchorId = null;
}

btnCloseDossier.addEventListener('click', closeDossier);

btnFlipMirror.addEventListener('click', () => {
  if (!state.activeAnchorId) return;
  const proj = state.lastProjected.find((p) => p.id === state.activeAnchorId);
  const sx = proj ? proj.sx : 0.5;
  if (state.activeDossierSide === 'london') {
    // Move seam left of anchor sx so anchor falls into Paris side
    const target = Math.max(0.06, Math.min(state.seamX - 0.14, sx - 0.11));
    animateSeamTo(target, 560);
  } else {
    // Move seam right of anchor sx so anchor falls into London side
    const target = Math.min(0.94, Math.max(state.seamX + 0.14, sx + 0.11));
    animateSeamTo(target, 560);
  }
});

function updateProgressUI() {
  const count = state.visitedDossiers.size;
  progressText.textContent = `档案 ${count} / 8`;
  finaleDossierCount.textContent = `${count} / 8`;
  btnOpenCipher.classList.toggle('ready', count >= 2);
  btnCipherLabel.textContent = count >= 2 ? '火漆密信已共鸣 · 点击启封' : '启封多佛密信';
}

// ==================== GLOSSARY / VOCAB POPOVER ====================
function openVocabPopover(termKey, triggerEl) {
  const entry = GLOSS_LEXICON[termKey];
  if (!entry) return;

  vocabWord.textContent = entry.word;
  vocabIpa.textContent = entry.ipa || '';
  vocabMeaning.textContent = entry.meaning;
  vocabContext.textContent = entry.context;

  // Determine snippet to pronounce on click
  if (state.beat === 'prologue') {
    state.currentSpeakText = PROLOGUE_COUPLETS[state.coupletIndex].speak;
  } else if (state.activeAnchorId && state.activeDossierSide) {
    const a = DUAL_ANCHORS.find((item) => item.id === state.activeAnchorId);
    state.currentSpeakText = a ? a[state.activeDossierSide].speak : entry.word;
  } else {
    state.currentSpeakText = entry.word;
  }

  vocabPopover.classList.remove('hidden');

  const rect = triggerEl.getBoundingClientRect();
  const popW = Math.min(330, window.innerWidth - 24);
  const popH = vocabPopover.offsetHeight || 160;
  let left = rect.left + rect.width * 0.5 - popW * 0.5;
  left = Math.max(12, Math.min(window.innerWidth - popW - 12, left));
  let top = rect.top - popH - 12;
  if (top < 64) {
    top = Math.min(window.innerHeight - popH - 12, rect.bottom + 12);
  }

  vocabPopover.style.left = `${left}px`;
  vocabPopover.style.top = `${top}px`;
}

document.addEventListener('click', (e) => {
  const gloss = e.target.closest('.gloss-term');
  if (gloss) {
    e.stopPropagation();
    openVocabPopover(gloss.dataset.term, gloss);
    return;
  }
  if (!vocabPopover.classList.contains('hidden') && !vocabPopover.contains(e.target)) {
    vocabPopover.classList.add('hidden');
  }
});

btnCloseVocab.addEventListener('click', () => vocabPopover.classList.add('hidden'));
btnSpeakVocab.addEventListener('click', () => {
  audio.speakEnglishSnippet(state.currentSpeakText);
});

// ==================== HUD TOGGLES ====================
btnStyle.addEventListener('click', () => {
  state.monoMode = !state.monoMode;
  engine.setMonoMode(state.monoMode);
  app.dataset.style = state.monoMode ? 'mono' : 'oil';
  btnStyle.setAttribute('aria-pressed', String(state.monoMode));
  btnStyleLabel.textContent = state.monoMode ? '纯素版画' : '油彩铜刻';
  audio.playPageTurn();
});

const LANG_ORDER = [
  { key: 'bilingual', label: '中英双语' },
  { key: 'en', label: '原版英文' },
  { key: 'zh', label: '文学中译' }
];

btnLang.addEventListener('click', () => {
  const curIdx = LANG_ORDER.findIndex((item) => item.key === state.langMode);
  const next = LANG_ORDER[(curIdx + 1) % LANG_ORDER.length];
  state.langMode = next.key;
  app.dataset.lang = next.key;
  btnLangLabel.textContent = next.label;
  audio.playPageTurn();
});

btnAudio.addEventListener('click', async () => {
  const active = await audio.toggle();
  btnAudio.setAttribute('aria-pressed', String(active));
  btnAudioLabel.textContent = active ? '室内乐中' : '开启声场';
});

// ==================== BEAT 3: CIPHER MODAL & FINALE ====================
const TARGET_PHRASE = 'RECALLED TO LIFE.';
const TARGET_YEAR_TICK = 75;

function openCipherModal() {
  closeDossier();
  vocabPopover.classList.add('hidden');
  cipherModal.classList.remove('hidden');

  if (state.cipherSolved) {
    showCipherStep('finale');
  } else {
    showCipherStep('seal');
  }
  audio.playPageTurn();
}

function showCipherStep(step) {
  cipherStepSeal.classList.toggle('hidden', step !== 'seal');
  cipherStepDecode.classList.toggle('hidden', step !== 'decode');
  cipherStepFinale.classList.toggle('hidden', step !== 'finale');
}

btnOpenCipher.addEventListener('click', openCipherModal);
btnCloseCipher.addEventListener('click', () => {
  cipherModal.classList.add('hidden');
});

btnBreakSeal.addEventListener('click', () => {
  audio.playWaxShatter();
  btnBreakSeal.disabled = true;
  btnBreakSeal.style.transform = 'scale(1.18)';
  setTimeout(() => {
    btnBreakSeal.disabled = false;
    btnBreakSeal.style.transform = '';
    resonanceSlider.value = '18';
    updateResonanceReadout(18);
    showCipherStep('decode');
  }, 280);
});

function updateResonanceReadout(val) {
  const diff = Math.abs(val - TARGET_YEAR_TICK);
  const pct = Math.max(0, Math.min(100, Math.round(100 - diff * 2.1)));
  resPercent.textContent = `${pct}% 共振`;

  // Progressively unscramble TARGET_PHRASE
  const revealRatio = pct / 100;
  let masked = '';
  for (let i = 0; i < TARGET_PHRASE.length; i++) {
    const ch = TARGET_PHRASE[i];
    if (ch === ' ' || ch === '.') {
      masked += ch === ' ' ? '  ' : ch;
    } else if (((i * 37) % 100) / 100 < revealRatio) {
      masked += ch;
    } else {
      masked += '_';
    }
  }
  cipherRevealPreview.textContent = masked;

  if (diff <= 4 && !state.cipherSolved) {
    state.cipherSolved = true;
    cipherRevealPreview.textContent = TARGET_PHRASE;
    resPercent.textContent = '100% 共振 · 显影成功';
    audio.playUnlockChime();
    setBeat('finale');
    setTimeout(() => {
      showCipherStep('finale');
    }, 420);
  }
}

resonanceSlider.addEventListener('input', (e) => {
  updateResonanceReadout(Number(e.target.value));
});

btnFreeExplore.addEventListener('click', () => {
  cipherModal.classList.add('hidden');
  setBeat('diorama');
});

btnReplayAct1.addEventListener('click', () => {
  cipherModal.classList.add('hidden');
  state.cipherSolved = false;
  state.coupletIndex = 0;
  renderCouplet();
  animateSeamTo(0.5, 500);
  setBeat('prologue');
});

// ==================== INITIALIZE ====================
buildCoupletDots();
renderCouplet();
createAnchorButtons();
applySeam(0.5, 0);
updateProgressUI();
