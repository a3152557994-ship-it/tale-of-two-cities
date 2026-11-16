/**
 * Xiaohongshu mini-tool (小红书小工具) build — separate from the website build (vite.config.js → docs/).
 *
 *   pnpm build:minitool      (scripts/build-minitool.mjs: images → this config → checks → zip)
 *
 * Output: release/minitool-build/  (index.html at root, classic deferred app.js, style.css,
 * critical/ first-screen painting, assets/ deferrable images — see the container doc §2.6/§2.7).
 */
import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const SRC_ASSETS = path.join(root, 'src', 'assets') + path.sep;
const IMG_CACHE = path.join(root, 'release', '.minitool-cache', 'img');

// Exposed to client code as import.meta.env.VITE_TARGET (constant-folded).
process.env.VITE_TARGET = 'minitool';

function must(html, from, to) {
  if (typeof from === 'string' ? !html.includes(from) : !from.test(html)) {
    throw new Error(`[minitool] index.html transform did not match: ${from}`);
  }
  return html.replace(from, to);
}

/** index.html → container-compliant entry (no external fonts, classic script, album/share buttons). */
function minitoolHtml() {
  return [
    {
      name: 'minitool-html-pre',
      transformIndexHtml: {
        order: 'pre',
        handler(html) {
          let h = html;
          h = must(h, /^<!doctype html>/i, '<!DOCTYPE html>');
          h = must(h, /\s*<link\s+rel="icon"[\s\S]*?\/>/, '');
          h = must(h, /\s*<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com" \/>/, '');
          h = must(h, /\s*<link rel="preconnect" href="https:\/\/fonts\.gstatic\.com" crossorigin \/>/, '');
          h = must(h, /\s*<link\s+href="https:\/\/fonts\.googleapis\.com[\s\S]*?\/>/, '');
          h = must(h, '/src/main.js', '/src/minitool/entry.js');
          h = must(h, '手机长按图片保存，电脑点下方按钮下载', '点「保存到相册」，把结局卡存进手机');
          h = must(
            h,
            '<a class="btn-primary" id="share-download" download="双城记-结局卡.png">下载结局卡</a>',
            '<button class="btn-primary" id="share-download" type="button">保存到相册</button>'
          );
          h = must(
            h,
            '<button class="btn-secondary dark" id="btn-copy-link" type="button">复制游戏链接</button>',
            '<button class="btn-secondary dark hidden" id="btn-copy-link" type="button">分享小工具</button>'
          );
          return h;
        }
      }
    },
    {
      name: 'minitool-html-post',
      enforce: 'post',
      transformIndexHtml: {
        order: 'post',
        handler(html) {
          let h = html.replace(/<script type="module" crossorigin src="([^"]+)"><\/script>/g, '<script defer src="$1"></script>');
          h = h.replace(/<link rel="stylesheet" crossorigin href=/g, '<link rel="stylesheet" href=');
          if (/type="module"|crossorigin|https?:\/\/fonts\./.test(h)) throw new Error('[minitool] index.html still has module/crossorigin/external refs');
          return h;
        }
      }
    }
  ];
}

/** Swap network/QR modules for stubs and JPGs for pre-compressed WebP (scripts/build-minitool.mjs). */
function minitoolSwaps() {
  const stub = (f) => path.join(root, 'src', 'minitool', f);
  return {
    name: 'minitool-swaps',
    enforce: 'pre',
    async resolveId(source, importer, options) {
      if (source === 'qrcode') return stub('qrcode-stub.js');
      const r = await this.resolve(source, importer, { ...options, skipSelf: true });
      if (!r || r.external) return null;
      const id = r.id.split('?')[0];
      if (id === path.join(root, 'src', 'game', 'track.js')) return stub('track-stub.js');
      if (id.startsWith(SRC_ASSETS) && /\.jpe?g$/i.test(id)) {
        const webp = path.join(IMG_CACHE, path.relative(SRC_ASSETS, id).replace(/\.jpe?g$/i, '.webp'));
        if (fs.existsSync(webp)) return webp;
        this.warn(`no WebP for ${path.relative(root, id)} — shipping original JPG`);
      }
      return null;
    }
  };
}

/** esbuild's syntax-lowering helpers are emitted above the IIFE; wrap the whole file so no globals leak. */
function minitoolSealScope() {
  return {
    name: 'minitool-seal-scope',
    enforce: 'post',
    generateBundle(_, bundle) {
      for (const chunk of Object.values(bundle)) {
        if (chunk.type === 'chunk' && chunk.isEntry) chunk.code = `!function(){${chunk.code}\n}();\n`;
      }
    }
  };
}

export default defineConfig({
  base: './',
  plugins: [minitoolSwaps(), ...minitoolHtml(), minitoolSealScope()],
  experimental: {
    // JS-side asset URLs are used as <img>/CSS urls relative to index.html (zip root).
    renderBuiltUrl(filename, { hostType }) {
      return hostType === 'js' ? `./${filename}` : { relative: true };
    }
  },
  build: {
    outDir: 'release/minitool-build',
    emptyOutDir: true,
    target: ['es2017', 'chrome61'],
    cssTarget: 'chrome61',
    sourcemap: false,
    modulePreload: false,
    assetsInlineLimit: 0,
    cssCodeSplit: false,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        format: 'iife',
        inlineDynamicImports: true,
        entryFileNames: 'app.js',
        assetFileNames(info) {
          const name = (info.names && info.names[0]) || info.name || '';
          if (name.endsWith('.css')) return 'style.css';
          // First-screen painting ships with the main package; everything else may be
          // externalised by the platform's static-resource optimisation (doc §2.7).
          if (name.startsWith('prologue-channel')) return 'critical/[name]-[hash][extname]';
          return 'assets/[name]-[hash][extname]';
        }
      }
    }
  }
});
