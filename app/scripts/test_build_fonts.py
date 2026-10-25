"""フォント生成の集計だけを検証する（ダウンロード・フォント再生成はしない）。

実行: fonttools と brotli を入れた Python で
  python -m unittest discover -s scripts -p test_build_fonts.py
"""
import contextlib
import io
import os
import tempfile
import unittest
from unittest.mock import MagicMock, patch

import build_fonts


class BuildFontsTest(unittest.TestCase):
    def test_build_reads_cmap_once_and_keeps_coverage(self):
        # 実際の生成処理を置き換え、文字の集計回数と表示を独立に確かめる。
        with tempfile.TemporaryDirectory(dir=build_fonts.APP) as work:
            dest = os.path.join(work, 'font.woff2')
            with open(dest, 'wb') as f:
                f.write(b'font')
            output = io.StringIO()
            with patch.object(build_fonts, 'CACHE', work), \
                 patch.object(build_fonts.subprocess, 'run') as run, \
                 patch.object(build_fonts, 'cmap_of', return_value={ord('A'), ord('B')}) as cmap, \
                 contextlib.redirect_stdout(output):
                build_fonts.build('source.ttf', dest, 'ABA?')
            cmap.assert_called_once_with(dest)
            self.assertIn('3/4文字 4 bytes', output.getvalue())
            run.assert_called_once()

    def test_cmap_closes_font(self):
        font = MagicMock()
        font.__enter__.return_value.getBestCmap.return_value = {65: 'A', 66: 'B'}
        with patch.object(build_fonts, 'TTFont', return_value=font) as constructor:
            self.assertEqual(build_fonts.cmap_of('font.woff2'), {65, 66})
        constructor.assert_called_once_with('font.woff2')
        font.__exit__.assert_called_once_with(None, None, None)


if __name__ == '__main__':
    unittest.main()
