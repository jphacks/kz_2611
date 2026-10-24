"""scripts/tests/test_*.py を順に実行する。機能ごとに自分のファイルを足す（他人のファイルは触らない）"""
import glob, os, subprocess, sys
here = os.path.dirname(os.path.abspath(__file__))
fail = 0
for f in sorted(glob.glob(os.path.join(here, 'tests', 'test_*.py'))):
    print('==', os.path.basename(f))
    r = subprocess.run([sys.executable, f, *sys.argv[1:]], env={**os.environ, 'PYTHONPATH': here})
    fail |= r.returncode
sys.exit(fail)
