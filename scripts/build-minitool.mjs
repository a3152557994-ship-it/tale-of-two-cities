#!/usr/bin/env node
/**
 * Build the Xiaohongshu mini-tool zip (小红书小工具离线包).
 *
 *   pnpm build:minitool
 *
 * 1. Re-encode src/assets/**.jpg as WebP into release/.minitool-cache/img (python3 + Pillow;
 *    skipped per file when up to date; falls back to the JPGs if unavailable).
 * 2. vite build -c vite.minitool.config.js  → release/minitool-build/
 * 3. Static gate: file-type whitelist, no module scripts / external refs / forbidden APIs,
 *    every referenced file present.
 * 4. Zip the directory CONTENTS (index.html at zip root) → release/双城记-撕裂年代-minitool.zip
 *
 * The website build (pnpm build → docs/) is untouched.
 */
import { build } from 'vite';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC_ASSETS = path.join(root, 'src', 'assets');
const CACHE = path.join(root, 'release', '.minitool-cache', 'img');
const OUT = path.join(root, 'release', 'minitool-build');
const ZIP = path.join(root, 'release', '双城记-撕裂年代-minitool.zip');

// ---------- 1. images ----------
function listJpgs(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return listJpgs(p);
    return /\.jpe?g$/i.test(e.name) ? [p] : [];
  });
}

const jobs = listJpgs(SRC_ASSETS)
  .map((src) => {
    const rel = path.relative(SRC_ASSETS, src);
    const dst = path.join(CACHE, rel.replace(/\.jpe?g$/i, '.webp'));
    // Paintings are WebGL textures (1672×941, under the 2048 budget): keep size, recompress.
    // Portraits (640²) are shown ≤ 300 CSS px: 512² is plenty at DPR 1.5.
    const portrait = rel.startsWith('portraits');
    return { src, dst, max: portrait ? 512 : 1672, q: portrait ? 78 : 80 };
  })
  .filter((j) => !fs.existsSync(j.dst) || fs.statSync(j.dst).mtimeMs < fs.statSync(j.src).mtimeMs);

if (jobs.length) {
  fs.mkdirSync(CACHE, { recursive: true });
  const py = `
import json, os, sys
from PIL import Image
for j in json.loads(sys.argv[1]):
    os.makedirs(os.path.dirname(j["dst"]), exist_ok=True)
    im = Image.open(j["src"]).convert("RGB")
    if max(im.size) > j["max"]:
        im.thumbnail((j["max"], j["max"]), Image.LANCZOS)
    im.save(j["dst"], "WEBP", quality=j["q"], method=6)
    print("  webp", os.path.basename(j["dst"]), im.size, os.path.getsize(j["dst"]) // 1024, "KiB")
`;
  try {
    execFileSync('python3', ['-c', py, JSON.stringify(jobs)], { stdio: 'inherit' });
  } catch (e) {
    console.warn('[minitool] WebP conversion unavailable (python3 + Pillow) — original JPGs will be shipped.');
  }
}

// ---------- 2. vite build ----------
await build({ configFile: path.join(root, 'vite.minitool.config.js'), logLevel: 'warn' });

// ---------- 3. static gate ----------
const ALLOWED = new Set(['.html', '.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.woff', '.woff2', '.json']);
const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else files.push(path.relative(OUT, p).split(path.sep).join('/'));
  }
})(OUT);

const errors = [];
for (const f of files) {
  if (!ALLOWED.has(path.extname(f).toLowerCase())) errors.push(`file type not allowed: ${f}`);
  if (/(^|\/)\.|\.map$|node_modules|vite\.config/.test(f)) errors.push(`dev/junk file: ${f}`);
}
if (!files.includes('index.html')) errors.push('index.html missing at root');
if (files.filter((f) => f.endsWith('.html')).length !== 1) errors.push('exactly one .html expected');

const html = fs.readFileSync(path.join(OUT, 'index.html'), 'utf8');
const htmlChecks = [
  [/^<!DOCTYPE html>/, true, 'DOCTYPE'],
  [/<html lang="zh-CN">/, true, 'lang=zh-CN'],
  [/<meta charset="UTF-8"/i, true, 'charset'],
  [/width=device-width[^"]*initial-scale=1\.0[^"]*viewport-fit=cover|width=device-width[^"]*viewport-fit=cover[^"]*/, true, 'viewport'],
  [/type="module"/, false, 'module script'],
  [/<script(?![^>]*\bsrc=)[^>]*>/, false, 'inline <script>'],
  [/\son[a-z]+\s*=/i, false, 'inline event handler'],
  [/javascript:/i, false, 'javascript: URI'],
  [/<base\s|<iframe|<object|http-equiv=["']?Content-Security-Policy/i, false, 'base/iframe/object/CSP meta'],
  [/(src|href)="(https?:)?\/\//i, false, 'external resource'],
  [/(src|href)="\//, false, 'absolute path'],
  [/\bdownload=|target="_blank"/i, false, 'download / target=_blank']
];
for (const [re, want, label] of htmlChecks) if (re.test(html) !== want) errors.push(`index.html: ${label}`);

const refs = [...html.matchAll(/(?:src|href)="\.\/([^"]+)"/g)].map((m) => m[1]);
const js = fs.readFileSync(path.join(OUT, 'app.js'), 'utf8');
const css = files.filter((f) => f.endsWith('.css')).map((f) => fs.readFileSync(path.join(OUT, f), 'utf8')).join('\n');
// Built asset URLs carry a Vite content hash (glob source keys like ./assets/portraits/x.jpg do not).
for (const m of js.matchAll(/["'`]\.\/((?:assets|critical)\/[^"'`]+-[A-Za-z0-9_-]{8}\.[a-z0-9]+)["'`]/g)) refs.push(m[1]);
for (const m of css.matchAll(/url\(\s*["']?(?!data:)([^"')]+)["']?\s*\)/g)) refs.push(m[1].replace(/^\.\//, ''));
for (const r of new Set(refs)) if (!files.includes(r)) errors.push(`referenced file missing: ${r}`);

const forbidden = [
  /\bfetch\s*\(/, /XMLHttpRequest/, /new\s+WebSocket\s*\(/, /new\s+EventSource\s*\(/, /RTCPeerConnection/,
  /navigator\.geolocation/, /navigator\.clipboard/, /execCommand\s*\(\s*["'](copy|cut|paste)/,
  /navigator\.(bluetooth|usb|hid|serial|getBattery|connection|credentials|locks|sendBeacon)\b/,
  /enumerateDevices|getDisplayMedia|storage\.persist|serviceWorker/, /new\s+(Shared)?Worker\s*\(/,
  /new\s+(Accelerometer|Gyroscope|Magnetometer)\s*\(/, /DeviceMotionEvent|DeviceOrientationEvent|["']device(motion|orientation)["']/,
  /requestFullscreen/, /\beval\s*\(/, /new\s+Function\s*\(/, /WebAssembly\./, /window\.open\s*\(/, /\bprompt\s*\(/,
  /location\.(href\s*=|assign\s*\(|replace\s*\()/, /["'`]https?:\/\/(?!www\.w3\.org\/2000\/svg)/, /import\s*\(/, /\bimport\.meta\b/
];
for (const re of forbidden) if (re.test(js)) errors.push(`app.js matches forbidden pattern ${re}`);
if (/^\s*(import|export)\s/m.test(js)) errors.push('app.js contains ES module syntax');
if (/@import|url\(\s*["']?https?:/i.test(css)) errors.push('CSS has external @import/url');

if (errors.length) {
  console.error('[minitool] static gate FAILED:\n  - ' + errors.join('\n  - '));
  process.exit(1);
}

// ---------- 4. zip (contents, not the folder) ----------
fs.rmSync(ZIP, { force: true });
execFileSync('zip', ['-r', '-X', '-q', ZIP, '.', '-x', '*.DS_Store'], { cwd: OUT, stdio: 'inherit' });

const kib = (n) => `${(n / 1024).toFixed(1)} KiB`;
let total = 0;
for (const f of files) total += fs.statSync(path.join(OUT, f)).size;
console.log(`[minitool] ${files.length} files, ${kib(total)} unpacked → ${path.relative(root, ZIP)} (${kib(fs.statSync(ZIP).size)})`);
for (const f of files.sort()) console.log(`  ${kib(fs.statSync(path.join(OUT, f)).size).padStart(10)}  ${f}`);
