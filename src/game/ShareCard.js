/**
 * ShareCard — renders a 1080×1440《1792 断头台城门官 · 审判鉴定书》share image.
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
  for (let i = 1; i < lines.length; i++) {
    if (/^[，。、；：！？」』）]/.test(lines[i])) {
      lines[i - 1] += lines[i][0];
      lines[i] = lines[i].slice(1);
    }
  }
  return lines.filter(Boolean);
}

export async function renderShareCard({ verdict, cityImage, portrait, url, lang = 'zh' }) {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  const en = lang === 'en';

  const bg = await loadImg(cityImage);
  ctx.fillStyle = '#0d1620';
  ctx.fillRect(0, 0, W, H);
  cover(ctx, bg, 0, 0, W, H * 0.58, verdict.city === 'paris' ? 0.55 : 0.42, 0.38);

  const g = ctx.createLinearGradient(0, H * 0.14, 0, H * 0.60);
  g.addColorStop(0, 'rgba(13,22,32,0.1)');
  g.addColorStop(1, 'rgba(13,22,32,1)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H * 0.60);
  ctx.fillStyle = '#0d1620';
  ctx.fillRect(0, H * 0.595, W, H);

  // Double brass border
  ctx.strokeStyle = 'rgba(212,176,106,0.78)';
  ctx.lineWidth = 2;
  ctx.strokeRect(36, 36, W - 72, H - 72);
  ctx.strokeStyle = 'rgba(212,176,106,0.34)';
  ctx.lineWidth = 1;
  ctx.strokeRect(46, 46, W - 92, H - 92);

  // Masthead
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#f3ead8';
  ctx.font = `700 44px ${ZH}`;
  ctx.fillText(en ? '1792: GATEKEEPER OF CALAIS' : '1792 · 断头台城门官', 84, 120);
  ctx.fillStyle = '#d4b06a';
  ctx.font = `italic 500 28px ${EN}`;
  ctx.fillText('A Tale of Two Cities · Official Border Audit', 86, 162);

  // Kicker & Rank
  let y = 555;
  ctx.fillStyle = '#d4b06a';
  ctx.font = `600 30px ${ZH}`;
  ctx.fillText(en ? verdict.rankEn : verdict.rank, 84, y);

  // Big Verdict Title
  y += 108;
  ctx.fillStyle = '#f6eedc';
  const title = en ? verdict.titleEn || verdict.title : verdict.title;
  let fs = 94;
  ctx.font = `700 ${fs}px ${ZH}`;
  while (ctx.measureText(title).width > W - 168 && fs > 48) {
    fs -= 4;
    ctx.font = `700 ${fs}px ${ZH}`;
  }
  ctx.fillText(title, 80, y);

  // Stats strip
  y += 72;
  ctx.font = `600 34px ${ZH}`;
  ctx.fillStyle = '#e8977a';
  const statLine = en
    ? `Clues Found: ${verdict.cluesFound}/${verdict.cluesPossible}  ·  Gold: ${verdict.gold}  ·  Strikes: ${verdict.strikes}/2`
    : `检出破绽 ${verdict.cluesFound}/${verdict.cluesPossible} 处  ·  攒下 ${verdict.gold} 金币  ·  督察记过 ${verdict.strikes}/2`;
  ctx.fillText(statLine, 84, y);

  // Epitaph
  y += 66;
  ctx.font = `400 34px ${ZH}`;
  ctx.fillStyle = '#d9dfe3';
  wrap(ctx, en ? verdict.epitaphEn || verdict.epitaph : verdict.epitaph, W - 168)
    .slice(0, 3)
    .forEach((l) => {
      ctx.fillText(l, 84, y);
      y += 54;
    });

  // Parchment Case Ledger Plate
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
      ctx.arc(192, py + 150, 88, 0, Math.PI * 2);
      ctx.clip();
      cover(ctx, p, 104, py + 62, 176, 176, 0.5, 0.3);
      ctx.restore();
      ctx.strokeStyle = 'rgba(155,122,60,0.85)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(192, py + 150, 90, 0, Math.PI * 2);
      ctx.stroke();
    } catch (e) {
      /* ignore */
    }
  }

  ctx.fillStyle = '#9b7a3c';
  ctx.font = `600 24px ${ZH}`;
  ctx.fillText(en ? 'SHIFT CASE LOG' : '本班三审卷宗记录', 310, py + 68);

  let ry = py + 118;
  (verdict.history || []).forEach((h, idx) => {
    const isDetain = h.action === 'detain';
    const shortName = String(h.name || '').replace(/^持证名：/, '');
    const stampTxt = isDetain ? '【红章扣押】' : '【绿章放行】';
    const mainTxt = `${idx + 1}. ${shortName} ${stampTxt}`;
    ctx.fillStyle = isDetain ? '#8e2a22' : '#1f6b49';
    ctx.font = `700 23px ${ZH}`;
    ctx.fillText(mainTxt, 302, ry);
    const mainW = ctx.measureText(mainTxt).width;
    ctx.fillStyle = '#5a5043';
    ctx.font = `600 20px ${ZH}`;
    ctx.fillText(`· ${h.tag}`, 302 + mainW + 8, ry);
    ry += 56;
  });

  if (IS_MINITOOL) {
    const sx = W - 210;
    const sy = py + 150;
    ctx.fillStyle = '#8e2a22';
    ctx.beginPath();
    ctx.arc(sx, sy, 74, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,215,185,0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sx, sy, 58, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#f6d9bf';
    ctx.font = `600 30px ${EN}`;
    ctx.textAlign = 'center';
    ctx.fillText('1792', sx, sy + 10);
    ctx.textAlign = 'left';
  } else {
    const qr = await QRCode.toDataURL(url, { margin: 1, width: 210, color: { dark: '#2b2722', light: '#efe7d3' } });
    const q = await loadImg(qr);
    ctx.drawImage(q, W - 320, py + 45, 210, 210);
  }

  ctx.fillStyle = '#a5b1b9';
  ctx.font = `400 26px ${ZH}`;
  ctx.textAlign = 'center';
  const footer = IS_MINITOOL
    ? en
      ? '90% stamp the wrong suspect on Case 1 — try your eye!'
      : '90% 的人第一关就盖错章——换你坐上城门审讯台试试？'
    : en
      ? 'Scan to test your eye at the 1792 Calais Gate'
      : '扫码上任：这三个人里谁是伪装贵族？90% 的人第一关就盖错章';
  ctx.fillText(footer, W / 2, H - 72);
  ctx.textAlign = 'left';

  return IS_MINITOOL ? c.toDataURL('image/jpeg', 0.92) : c.toDataURL('image/png');
}
