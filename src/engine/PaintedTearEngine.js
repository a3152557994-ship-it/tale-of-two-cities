/**
 * PaintedTearEngine — 2.5D oil-painting "rift" renderer (raw WebGL, zero deps).
 *
 * Two pixel-aligned museum paintings (London 1775 / Paris 1775) are composited
 * through a burning golden tear. Pseudo-depth parallax, drifting fog & rain
 * (London), heat shimmer & rising embers (Paris), canvas weave, film grain,
 * a paper-burn prologue dissolve and an optional copperplate-engraving mode.
 */

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = vec2(aPos.x * 0.5 + 0.5, 0.5 - aPos.y * 0.5); // y-down screen uv
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uLondon;
uniform sampler2D uParis;
uniform sampler2D uPrologue;
uniform vec2 uRes;
uniform vec2 uK;        // theatre cover-fit scale
uniform vec2 uK0;       // prologue cover-fit scale
uniform vec2 uOffset;   // pan
uniform vec2 uMouse;    // -1..1 parallax
uniform float uTime;
uniform float uSeam;
uniform float uVel;
uniform float uScene;   // 0 prologue -> 1 theatre
uniform float uMono;
uniform float uDpr;
uniform vec3 uFocus;    // screen uv + strength
uniform float uLite;    // 0 = full quality (default); 1 = low tier: fewer octaves / layers, no grain

float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0; float a = 0.5;
  for (int i = 0; i < 4; i++) { if (uLite > 0.5 && i > 1) break; v += a * noise(p); p = p * 2.03 + 17.1; a *= 0.5; }
  return v;
}

vec2 imgUV(vec2 s, vec2 k) {
  vec2 t = (s - 0.5) * k + 0.5 + uOffset;
  float w = 0.35 + 0.65 * smoothstep(0.25, 1.0, t.y); // foreground moves more
  t += uMouse * 0.012 * w;
  return t;
}

vec3 london(vec2 s, vec2 t) {
  vec3 c = texture2D(uLondon, t).rgb;
  // drifting ground fog
  float f = fbm(t * vec2(3.0, 7.0) + vec2(uTime * 0.025, uTime * 0.004));
  float fogMask = 0.25 + 0.75 * smoothstep(0.35, 1.0, t.y);
  c = mix(c, vec3(0.58, 0.64, 0.72), f * fogMask * 0.2);
  // slanted rain, two layers
  vec2 rs = vec2(s.x * uRes.x / uRes.y, s.y);
  rs.x += rs.y * 0.16;
  float rain = 0.0;
  for (int L = 0; L < 2; L++) {
    if (uLite > 0.5 && L > 0) break;
    float fl = float(L);
    vec2 g = rs * vec2(150.0 + fl * 90.0, 5.0 + fl * 3.0) + vec2(fl * 13.0, -uTime * (7.0 + fl * 4.0));
    vec2 id = floor(g); vec2 fr = fract(g);
    float h = hash(id + fl * 31.0);
    float on = step(0.9, h);
    float lx = smoothstep(0.14, 0.0, abs(fr.x - 0.5 - (h - 0.95) * 4.0));
    float ly = smoothstep(0.0, 0.1, fr.y) * smoothstep(0.8, 0.25, fr.y);
    rain += on * lx * ly * (0.55 - fl * 0.2);
  }
  c += vec3(0.62, 0.7, 0.8) * rain * 0.11;
  return c * vec3(0.97, 1.0, 1.04);
}

vec3 paris(vec2 s, vec2 t) {
  // heat shimmer stronger toward the sky
  t.x += sin(t.y * 70.0 + uTime * 2.6) * 0.0011 * smoothstep(0.6, 0.0, t.y);
  vec3 c = texture2D(uParis, t).rgb;
  // firelight flicker
  float fl = noise(vec2(uTime * 2.2, 3.1));
  c *= 1.0 + (fl - 0.5) * 0.06;
  // rising embers
  vec2 rs = vec2(s.x * uRes.x / uRes.y, s.y);
  float emb = 0.0;
  for (int L = 0; L < 2; L++) {
    if (uLite > 0.5 && L > 0) break;
    float fz = float(L);
    vec2 g = rs * vec2(22.0 + fz * 14.0, 12.0 + fz * 8.0) + vec2(sin(uTime * 0.4 + rs.y * 3.0) * 0.6, uTime * (0.9 + fz * 0.5));
    vec2 id = floor(g); vec2 fr = fract(g);
    float h = hash(id + 7.0 * fz);
    vec2 p = vec2(hash(id + 1.3), hash(id + 2.7));
    p += vec2(sin(uTime * 1.7 + h * 6.28), cos(uTime * 1.3 + h * 6.28)) * 0.15;
    float d = length((fr - p) * vec2(1.0, 0.7));
    float tw = 0.5 + 0.5 * sin(uTime * (3.0 + h * 5.0) + h * 40.0);
    emb += step(0.72, h) * exp(-d * d * (900.0 + fz * 600.0)) * tw;
  }
  float bottom = 0.35 + 0.65 * smoothstep(0.2, 1.0, s.y);
  c += vec3(1.0, 0.5, 0.16) * emb * bottom * 0.9;
  return c;
}

vec3 engrave(vec3 c, float warm) {
  float lum = dot(c, vec3(0.3, 0.59, 0.11));
  vec2 px = gl_FragCoord.xy / max(uDpr, 1.0);
  float h1 = smoothstep(0.15, 0.75, abs(sin((px.x + px.y) * 0.62)));
  float h2 = smoothstep(0.15, 0.75, abs(sin((px.x - px.y) * 0.62)));
  float h3 = smoothstep(0.1, 0.7, abs(sin(px.y * 0.95)));
  float ink = 1.0;
  ink = min(ink, mix(1.0, h1, smoothstep(0.78, 0.52, lum)));
  ink = min(ink, mix(1.0, h2, smoothstep(0.5, 0.3, lum)));
  ink = min(ink, mix(1.0, h3, smoothstep(0.3, 0.12, lum)));
  vec3 paper = vec3(0.93, 0.89, 0.8);
  vec3 inkC = mix(vec3(0.1, 0.13, 0.17), vec3(0.32, 0.07, 0.06), warm);
  return mix(inkC, paper, ink);
}

void main() {
  vec2 s = vUv;
  float aspect = uRes.x / uRes.y;

  // ---------- THEATRE (dual painting + tear) ----------
  vec2 t = imgUV(s, uK);
  float wob = (fbm(vec2(s.y * 5.0, uTime * 0.12)) - 0.5) * 0.03 * (1.0 + min(abs(uVel) * 40.0, 3.0));
  wob += (noise(vec2(s.y * 46.0, uTime * 0.5)) - 0.5) * 0.007;
  float edge = uSeam + wob / aspect;
  float d = (s.x - edge) * aspect;
  float m = smoothstep(-0.0012, 0.0012, d);
  vec3 cL = london(s, t);
  vec3 cP = paris(s, t);
  vec3 theatre = mix(cL, cP, m);
  if (uMono > 0.001) {
    theatre = mix(theatre, mix(engrave(cL, 0.0), engrave(cP, 1.0), m), uMono);
  }
  float ad = abs(d);
  float seamVis = step(0.002, uSeam) * step(uSeam, 0.998);
  float g1 = exp(-ad * 320.0);
  float g2 = exp(-ad * 38.0);
  float sparkle = pow(noise(vec2(s.y * 140.0, uTime * 3.5)), 7.0) * exp(-ad * 110.0);
  theatre *= 1.0 - 0.6 * exp(-ad * 85.0) * (1.0 - g1) * seamVis; // charred paper lip
  vec3 gold = vec3(1.0, 0.78, 0.42);
  theatre += gold * (g1 * 1.15 + g2 * 0.22 + sparkle * 2.2) * seamVis;

  // focus spotlight on hovered anchor
  vec2 fd = (s - uFocus.xy) * vec2(aspect, 1.0);
  theatre *= mix(1.0, 0.8 + 0.42 * exp(-dot(fd, fd) * 16.0), uFocus.z);

  // ---------- PROLOGUE ----------
  vec2 t0 = (s - 0.5) * uK0 + 0.5 + uMouse * 0.008 * (0.4 + 0.6 * s.y);
  t0.x += sin(uTime * 0.045) * max(0.0, 1.0 - uK0.x) * 0.46; // slow drift across the Channel on narrow screens
  vec3 pro = texture2D(uPrologue, t0).rgb;
  float pf = fbm(t0 * vec2(2.5, 5.0) + vec2(uTime * 0.02, 0.0));
  pro = mix(pro, vec3(0.5, 0.55, 0.62), pf * 0.12 * smoothstep(0.4, 1.0, s.y));
  if (uMono > 0.001) pro = mix(pro, engrave(pro, s.x), uMono);

  // paper-burn dissolve between prologue and theatre
  float n = fbm(s * vec2(3.2, 2.4) + 4.0);
  float th = uScene * 1.25 - 0.12;
  float reveal = 1.0 - smoothstep(th - 0.025, th + 0.005, n);
  vec3 col = mix(pro, theatre, reveal);
  float burnEdge = exp(-abs(n - th) * 70.0) * step(0.001, uScene) * step(uScene, 0.999);
  col *= 1.0 - burnEdge * 0.5;
  col += gold * burnEdge * exp(-abs(n - th + 0.01) * 160.0) * 1.6;

  // ---------- FINISH: canvas weave, grade, vignette, grain ----------
  vec2 px = gl_FragCoord.xy / max(uDpr, 1.0);
  float weave = (sin(px.x * 1.9) * sin(px.y * 1.9)) * 0.012 + (noise(px * 0.7) - 0.5) * 0.02;
  col += weave * (1.0 - uLite);
  col = (col - 0.5) * 1.06 + 0.5;
  float v = smoothstep(1.0, 0.28, length((s - 0.5) * vec2(1.05, 1.15)));
  col *= 0.5 + 0.5 * v;
  col += (hash(s * uRes + fract(uTime * 7.0) * 91.0) - 0.5) * 0.035 * (1.0 - uLite);
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${src}`));
    img.src = src;
  });
}

export class PaintedTearEngine {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {object} [opts]
   * @param {object} [opts.budget]  Optional mobile GPU budget (used by the mini-tool build).
   *   { maxDpr, maxPixels, adaptive }. When omitted the engine behaves exactly as before
   *   (DPR ≤ 1.75, no pixel cap, no tiering, no visibility pause).
   * @param {(reason: string) => void} [opts.onFallback]  Called once when WebGL must be
   *   abandoned (context lost, or still too slow at the lowest tier). Budget mode only.
   */
  constructor(canvas, { onFrame, onProgress, budget = null, onFallback = null } = {}) {
    this.canvas = canvas;
    this.onFrame = onFrame || (() => {});
    this.onProgress = onProgress || (() => {});
    this.budget = budget;
    this.onFallback = onFallback || (() => {});
    const opts = { antialias: false, alpha: false, premultipliedAlpha: false, powerPreference: 'high-performance' };
    this.gl = canvas.getContext('webgl', opts) || canvas.getContext('experimental-webgl', opts);
    if (!this.gl) throw new Error('WebGL unavailable');

    this.seam = 1.0;
    this.vel = 0;
    this.scene = 0;
    this.sceneTarget = 0;
    this.mono = 0;
    this.monoTarget = 0;
    this.mouse = [0, 0];
    this.mouseTarget = [0, 0];
    this.pan = 0;
    this.panTarget = 0;
    this.focus = [0.5, 0.5, 0];
    this.focusTarget = [0.5, 0.5, 0];
    this.imgAspect = 1.5;
    this.proAspect = 1.5;
    this.start = performance.now();
    this.dead = false;

    if (budget) {
      // Tier 0 = default budget, 1 = low, 2 = lowest (lite shader + 30 fps cap).
      this.tiers = [
        { dpr: budget.maxDpr || 1.5, px: budget.maxPixels || 2e6, lite: 0, skip: false },
        { dpr: 1, px: 1e6, lite: 0, skip: false },
        { dpr: 0.75, px: 1e6, lite: 1, skip: true }
      ];
      this.tier = 0;
      this._stat = { last: 0, acc: 0, n: 0, since: performance.now() + 2500, frame: 0 };
    }

    this._initGL();
    this._resize = this._resize.bind(this);
    window.addEventListener('resize', this._resize);
    if ('ResizeObserver' in window) {
      this._ro = new ResizeObserver(() => this._resize());
      this._ro.observe(canvas);
    }
    window.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') return;
      this.mouseTarget[0] = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouseTarget[1] = (e.clientY / window.innerHeight) * 2 - 1;
    });
    if (budget) {
      this._onLost = (e) => {
        e.preventDefault();
        this._abandon('contextlost', false);
      };
      canvas.addEventListener('webglcontextlost', this._onLost, false);
      this._onVis = () => {
        if (this.dead) return;
        if (document.hidden) {
          cancelAnimationFrame(this._raf);
          this._raf = 0;
        } else if (!this._raf) {
          this._stat.last = 0;
          this._stat.acc = 0;
          this._stat.n = 0;
          this._stat.since = performance.now() + 1000;
          this._raf = requestAnimationFrame(this._loop);
        }
      };
      document.addEventListener('visibilitychange', this._onVis);
    }
    this._resize();
    this._loop = this._loop.bind(this);
    this._raf = requestAnimationFrame(this._loop);
  }

  _initGL() {
    const gl = this.gl;
    const sh = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    gl.useProgram(prog);
    this.prog = prog;

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    this.u = {};
    ['uLondon', 'uParis', 'uPrologue', 'uRes', 'uK', 'uK0', 'uOffset', 'uMouse', 'uTime', 'uSeam', 'uVel', 'uScene', 'uMono', 'uDpr', 'uFocus', 'uLite'].forEach(
      (n) => (this.u[n] = gl.getUniformLocation(prog, n))
    );
    this.textures = {};
    ['london', 'paris', 'prologue'].forEach((key, i) => {
      const tex = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([12, 14, 20, 255]));
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      this.textures[key] = { tex, unit: i };
    });
    gl.uniform1i(this.u.uLondon, 0);
    gl.uniform1i(this.u.uParis, 1);
    gl.uniform1i(this.u.uPrologue, 2);
  }

  async load(sources) {
    const keys = Object.keys(sources);
    let done = 0;
    await Promise.all(
      keys.map(async (key) => {
        const img = await loadImage(sources[key]);
        if (this.dead) return;
        const gl = this.gl;
        const { tex, unit } = this.textures[key];
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        if (key === 'prologue') this.proAspect = img.naturalWidth / img.naturalHeight;
        else this.imgAspect = img.naturalWidth / img.naturalHeight;
        done += 1;
        this.onProgress(done / keys.length);
      })
    );
  }

  _resize() {
    let dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    if (this.budget) {
      // Budget mode: cap DPR per tier, then cap total drawing-buffer pixels.
      const tier = this.tiers[this.tier];
      const area = Math.max(1, this.canvas.clientWidth * this.canvas.clientHeight);
      dpr = Math.min(window.devicePixelRatio || 1, tier.dpr);
      if (area * dpr * dpr > tier.px) dpr = Math.sqrt(tier.px / area);
    }
    const w = Math.max(1, Math.round(this.canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(this.canvas.clientHeight * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    this.dpr = dpr;
  }

  /** Budget mode: step down one quality tier, or abandon WebGL at the lowest tier. */
  _degrade(now) {
    if (this.tier < this.tiers.length - 1) {
      this.tier += 1;
      this._stat.since = now + 1500;
      this._resize();
    } else {
      this._abandon('slow', true);
    }
  }

  /** Stop rendering for good, release listeners (and the GL context) and notify once. */
  _abandon(reason, loseContext) {
    if (this.dead) return;
    this.dead = true;
    cancelAnimationFrame(this._raf);
    window.removeEventListener('resize', this._resize);
    if (this._ro) this._ro.disconnect();
    if (this._onVis) document.removeEventListener('visibilitychange', this._onVis);
    if (this._onLost) this.canvas.removeEventListener('webglcontextlost', this._onLost, false);
    if (loseContext) {
      const ext = this.gl.getExtension('WEBGL_lose_context');
      if (ext) ext.loseContext();
    }
    this.onFallback(reason);
  }

  dispose() {
    this._abandon('dispose', true);
  }

  _fit(aspectImg) {
    const A = this.canvas.clientWidth / Math.max(1, this.canvas.clientHeight);
    const zoom = 1.065;
    let k = A > aspectImg ? [1, aspectImg / A] : [A / aspectImg, 1];
    return [k[0] / zoom, k[1] / zoom];
  }

  /** Max horizontal pan (image-uv) available on narrow screens. */
  panLimit() {
    const k = this._fit(this.imgAspect);
    return Math.max(0, (1 - k[0]) / 2 - 0.012);
  }

  setPan(p) {
    const lim = this.panLimit();
    this.panTarget = Math.max(-lim, Math.min(lim, p));
  }

  setSeam(x, velocity = 0) {
    this.seam = x;
    this.vel = velocity;
  }

  setScene(target) {
    this.sceneTarget = target;
  }

  setMono(on) {
    this.monoTarget = on ? 1 : 0;
  }

  /** Spotlight an image-uv point (or clear with null). */
  setFocus(uv) {
    if (!uv) {
      this.focusTarget[2] = 0;
      return;
    }
    const p = this.imageToScreen(uv[0], uv[1]);
    this.focusTarget = [p.nx, p.ny, 1];
  }

  /** Image uv (y-down, 0..1) -> css px within canvas + normalized screen uv. */
  imageToScreen(u, v) {
    const k = this._fit(this.imgAspect);
    const x = Math.min(1, Math.max(0, (v - 0.25) / 0.75));
    const w = 0.35 + 0.65 * x * x * (3 - 2 * x);
    const tu = u - this.mouse[0] * 0.012 * w;
    const tv = v - this.mouse[1] * 0.012 * w;
    const nx = (tu - 0.5 - this.pan) / k[0] + 0.5;
    const ny = (tv - 0.5) / k[1] + 0.5;
    return { x: nx * this.canvas.clientWidth, y: ny * this.canvas.clientHeight, nx, ny };
  }

  /** Inverse: screen-normalized x -> image u (ignores parallax). */
  screenToImageU(nx) {
    const k = this._fit(this.imgAspect);
    return (nx - 0.5) * k[0] + 0.5 + this.pan;
  }

  _loop(now) {
    if (this.dead) return;
    const gl = this.gl;
    const t = (now - this.start) / 1000;
    const ease = (a, b, f) => a + (b - a) * f;
    this.scene = ease(this.scene, this.sceneTarget, 0.022);
    if (Math.abs(this.scene - this.sceneTarget) < 0.0005) this.scene = this.sceneTarget;
    this.mono = ease(this.mono, this.monoTarget, 0.08);
    this.mouse[0] = ease(this.mouse[0], this.mouseTarget[0], 0.045);
    this.mouse[1] = ease(this.mouse[1], this.mouseTarget[1], 0.045);
    const lim = this.panLimit();
    this.panTarget = Math.max(-lim, Math.min(lim, this.panTarget));
    this.pan = ease(this.pan, this.panTarget, 0.12);
    for (let i = 0; i < 3; i++) this.focus[i] = ease(this.focus[i], this.focusTarget[i], i === 2 ? 0.08 : 0.25);
    this.vel *= 0.9;

    this.onFrame(t);

    if (this.budget) {
      // Frame-time driven tiering (no device lists): sustained < ~24 fps steps down a tier.
      const st = this._stat;
      if (st.last && now > st.since) {
        const dt = now - st.last;
        if (dt < 250) {
          st.acc += dt;
          st.n += 1;
        }
        if (st.n >= 90) {
          const avg = st.acc / st.n;
          st.acc = 0;
          st.n = 0;
          if (avg > 42 && this.budget.adaptive) {
            this._degrade(now);
            if (this.dead) return;
          }
        }
      }
      st.last = now;
      const tier = this.tiers[this.tier];
      st.frame += 1;
      if (tier.skip && st.frame % 2) {
        this._raf = requestAnimationFrame(this._loop);
        return;
      }
      gl.uniform1f(this.u.uLite, tier.lite);
    }

    const k = this._fit(this.imgAspect);
    const k0 = this._fit(this.proAspect);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.uniform2f(this.u.uRes, this.canvas.width, this.canvas.height);
    gl.uniform2f(this.u.uK, k[0], k[1]);
    gl.uniform2f(this.u.uK0, k0[0], k0[1]);
    gl.uniform2f(this.u.uOffset, this.pan, 0);
    gl.uniform2f(this.u.uMouse, this.mouse[0], this.mouse[1]);
    gl.uniform1f(this.u.uTime, t);
    gl.uniform1f(this.u.uSeam, this.seam);
    gl.uniform1f(this.u.uVel, this.vel);
    gl.uniform1f(this.u.uScene, this.scene);
    gl.uniform1f(this.u.uMono, this.mono);
    gl.uniform1f(this.u.uDpr, this.dpr);
    gl.uniform3f(this.u.uFocus, this.focus[0], this.focus[1], this.focus[2]);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    this._raf = requestAnimationFrame(this._loop);
  }
}
