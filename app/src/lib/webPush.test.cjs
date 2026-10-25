// #87 通知の対応判定・鍵の変換・通知から開いた URL の読み取り
// 実行: node --test src/lib/webPush.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
require.extensions['.ts'] = (module, filename) => {
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, filename);
};
// react-native の代わり（Platform だけ使う）
const rn = require.resolve('react-native');
require.cache[rn] = { id: rn, filename: rn, loaded: true, exports: { Platform: { OS: 'web' } } };
const { pushSupport, isIos, base64UrlToBytes, sameKey } = require('./pushSupport.ts');
const { eventIdFromSearch, takeEventLink } = require('./eventLink.ts');

const android = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36';
const iphone = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const iphoneChrome = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0 Mobile/15E148 Safari/604.1';
const ipad = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15';
const full = { web: true, secure: true, serviceWorker: true, pushManager: true, notification: true, userAgent: android, touchPoints: 5, standalone: false };

test('Android の Chrome は使える', () => {
  assert.deepEqual(pushSupport(full), { ok: true });
});

test('iPhone はホーム画面に追加していないと案内を出す（Safari 以外のブラウザも）', () => {
  for (const ua of [iphone, iphoneChrome]) {
    const r = pushSupport({ ...full, userAgent: ua, pushManager: false });
    assert.equal(r.ok, false);
    assert.match(r.reason, /ホーム画面に追加/);
    assert.match(r.guide, /iOS 16\.4/);
  }
  assert.deepEqual(pushSupport({ ...full, userAgent: iphone, standalone: true }), { ok: true });
  const old = pushSupport({ ...full, userAgent: iphone, standalone: true, pushManager: false });
  assert.equal(old.ok, false); assert.match(old.guide, /アップデート/);
});

test('iPad（Mac と名乗る Safari）はタッチで iPhone と同じ扱い。Mac はそのまま', () => {
  assert.equal(isIos(ipad, 5), true);
  assert.equal(isIos(ipad, 0), false);
  assert.equal(pushSupport({ ...full, userAgent: ipad, touchPoints: 0 }).ok, true);
});

test('使えない環境は理由を返す', () => {
  assert.match(pushSupport({ ...full, web: false }).reason, /ブラウザ版/);
  assert.match(pushSupport({ ...full, secure: false }).reason, /https/);
  assert.match(pushSupport({ ...full, serviceWorker: false }).reason, /対応していません/);
  assert.match(pushSupport({ ...full, notification: false }).reason, /対応していません/);
});

test('公開鍵を applicationServerKey のバイト列にする', () => {
  const key = 'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4';
  const bytes = base64UrlToBytes(key);
  assert.equal(bytes.length, 65); assert.equal(bytes[0], 4);
  assert.equal(Buffer.from(bytes).toString('base64url'), key);
  assert.equal(sameKey(bytes.buffer, key), true);
  assert.equal(sameKey(new Uint8Array(65).buffer, key), false);
  assert.equal(sameKey(null, key), false);
});

test('?event= から正の整数の id だけを読む', () => {
  assert.equal(eventIdFromSearch('?event=12'), 12);
  assert.equal(eventIdFromSearch('?a=1&event=7'), 7);
  for (const s of ['', '?event=', '?event=0', '?event=-1', '?event=1.5', '?event=abc', '?event=01', '?event=1e3', '?event=9999999999999999']) {
    assert.equal(eventIdFromSearch(s), undefined, s);
  }
});

test('通知から開いた URL は1回だけ読み、URL から消す（ログイン前に読んでも id は残る）', () => {
  const calls = [];
  global.window = {
    location: { pathname: '/', search: '?event=42&x=1', hash: '' },
    history: { state: null, replaceState: (_s, _t, url) => calls.push(url) },
  };
  try {
    assert.equal(takeEventLink(), 42);
    assert.deepEqual(calls, ['/?x=1']);
    window.location.search = '?event=99';
    assert.equal(takeEventLink(), 42); // 2回目は読み直さない
    assert.equal(calls.length, 1);
  } finally { delete global.window; }
});
