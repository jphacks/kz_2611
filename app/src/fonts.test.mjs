// #134 初回表示のフォント。外部（Google Fonts）を読まず、public/fonts/ のサブセットから配る
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';
import { brotliDecompressSync } from 'node:zlib';

const app = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, app), 'utf8');

// WOFF2 のタグ番号（仕様の既定の並び）
const WOFF2_TAGS = ('cmap head hhea hmtx maxp name OS/2 post cvt fpgm glyf loca prep CFF VORG EBDT EBLC gasp hdmx ' +
  'kern LTSH PCLT VDMX vhea vmtx BASE GDEF GPOS GSUB EBSC JSTF MATH CBDT CBLC COLR CPAL SVG sbix acnt avar ' +
  'bdat bloc bsln cvar fdsc feat fmtx fvar gvar hsty just lcar mort morx opbd prop trak Zapf Silf Glat Gloc Feat Sill').split(' ');

function base128(buf, cursor) {
  let value = 0;
  for (let i = 0; i < 5; i++) {
    const byte = buf[cursor.at++];
    value = (value * 128) + (byte & 0x7f);
    if (!(byte & 0x80)) return value;
  }
  throw new Error('WOFF2 の UIntBase128 が壊れています');
}

/** WOFF2 を展開して、表ごとのバイト列を返す */
function woff2Tables(buf) {
  assert.equal(buf.toString('latin1', 0, 4), 'wOF2', 'WOFF2 ではありません');
  const count = buf.readUInt16BE(12);
  const cursor = { at: 48 };
  const entries = [];
  let offset = 0;
  for (let i = 0; i < count; i++) {
    const flags = buf[cursor.at++];
    const tagIndex = flags & 0x3f;
    const transform = flags >> 6;
    const tag = tagIndex === 0x3f ? buf.toString('latin1', cursor.at, (cursor.at += 4)) : WOFF2_TAGS[tagIndex];
    const origLength = base128(buf, cursor);
    const transformed = tag === 'glyf' || tag === 'loca' ? transform !== 3 : transform !== 0;
    const length = transformed ? base128(buf, cursor) : origLength;
    entries.push({ tag, offset, length });
    offset += length;
  }
  const data = brotliDecompressSync(buf.subarray(cursor.at));
  const tables = {};
  for (const { tag, offset: at, length } of entries) tables[tag] = data.subarray(at, at + length);
  return tables;
}

/** cmap（format 4 / 12）から、そのフォントが持つ文字コードを集める */
function coveredCodes(font) {
  const cmap = font.cmap;
  const codes = new Set();
  const count = cmap.readUInt16BE(2);
  for (let i = 0; i < count; i++) {
    const platform = cmap.readUInt16BE(4 + i * 8);
    if (platform !== 0 && platform !== 3) continue;
    const at = cmap.readUInt32BE(8 + i * 8);
    const format = cmap.readUInt16BE(at);
    if (format === 4) {
      const segments = cmap.readUInt16BE(at + 6) / 2;
      const ends = at + 14;
      const starts = ends + segments * 2 + 2;
      for (let s = 0; s < segments; s++) {
        const start = cmap.readUInt16BE(starts + s * 2);
        const end = cmap.readUInt16BE(ends + s * 2);
        for (let code = start; code <= end && code !== 0xffff; code++) codes.add(code);
      }
    } else if (format === 12) {
      const groups = cmap.readUInt32BE(at + 12);
      for (let g = 0; g < groups; g++) {
        const start = cmap.readUInt32BE(at + 16 + g * 12);
        const end = cmap.readUInt32BE(at + 20 + g * 12);
        for (let code = start; code <= end; code++) codes.add(code);
      }
    }
  }
  return codes;
}

const noto = coveredCodes(woff2Tables(readFileSync(new URL('public/fonts/noto-sans-jp-subset.woff2', app))));
const inter = coveredCodes(woff2Tables(readFileSync(new URL('public/fonts/inter-subset.woff2', app))));

function words(path, pattern) {
  const found = new Set();
  const walk = dir => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (pattern.test(name) && !name.includes('.test.')) for (const ch of readFileSync(full, 'utf8')) found.add(ch);
    }
  };
  walk(new URL(path, app).pathname);
  return [...found];
}

test('最初の HTML が同じオリジンのサブセットを font-display: swap で読む', () => {
  const head = read('public/index.html').split('</head>')[0];
  for (const file of ['inter-subset.woff2', 'noto-sans-jp-subset.woff2']) {
    assert.ok(head.includes(`url('/fonts/${file}?v=`), file);
    assert.ok(existsSync(new URL(`public/fonts/${file}`, app)), file);
  }
  assert.equal((head.match(/font-display: swap/g) || []).length, 2);
  assert.doesNotMatch(head, /fonts\.(googleapis|gstatic)\.com/, '外部のフォントを読みに行かない');
});

test('フォントは 250KB・2リクエストに収まる（Issue #134 の完了条件）', () => {
  const files = readdirSync(new URL('public/fonts', app)).filter(name => extname(name) === '.woff2');
  assert.deepEqual(files.sort(), ['inter-subset.woff2', 'noto-sans-jp-subset.woff2']);
  const total = files.reduce((sum, name) => sum + statSync(new URL(`public/fonts/${name}`, app)).size, 0);
  assert.ok(total <= 250000, `フォントの合計が ${total} bytes。scripts/build_fonts.py で作り直す`);
});

test('画面に出る日本語はすべてサブセットに入っている', () => {
  const japanese = words('src', /\.(ts|tsx|cjs|mjs)$/).concat(words('functions', /\.(ts|tsx)$/))
    .filter(ch => /[\u3000-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uff00-\uffef]/.test(ch));
  const missing = japanese.filter(ch => !noto.has(ch.codePointAt(0)));
  assert.deepEqual(missing, [], `サブセットに無い日本語: ${missing.join('')}（scripts/build_fonts.py を実行する）`);
});

test('英数字は Inter のサブセットで表示できる', () => {
  const ascii = [...Array(0x7f - 0x20)].map((_, i) => String.fromCodePoint(0x20 + i));
  assert.deepEqual(ascii.filter(ch => !inter.has(ch.codePointAt(0))), []);
});

test('サブセットに無い文字は端末の日本語フォントで表示する（フォールバックを残す）', () => {
  const theme = read('src/ui/theme.ts');
  assert.match(theme, /FONT = Platform\.select\(\{ web: 'Inter, "Noto Sans JP", "Hiragino Sans", sans-serif'/);
  assert.doesNotMatch(read('App.tsx'), /fonts\.(googleapis|gstatic)\.com/);
});
