import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cropGeometry, cropRect } from './crop.ts';

test('横長画像は短辺に合わせ、中央の正方形を選ぶ', () => {
  assert.deepEqual(cropRect(1200, 600, 300, { zoom: 1, x: 0, y: 0 }), { originX: 300, originY: 0, width: 600, height: 600 });
});

test('縦長・小画像・極端なドラッグでも正方形が画像内に収まる', () => {
  for (const [width, height] of [[600, 1200], [1200, 600], [20, 10], [1, 1]]) {
    for (const zoom of [0.1, 1, 2.37, 4, 100]) {
      for (const x of [-10000, 0, 10000]) for (const y of [-10000, 0, 10000]) {
        const g = cropGeometry(width, height, 300, { zoom, x, y });
        assert.ok(g.zoom >= 1 && g.zoom <= 4);
        assert.ok(g.width / 2 - Math.abs(g.x) >= 150 - 1e-8);
        assert.ok(g.height / 2 - Math.abs(g.y) >= 150 - 1e-8);
        const r = cropRect(width, height, 300, { zoom, x, y });
        assert.equal(r.width, r.height);
        assert.ok(r.width >= 1 && r.originX >= 0 && r.originY >= 0);
        assert.ok(r.originX + r.width <= width && r.originY + r.height <= height);
        assert.ok(Object.values(r).every(Number.isInteger));
      }
    }
  }
});

test('拡大と移動を元画像の座標に逆変換する', () => {
  assert.deepEqual(cropRect(1200, 600, 300, { zoom: 2, x: 150, y: -150 }), { originX: 300, originY: 300, width: 300, height: 300 });
  assert.throws(() => cropRect(0, 600, 300, { zoom: 1, x: 0, y: 0 }), /サイズ/);
});
