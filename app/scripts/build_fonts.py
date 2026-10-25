#!/usr/bin/env python3
"""初回表示用のフォント（サブセット）を作り直す。#134

Google Fonts から Inter と Noto Sans JP を丸ごと読むと、最初の画面だけで
フォント CSS 92KB＋WOFF2 406KB（18リクエスト）になる。アプリが実際に表示する文字だけを
含む WOFF2 を作って public/fonts/ に置き、そこから配る（2リクエスト・約170KB）。

- 対象の文字: app/src・app/functions・app/public のソースに出てくる日本語と、
  ASCII・ラテン文字（利用者の名前や募集タイトル用）。サブセットに無い文字は
  theme.ts のフォールバック（Hiragino Sans / Noto Sans JP / Yu Gothic）で表示される。
- 文字を足したときは、このスクリプトを実行してファイルを作り直す（テストが不足を検出する）。

使い方（fonttools と brotli が要る）:
  python3 -m venv .venv && .venv/bin/pip install fonttools brotli
  .venv/bin/python scripts/build_fonts.py

元のフォント: https://github.com/google/fonts （どちらも SIL Open Font License 1.1）
"""
import os
import subprocess
import sys
import urllib.request

try:
    from fontTools.ttLib import TTFont
except ImportError:
    sys.exit('fonttools がありません: python3 -m venv .venv && .venv/bin/pip install fonttools brotli')

APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(APP, 'public', 'fonts')
CACHE = os.path.join(APP, '.cache', 'fonts')
SOURCES = {
    'inter': ('Inter.ttf', 'https://raw.githubusercontent.com/google/fonts/main/ofl/inter/Inter%5Bopsz,wght%5D.ttf'),
    'noto': ('NotoSansJP.ttf', 'https://raw.githubusercontent.com/google/fonts/main/ofl/notosansjp/NotoSansJP%5Bwght%5D.ttf'),
}
# ソースに出てこないが、画面に出る可能性のある記号
EXTRA = '　、。「」『』（）［］｛｝〜・ー…‥―–—“”‘’！？：；／＼＋－＝×÷±°¥￥←→↑↓★☆✓✕'


def is_japanese(ch: str) -> bool:
    o = ord(ch)
    return 0x3000 <= o <= 0x30ff or 0x3400 <= o <= 0x4dbf or 0x4e00 <= o <= 0x9fff or 0xff00 <= o <= 0xffef


def collect() -> tuple[str, str]:
    """(日本語の文字, ラテンの文字) をソースから集める"""
    jp, latin = set(EXTRA), set()
    latin |= {chr(o) for o in range(0x20, 0x7f)}          # ASCII
    latin |= {chr(o) for o in range(0xa0, 0x180)}          # ラテン1補助・ラテン拡張A（名前用）
    latin |= set('←→↑↓…‥―–—“”‘’±×÷°¥€£★☆✓✕')
    for base in ('src', 'functions', 'public'):
        for root, _, files in os.walk(os.path.join(APP, base)):
            for name in files:
                if not name.endswith(('.ts', '.tsx', '.cjs', '.mjs', '.html', '.webmanifest')):
                    continue
                if '.test.' in name:  # テストの文字は画面に出ない
                    continue
                with open(os.path.join(root, name), encoding='utf-8') as f:
                    for ch in f.read():
                        if is_japanese(ch):
                            jp.add(ch)
    return ''.join(sorted(jp)), ''.join(sorted(latin))


def fetch(name: str) -> str:
    filename, url = SOURCES[name]
    os.makedirs(CACHE, exist_ok=True)
    path = os.path.join(CACHE, filename)
    if not os.path.exists(path):
        print(f'ダウンロード: {url}')
        urllib.request.urlretrieve(url, path)
    return path


def build(src: str, dest: str, text: str, opsz: int | None = None) -> None:
    """text の文字だけを含む WOFF2 を dest に作る（fontTools のコマンドをそのまま使う）"""
    work = os.path.join(CACHE, 'work')
    os.makedirs(work, exist_ok=True)
    chars_path = os.path.join(work, os.path.basename(dest) + '.txt')
    with open(chars_path, 'w', encoding='utf-8') as f:
        f.write(text)
    source = src
    if opsz is not None:
        # Inter は opsz（optical size）軸も持つが、このアプリでは既定の 14 しか使わない
        instance = os.path.join(work, 'instance.ttf')
        subprocess.run([sys.executable, '-m', 'fontTools.varLib.instancer', src, f'opsz={opsz}', '-o', instance],
                       check=True, stdout=subprocess.DEVNULL)
        source = instance
    subprocess.run([sys.executable, '-m', 'fontTools.subset', source,
                    f'--text-file={chars_path}', f'--output-file={dest}',
                    '--flavor=woff2', '--layout-features=kern,liga', '--no-hinting'], check=True)
    covered = sum(1 for ch in text if ord(ch) in cmap_of(dest))
    print(f'{os.path.relpath(dest, APP)}: {covered}/{len(text)}文字 {os.path.getsize(dest)} bytes')


def cmap_of(path: str) -> set[int]:
    font = TTFont(path)
    return set(font.getBestCmap())


def main() -> None:
    os.makedirs(OUT, exist_ok=True)
    jp, latin = collect()
    print(f'日本語 {len(jp)}文字 / ラテン {len(latin)}文字')
    build(fetch('inter'), os.path.join(OUT, 'inter-subset.woff2'), latin, opsz=14)
    build(fetch('noto'), os.path.join(OUT, 'noto-sans-jp-subset.woff2'), jp)
    print('作り直したら public/index.html の /fonts/*.woff2?v= を上げる（長くキャッシュしているため）')


if __name__ == '__main__':
    main()
