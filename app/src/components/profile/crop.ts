export type CropPosition = { zoom: number; x: number; y: number };
const clamp = (value: number, max: number) => Math.max(-max, Math.min(max, value));

// 枠の中心からの移動量を表示ピクセルで受け取り、必ず画像で枠を覆う。
export function cropGeometry(width: number, height: number, frame: number, position: CropPosition) {
  if (![width, height, frame].every(v => Number.isFinite(v) && v > 0)) throw new Error('画像のサイズを読み込めませんでした');
  const zoom = Math.max(1, Math.min(4, position.zoom));
  const scale = frame / Math.min(width, height) * zoom;
  const displayWidth = width * scale;
  const displayHeight = height * scale;
  return { zoom, scale, width: displayWidth, height: displayHeight,
    x: clamp(position.x, (displayWidth - frame) / 2), y: clamp(position.y, (displayHeight - frame) / 2) };
}

export function cropRect(width: number, height: number, frame: number, position: CropPosition) {
  const g = cropGeometry(width, height, frame, position);
  const size = Math.min(width, height, Math.max(1, Math.round(frame / g.scale)));
  return { originX: Math.max(0, Math.min(width - size, Math.round((width - frame / g.scale) / 2 - g.x / g.scale))),
    originY: Math.max(0, Math.min(height - size, Math.round((height - frame / g.scale) / 2 - g.y / g.scale))), width: size, height: size };
}
