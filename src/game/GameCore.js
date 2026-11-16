/**
 * GameCore — pure, UI-agnostic rules for the swipe-card survival game.
 * No DOM access: the same module can drive the H5 view and a future
 * canvas-only mini-game view.
 */
import { METERS, CARDS, ENDINGS, SURVIVAL_RULES, PERSONAS } from '../data/cards.js';

export const TOTAL_STEPS = 50;
export const START_YEAR = 1775;
export const END_YEAR = 1793;

export const PHASES = [
  { id: 1, from: 0, to: 13, title: '第一卷 · 招回人世', titleEn: 'Book I · Recalled to Life' },
  { id: 2, from: 14, to: 34, title: '第二卷 · 金线', titleEn: 'Book II · The Golden Thread' },
  { id: 3, from: 35, to: 50, title: '第三卷 · 风暴', titleEn: 'Book III · The Storm' }
];

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clone = (o) => JSON.parse(JSON.stringify(o));

export class GameCore {
  constructor() {
    this.meterKeys = METERS.map((m) => m.key);
    this.beats = new Map();
    CARDS.forEach((c) => {
      if (typeof c.beat === 'number') this.beats.set(c.beat, c);
    });
    // How often each persona tag appears in the deck: used to normalise persona scoring
    // so rare archetypes (e.g. sacrifice) are as reachable as common ones (prudent).
    this.tagFreq = {};
    CARDS.forEach((c) =>
      ['left', 'right'].forEach((side) => (c[side].tags || []).forEach((t) => (this.tagFreq[t] = (this.tagFreq[t] || 0) + 1)))
    );
    this.start();
  }

  start(seed = (Math.random() * 2 ** 32) >>> 0) {
    this.rand = mulberry32(seed);
    this.s = {
      step: 0,
      meters: Object.fromEntries(this.meterKeys.map((k) => [k, 50])),
      flags: [],
      used: [],
      tags: {},
      lefts: 0,
      rights: 0,
      ended: null
    };
    this.history = [];
    this.card = this._draw();
    return this.card;
  }

  get step() {
    return this.s.step;
  }

  get meters() {
    return this.s.meters;
  }

  get year() {
    return Math.min(END_YEAR, Math.floor(START_YEAR + (this.s.step * (END_YEAR - START_YEAR)) / TOTAL_STEPS));
  }

  get phase() {
    return PHASES.find((p) => this.s.step >= p.from && this.s.step <= p.to) || PHASES[PHASES.length - 1];
  }

  hasFlag(f) {
    return this.s.flags.includes(f);
  }

  _eligible(c, phaseId) {
    if (typeof c.beat === 'number') return false;
    if (c.phase !== phaseId) return false;
    if (c.once !== false && this.s.used.includes(c.id)) return false;
    if (c.requires && c.requires.some((f) => !this.hasFlag(f))) return false;
    if (c.excludes && c.excludes.some((f) => this.hasFlag(f))) return false;
    return true;
  }

  _draw() {
    const beat = this.beats.get(this.s.step);
    if (beat && !this.s.used.includes(beat.id)) return beat;
    const phaseId = this.phase.id;
    let pool = CARDS.filter((c) => this._eligible(c, phaseId));
    // Graceful fallbacks: earlier phases, then repeats of non-beat cards of this phase.
    for (let p = phaseId - 1; pool.length === 0 && p >= 1; p--) pool = CARDS.filter((c) => this._eligible(c, p));
    if (pool.length === 0) {
      const last = this.s.used[this.s.used.length - 1];
      pool = CARDS.filter((c) => typeof c.beat !== 'number' && c.phase === phaseId && c.id !== last);
    }
    // Avoid showing the same character twice in a row when possible.
    const lastWho = this.card ? this.card.who : null;
    const varied = pool.filter((c) => c.who !== lastWho);
    if (varied.length) pool = varied;
    const total = pool.reduce((s, c) => s + (c.weight || 1), 0);
    let r = this.rand() * total;
    for (const c of pool) {
      r -= c.weight || 1;
      if (r <= 0) return c;
    }
    return pool[pool.length - 1];
  }

  /** Which meters a choice touches and how hard (no sign — Reigns style). */
  preview(side) {
    const fx = (this.card && this.card[side] && this.card[side].fx) || {};
    const out = {};
    this.meterKeys.forEach((k) => {
      const v = Math.abs(fx[k] || 0);
      out[k] = v === 0 ? 0 : v >= 15 ? 2 : 1;
    });
    return out;
  }

  choose(side) {
    if (this.s.ended || !this.card) return null;
    const card = this.card;
    const opt = card[side];
    this.history.push({ s: clone(this.s), card });
    const before = { ...this.s.meters };
    const fx = opt.fx || {};
    this.meterKeys.forEach((k) => {
      this.s.meters[k] = Math.max(0, Math.min(100, this.s.meters[k] + (fx[k] || 0)));
    });
    (opt.set || []).forEach((f) => !this.s.flags.includes(f) && this.s.flags.push(f));
    (opt.clear || []).forEach((f) => (this.s.flags = this.s.flags.filter((x) => x !== f)));
    (opt.tags || []).forEach((t) => (this.s.tags[t] = (this.s.tags[t] || 0) + 1));
    if (side === 'left') this.s.lefts++;
    else this.s.rights++;
    this.s.used.push(card.id);

    const delta = {};
    this.meterKeys.forEach((k) => (delta[k] = this.s.meters[k] - before[k]));

    // Meter death?
    let endingKey = null;
    for (const k of this.meterKeys) {
      if (this.s.meters[k] <= 0) endingKey = `${k}_0`;
      else if (this.s.meters[k] >= 100) endingKey = `${k}_100`;
      if (endingKey) break;
    }
    this.s.step++;
    if (!endingKey && this.s.step >= TOTAL_STEPS) endingKey = this._survivalEnding();

    if (endingKey) {
      this.s.ended = endingKey;
      this.card = null;
    } else {
      this.card = this._draw();
    }
    return { delta, after: opt.after, afterEn: opt.afterEn, ending: endingKey ? this.ending() : null };
  }

  /** Rewind one card (future rewarded-ad hook "命运回溯"). */
  undo() {
    const h = this.history.pop();
    if (!h) return false;
    this.s = h.s;
    this.card = h.card;
    return true;
  }

  dominantTag() {
    let best = null;
    let n = -1;
    Object.entries(this.s.tags).forEach(([t, raw]) => {
      const c = raw / Math.pow(this.tagFreq[t] || 1, 0.85);
      if (c > n) {
        best = t;
        n = c;
      }
    });
    if (best) return best;
    return this.s.lefts >= this.s.rights ? 'prudent' : 'idealist';
  }

  _survivalEnding() {
    const tag = this.dominantTag();
    for (const r of SURVIVAL_RULES || []) {
      if (r.flags && r.flags.some((f) => !this.hasFlag(f))) continue;
      if (r.notFlags && r.notFlags.some((f) => this.hasFlag(f))) continue;
      if (r.min && Object.entries(r.min).some(([k, v]) => this.s.meters[k] < v)) continue;
      if (r.max && Object.entries(r.max).some(([k, v]) => this.s.meters[k] > v)) continue;
      if (r.tag && r.tag !== tag) continue;
      if (r.tags && !r.tags.includes(tag)) continue;
      if (ENDINGS[r.ending]) return r.ending;
    }
    return Object.keys(ENDINGS).find((k) => k.startsWith('survive')) || Object.keys(ENDINGS)[0];
  }

  ending() {
    if (!this.s.ended) return null;
    const e = ENDINGS[this.s.ended] || {};
    const tag = this.dominantTag();
    const persona = PERSONAS.find((p) => p.tag === tag) || PERSONAS[0];
    return {
      key: this.s.ended,
      ...e,
      persona,
      year: this.year,
      cards: this.s.step,
      survived: this.s.step >= TOTAL_STEPS && !/_(0|100)$/.test(this.s.ended),
      meters: { ...this.s.meters }
    };
  }
}
