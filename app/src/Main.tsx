// ★共有: ログイン状態・下タブ・画面の切り替え。タブの中身は各画面ファイルで作る
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle } from 'react-native-svg';
import { api, loadToken, setToken, Me } from './api';
import { C, FONT } from './ui/theme';
import { AuthScreen } from './screens/AuthScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { ONBOARDED_KEY, shouldShowOnboarding } from './components/onboarding/state';
import { BoardScreen } from './screens/BoardScreen';
import { CreateScreen } from './screens/CreateScreen';
import { TalkScreen } from './screens/TalkScreen';
import { FollowScreen } from './screens/FollowScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { takeEventLink } from './lib/eventLink';
import { removePushOnLogout } from './lib/webPush';
import { restoreSession } from './lib/session';
import { StartupError } from './components/StartupError';

export type Tab = 'board' | 'create' | 'talk' | 'follow' | 'profile';
export interface ScreenProps {
  me: Me;
  setMe: (m: Me) => void;
  go: (t: Tab, opts?: { openEventId?: number; editEventId?: number }) => void;
  openEventId?: number;      // トーク → 掲示板のチャットを開くときなど
  editEventId?: number;      // 掲示板 → 誘う（編集）
  clearNav: () => void;
  logout: () => void;
}

const ICON: Record<Tab, (c: string) => React.ReactNode> = {
  board: c => <Path d="M4 11 L12 4 L20 11 V20 H4 Z" stroke={c} strokeWidth={2} fill="none" />,
  create: c => <Path d="M12 5 V19 M5 12 H19" stroke={c} strokeWidth={2.6} strokeLinecap="round" />,
  talk: c => <Path d="M4 5 H20 V16 H9 L5 20 V16 H4 Z" stroke={c} strokeWidth={2} fill="none" />,
  follow: c => <><Circle cx={9} cy={8} r={3.2} stroke={c} strokeWidth={2} fill="none" /><Circle cx={17} cy={9} r={2.4} stroke={c} strokeWidth={2} fill="none" /><Path d="M3 19 C3 14 15 14 15 19 M15 14 C19 14 21 16 21 19" stroke={c} strokeWidth={2} fill="none" /></>,
  profile: c => <><Circle cx={12} cy={8} r={3.6} stroke={c} strokeWidth={2} fill="none" /><Path d="M5 20 C5 14 19 14 19 20" stroke={c} strokeWidth={2} fill="none" /></>,
};
// 並び順＝下タブの順。誘う（オレンジのボタン）を中央に置く（#39）
const LABEL: Record<Tab, string> = { board: '掲示板', talk: 'トーク', create: '誘う', follow: 'フォロー', profile: 'プロフィール' };

export function Main() {
  const [me, setMe] = useState<Me | null>(null);
  const [ready, setReady] = useState(false);
  const [onboarding, setOnboarding] = useState(false);
  const [tab, setTab] = useState<Tab>('board');
  const [nav, setNav] = useState<{ openEventId?: number; editEventId?: number }>({});
  const [startupError, setStartupError] = useState(false);
  // 起動時のログイン確認（#128）。認証拒否のときだけトークンを捨て、通信失敗は残して再試行できるようにする
  const boot = async () => {
    setStartupError(false);
    const { me: restored, failed } = await restoreSession({
      token: await loadToken(),
      fetchMe: async () => (await api<{ user: Me }>('/me')).user,
      clearToken: () => setToken(null),
    });
    if (failed) { setStartupError(true); setReady(true); return; }
    if (restored) setMe(restored);
    try {
      setOnboarding(shouldShowOnboarding(!!restored, await AsyncStorage.getItem(ONBOARDED_KEY)));
    } catch { /* 保存領域が使えない端末では認証を妨げない。案内は手動で開ける。 */ }
    setReady(true);
  };
  useEffect(() => { void boot(); }, []);
  // #87 通知から開いた募集（/?event=<id>）を掲示板で開く。ログイン前なら、ログイン後に開く
  const [link, setLink] = useState(takeEventLink);
  useEffect(() => { if (me && link !== undefined) { setNav({ openEventId: link }); setTab('board'); setLink(undefined); } }, [me, link]);
  if (!ready) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  if (startupError) return <View style={{ flex: 1, backgroundColor: '#E9E9E9', alignItems: 'center' }}><SafeAreaView style={{ flex: 1, width: '100%', maxWidth: 480, backgroundColor: C.bg }}><StartupError onRetry={boot} /></SafeAreaView></View>;
  if (!me) return <View style={{ flex: 1, backgroundColor: '#E9E9E9', alignItems: 'center' }}><SafeAreaView style={{ flex: 1, width: '100%', maxWidth: 480, backgroundColor: C.bg }}>{onboarding ? <OnboardingScreen onDone={async () => { await AsyncStorage.setItem(ONBOARDED_KEY, '1'); setOnboarding(false); }} /> : <AuthScreen onDone={setMe} onShowOnboarding={() => setOnboarding(true)} />}</SafeAreaView></View>;
  const props: ScreenProps = {
    me, setMe, ...nav,
    go: (t, o) => { setNav(o || {}); setTab(t); },
    clearNav: () => setNav({}),
    logout: async () => { await removePushOnLogout(); try { await api('/logout', { method: 'POST' }); } catch {} await setToken(null); setMe(null); setTab('board'); },
  };
  const Screen = { board: BoardScreen, create: CreateScreen, talk: TalkScreen, follow: FollowScreen, profile: ProfileScreen }[tab];
  return (
    <View style={{ flex: 1, backgroundColor: '#E9E9E9', alignItems: 'center' }}>
      {/* スマホ前提。PC では画面中央にスマホ幅で表示する */}
      <SafeAreaView style={{ flex: 1, width: '100%', maxWidth: 480, backgroundColor: C.bg }} edges={['top', 'bottom']}>
        <View style={{ flex: 1 }}><Screen {...props} /></View>
        <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: C.line, backgroundColor: C.bg, paddingTop: 6, paddingBottom: 4 }}>
          {(Object.keys(LABEL) as Tab[]).map(t => {
            const on = t === tab;
            const c = on ? C.ink : '#9A9A9A';
            if (t === 'create') return (
              <Pressable key={t} onPress={() => props.go(t)} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 52 }} accessibilityRole="tab" accessibilityLabel="誘う" accessibilityState={{ selected: on }}>
                <View style={{ width: 52, height: 40, borderRadius: 20, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center' }}>
                  <Svg width={22} height={22} viewBox="0 0 24 24">{ICON.create(C.white)}</Svg>
                </View>
              </Pressable>
            );
            return (
              <Pressable key={t} onPress={() => props.go(t)} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, minHeight: 52 }} accessibilityRole="tab" accessibilityState={{ selected: on }}>
                <Svg width={24} height={24} viewBox="0 0 24 24">{ICON[t](c)}</Svg>
                <Text style={{ fontFamily: FONT, fontSize: 10, fontWeight: on ? '800' : '600', color: c }}>{LABEL[t]}</Text>
              </Pressable>
            );
          })}
        </View>
      </SafeAreaView>
    </View>
  );
}
