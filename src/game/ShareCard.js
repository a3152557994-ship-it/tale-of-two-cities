/**
 * ShareCard — renders a 1080×1440 "fate card" PNG for social sharing.
 */
import QRCode from 'qrcode';

// Mini-tool build: no external-URL QR / no CORS-mode image loads (same-origin package files).
const IS_MINITOOL = import.meta.env.VITE_TARGET === 'minitool';

const W = 1080;
const H = 1440;
const ZH = '"Songti SC", "STSong", "Noto Serif SC", "Source Han Serif SC", serif';
const EN = '"Cormorant Garamond", "Iowan Old Style", Georgia, serif';

function loadImg(src) {
  return new Promise((res, rej) => {
    const i = new Image();
    if (!IS_MINITOOL) i.crossOrigin = 'anonymous';
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
}

function cover(ctx, img, x, y, w, h, fx = 0.5, fy = 0.5) {
  const s = Math.max(w / img.width, h / img.height);
  const sw = w / s;
  const sh = h / s;
  ctx.drawImage(img, (img.width - sw) * fx, (img.height - sh) * fy, sw, sh, x, y, w, h);
}

function wrap(ctx, text, maxW) {
  const lines = [];
  let line = '';
  const tokens = /[\u4e00-\u9fff]/.test(text) ? [...text] : text.split(/(\s+)/);
  for (const t of tokens) {
    const test = line + t;
    if (ctx.measureText(test).width > maxW && line.trim()) {
      lines.push(line.trim());
      line = t.trimStart();
    } else line = test;
  }
  if (line.trim()) lines.push(line.trim());
  // avoid a lone punctuation mark at line start
  for (let i = 1; i < lines.length; i++) {
    if (/^[，。、；：！？」』）]/.test(lines[i])) {
      lines[i - 1] += lines[i][0];
      lines[i] = lines[i].slice(1);
    }
  }
  return lines.filter(Boolean);
}

export async function renderShareCard({ ending, cityImage, portrait, url, lang = 'zh' }) {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  const en = lang === 'en';

  // Painting background
  const bg = await loadImg(cityImage);
  ctx.fillStyle = '#0d1620';
  ctx.fillRect(0, 0, W, H);
  cover(ctx, bg, 0, 0, W, H * 0.62, ending.city === 'paris' ? 0.55 : 0.4, 0.4);
  const g = ctx.createLinearGradient(0, H * 0.18, 0, H * 0.64);
  g.addColorStop(0, 'rgba(13,22,32,0)');
  g.addColorStop(1, 'rgba(13,22,32,1)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H * 0.64);
  ctx.fillStyle = '#0d1620';
  ctx.fillRect(0, H * 0.635, W, H);
  const v = ctx.createRadialGradient(W / 2, H * 0.3, 200, W / 2, H * 0.3, 900);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);

  // Frame
  ctx.strokeStyle = 'rgba(212,176,106,0.75)';
  ctx.lineWidth = 2;
  ctx.strokeRect(36, 36, W - 72, H - 72);
  ctx.strokeStyle = 'rgba(212,176,106,0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(46, 46, W - 92, H - 92);

  // Masthead
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#f3ead8';
  ctx.font = `700 46px ${ZH}`;
  ctx.fillText('双城记 · 撕裂年代', 84, 124);
  ctx.fillStyle = '#d4b06a';
  ctx.font = `italic 500 30px ${EN}`;
  ctx.fillText('It was the best of times, it was the worst of times', 86, 168);

  // Kicker
  let y = 580;
  const cityName = ending.city === 'paris' ? (en ? 'Paris' : '巴黎') : en ? 'London' : '伦敦';
  ctx.fillStyle = '#d4b06a';
  ctx.font = `600 30px ${ZH}`;
  const kicker = en
    ? `${ending.year} · ${cityName} · survived ${ending.cards} cards`
    : `${ending.year} 年 · ${cityName} · 撑过 ${ending.cards} 张牌`;
  ctx.fillText(kicker, 84, y);

  // Title
  y += 110;
  ctx.fillStyle = '#f6eedc';
  const title = en ? ending.titleEn || ending.title : ending.title;
  let fs = 96;
  ctx.font = `700 ${fs}px ${ZH}`;
  while (ctx.measureText(title).width > W - 168 && fs > 48) {
    fs -= 4;
    ctx.font = `700 ${fs}px ${ZH}`;
  }
  ctx.fillText(title, 80, y);

  // Death line
  const death = en ? ending.deathEn : ending.death;
  y += 78;
  ctx.font = `600 38px ${ZH}`;
  ctx.fillStyle = '#e8977a';
  ctx.fillText(death ? (en ? `Died of: ${death}` : `死于：${death}`) : en ? 'Survived the Terror.' : '活过了恐怖时代。', 84, y);

  // Epitaph
  y += 70;
  ctx.font = `400 36px ${ZH}`;
  ctx.fillStyle = '#d9dfe3';
  wrap(ctx, en ? ending.epitaphEn || ending.epitaph : ending.epitaph, W - 168)
    .slice(0, 3)
    .forEach((l) => {
      ctx.fillText(l, 84, y);
      y += 56;
    });

  // Persona plate
  const py = H - 430;
  ctx.fillStyle = '#efe7d3';
  ctx.fillRect(72, py, W - 144, 300);
  ctx.strokeStyle = 'rgba(155,122,60,0.55)';
  ctx.strokeRect(82, py + 10, W - 164, 280);
  if (portrait) {
    try {
      const p = await loadImg(portrait);
      ctx.save();
      ctx.beginPath();
      ctx.arc(196, py + 150, 92, 0, Math.PI * 2);
      ctx.clip();
      cover(ctx, p, 104, py + 58, 184, 184, 0.5, 0.3);
      ctx.restore();
      ctx.strokeStyle = 'rgba(155,122,60,0.8)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(196, py + 150, 94, 0, Math.PI * 2);
      ctx.stroke();
    } catch (e) {
      /* ignore */
    }
  }
  const p = ending.persona || {};
  ctx.fillStyle = '#9b7a3c';
  ctx.font = `600 24px ${ZH}`;
  ctx.fillText(en ? 'YOUR PERSONA' : '我的人格', 320, py + 78);
  ctx.fillStyle = '#8e2a22';
  ctx.font = `700 52px ${ZH}`;
  ctx.fillText(en ? p.nameEn || p.name : `「${p.name}」`, 312, py + 140);
  ctx.fillStyle = '#3e372d';
  ctx.font = `400 28px ${ZH}`;
  let ly = py + 188;
  wrap(ctx, en ? p.lineEn || p.line || '' : p.line || '', 440)
    .slice(0, 3)
    .forEach((l) => {
      ctx.fillText(l, 320, ly);
      ly += 40;
    });

  if (IS_MINITOOL) {
    // Wax seal in place of the website QR code (no external link inside the mini-tool).
    const sx = W - 220;
    const sy = py + 150;
    ctx.fillStyle = '#8e2a22';
    ctx.beginPath();
    ctx.arc(sx, sy, 96, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(243,234,216,0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sx, sy, 80, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#f3ead8';
    ctx.textAlign = 'center';
    ctx.font = `600 50px ${EN}`;
    ctx.fillText('T·C', sx, sy + 8);
    ctx.font = `600 20px ${ZH}`;
    ctx.fillText(String(ending.year || ''), sx, sy + 46);
    ctx.textAlign = 'left';
  } else {
    // QR
    const qr = await QRCode.toDataURL(url, { margin: 1, width: 220, color: { dark: '#2b2722', light: '#efe7d3' } });
    const q = await loadImg(qr);
    ctx.drawImage(q, W - 330, py + 40, 220, 220);
  }

  // Footer
  ctx.fillStyle = '#a5b1b9';
  ctx.font = `400 26px ${ZH}`;
  ctx.textAlign = 'center';
  const footer = IS_MINITOOL
    ? en
      ? 'Every card: London, or Paris?'
      : '这是最好的时代，也是最坏的时代——每一张牌，你撕向哪座城？'
    : en
      ? 'Scan to see which city you would tear toward'
      : '扫码看看：每一张牌，你会撕向哪座城？';
  ctx.fillText(footer, W / 2, H - 72);
  ctx.textAlign = 'left';

  // Mini-tool: JPEG keeps the base64 handed to writeTempFile / the album small.
  return IS_MINITOOL ? c.toDataURL('image/jpeg', 0.92) : c.toDataURL('image/png');
}
