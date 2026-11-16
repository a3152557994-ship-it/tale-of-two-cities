/**
 * GatekeeperCore — Pure, DOM-free state machine for《1792：断头台城门官》.
 * Ready for both H5/Xiaohongshu WebView and future Douyin/WeChat mini-game Canvas.
 */
import { DAILY_ORDERS, GATE_CASES, VERDICT_ENDINGS } from '../data/gateCases.js';

export class GatekeeperCore {
  constructor() {
    this.orders = DAILY_ORDERS;
    this.totalCases = GATE_CASES.length;
    this.totalCluesPossible = GATE_CASES.reduce((sum, c) => sum + c.clues.length, 0);
    this.reset();
  }

  reset() {
    this.caseIndex = 0;
    this.gold = 20; // Starting pocket coins (need >= 55 for medicine & winter bread!)
    this.strikes = 0; // 2 strikes = guillotined!
    this.informantLeft = 1; // Free wiretap/perspective scan (IAA rewarded-ad slot in mini-game)
    this.foundByCase = {};
    this.trunkOpened = {};
    this.history = [];
    this.daughterSaved = false;
    this.mercyTwin = null;
    this.ended = null;
    GATE_CASES.forEach((c) => {
      this.foundByCase[c.id] = [];
      this.trunkOpened[c.id] = false;
    });
    return this.currentCase;
  }

  get currentCase() {
    return GATE_CASES[this.caseIndex] || null;
  }

  get foundClues() {
    const c = this.currentCase;
    if (!c) return [];
    const ids = this.foundByCase[c.id] || [];
    return c.clues.filter((cl) => ids.includes(cl.id));
  }

  get totalFoundCount() {
    return Object.values(this.foundByCase).reduce((s, arr) => s + arr.length, 0);
  }

  get isBribeActive() {
    const c = this.currentCase;
    if (!c || !c.bribe) return false;
    return this.foundClues.length >= c.bribe.triggerClues || this.trunkOpened[c.id];
  }

  hasClue(clueId) {
    const c = this.currentCase;
    return !!c && this.foundByCase[c.id].indexOf(clueId) !== -1;
  }

  inspectClue(clueId) {
    const c = this.currentCase;
    if (!c || this.ended) return null;
    const clue = c.clues.find((x) => x.id === clueId);
    if (!clue) return null;
    const already = this.hasClue(clueId);
    if (!already) {
      this.foundByCase[c.id].push(clueId);
    }
    return {
      clue,
      isNew: !already,
      bribeUnlocked: !already && this.isBribeActive ? c.bribe : null
    };
  }

  /** Check normalized portrait coordinates (0..1) under the magnifying glass. */
  probePortrait(nx, ny, radius = 0.12) {
    const c = this.currentCase;
    if (!c || this.ended) return null;
    for (let i = 0; i < c.clues.length; i++) {
      const cl = c.clues[i];
      if (cl.where !== 'portrait') continue;
      const dx = nx - cl.x;
      const dy = ny - cl.y;
      if (Math.sqrt(dx * dx + dy * dy) <= radius) {
        return this.inspectClue(cl.id);
      }
    }
    return null;
  }

  openTrunk() {
    const c = this.currentCase;
    if (!c || this.ended) return null;
    const wasBribe = this.isBribeActive;
    this.trunkOpened[c.id] = true;
    const trunkClue = c.clues.find((x) => x.where === 'trunk');
    let res = null;
    if (trunkClue) {
      res = this.inspectClue(trunkClue.id);
    }
    return {
      clue: trunkClue || null,
      isNew: res ? res.isNew : false,
      bribeUnlocked: !wasBribe && this.isBribeActive ? c.bribe : null
    };
  }

  useInformant() {
    const c = this.currentCase;
    if (!c || this.informantLeft <= 0) return null;
    this.informantLeft -= 1;
    const remaining = c.clues.filter((cl) => !this.hasClue(cl.id));
    return { remaining };
  }

  /** Stamp decision: 'pass' (green) or 'detain' (red). */
  stamp(action) {
    const c = this.currentCase;
    if (!c || this.ended) return null;

    let outcome;
    if (c.id === 'case_noble') {
      if (action === 'detain') outcome = c.outcomes.detain;
      else outcome = this.isBribeActive ? c.outcomes.pass_bribe : c.outcomes.pass_blind;
    } else if (c.id === 'case_jerry') {
      outcome = action === 'pass' ? c.outcomes.pass_clean : c.outcomes.detain_wrong;
    } else {
      if (action === 'detain') outcome = c.outcomes.detain;
      else outcome = this.foundClues.length >= 2 ? c.outcomes.pass_mercy : c.outcomes.pass_blind;
    }

    this.gold = Math.max(0, this.gold + (outcome.goldDelta || 0));
    this.strikes += outcome.strikeDelta || 0;
    if (outcome.daughterSaved) this.daughterSaved = true;
    if (typeof outcome.mercyTwin === 'boolean') this.mercyTwin = outcome.mercyTwin;

    const record = {
      caseId: c.id,
      name: c.name,
      action,
      tag: outcome.tag,
      summary: outcome.summary,
      summaryEn: outcome.summaryEn,
      goldDelta: outcome.goldDelta,
      strikeDelta: outcome.strikeDelta,
      cluesFound: this.foundClues.length,
      cluesTotal: c.clues.length
    };
    this.history.push(record);

    // Immediate firing if 2 strikes!
    if (this.strikes >= 2) {
      this.ended = 'fired_guillotine';
      return { record, nextCase: null, verdict: this.getVerdict() };
    }

    this.caseIndex += 1;
    if (this.caseIndex >= GATE_CASES.length) {
      this.ended = this._computeEndingKey();
      return { record, nextCase: null, verdict: this.getVerdict() };
    }

    return { record, nextCase: this.currentCase, verdict: null };
  }

  _computeEndingKey() {
    if (this.strikes >= 2) return 'fired_guillotine';
    if (this.mercyTwin && this.totalFoundCount >= 6) return 'night_watchman';
    if (this.mercyTwin === false && this.strikes === 0) return 'iron_hound';
    return 'clever_survivor';
  }

  getVerdict() {
    if (!this.ended) return null;
    const v = VERDICT_ENDINGS[this.ended] || VERDICT_ENDINGS.clever_survivor;
    return {
      key: this.ended,
      ...v,
      gold: this.gold,
      strikes: this.strikes,
      cluesFound: this.totalFoundCount,
      cluesPossible: this.totalCluesPossible,
      casesHandled: this.history.length,
      daughterSaved: this.daughterSaved,
      history: this.history.slice()
    };
  }
}
