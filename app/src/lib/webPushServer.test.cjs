// サーバー側の Web Push（functions/lib/push.ts）の確認。ネットワークには出ない
// 実行: node --test src/lib/webPushServer.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const path = require('node:path');
require.extensions['.ts'] = (module, filename) => {
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, filename);
};
const push = require(path.join(__dirname, '../../functions/lib/push.ts'));
const { b64urlDecode: d, b64urlEncode: e } = push;
const enc = new TextEncoder();
const join = s => s.replace(/\s+/g, '');

// RFC 8291 5章・付録A の例（https://www.rfc-editor.org/rfc/rfc8291）
const RFC = {
  plaintext: 'When I grow up, I want to be a watermelon',
  asPublic: join('BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIg Dll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8'),
  asPrivate: 'yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw',
  uaPublic: join('BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcx aOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4'),
  uaPrivate: 'q1dXpw3UpT5VOmu_cf_v6ih07Aems3njxI-JWgLcM94',
  salt: 'DGv6ra1nlYgDCS1FRnbzlw',
  auth: 'BTBZMqHH6r4Tts7J_aSIgg',
  body: join(`DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27ml
    mlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPT
    pK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN`),
};

// 受信側（ブラウザ）の復号。テストだけで使う
async function decrypt(body, uaPrivate, uaPublic, auth) {
  const salt = body.slice(0, 16), rs = new DataView(body.buffer, body.byteOffset).getUint32(16), idlen = body[20];
  const asPublic = body.slice(21, 21 + idlen), cipher = body.slice(21 + idlen);
  const priv = await push.importPrivateKey(uaPrivate, uaPublic, 'ECDH');
  const asKey = await crypto.subtle.importKey('raw', asPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: asKey }, priv, 256));
  const hkdf = async (salt, ikm, info, n) => new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info },
    await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']), n * 8));
  const cat = (...a) => { const o = new Uint8Array(a.reduce((n, x) => n + x.length, 0)); let i = 0; for (const x of a) { o.set(x, i); i += x.length; } return o; };
  const ikm = await hkdf(d(auth), ecdh, cat(enc.encode('WebPush: info\0'), d(uaPublic), asPublic), 32);
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12);
  const plain = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce },
    await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['decrypt']), cipher));
  assert.equal(plain[plain.length - 1], 2, '最後のレコードの区切り');
  return { rs, text: new TextDecoder().decode(plain.slice(0, -1)) };
}

test('RFC 8291 の例と同じ暗号文になる', async () => {
  const sender = { privateKey: await push.importPrivateKey(RFC.asPrivate, RFC.asPublic, 'ECDH'), publicKey: d(RFC.asPublic) };
  const body = await push.encrypt(enc.encode(RFC.plaintext), d(RFC.uaPublic), d(RFC.auth), { salt: d(RFC.salt), sender });
  assert.equal(e(body), RFC.body);
  assert.equal(body.length, 144);
});

test('毎回の鍵と salt で暗号化し、受信側で復号できる', async () => {
  const a = await push.encrypt(enc.encode('こんにちは'), d(RFC.uaPublic), d(RFC.auth));
  const b = await push.encrypt(enc.encode('こんにちは'), d(RFC.uaPublic), d(RFC.auth));
  assert.notEqual(e(a), e(b));
  assert.deepEqual(await decrypt(a, RFC.uaPrivate, RFC.uaPublic, RFC.auth), { rs: 4096, text: 'こんにちは' });
  await assert.rejects(push.encrypt(new Uint8Array(4000), d(RFC.uaPublic), d(RFC.auth)), /長すぎ/);
});

async function testKeys() {
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const jwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
  const pub = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey));
  return { keys: { publicKey: e(pub), privateKey: jwk.d, subject: 'mailto:test@example.com' }, verifyKey: pair.publicKey };
}

test('RFC 8292 の VAPID: ES256 の JWT と公開鍵を付ける', async () => {
  const { keys, verifyKey } = await testKeys();
  const now = Date.UTC(2026, 9, 25);
  const value = await push.vapidAuthorization('https://fcm.googleapis.com/fcm/send/abc', keys, now);
  const m = value.match(/^vapid t=([^.]+)\.([^.]+)\.([^,]+), k=(.+)$/);
  assert.ok(m);
  assert.deepEqual(JSON.parse(new TextDecoder().decode(d(m[1]))), { typ: 'JWT', alg: 'ES256' });
  assert.deepEqual(JSON.parse(new TextDecoder().decode(d(m[2]))), { aud: 'https://fcm.googleapis.com', exp: now / 1000 + 43200, sub: 'mailto:test@example.com' });
  assert.equal(m[4], keys.publicKey);
  assert.equal(d(m[3]).length, 64);
  assert.ok(await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, verifyKey, d(m[3]), enc.encode(`${m[1]}.${m[2]}`)));
});

test('届け先はプッシュサービスの https だけ（SSRF 対策）', () => {
  for (const ok of ['https://fcm.googleapis.com/fcm/send/abc', 'https://updates.push.services.mozilla.com/wpush/v2/abc',
    'https://web.push.apple.com/QGx', 'https://wns2-par02p.notify.windows.com/w/?token=abc']) assert.equal(push.pushEndpoint(ok), ok);
  assert.equal(push.pushEndpoint('https://FCM.googleapis.com/fcm/send/abc'), 'https://fcm.googleapis.com/fcm/send/abc');
  for (const ng of ['http://fcm.googleapis.com/fcm/send/abc', 'https://localhost/x', 'https://127.0.0.1/x', 'https://[::1]/x',
    'https://169.254.169.254/latest', 'https://fcm.googleapis.com:8443/x', 'https://user:pass@fcm.googleapis.com/x',
    'https://fcm.googleapis.com.evil.example/x', 'https://evil.example/fcm.googleapis.com', 'https://notify.windows.com/x',
    'https://fcm.googleapis.com./x', 'https://fcm.googleapis.com/', 'https://fcm.googleapis.com/x#a', 'https://fcm.googleapis.com/a b',
    'file:///etc/passwd', 'javascript:alert(1)', '', 'https://fcm.googleapis.com/' + 'a'.repeat(1100), 42, null]) {
    assert.equal(push.pushEndpoint(ng), null, String(ng));
  }
});

test('端末の鍵の形を確かめる', async () => {
  assert.equal(await push.validKeys(RFC.uaPublic, RFC.auth), true);
  assert.equal(await push.validKeys(RFC.uaPublic.slice(0, -2), RFC.auth), false);
  assert.equal(await push.validKeys(RFC.uaPublic, 'AAAA'), false);
  assert.equal(await push.validKeys('B' + 'A'.repeat(86), RFC.auth), false); // 曲線上にない点
  assert.equal(await push.validKeys(RFC.uaPublic, RFC.auth + '!'), false);
  assert.equal(await push.validKeys(undefined, RFC.auth), false);
});

test('送信は偽の fetch で確かめ、404/410 の届け先だけ消す', async () => {
  const { keys } = await testKeys();
  const target = n => ({ endpoint: `https://fcm.googleapis.com/fcm/send/${n}`, p256dh: RFC.uaPublic, auth: RFC.auth, user_id: 1 });
  const calls = [], deleted = [], warns = [];
  const status = { ok: 201, gone: 410, missing: 404, busy: 429 };
  const fetcher = async (url, init) => { calls.push({ url, init }); return { status: status[url.split('/').pop()] }; };
  const db = { prepare: sql => ({ bind: v => ({ run: async () => { assert.match(sql, /^DELETE FROM push_subscriptions WHERE endpoint = \?$/); deleted.push(v); } }) }) };
  const message = { kind: 'created', title: '新しい募集', body: 'ゆうきさんが「カラオケ」に誘っています', event_id: 7, tag: 'created-7' };
  const warn = console.warn; console.warn = (...a) => warns.push(a);
  try {
    const bad = { ...target('x'), endpoint: 'https://127.0.0.1/x' };
    const r = await push.dispatch(db, [target('ok'), target('gone'), target('missing'), target('busy'), bad], message, keys, fetcher);
    assert.deepEqual(r, { sent: 1, removed: 3, failed: 1 });
  } finally { console.warn = warn; }
  assert.deepEqual(calls.map(c => c.url.split('/').pop()).sort(), ['busy', 'gone', 'missing', 'ok']);
  assert.deepEqual(deleted.map(u => u.split('/').pop()).sort(), ['gone', 'missing', 'x']);
  const h = calls[0].init.headers;
  assert.equal(calls[0].init.redirect, 'manual');
  assert.equal(h['content-encoding'], 'aes128gcm');
  assert.match(h.authorization, /^vapid t=.+, k=/);
  assert.equal(h.ttl, '3600');
  // ログに届け先や鍵を出さない
  assert.ok(warns.every(a => !JSON.stringify(a).includes('fcm.googleapis.com') && !JSON.stringify(a).includes(RFC.auth)));
  const { text } = await decrypt(calls[0].init.body, RFC.uaPrivate, RFC.uaPublic, RFC.auth);
  assert.deepEqual(JSON.parse(text), message);
});
