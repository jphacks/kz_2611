import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
test('初期 HTML に鳥アイコンとホーム画面用の設定がある', () => {
  const head = read('public/index.html').split('</head>')[0];
  for (const tag of [
    '<link rel="manifest" href="/manifest.webmanifest?v=2" />',
    '<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png?v=2" />',
    '<link rel="icon" type="image/png" href="/icons/favicon.png?v=2" />',
    '<meta name="theme-color" content="#FFFFFF" />',
    '<meta name="apple-mobile-web-app-title" content="このゆびとまれ" />',
    '<meta name="apple-mobile-web-app-capable" content="yes" />',
  ]) assert.ok(head.includes(tag), tag);
  assert.equal(JSON.parse(read('app.json')).expo.web.favicon, './public/icons/favicon.png');
  const manifest = JSON.parse(read('public/manifest.webmanifest'));
  for (const icon of manifest.icons) {
    assert.ok(icon.src.endsWith('?v=2'));
    assert.ok(readFileSync(new URL(`../public${icon.src.split('?')[0]}`, import.meta.url)).length > 0);
  }
  assert.doesNotMatch(read('App.tsx'), /createElement\(['"](?:meta|link)['"]\).*manifest|apple-touch-icon|apple-mobile-web-app-title|theme-color/);
});
