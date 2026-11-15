/**
 * Procedural banknote / copperplate ornaments (guilloché rosettes, wavy rules).
 * Generated as inline SVG so every edge stays razor sharp at any DPI.
 */

function f(n) {
  return Math.round(n * 100) / 100;
}

/** Guilloché rosette: many phase-shifted, sine-modulated closed curves. */
export function rosette({ size = 120, rings = 14, petals = 12, inner = 0.42, amp = 0.07, stroke = '#c9a45c', opacity = 0.9, width = 0.5, squash = 1 } = {}) {
  const c = size / 2;
  const paths = [];
  for (let i = 0; i < rings; i++) {
    const base = (inner + (i / Math.max(1, rings - 1)) * (0.94 - inner - amp)) * c;
    const phase = (i / rings) * Math.PI * 2 * 0.5;
    let d = '';
    const steps = 220;
    for (let s = 0; s <= steps; s++) {
      const t = (s / steps) * Math.PI * 2;
      const r = base + amp * c * Math.sin(petals * t + phase);
      const x = c + r * Math.cos(t);
      const y = c + r * Math.sin(t) * squash;
      d += `${s === 0 ? 'M' : 'L'}${f(x)} ${f(y)}`;
    }
    paths.push(`<path d="${d}Z"/>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" aria-hidden="true"><g fill="none" stroke="${stroke}" stroke-width="${width}" stroke-opacity="${opacity}">${paths.join('')}</g></svg>`;
}

/** Elliptical banknote cartouche (like a bank-note vignette frame). */
export function cartouche({ w = 360, h = 220, rings = 18, petals = 34, stroke = '#5c8a72', width = 0.45 } = {}) {
  const cx = w / 2;
  const cy = h / 2;
  const paths = [];
  for (let i = 0; i < rings; i++) {
    const k = 0.62 + (i / rings) * 0.36;
    const phase = i * 0.37;
    let d = '';
    const steps = 360;
    for (let s = 0; s <= steps; s++) {
      const t = (s / steps) * Math.PI * 2;
      const m = 1 + 0.028 * Math.sin(petals * t + phase);
      const x = cx + Math.cos(t) * (w / 2 - 2) * k * m;
      const y = cy + Math.sin(t) * (h / 2 - 2) * k * m;
      d += `${s === 0 ? 'M' : 'L'}${f(x)} ${f(y)}`;
    }
    paths.push(`<path d="${d}Z"/>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" aria-hidden="true"><g fill="none" stroke="${stroke}" stroke-width="${width}">${paths.join('')}</g></svg>`;
}

/** Interlaced wavy rule band (banknote border line). */
export function waveRule({ w = 1200, h = 18, lines = 6, waves = 60, stroke = '#c9a45c', accent = '#8e2a22', width = 0.6 } = {}) {
  const paths = [];
  for (let i = 0; i < lines; i++) {
    const phase = (i / lines) * Math.PI * 2;
    const amp = h * 0.32;
    let d = '';
    const steps = 600;
    for (let s = 0; s <= steps; s++) {
      const x = (s / steps) * w;
      const y = h / 2 + Math.sin((s / steps) * Math.PI * 2 * waves + phase) * amp * (0.6 + 0.4 * Math.cos(phase));
      d += `${s === 0 ? 'M' : 'L'}${f(x)} ${f(y)}`;
    }
    paths.push(`<path d="${d}" stroke="${i % 3 === 1 ? accent : stroke}"/>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><g fill="none" stroke-width="${width}">${paths.join('')}</g></svg>`;
}

export function svgUrl(svg) {
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
}

/** Mount ornaments into every [data-ornament] slot. */
export function mountOrnaments(root = document) {
  root.querySelectorAll('[data-ornament]').forEach((el) => {
    const kind = el.dataset.ornament;
    const stroke = el.dataset.stroke;
    if (kind === 'rosette') el.innerHTML = rosette({ stroke: stroke || '#c9a45c', rings: +(el.dataset.rings || 12), petals: +(el.dataset.petals || 12) });
    else if (kind === 'rosette-dense') el.innerHTML = rosette({ stroke: stroke || '#3b3a35', rings: 22, petals: 18, inner: 0.1, amp: 0.05, width: 0.35, opacity: 0.85 });
    else if (kind === 'cartouche') el.innerHTML = cartouche({ stroke: stroke || '#5c8a72' });
    else if (kind === 'wave') el.innerHTML = waveRule({ stroke: stroke || '#c9a45c', accent: el.dataset.accent || '#8e2a22' });
  });
}
