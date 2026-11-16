/**
 * Mini-tool only: non-WebGL stage used when WebGL cannot start, its context is lost,
 * or the device is still too slow at the lowest GPU tier (performance-budget.md §5).
 *
 * Same surface as PaintedTearEngine as used by main.js (setSeam / setScene / setMono /
 * load), drawn with plain DOM layers: London on the left, Paris clipped at the seam,
 * a glowing seam line, and the prologue painting cross-fading on top.
 * One cheap rAF loop drives main.js's seam easing + audio, paused while hidden.
 */
export function createFallbackStage(stage, { onFrame } = {}) {
  const canvas = stage.querySelector('canvas');
  if (canvas) canvas.style.display = 'none';

  const root = document.createElement('div');
  root.className = 'mt-fallback';
  root.setAttribute('aria-hidden', 'true');
  const layer = (cls) => {
    const el = document.createElement('div');
    el.className = cls;
    root.appendChild(el);
    return el;
  };
  const london = layer('mt-fb-layer mt-fb-london');
  const paris = layer('mt-fb-layer mt-fb-paris');
  const seamLine = layer('mt-fb-seam');
  const prologue = layer('mt-fb-layer mt-fb-prologue');
  stage.insertBefore(root, canvas ? canvas.nextSibling : stage.firstChild);

  let seam = 0.5;
  let drawn = -1;
  let raf = 0;
  let dead = false;
  const tick = onFrame || (() => {});

  function frame() {
    raf = requestAnimationFrame(frame);
    tick();
    if (Math.abs(seam - drawn) > 0.0015) {
      drawn = seam;
      const pct = `${(seam * 100).toFixed(2)}%`;
      const clip = `inset(0 0 0 ${pct})`;
      paris.style.webkitClipPath = clip;
      paris.style.clipPath = clip;
      seamLine.style.left = pct;
    }
  }

  function onVis() {
    if (dead) return;
    if (document.hidden) {
      cancelAnimationFrame(raf);
      raf = 0;
    } else if (!raf) raf = requestAnimationFrame(frame);
  }
  document.addEventListener('visibilitychange', onVis);
  raf = requestAnimationFrame(frame);

  const bg = (el, url) => {
    if (url) el.style.backgroundImage = `url("${url}")`;
  };

  return {
    isFallback: true,
    setSeam(x) {
      seam = x;
    },
    setScene(s) {
      root.classList.toggle('is-theatre', s > 0.5);
    },
    setMono(on) {
      root.classList.toggle('is-mono', !!on);
    },
    setPan() {},
    setFocus() {},
    load(sources) {
      bg(london, sources.london);
      bg(paris, sources.paris);
      bg(prologue, sources.prologue);
      return Promise.resolve();
    },
    dispose() {
      dead = true;
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVis);
      if (root.parentNode) root.parentNode.removeChild(root);
    }
  };
}
