// 参加をやめたときのホラー演出（Web）。真っ暗な画面のまん中で本物そっくりの目が開き、
// 指の位置をにらんでから正面を見つめ、血文字で「なんでやめたの」と出す。Canvas 1枚に描く。
// 目の大きさは「横幅1000」の単位で描き、画面の幅に合わせて拡大する。
import { BLOOD_FONT_FAMILY } from './bloodFont';
import { LEAVE_TEXT, LEAVE_TIMING as T, between, clamp01, dripProgress, easeOut, lidOpen } from './leaveTiming';

type Pt = [number, number];
type Curve = [Pt, Pt, Pt, Pt];
interface Lids { up: Curve; lo: Curve }
type Ctx = CanvasRenderingContext2D;

interface Textures {
  noise: HTMLCanvasElement;
  iris: HTMLCanvasElement;
  sclera: HTMLCanvasElement;
  vessels: HTMLCanvasElement;
  skin: HTMLCanvasElement;
  lash: number[][];
  low: number[][];
  ruff: number[];
  wet: number[][];
}

interface Drip { x: number; y: number; len: number; w: number; t0: number; dur: number; ph: number; pz: number }
interface Letter { w: number; wd: number; hd: number; mat: HTMLCanvasElement; drips: Drip[] }

interface Frame {
  open: number; gx: number; gy: number; pupil: number; zoom: number;
  sx: number; sy: number; vein: number; flick: number;
}

export interface LeaveEyeOptions {
  host: HTMLElement;
  width: number;
  height: number;
  reduced: boolean;
  onEnd: () => void;
}

export interface LeaveEyeHandle { stop: () => void }

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}
const ctx2d = (c: HTMLCanvasElement) => c.getContext('2d') as Ctx;
const hasFilter = (c: Ctx) => 'filter' in c;
function stops(g: CanvasGradient, list: [number, string][]) {
  list.forEach(([at, color]) => g.addColorStop(at, color));
}

/** 毎回同じ形になるように、決まった並びの乱数を使う */
function seeded(seed: number) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

let cachedTextures: Textures | null = null;

/** 目の材料を一度だけ作る（重いので暗転しているあいだに作る） */
function buildTextures(): Textures {
  if (cachedTextures) return cachedTextures;
  const R = seeded(11);

  const noise = canvas(220, 220);
  const nc = ctx2d(noise);
  const img = nc.createImageData(220, 220);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random() * 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  nc.putImageData(img, 0, 0);

  // 虹彩
  const IS = 1024, Rp = IS / 2;
  const iris = canvas(IS, IS);
  const c = ctx2d(iris);
  c.translate(Rp, Rp);
  let gr = c.createRadialGradient(0, 0, 0, 0, 0, Rp);
  stops(gr, [[0, '#120804'], [0.22, '#3a1f0c'], [0.4, '#6a4018'], [0.55, '#7d5222'], [0.75, '#5a3816'], [0.9, '#2e1a0a'], [1, '#0c0603']]);
  c.fillStyle = gr; c.beginPath(); c.arc(0, 0, Rp, 0, 7); c.fill();
  const tints = ['rgba(150,120,40,', 'rgba(90,50,20,', 'rgba(190,130,60,', 'rgba(60,70,30,'];
  for (let i = 0; i < 70; i++) {
    const a = R() * Math.PI * 2, w = 0.05 + R() * 0.15;
    c.fillStyle = tints[(R() * 4) | 0] + (0.05 + R() * 0.1) + ')';
    c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, Rp * 0.95, a, a + w); c.closePath(); c.fill();
  }
  const fiber = (n: number, cols: string[], a0: number, a1: number, w0: number, w1: number, comp: GlobalCompositeOperation = 'source-over') => {
    c.globalCompositeOperation = comp;
    for (let i = 0; i < n; i++) {
      const a = R() * Math.PI * 2, r0 = Rp * (0.16 + R() * 0.28), r1 = Rp * (0.6 + R() * 0.36), ph = R() * 6, amp = 0.012 + R() * 0.03;
      c.beginPath();
      for (let k = 0; k <= 14; k++) {
        const r = r0 + (r1 - r0) * k / 14, aa = a + Math.sin(k * 0.8 + ph) * amp;
        if (k) c.lineTo(Math.cos(aa) * r, Math.sin(aa) * r); else c.moveTo(Math.cos(aa) * r, Math.sin(aa) * r);
      }
      c.strokeStyle = cols[(R() * cols.length) | 0]; c.globalAlpha = a0 + R() * (a1 - a0); c.lineWidth = w0 + R() * (w1 - w0); c.stroke();
    }
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  };
  fiber(2600, ['#140904', '#22100a', '#2c160a'], 0.2, 0.45, 1, 3.2);
  fiber(3800, ['#c99a5a', '#e0b070', '#a87840', '#8f6a3a', '#d8c08a', '#b38b4a'], 0.1, 0.42, 0.7, 2.2);
  fiber(700, ['rgba(255,200,130,1)'], 0.04, 0.1, 0.6, 1.4, 'lighter');
  c.beginPath();
  for (let k = 0; k <= 140; k++) {
    const a = k / 140 * Math.PI * 2, r = Rp * (0.43 + Math.sin(k * 1.9) * 0.025 + Math.sin(k * 0.45) * 0.02 + (R() - 0.5) * 0.03);
    if (k) c.lineTo(Math.cos(a) * r, Math.sin(a) * r); else c.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  c.closePath(); c.strokeStyle = 'rgba(215,165,95,.38)'; c.lineWidth = 10; c.stroke(); c.strokeStyle = 'rgba(30,14,5,.4)'; c.lineWidth = 3; c.stroke();
  for (let i = 0; i < 55; i++) {
    const a = R() * Math.PI * 2, r = Rp * (0.46 + R() * 0.22);
    c.save(); c.translate(Math.cos(a) * r, Math.sin(a) * r); c.rotate(a);
    const rx = 10 + R() * 22, ry = 4 + R() * 7;
    c.fillStyle = 'rgba(10,5,2,.6)'; c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, 7); c.fill();
    c.strokeStyle = 'rgba(205,155,90,.28)'; c.lineWidth = 2; c.stroke(); c.restore();
  }
  for (let i = 0; i < 6; i++) {
    const r = Rp * (0.72 + i * 0.035);
    let a = R() * 6;
    while (a < 6 + Math.PI * 2) {
      const l = 0.2 + R() * 0.6;
      c.strokeStyle = 'rgba(15,8,3,.35)'; c.lineWidth = 2 + R() * 2; c.beginPath(); c.arc(0, 0, r, a, a + l); c.stroke();
      a += l + 0.1 + R() * 0.5;
    }
  }
  for (let i = 0; i < 9; i++) {
    const a = R() * Math.PI * 2, r = Rp * (0.5 + R() * 0.35);
    c.fillStyle = 'rgba(45,22,8,.55)'; c.beginPath(); c.ellipse(Math.cos(a) * r, Math.sin(a) * r, 4 + R() * 9, 3 + R() * 6, R() * 3, 0, 7); c.fill();
  }
  if (hasFilter(c)) {
    const tmp = canvas(IS, IS);
    ctx2d(tmp).drawImage(iris, 0, 0);
    c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 0.4; c.filter = 'blur(1.5px)'; c.drawImage(tmp, 0, 0); c.filter = 'none'; c.globalAlpha = 1; c.translate(Rp, Rp);
  }
  gr = c.createRadialGradient(0, 0, Rp * 0.8, 0, 0, Rp);
  stops(gr, [[0, 'rgba(0,0,0,0)'], [0.7, 'rgba(8,4,2,.75)'], [1, 'rgba(0,0,0,.96)']]);
  c.fillStyle = gr; c.beginPath(); c.arc(0, 0, Rp, 0, 7); c.fill();
  c.globalCompositeOperation = 'destination-in'; c.fillStyle = '#000'; c.beginPath(); c.arc(0, 0, Rp, 0, 7); c.fill(); c.globalCompositeOperation = 'source-over';
  const ruff = Array.from({ length: 72 }, () => R());

  // 白目（1000x560 の単位を 1200x672 に）
  const S = 1.2;
  const sclera = canvas(1200, 672);
  const s = ctx2d(sclera);
  s.scale(S, S); s.translate(500, 280);
  gr = s.createRadialGradient(0, 0, 0, 0, 0, 540);
  stops(gr, [[0, '#f2ebe4'], [0.35, '#ebe0d6'], [0.7, '#d9bfb2'], [0.9, '#c08e82'], [1, '#8f4f47']]);
  s.fillStyle = gr; s.fillRect(-500, -280, 1000, 560);
  for (let i = 0; i < 60; i++) {
    const x = (R() - 0.5) * 900, y = (R() - 0.5) * 450, r = 30 + R() * 90, q = s.createRadialGradient(x, y, 0, x, y, r), col = R() < 0.6 ? '205,175,120' : '200,140,130';
    q.addColorStop(0, `rgba(${col},.09)`); q.addColorStop(1, `rgba(${col},0)`); s.fillStyle = q; s.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  ([[-500, 20, 300, 0.6], [500, -10, 280, 0.5]] as const).forEach(([x, y, r, a]) => {
    const q = s.createRadialGradient(x, y, 0, x, y, r);
    q.addColorStop(0, `rgba(170,55,50,${a})`); q.addColorStop(1, 'rgba(170,55,50,0)');
    s.fillStyle = q; s.fillRect(-500, -280, 1000, 560);
  });

  // 血管（ぼけた深い層＋くっきりした表面の層）
  const vessels = canvas(1200, 672);
  const v = ctx2d(vessels);
  const vesselColor = (mul: number) => `rgba(${(150 + R() * 40) | 0},${(14 + R() * 22) | 0},${(22 + R() * 16) | 0},${(0.35 + R() * 0.4) * mul})`;
  const drawVessels = (target: Ctx, wMul: number, aMul: number, count: number) => {
    target.save(); target.scale(S, S); target.translate(500, 280); target.lineCap = 'round'; target.lineJoin = 'round';
    const branch = (x0: number, y0: number, a0: number, w0: number, len0: number, depth: number) => {
      let x = x0, y = y0, a = a0, w = w0, len = len0;
      target.beginPath(); target.moveTo(x, y);
      while (len > 0 && w > 0.2) {
        const st = 4 + R() * 6;
        a += (R() - 0.5) * 0.6; x += Math.cos(a) * st; y += Math.sin(a) * st; target.lineTo(x, y); len -= st; w *= 0.985;
        if (depth < 4 && R() < 0.07) {
          target.strokeStyle = vesselColor(aMul); target.lineWidth = w * wMul; target.stroke();
          branch(x, y, a + (R() < 0.5 ? -1 : 1) * (0.4 + R() * 0.6), w * 0.65, len * 0.6, depth + 1);
          target.beginPath(); target.moveTo(x, y);
        }
      }
      target.strokeStyle = vesselColor(aMul); target.lineWidth = Math.max(0.3, w * wMul); target.stroke();
    };
    for (let i = 0; i < count; i++) branch(-495 + R() * 100, -80 + R() * 170, (R() - 0.5) * 1.1, 0.9 + R() * 1.3, 140 + R() * 220, 0);
    for (let i = 0; i < count; i++) branch(495 - R() * 100, -90 + R() * 170, Math.PI + (R() - 0.5) * 1.1, 0.9 + R() * 1.3, 140 + R() * 220, 0);
    for (let i = 0; i < count / 2; i++) branch(-330 + R() * 660, -235 + R() * 30, Math.PI / 2 + (R() - 0.5) * 0.9, 0.7 + R(), 80 + R() * 130, 0);
    for (let i = 0; i < count / 3; i++) branch(-300 + R() * 600, 175 + R() * 30, -Math.PI / 2 + (R() - 0.5) * 0.9, 0.6 + R() * 0.9, 60 + R() * 100, 0);
    target.restore();
  };
  const deep = canvas(1200, 672);
  drawVessels(ctx2d(deep), 2.6, 0.55, 22);
  if (hasFilter(v)) { v.filter = 'blur(3px)'; v.drawImage(deep, 0, 0); v.filter = 'none'; } else { v.globalAlpha = 0.5; v.drawImage(deep, 0, 0); v.globalAlpha = 1; }
  drawVessels(v, 1, 1, 30);
  const wet = Array.from({ length: 14 }, () => [Math.PI * (1.05 + R() * 0.6), 1.15 + R() * 0.75, 1.5 + R() * 3.5, 0.25 + R() * 0.4]);

  // 目のまわりの肌（-1100..1100 x -1300..1300 を 0.6px/単位で）
  const K = 0.6;
  const skin = canvas(1320, 1560);
  const k = ctx2d(skin);
  k.scale(K, K); k.translate(1100, 1300);
  k.fillStyle = '#86584a'; k.fillRect(-1100, -1300, 2200, 2600);
  for (let i = 0; i < 140; i++) {
    const x = (R() - 0.5) * 2200, y = (R() - 0.5) * 2600, r = 40 + R() * 160, q = k.createRadialGradient(x, y, 0, x, y, r), col = R() < 0.5 ? '150,70,60' : '90,55,40';
    q.addColorStop(0, `rgba(${col},${0.08 + R() * 0.1})`); q.addColorStop(1, `rgba(${col},0)`); k.fillStyle = q; k.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  for (let i = 0; i < 14000; i++) {
    const x = (R() - 0.5) * 2200, y = (R() - 0.5) * 2600;
    k.fillStyle = `rgba(40,18,12,${0.1 + R() * 0.18})`; k.beginPath(); k.arc(x, y, 0.8 + R() * 1.6, 0, 7); k.fill();
  }
  for (let i = 0; i < 4500; i++) {
    const x = (R() - 0.5) * 2200, y = (R() - 0.5) * 2600;
    k.fillStyle = `rgba(255,220,200,${0.04 + R() * 0.06})`; k.fillRect(x, y, 1.6, 1.6);
  }
  k.lineCap = 'round';
  const wrinkle = (pts: Pt[], w: number, a: number) => {
    k.strokeStyle = `rgba(45,20,14,${a})`; k.lineWidth = w; k.beginPath();
    pts.forEach((q, i) => (i ? k.lineTo(q[0], q[1]) : k.moveTo(q[0], q[1]))); k.stroke();
    k.strokeStyle = `rgba(255,215,195,${a * 0.35})`; k.lineWidth = w * 0.7; k.beginPath();
    pts.forEach((q, i) => (i ? k.lineTo(q[0], q[1] + w * 1.4) : k.moveTo(q[0], q[1] + w * 1.4))); k.stroke();
  };
  for (let i = 0; i < 14; i++) {
    const a0 = -0.7 + i * 0.1 + (R() - 0.5) * 0.06, len = 140 + R() * 260, pts: Pt[] = [];
    for (let t = 0; t <= 1; t += 0.1) {
      const a = a0 + t * (R() - 0.5) * 0.25 + t * 0.15 * (a0 > 0 ? 1 : -1);
      pts.push([540 + Math.cos(a) * len * t + 20, -10 + Math.sin(a) * len * t]);
    }
    wrinkle(pts, 2 + R() * 2.5, 0.35 + R() * 0.25);
  }
  for (let i = 0; i < 10; i++) {
    const y0 = 150 + i * 16 + R() * 10, x0 = -380 + R() * 200, x1 = 200 + R() * 250, pts: Pt[] = [];
    for (let x = x0; x <= x1; x += 30) pts.push([x, y0 + Math.pow((x - (x0 + x1) / 2) / 400, 2) * -60 + (R() - 0.5) * 4]);
    wrinkle(pts, 1.4 + R() * 1.6, 0.25 + R() * 0.2);
  }
  const lash = Array.from({ length: 120 }, () => [R(), R(), R()]);
  const low = Array.from({ length: 44 }, () => [R(), R(), R()]);
  cachedTextures = { noise, iris, sclera, vessels, skin, lash, low, ruff, wet };
  return cachedTextures;
}

function bz(p: Curve, u: number): Pt {
  const m = 1 - u;
  return [
    m * m * m * p[0][0] + 3 * m * m * u * p[1][0] + 3 * m * u * u * p[2][0] + u * u * u * p[3][0],
    m * m * m * p[0][1] + 3 * m * m * u * p[1][1] + 3 * m * u * u * p[2][1] + u * u * u * p[3][1],
  ];
}
function bzd(p: Curve, u: number): Pt {
  const m = 1 - u;
  return [
    3 * m * m * (p[1][0] - p[0][0]) + 6 * m * u * (p[2][0] - p[1][0]) + 3 * u * u * (p[3][0] - p[2][0]),
    3 * m * m * (p[1][1] - p[0][1]) + 6 * m * u * (p[2][1] - p[1][1]) + 3 * u * u * (p[3][1] - p[2][1]),
  ];
}
function lids(t: number, gy: number): Lids {
  const d = gy * 45 * Math.min(1, t);
  return {
    up: [[-500, 20], [-280, 20 - 300 * t + d], [260, -10 - 300 * t + d], [500, -10]],
    lo: [[500, -10], [260, -10 + 190 * t], [-280, 20 + 200 * t], [-500, 20]],
  };
}
const mapCurve = (p: Curve, f: (q: Pt, i: number) => Pt) => p.map(f) as Curve;
function curve(c: Ctx, p: Curve, move: boolean) {
  if (move) c.moveTo(p[0][0], p[0][1]);
  c.bezierCurveTo(p[1][0], p[1][1], p[2][0], p[2][1], p[3][0], p[3][1]);
}
function opening(c: Ctx, L: Lids) { c.beginPath(); curve(c, L.up, true); curve(c, L.lo, false); c.closePath(); }
function strokeCurve(c: Ctx, p: Curve, color: string, width: number) { c.strokeStyle = color; c.lineWidth = width; c.beginPath(); curve(c, p, true); c.stroke(); }

/** まつげ（根元が太く、先が細い。何本かずつ束になる） */
function hairs(c: Ctx, p: Curve, list: number[][], isUp: boolean, open: number) {
  c.lineCap = 'round';
  list.forEach(([a, b, k], i) => {
    const u = isUp ? 0.04 + 0.93 * (i / list.length) + (a - 0.5) * 0.012 : 0.12 + 0.76 * (i / list.length);
    const P = bz(p, u), D = bzd(p, u), tl = Math.hypot(D[0], D[1]) || 1, tx = D[0] / tl, ty = D[1] / tl, nx = ty, ny = -tx;
    const clump = Math.sin(i * 1.3) * 0.12;
    const lean = (isUp ? 0.2 + 0.65 * u : 0.25) + clump;
    const len = isUp ? (36 + 70 * Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.06)), 0.7)) * (0.7 + 0.55 * b) : (12 + 22 * Math.sin(Math.PI * u)) * (0.7 + 0.6 * b);
    const sg = isUp ? 1 : -1, dx = nx + tx * lean * sg, dy = ny + ty * lean * sg, dl = Math.hypot(dx, dy);
    const ex = P[0] + dx / dl * len, ey = P[1] + dy / dl * len * (isUp ? 0.5 + 0.5 * Math.min(1, open) : 1);
    const cx = P[0] + nx * len * 0.75, cy = P[1] + ny * len * 0.75;
    const base = isUp ? 3.6 + k * 1.8 : 1.8 + k;
    let px = P[0], py = P[1];
    for (let j = 1; j <= 6; j++) {
      const t = j / 6, m = 1 - t, qx = m * m * P[0] + 2 * m * t * cx + t * t * ex, qy = m * m * P[1] + 2 * m * t * cy + t * t * ey;
      c.strokeStyle = `rgba(${14 + j * 2},${8 + j},${6 + j},${0.97 - t * 0.25})`; c.lineWidth = base * Math.pow(1 - (j - 1) / 6, 0.9) + 0.4;
      c.beginPath(); c.moveTo(px, py); c.lineTo(qx, qy); c.stroke(); px = qx; py = qy;
    }
  });
}

function drawEye(c: Ctx, X: Textures, CW: number, CH: number, DPR: number, o: Frame) {
  c.setTransform(DPR, 0, 0, DPR, 0, 0); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
  c.fillStyle = '#000'; c.fillRect(0, 0, CW, CH);
  const sc = CW * 1.15 / 1000 * o.zoom;
  c.save(); c.translate(CW / 2 + o.sx, CH / 2 + o.sy); c.scale(sc, sc);
  c.drawImage(X.skin, -1100, -1300, 2200, 2600);
  const L = lids(o.open, o.gy);
  const crease = mapCurve(L.up, ([x, y], i) => [x * 1.05, y - (i === 0 || i === 3 ? 45 : 70 + 45 * o.open)]);
  const bag = mapCurve(L.lo, ([x, y]) => [x, y + 80 + 30 * o.open]);
  let g: CanvasGradient;
  // 上まぶたのふくらみ
  const yc = bz(crease, 0.5)[1], yl = bz(L.up, 0.5)[1];
  c.beginPath(); curve(c, L.up, true); c.lineTo(crease[3][0], crease[3][1]); c.bezierCurveTo(crease[2][0], crease[2][1], crease[1][0], crease[1][1], crease[0][0], crease[0][1]); c.closePath();
  g = c.createLinearGradient(0, yc - 10, 0, yl);
  stops(g, [[0, 'rgba(10,3,2,.75)'], [0.25, 'rgba(10,3,2,.25)'], [0.6, 'rgba(255,215,190,.13)'], [1, 'rgba(10,3,2,.45)']]);
  c.fillStyle = g; c.fill();
  c.lineCap = 'round';
  ([[46, 0.14], [22, 0.28], [8, 0.45]] as const).forEach(([w, a]) => strokeCurve(c, crease, `rgba(15,5,3,${a})`, w));
  // 下まぶたの厚み
  const yb = bz(bag, 0.5)[1], yo = bz(L.lo, 0.5)[1];
  c.beginPath(); curve(c, L.lo, true); c.lineTo(bag[3][0], bag[3][1]); c.bezierCurveTo(bag[2][0], bag[2][1], bag[1][0], bag[1][1], bag[0][0], bag[0][1]); c.closePath();
  g = c.createLinearGradient(0, yo, 0, yb + 20);
  stops(g, [[0, 'rgba(10,3,2,.25)'], [0.3, 'rgba(255,210,190,.09)'], [0.75, 'rgba(10,3,2,.12)'], [1, 'rgba(10,3,2,.3)']]);
  c.fillStyle = g; c.fill();
  ([[70, 0.1], [36, 0.14], [12, 0.16]] as const).forEach(([w, a]) => strokeCurve(c, bag, `rgba(10,3,2,${a})`, w));
  if (o.open > 0.004) {
    c.save(); c.shadowColor = 'rgba(0,0,0,.9)'; c.shadowBlur = 26 * sc * DPR; opening(c, L); c.fillStyle = '#000'; c.fill(); c.restore();
    c.save(); opening(c, L); c.clip();
    const ix = o.gx * 230, iy = o.gy * 60 + 18, Ri = 190, fx = 1 - 0.22 * Math.abs(o.gx);
    c.drawImage(X.sclera, -500, -280, 1000, 560);
    c.globalAlpha = o.vein; c.drawImage(X.vessels, -500, -280, 1000, 560); c.globalAlpha = 1;
    // 眼球の丸み
    g = c.createRadialGradient(ix * 0.6, iy - 20, 180, ix * 0.6, iy, 560);
    stops(g, [[0, 'rgba(40,8,8,0)'], [1, 'rgba(40,8,8,.6)']]);
    c.fillStyle = g; c.fillRect(-520, -300, 1040, 600);
    c.save(); c.translate(ix, iy); c.scale(fx, 1);
    g = c.createRadialGradient(0, 0, Ri * 0.95, 0, 0, Ri * 1.35);
    stops(g, [[0, 'rgba(120,130,150,.22)'], [1, 'rgba(120,130,150,0)']]);
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, Ri * 1.35, 0, 7); c.fill();
    g = c.createRadialGradient(0, 0, Ri * 0.92, 0, 0, Ri * 1.18);
    stops(g, [[0, 'rgba(50,18,12,.5)'], [1, 'rgba(50,18,12,0)']]);
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, Ri * 1.22, 0, 7); c.fill();
    c.drawImage(X.iris, -Ri, -Ri, 2 * Ri, 2 * Ri);
    c.save(); c.beginPath(); c.arc(0, 0, Ri * 0.97, 0, 7); c.clip();
    c.globalCompositeOperation = 'screen';
    g = c.createRadialGradient(Ri * 0.32, Ri * 0.42, 0, Ri * 0.32, Ri * 0.42, Ri * 0.8);
    stops(g, [[0, 'rgba(255,190,120,.42)'], [1, 'rgba(255,190,120,0)']]);
    c.fillStyle = g; c.fillRect(-Ri, -Ri, 2 * Ri, 2 * Ri);
    c.globalCompositeOperation = 'source-over'; c.restore();
    g = c.createRadialGradient(0, 0, o.pupil * 0.8, 0, 0, o.pupil * 1.1);
    stops(g, [[0, '#020101'], [1, 'rgba(0,0,0,0)']]);
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, o.pupil * 1.1, 0, 7); c.fill();
    c.beginPath();
    X.ruff.forEach((q, i) => {
      const a = i / X.ruff.length * Math.PI * 2, r = o.pupil * (1.02 + q * 0.07);
      if (i) c.lineTo(Math.cos(a) * r, Math.sin(a) * r); else c.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    });
    c.closePath(); c.strokeStyle = 'rgba(40,18,8,.5)'; c.lineWidth = 3; c.stroke();
    c.restore();
    [150, 105, 65, 32].forEach(w => strokeCurve(c, L.up, 'rgba(12,3,2,.2)', w));
    strokeCurve(c, L.lo, 'rgba(12,3,2,.16)', 34);
    // 角膜の映り込み
    const hx = ix * 0.85 - 58, hy = iy - 74;
    g = c.createRadialGradient(ix * 0.85, iy, 0, ix * 0.85, iy, Ri * 1.05);
    stops(g, [[0.6, 'rgba(255,255,255,0)'], [0.92, 'rgba(255,255,255,.07)'], [1, 'rgba(255,255,255,0)']]);
    c.fillStyle = g; c.fillRect(ix - Ri * 1.1, iy - Ri * 1.1, Ri * 2.2, Ri * 2.2);
    c.save(); c.shadowColor = 'rgba(255,255,255,.9)'; c.shadowBlur = 5 * sc * DPR; c.fillStyle = 'rgba(255,250,245,.88)';
    c.beginPath(); c.moveTo(hx, hy + 4); c.quadraticCurveTo(hx + 10, hy - 3, hx + 20, hy); c.lineTo(hx + 18, hy + 26); c.quadraticCurveTo(hx + 8, hy + 25, hx - 2, hy + 28); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(hx + 25, hy + 1); c.quadraticCurveTo(hx + 31, hy, hx + 37, hy + 3); c.lineTo(hx + 35, hy + 25); c.lineTo(hx + 23, hy + 25); c.closePath(); c.fill();
    c.restore();
    c.strokeStyle = 'rgba(255,255,255,.13)'; c.lineWidth = 7; c.beginPath(); c.ellipse(ix, iy, Ri * 1.02 * fx, Ri * 1.02, 0, Math.PI * 1.1, Math.PI * 1.45); c.stroke();
    X.wet.forEach(([a, r, sz, al]) => {
      c.fillStyle = `rgba(255,255,255,${al})`; c.beginPath(); c.ellipse(ix + Math.cos(a) * Ri * r, iy + Math.sin(a) * Ri * r * 0.7, sz * 1.6, sz, a, 0, 7); c.fill();
    });
    c.restore();
    g = c.createRadialGradient(-470, 22, 0, -470, 22, 42);
    stops(g, [[0, '#b8645d'], [0.7, 'rgba(120,45,40,.6)'], [1, 'rgba(110,35,35,0)']]);
    c.fillStyle = g; c.beginPath(); c.ellipse(-466, 22, 42, Math.max(2, 24 * Math.min(1, o.open * 1.6)), 0, 0, 7); c.fill();
    strokeCurve(c, mapCurve(L.lo, ([x, y]) => [x, y - 7]), 'rgba(255,255,255,.35)', 2.2);
    strokeCurve(c, L.lo, 'rgba(122,62,54,.95)', 12);
    strokeCurve(c, mapCurve(L.lo, ([x, y]) => [x, y + 4]), 'rgba(255,200,190,.28)', 2.5);
  }
  strokeCurve(c, L.up, '#2a120c', 15);
  strokeCurve(c, L.up, '#0a0403', 6);
  hairs(c, L.up, X.lash, true, o.open);
  if (o.open > 0.004) hairs(c, L.lo, X.low, false, o.open);
  c.restore();
  // 画面の光だけで照らされたような暗さにして、まわりは真っ暗にする
  c.setTransform(DPR, 0, 0, DPR, 0, 0);
  c.globalCompositeOperation = 'multiply';
  c.save(); c.translate(CW / 2, CH / 2 + CW * 0.03); c.scale(1, 0.6);
  g = c.createRadialGradient(0, 0, 0, 0, 0, CW * 0.8 * o.zoom);
  stops(g, [[0, 'rgb(232,212,202)'], [0.35, 'rgb(150,126,118)'], [0.6, 'rgb(30,24,22)'], [0.78, 'rgb(0,0,0)'], [1, 'rgb(0,0,0)']]);
  c.fillStyle = g; c.fillRect(-CW, -CH * 2, CW * 2, CH * 4); c.restore();
  c.globalCompositeOperation = 'saturation'; c.fillStyle = 'rgba(128,128,128,.25)'; c.fillRect(0, 0, CW, CH);
  c.globalCompositeOperation = 'source-over';
  const pattern = c.createPattern(X.noise, 'repeat');
  if (pattern) {
    c.save(); c.globalCompositeOperation = 'overlay'; c.translate(Math.random() * 220, Math.random() * 220); c.globalAlpha = 0.22; c.fillStyle = pattern; c.fillRect(-220, -220, CW + 440, CH + 440); c.restore();
  }
  if (o.flick > 0) { c.globalAlpha = 1; c.fillStyle = `rgba(0,0,0,${o.flick})`; c.fillRect(0, 0, CW, CH); }
}

const bloodFont = (fs: number) => `900 ${fs}px "${BLOOD_FONT_FAMILY}", "Hiragino Mincho ProN", "Yu Mincho", serif`;

/** 指で血をなすって書いたような文字（ガタガタのふち→ぬれた質感→したたり）を1字ずつ作る */
function buildBlood(X: Textures, CW: number, DPR: number): { letters: Letter[] } {
  let fs = Math.round(CW * 0.15);
  const d = DPR;
  let font = bloodFont(fs);
  const r = seeded(9);
  const meas = ctx2d(canvas(4, 4));
  meas.font = font;
  const chars = Array.from(LEAVE_TEXT);
  const total = chars.reduce((t, ch) => t + meas.measureText(ch).width * 0.9, 0);
  if (total > CW * 0.86) { fs = Math.floor(fs * CW * 0.86 / total); font = bloodFont(fs); meas.font = font; }
  const letters = chars.map(ch => {
    const w = meas.measureText(ch).width, pad = fs * 0.35;
    const W = Math.ceil((w + pad * 2) * d), H = Math.ceil(fs * 1.6 * d), cx = W / d / 2, cy = H / d / 2;
    const m = canvas(W, H), mc = ctx2d(m);
    mc.scale(d, d); mc.font = font; mc.textAlign = 'center'; mc.textBaseline = 'middle';
    mc.fillStyle = '#000'; mc.strokeStyle = '#000'; mc.lineJoin = 'round'; mc.lineCap = 'round';
    for (let k = 0; k < 4; k++) {
      mc.save(); mc.translate(cx + (r() - 0.5) * fs * 0.018, cy + (r() - 0.5) * fs * 0.018); mc.rotate((r() - 0.5) * 0.025);
      mc.lineWidth = fs * (0.008 + r() * 0.018); mc.globalAlpha = k ? 0.5 : 1; mc.strokeText(ch, 0, 0); mc.fillText(ch, 0, 0); mc.restore();
    }
    mc.setTransform(1, 0, 0, 1, 0, 0);
    const px = mc.getImageData(0, 0, W, H).data;
    const on = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && px[(y * W + x) * 4 + 3] > 128;
    const e = Math.max(2, Math.round(2 * d)), edge: Pt[] = [];
    for (let n = 0; n < 6000; n++) {
      const x = (r() * W) | 0, y = (r() * H) | 0;
      if (on(x, y) && (!on(x + e, y) || !on(x - e, y) || !on(x, y + e) || !on(x, y - e))) edge.push([x, y]);
    }
    mc.globalAlpha = 1;
    edge.forEach(([x, y]) => { if (r() < 0.12) { mc.beginPath(); mc.arc(x + (r() - 0.5) * 2 * d, y + (r() - 0.5) * 2 * d, (0.3 + r() * 0.9) * d, 0, 7); mc.fill(); } });
    for (let n = 0; n < 6 && edge.length; n++) {
      const q = edge[(r() * edge.length) | 0], a = r() * 6.28, dist = (4 + r() * 16) * d;
      mc.beginPath(); mc.arc(q[0] + Math.cos(a) * dist, q[1] + Math.sin(a) * dist, (0.3 + r() * 1.3) * d, 0, 7); mc.fill();
    }
    // したたりの出発点＝適当な列のいちばん下の点
    const drips: Drip[] = [], count = 1 + ((r() * 2.7) | 0);
    for (let k = 0; k < 40 && drips.length < count; k++) {
      const x = (W * 0.18 + r() * W * 0.64) | 0;
      let y = -1;
      for (let yy = H - 1; yy >= 0; yy--) if (on(x, yy)) { y = yy; break; }
      if (y > 0 && !drips.some(q => Math.abs(q.x - (x / d - cx)) < fs * 0.12)) {
        drips.push({ x: x / d - cx, y: y / d - cy - 1, len: fs * (0.4 + r() * 2.2), w: fs * (0.03 + r() * 0.03), t0: 250 + r() * 700, dur: 1600 + r() * 2600, ph: r() * 6, pz: r() });
      }
    }
    const mat = canvas(W, H), c = ctx2d(mat);
    const sh = canvas(W, H), shc = ctx2d(sh);
    shc.drawImage(m, 0.7 * d, 1.3 * d); shc.globalCompositeOperation = 'source-in'; shc.fillStyle = 'rgba(10,0,0,.6)'; shc.fillRect(0, 0, W, H);
    c.drawImage(sh, 0, 0);
    const body = canvas(W, H), b = ctx2d(body);
    b.drawImage(m, 0, 0); b.globalCompositeOperation = 'source-in';
    const g = b.createLinearGradient(0, 0, 0, H);
    stops(g, [[0, '#a10b10'], [0.55, '#7e060a'], [1, '#560306']]);
    b.fillStyle = g; b.fillRect(0, 0, W, H);
    b.globalCompositeOperation = 'source-atop';
    for (let n = 0; n < 18; n++) {
      const x = r() * W, y = r() * H, rr = (5 + r() * 20) * d, q = b.createRadialGradient(x, y, 0, x, y, rr), light = r() < 0.5;
      q.addColorStop(0, light ? 'rgba(190,25,28,.35)' : 'rgba(40,0,2,.35)'); q.addColorStop(1, 'rgba(0,0,0,0)');
      b.fillStyle = q; b.fillRect(x - rr, y - rr, 2 * rr, 2 * rr);
    }
    for (let n = 0; n < 10; n++) {
      const x = r() * W, y = r() * H, len = (8 + r() * 30) * d, a = (r() - 0.5) * 0.7 + (r() < 0.5 ? 0 : Math.PI / 2);
      b.strokeStyle = r() < 0.5 ? 'rgba(200,40,40,.2)' : 'rgba(40,0,0,.22)'; b.lineWidth = (0.4 + r() * 1.1) * d;
      b.beginPath(); b.moveTo(x, y); b.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len); b.stroke();
    }
    const grain = b.createPattern(X.noise, 'repeat');
    if (grain) { b.globalCompositeOperation = 'multiply'; b.globalAlpha = 0.18; b.fillStyle = grain; b.fillRect(0, 0, W, H); }
    b.globalAlpha = 1; b.globalCompositeOperation = 'destination-in'; b.drawImage(m, 0, 0);
    c.drawImage(body, 0, 0);
    // ふちに血がたまって少し濃くなる
    const rim = canvas(W, H), rc = ctx2d(rim);
    rc.drawImage(m, 0, 0); rc.globalCompositeOperation = 'destination-out';
    if (hasFilter(rc)) rc.filter = `blur(${0.7 * d}px)`;
    rc.drawImage(m, 0, 0); rc.filter = 'none';
    rc.globalCompositeOperation = 'source-in'; rc.fillStyle = 'rgba(40,0,0,.4)'; rc.fillRect(0, 0, W, H);
    c.drawImage(rim, 0, 0);
    // 左上のふちのぬれたテカリ（ところどころ）
    const hl = canvas(W, H), h = ctx2d(hl);
    h.drawImage(m, 0, 0); h.globalCompositeOperation = 'destination-out'; h.drawImage(m, 0.8 * d, 1.2 * d);
    h.globalCompositeOperation = 'source-in'; h.fillStyle = 'rgba(255,175,165,.5)'; h.fillRect(0, 0, W, H);
    h.globalCompositeOperation = 'destination-out';
    for (let n = 0; n < 40; n++) { h.fillStyle = `rgba(0,0,0,${0.5 + r() * 0.5})`; h.beginPath(); h.arc(r() * W, r() * H, (3 + r() * 12) * d, 0, 7); h.fill(); }
    c.globalCompositeOperation = 'screen';
    if (hasFilter(c)) c.filter = `blur(${0.5 * d}px)`;
    c.drawImage(hl, 0, 0); c.filter = 'none';
    c.globalCompositeOperation = 'source-over';
    for (let n = 0; n < 3 && edge.length; n++) {
      const q = edge[(r() * edge.length) | 0];
      c.fillStyle = `rgba(255,228,222,${0.45 + r() * 0.3})`; c.beginPath(); c.ellipse(q[0] + 0.6 * d, q[1] + 0.6 * d, (0.6 + r()) * d, (0.3 + r() * 0.4) * d, -0.6, 0, 7); c.fill();
    }
    return { w, wd: W / d, hd: H / d, mat, drips };
  });
  return { letters };
}

function drawDrip(c: Ctx, x0: number, y0: number, q: Drip, L: number) {
  const w = q.w, N = Math.max(6, Math.ceil(L / 3)), left: Pt[] = [], right: Pt[] = [], mid: Pt[] = [];
  for (let j = 0; j <= N; j++) {
    const y = L * j / N, neck = 1 + 0.6 * Math.max(0, 1 - y / (w * 4)), ww = w * neck * (0.8 + 0.12 * Math.sin(y / 7 + q.ph)) * (1 - 0.25 * (y / (L + 1)));
    const x = x0 + Math.sin(y / 22 + q.ph) * w * 0.3;
    left.push([x - ww / 2, y0 + y]); right.push([x + ww / 2, y0 + y]); mid.push([x, y0 + y]);
  }
  const g = c.createLinearGradient(x0 - w, 0, x0 + w, 0);
  stops(g, [[0, '#3a0002'], [0.35, '#7a060a'], [0.55, '#9a0b10'], [1, '#3a0002']]);
  c.fillStyle = g; c.beginPath();
  left.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])));
  for (let i = right.length - 1; i >= 0; i--) c.lineTo(right[i][0], right[i][1]);
  c.closePath(); c.fill();
  if (L > w * 3) {
    c.strokeStyle = 'rgba(255,150,145,.28)'; c.lineWidth = Math.max(0.6, w * 0.14); c.beginPath();
    mid.forEach(p => { if (p[1] - y0 < w * 2 || p[1] - y0 > L - w) return; c.lineTo(p[0] - w * 0.2, p[1]); });
    c.stroke();
  }
  const tx = mid[mid.length - 1][0], ty = y0 + L + w * 0.35;
  const bg = c.createRadialGradient(tx - w * 0.3, ty - w * 0.4, w * 0.1, tx, ty, w * 1.3);
  stops(bg, [[0, '#8a0a0d'], [0.5, '#4a0204'], [1, '#1a0001']]);
  c.fillStyle = bg; c.beginPath(); c.ellipse(tx, ty, w * 0.85, w * 1.2, 0, 0, 7); c.fill();
  c.fillStyle = 'rgba(255,225,220,.8)'; c.beginPath(); c.ellipse(tx - w * 0.3, ty - w * 0.45, w * 0.18, w * 0.12, -0.6, 0, 7); c.fill();
}

function drawBlood(c: Ctx, blood: { letters: Letter[] }, CW: number, CH: number, DPR: number, since: number) {
  if (since < 0) return;
  c.setTransform(DPR, 0, 0, DPR, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  const ws = blood.letters.map(l => l.w * 0.9), total = ws.reduce((a, b) => a + b, 0);
  const y = CH * 0.8;
  let x = CW / 2 - total / 2;
  blood.letters.forEach((l, i) => {
    const lx = x + ws[i] / 2;
    x += ws[i];
    const t = since - i * 200;
    if (t < 0) return;
    const reveal = easeOut(clamp01(t / 280));
    c.save(); c.beginPath(); c.rect(lx - l.wd / 2, y - l.hd / 2, l.wd * reveal, l.hd); c.clip();
    c.drawImage(l.mat, lx - l.wd / 2, y - l.hd / 2, l.wd, l.hd); c.restore();
    l.drips.forEach(q => {
      const len = q.len * dripProgress(clamp01((t - q.t0) / q.dur), q.pz);
      if (len > 1) drawDrip(c, lx + q.x, y + q.y, q, len);
    });
  });
}

/** 演出を始める。返した stop() で rAF・Canvas・イベントを片付ける */
export function startLeaveEye({ host, width, height, reduced, onEnd }: LeaveEyeOptions): LeaveEyeHandle {
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  const CW = width, CH = height;
  const view = canvas(CW * DPR, CH * DPR);
  view.setAttribute('aria-hidden', 'true');
  Object.assign(view.style, { position: 'absolute', left: '0', top: '0', width: `${CW}px`, height: `${CH}px`, display: 'block' });
  host.appendChild(view);
  const c = ctx2d(view);
  c.fillStyle = '#000'; c.fillRect(0, 0, view.width, view.height);

  // 最後にさわった指の位置（最初は画面の下のほう）
  const pointer = { x: NaN, y: NaN };
  const move = (e: PointerEvent | TouchEvent) => {
    const p = 'touches' in e ? e.touches[0] : e;
    if (p) { pointer.x = p.clientX; pointer.y = p.clientY; }
  };
  window.addEventListener('pointermove', move, { passive: true });
  window.addEventListener('pointerdown', move, { passive: true });
  window.addEventListener('touchmove', move, { passive: true });

  let textures: Textures | null = null;
  let blood: { letters: Letter[] } | null = null;
  let raf = 0;
  let stopped = false;
  const gaze = { gx: 0, gy: 0.35, p: 62, last: 0, jx: 0, jy: 0 };
  const start = performance.now();

  const aim = (): Pt => {
    const rect = view.getBoundingClientRect();
    if (!rect.width || Number.isNaN(pointer.x)) return [0, 0.6];
    const ax = (pointer.x - (rect.left + rect.width / 2)) / (rect.width * 0.45);
    const ay = (pointer.y - (rect.top + rect.height / 2)) / (rect.height * 1.2);
    return [Math.max(-1, Math.min(1, ax)), Math.max(-1, Math.min(1, ay))];
  };

  const frame = () => {
    if (stopped) return;
    const ms = performance.now() - start;
    // 重い下ごしらえは暗転しているあいだに済ませる
    if (!textures) textures = buildTextures();
    if (ms >= T.cut) {
      c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
      c.fillStyle = '#000'; c.fillRect(0, 0, view.width, view.height);
    } else {
      let open = lidOpen(ms);
      if (ms > T.stare && !reduced) open += Math.sin(ms / 37) * Math.sin(ms / 211) * 0.006;
      let ax = 0, ay = 0.35, k = 0.03, target = 62;
      if (ms >= T.look && ms < T.stare) { [ax, ay] = aim(); k = 0.5; target = 46; }
      else if (ms >= T.stare) { k = 0.55; target = 46 + 70 * easeOut(between(ms, T.stare + 200, T.cut - 400)); }
      if (ms > T.look && ms - gaze.last > 90 + Math.random() * 120) { gaze.last = ms; gaze.jx = (Math.random() - 0.5) * 0.02; gaze.jy = (Math.random() - 0.5) * 0.03; }
      gaze.gx += (ax - gaze.gx) * k; gaze.gy += (ay - gaze.gy) * k; gaze.p += (target - gaze.p) * 0.1;
      const amp = reduced ? 0 : ms >= T.stare ? 1 + 2.5 * between(ms, T.stare, T.cut) : 0;
      if (ms >= T.slit) {
        drawEye(c, textures, CW, CH, DPR, {
          open, gx: gaze.gx + gaze.jx, gy: gaze.gy + gaze.jy, pupil: gaze.p + Math.sin(ms / 650) * 2.5,
          zoom: 1 + 0.36 * between(ms, T.stare, T.cut),
          sx: (Math.random() - 0.5) * amp, sy: (Math.random() - 0.5) * amp,
          vein: 0.5 + 0.5 * between(ms, T.stare, T.cut),
          flick: !reduced && Math.random() < 0.02 ? 0.25 + Math.random() * 0.3 : 0,
        });
      }
      if (!blood && ms > T.stare - 500) blood = buildBlood(textures, CW, DPR);
      if (blood) drawBlood(c, blood, CW, CH, DPR, ms - T.whisper);
    }
    if (ms >= T.end) { onEnd(); return; }
    raf = requestAnimationFrame(frame);
  };
  // 最初のフレームは真っ黒を出してから、次のフレームで下ごしらえする
  raf = requestAnimationFrame(frame);

  return {
    stop() {
      stopped = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerdown', move);
      window.removeEventListener('touchmove', move);
      view.remove();
    },
  };
}
