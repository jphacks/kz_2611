// #98 参加の演出の粒（鳥・紙吹雪・火花・衝撃波・光の筋）を Canvas 1枚に描く。
// React の state は毎フレーム更新しない。画面の揺れ・ズームは CSS transform で動かす。
import { C } from '../../ui/theme';
import { birdWebImages } from './birds';
import { QUALITY_STEPS, SAMPLE_FRAMES, averageFps, nextQuality, particleCount } from './quality';
import {
  CELEBRATION, birdOrigin, rotateAt, sampleKeyframes, shakeAt, zoomAt,
} from './timing';

const COLORS = [C.red, C.pink, C.yellow, C.white, C.blue];
const SPARK_LEFT = [18, 80, 50, 12, 88, 50];
const SPARK_TOP = [32, 30, 48, 65, 62, 20];
const BIRD_ROTATE = (index: number) => index * 31;

export interface CelebrationCanvasOptions {
  /** Canvas を差し込む RN の View（Web では div） */
  host: HTMLElement;
  /** 揺れ・ズームを CSS transform で当てる演出の重ね合わせ */
  stage: HTMLElement;
  width: number;
  height: number;
  reduced: boolean;
  flash: boolean;
  chromatic: boolean;
}

export interface CelebrationCanvasHandle {
  stop: () => void;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function roundedRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, radius: number) {
  if (radius <= 0) {
    c.fillRect(x, y, w, h);
    return;
  }
  const r = Math.min(radius, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + r, y);
  c.lineTo(x + w - r, y);
  c.arcTo(x + w, y, x + w, y + r, r);
  c.lineTo(x + w, y + h - r);
  c.arcTo(x + w, y + h, x + w - r, y + h, r);
  c.lineTo(x + r, y + h);
  c.arcTo(x, y + h, x, y + h - r, r);
  c.lineTo(x, y + r);
  c.arcTo(x, y, x + r, y, r);
  c.closePath();
  c.fill();
}

/** 演出を始める。返した stop() で rAF・Canvas・transform を片付ける */
export function startCelebrationCanvas(options: CelebrationCanvasOptions): CelebrationCanvasHandle {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.position = 'absolute';
  canvas.style.inset = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.pointerEvents = 'none';
  canvas.style.display = 'block';
  options.host.appendChild(canvas);

  const context = canvas.getContext('2d', { alpha: true });
  if (!context) {
    canvas.remove();
    return { stop: () => {} };
  }
  const c = context;
  const images = birdWebImages();

  let width = Math.max(1, options.width);
  let height = Math.max(1, options.height);
  let dpr = 1;

  const resize = () => {
    const rect = options.host.getBoundingClientRect();
    width = Math.max(1, rect.width || options.width);
    height = Math.max(1, rect.height || options.height);
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
  };
  resize();
  window.addEventListener('resize', resize);

  const origin = birdOrigin(width, height);
  let stopped = false;
  let raf = 0;
  let last = 0;
  let started = performance.now();
  let qualityIndex = 0;
  let sampleFrames = 0;
  let sampleTotal = 0;

  options.stage.style.willChange = 'transform';
  options.stage.style.transformOrigin = 'center center';

  const draw = (progress: number) => {
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.globalAlpha = 1;
    c.clearRect(0, 0, width, height);

    // 下地のピンク（今の pinkWash と同じ）
    c.globalAlpha = 0.33;
    c.fillStyle = C.pink;
    c.fillRect(0, 0, width, height);
    c.globalAlpha = 1;

    // 触れた瞬間のフラッシュ（ヒットストップ無しで即座に）
    if (options.flash && progress < 0.075) {
      const alpha = sampleKeyframes(progress, [0, 0.025, 0.04, 0.055, 0.075], [0.95, 0.95, 0, 0.7, 0]);
      c.globalAlpha = clamp(alpha, 0, 1);
      c.fillStyle = C.white;
      c.fillRect(0, 0, width, height);
      c.globalAlpha = 1;
    }

    // 色収差（赤青の縁）
    if (options.chromatic && progress < 0.25) {
      const alpha = sampleKeyframes(progress, [0, 0.1, 0.25], [0.7, 0.4, 0]);
      c.globalAlpha = clamp(alpha, 0, 1);
      c.lineWidth = 16;
      c.strokeStyle = C.blue;
      c.strokeRect(-10 - 8, 0, width + 16, height);
      c.strokeStyle = C.pink;
      c.strokeRect(10 - 8, 0, width + 16, height);
      c.globalAlpha = 1;
    }

    // 放射線
    const rayAlpha = sampleKeyframes(progress, [0, 0.04, 0.62, 1], [0, 0.95, 0.65, 0]);
    if (rayAlpha > 0) {
      const sx = width / 390;
      const sy = height / 844;
      c.save();
      c.scale(sx, sy);
      c.globalAlpha = rayAlpha * 0.27;
      c.fillStyle = C.yellow;
      c.beginPath();
      c.moveTo(30, 0);
      c.lineTo(360, 844);
      c.lineTo(80, 844);
      c.closePath();
      c.fill();
      c.globalAlpha = rayAlpha * 0.33;
      c.fillStyle = C.white;
      c.beginPath();
      c.moveTo(370, 0);
      c.lineTo(30, 844);
      c.lineTo(290, 844);
      c.closePath();
      c.fill();
      c.restore();

      c.save();
      c.translate(origin.x, origin.y);
      c.globalAlpha = rayAlpha * 0.4;
      for (let i = 0; i < 24; i++) {
        c.fillStyle = i % 2 ? C.pink : C.yellow;
        c.save();
        c.rotate((i * 15 * Math.PI) / 180);
        c.beginPath();
        c.moveTo(0, 0);
        c.lineTo(-15 * sx, -450 * sy);
        c.lineTo(15 * sx, -450 * sy);
        c.closePath();
        c.fill();
        c.restore();
      }
      c.restore();
      c.globalAlpha = 1;
    }

    // 衝撃波のリング
    for (let i = 0; i < 5; i++) {
      const alpha = sampleKeyframes(progress, [0, 0.04 + i * 0.03, 0.35 + i * 0.06, 1], [0, 1, 0, 0]);
      const scale = sampleKeyframes(progress, [0, 0.03 + i * 0.03, 0.4 + i * 0.06, 1], [0.1, 0.1, 12, 12]);
      if (alpha <= 0 || scale <= 0.1) continue;
      c.globalAlpha = clamp(alpha, 0, 1);
      c.strokeStyle = COLORS[i];
      c.lineWidth = 6 - i;
      c.beginPath();
      c.arc(origin.x, origin.y, 50 * scale, 0, Math.PI * 2);
      c.stroke();
    }
    c.globalAlpha = 1;

    // 飛び立つ位置の光
    const originAlpha = sampleKeyframes(progress, [0, 0.6, 1], [1, 0.4, 0]);
    const originScale = sampleKeyframes(progress, [0, 1], [0.1, 6]);
    if (originAlpha > 0) {
      c.globalAlpha = clamp(originAlpha, 0, 1);
      c.strokeStyle = C.yellow;
      c.lineWidth = 3;
      c.beginPath();
      c.arc(origin.x, origin.y, 35 * originScale, 0, Math.PI * 2);
      c.stroke();
    }
    c.globalAlpha = 1;

    // 紙吹雪
    const sparkCount = particleCount(CELEBRATION.sparks, QUALITY_STEPS[qualityIndex]);
    for (let i = 0; i < sparkCount; i++) {
      const group = i % 6;
      const delay = 0.05 + group * 0.075;
      const alpha = sampleKeyframes(progress, [0, delay, delay + 0.025, 0.85, 1], [0, 0, 1, 1, 0]);
      if (alpha <= 0) continue;
      const dx = sampleKeyframes(progress, [0, delay, 1], [0, 0, Math.cos(i * 2.4) * (150 + (i % 7) * 35)]);
      const dy = sampleKeyframes(progress, [0, delay, delay + 0.2, 1], [0, 0, -100 - (i % 6) * 26, 450]);
      const rotation = (i * 93 * progress * Math.PI) / 180;
      const w = i % 3 ? 6 : 12;
      const h = i % 3 ? 17 : 12;
      const x = (SPARK_LEFT[group] / 100) * width + dx;
      const y = (SPARK_TOP[group] / 100) * height + dy;
      c.globalAlpha = clamp(alpha, 0, 1);
      c.fillStyle = COLORS[i % 5];
      c.save();
      c.translate(x, y);
      c.rotate(rotation);
      roundedRect(c, -w / 2, -h / 2, w, h, i % 4 === 0 ? 20 : 0);
      c.restore();
    }
    c.globalAlpha = 1;

    // 鳥の大群（3波）
    const birdCount = particleCount(CELEBRATION.birds, QUALITY_STEPS[qualityIndex]);
    for (let i = 0; i < birdCount; i++) {
      const wave = i % 3;
      const delay = wave * 0.15;
      const end = delay + 0.58;
      const alpha = sampleKeyframes(
        progress,
        [0, delay, delay + 0.012, end - 0.1, end, 1],
        [0, 0, 1, 1, 0, 0],
      );
      if (alpha <= 0) continue;

      const angle = i * 2.39996;
      const distance = i < 6 ? 90 + i * 18 : 700 + (i % 9) * 65 + (14 - (i % 15)) * 22;
      const size = i < 6 ? 26 : 14 + (i % 15) * 9;
      const dx = sampleKeyframes(
        progress,
        [0, delay, delay + 0.1, end, 1],
        [0, 0, Math.cos(angle) * distance * 0.035, Math.cos(angle) * distance, Math.cos(angle) * distance],
      );
      const dy = sampleKeyframes(
        progress,
        [0, delay, delay + 0.12, delay + 0.24, delay + 0.36, end, 1],
        [
          0,
          0,
          Math.sin(angle) * distance * 0.2 + (i % 4 === 0 ? -55 : 0),
          Math.sin(angle) * distance * 0.42 + (i % 4 === 0 ? 55 : 0),
          Math.sin(angle) * distance * 0.65,
          Math.sin(angle) * distance,
          Math.sin(angle) * distance,
        ],
      );
      const flap = sampleKeyframes(
        progress,
        [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 1],
        [1, 0.4, 1, 0.5, 1, 0.4, 1, 0.5, 1, 1],
      );
      const rotationDeg = sampleKeyframes(
        progress,
        [0, delay, end, 1],
        [
          BIRD_ROTATE(i),
          BIRD_ROTATE(i),
          i < 6 ? 0 : BIRD_ROTATE(i) + (i % 2 ? 440 : -440),
          i < 6 ? 0 : BIRD_ROTATE(i) + (i % 2 ? 440 : -440),
        ],
      );
      const scale = sampleKeyframes(progress, [0, delay, delay + 0.06, end, 1], [0.1, 0.1, 1, 1.3, 1.3]);
      const x = origin.x + dx;
      const y = origin.y + dy;
      if (x < -120 || x > width + 120 || y < -120 || y > height + 120) continue;

      const rotation = (rotationDeg * Math.PI) / 180;
      const cos = Math.cos(rotation);
      const sin = Math.sin(rotation);
      c.globalAlpha = clamp(alpha, 0, 1);
      c.setTransform(
        dpr * cos * scale,
        dpr * sin * scale,
        -dpr * sin * scale * flap,
        dpr * cos * scale * flap,
        x * dpr,
        y * dpr,
      );
      const image = images[i % images.length];
      if (image && image.complete && image.naturalWidth > 0) {
        c.drawImage(image, -size / 2, -size / 2, size, size);
      } else {
        // 読み込み前でも粒が消えないように丸で描く
        c.fillStyle = COLORS[i % 5];
        c.beginPath();
        c.arc(0, 0, Math.max(2, size / 5), 0, Math.PI * 2);
        c.fill();
      }
    }
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.globalAlpha = 1;
  };

  const frame = (now: number) => {
    if (stopped) return;
    const dt = last ? now - last : 16.667;
    last = now;
    const elapsed = now - started;
    const progress = clamp(elapsed / CELEBRATION.burstMs, 0, 1);

    // 平均が 50fps を下回ったら粒の数を1段階減らす
    sampleFrames++;
    sampleTotal += dt;
    if (sampleFrames >= SAMPLE_FRAMES) {
      const fps = averageFps(sampleTotal, sampleFrames);
      qualityIndex = nextQuality(qualityIndex, fps);
      canvas.dataset.celebrationFps = String(Math.round(fps));
      canvas.dataset.celebrationQuality = String(qualityIndex);
      sampleFrames = 0;
      sampleTotal = 0;
    }

    // 「視差効果を減らす」でもズームは今まで通り。揺れと傾きだけ 0 になる
    const x = shakeAt(progress, options.reduced);
    const rotation = rotateAt(progress, options.reduced);
    options.stage.style.transform = `translate3d(${x}px,0,0) scale(${zoomAt(progress)}) rotate(${rotation}deg)`;

    draw(progress);

    if (elapsed >= CELEBRATION.burstMs) {
      stopped = true;
      options.stage.style.transform = '';
      return;
    }
    raf = requestAnimationFrame(frame);
  };

  // 呼び出し側の演出開始（音・振動）とできるだけ同じ瞬間から描く
  started = performance.now();
  raf = requestAnimationFrame(frame);

  return {
    stop() {
      stopped = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      options.stage.style.transform = '';
      options.stage.style.willChange = '';
      canvas.remove();
    },
  };
}
