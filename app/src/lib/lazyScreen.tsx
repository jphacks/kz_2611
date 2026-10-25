// 画面ごとの遅延読み込み（#135）。
// 初回に描かない画面のコードを別チャンクに分け、未ログインの初回に読む JS を減らす。
// 失敗したチャンクは覚えない（「再試行」で読み直せる）。成功したら覚えて再取得しない。
import { useEffect, useState, type ComponentType } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { C, S, T } from '../ui/theme';

export type ScreenLoader<P> = () => Promise<{ default: ComponentType<P> }>;

export interface ScreenLoadState<P> {
  /** 読み込み済みの画面。まだなら null */
  get: () => ComponentType<P> | null;
  /** 読み込む。成功した画面はキャッシュし、失敗した Promise は捨てて次の呼び出しで読み直す */
  load: () => Promise<ComponentType<P>>;
}

export function createScreenLoader<P>(load: ScreenLoader<P>): ScreenLoadState<P> {
  let loaded: ComponentType<P> | null = null;
  let pending: Promise<ComponentType<P>> | null = null;
  return {
    get: () => loaded,
    load: () => {
      if (loaded) return Promise.resolve(loaded);
      if (!pending) {
        pending = load().then(
          m => { loaded = m.default; return loaded; },
          e => { pending = null; throw e; },
        );
      }
      return pending;
    },
  };
}

/** 遅延読み込みする画面を作る。読み込み中は案内、失敗したら再試行を出す */
export function lazyScreen<P extends object>(load: ScreenLoader<P>) {
  const state = createScreenLoader(load);
  return function LazyScreen(props: P) {
    const [Screen, setScreen] = useState<ComponentType<P> | null>(() => state.get());
    const [failed, setFailed] = useState(false);
    const [attempt, setAttempt] = useState(0);
    useEffect(() => {
      if (Screen) return;
      let alive = true;
      setFailed(false);
      state.load().then(
        c => { if (alive) setScreen(() => c); },
        () => { if (alive) setFailed(true); },
      );
      return () => { alive = false; };
    }, [Screen, attempt]);
    if (Screen) return <Screen {...props} />;
    if (failed) return (
      <View style={[S.screen, { padding: 24, justifyContent: 'center', gap: 12 }]}>
        <Text style={T.screenTitle}>読み込めませんでした</Text>
        <Text style={T.sub}>電波の状況を確かめて、もう一度お試しください。</Text>
        <Pressable accessibilityRole="button" onPress={() => setAttempt(n => n + 1)} style={S.btn}>
          <Text style={S.btnText}>再試行</Text>
        </Pressable>
      </View>
    );
    return (
      <View style={[S.screen, { alignItems: 'center', justifyContent: 'center', gap: 12 }]} accessibilityRole="progressbar">
        <ActivityIndicator color={C.red} />
        <Text style={T.sub}>読み込み中…</Text>
      </View>
    );
  };
}
