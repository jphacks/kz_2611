// ★共有: ログイン状態・下タブ・画面の切り替え。タブの中身は各画面ファイルで作る
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle } from 'react-native-svg';
import { api, loadToken, setToken, Me } from './api';
import { C, FONT } from './ui/theme';
import { AuthScreen } from './screens/AuthScreen';
import { BoardScreen } from './screens/BoardScreen';
import { CreateScreen } from './screens/CreateScreen';
import { TalkScreen } from './screens/TalkScreen';
import { FollowScreen } from './screens/FollowScreen';
import { ProfileScreen } from './screens/ProfileScreen';

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
  board: c => <Path d="M4 11 L12 4 L20 11 V20 H4 Z" stroke={c} strokeWidth={1.8} fill="none" />,
  create: c => <Path d="M12 4 V20 M4 12 H20" stroke={c} strokeWidth={1.8} />,
  talk: c => <Path d="M4 5 H20 V16 H9 L5 20 V16 H4 Z" stroke={c} strokeWidth={1.8} fill="none" />,
  follow: c => <><Circle cx={9} cy={8} r={3.2} stroke={c} strokeWidth={1.8} fill="none" /><Circle cx={17} cy={9} r={2.4} stroke={c} strokeWidth={1.8} fill="none" /><Path d="M3 19 C3 14 15 14 15 19 M15 14 C19 14 21 16 21 19" stroke={c} strokeWidth={1.8} fill="none" /></>,
  profile: c => <><Circle cx={12} cy={8} r={3.6} stroke={c} strokeWidth={1.8} fill="none" /><Path d="M5 20 C5 14 19 14 19 20" stroke={c} strokeWidth={1.8} fill="none" /></>,
};
const LABEL: Record<Tab, string> = { board: '掲示板', create: '誘う', talk: 'トーク', follow: 'フォロー', profile: 'プロフィール' };

export function Main() {
  const [me, setMe] = useState<Me | null>(null);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>('board');
  const [nav, setNav] = useState<{ openEventId?: number; editEventId?: number }>({});
  useEffect(() => { (async () => {
    if (await loadToken()) { try { setMe((await api<{ user: Me }>('/me')).user); } catch { await setToken(null); } }
    setReady(true);
  })(); }, []);
  if (!ready) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  if (!me) return <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}><AuthScreen onDone={setMe} /></SafeAreaView>;
  const props: ScreenProps = {
    me, setMe, ...nav,
    go: (t, o) => { setNav(o || {}); setTab(t); },
    clearNav: () => setNav({}),
    logout: async () => { try { await api('/logout', { method: 'POST' }); } catch {} await setToken(null); setMe(null); setTab('board'); },
  };
  const Screen = { board: BoardScreen, create: CreateScreen, talk: TalkScreen, follow: FollowScreen, profile: ProfileScreen }[tab];
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'bottom']}>
      <View style={{ flex: 1 }}><Screen {...props} /></View>
      <View style={{ flexDirection: 'row', borderTopWidth: 2, borderTopColor: C.ink, backgroundColor: C.bg, paddingTop: 8, paddingBottom: 6 }}>
        {(Object.keys(LABEL) as Tab[]).map(t => {
          const c = t === tab ? C.ink : C.muted;
          return (
            <Pressable key={t} onPress={() => props.go(t)} style={{ flex: 1, alignItems: 'center', gap: 2 }} accessibilityRole="tab" accessibilityState={{ selected: t === tab }}>
              <Svg width={22} height={22} viewBox="0 0 24 24">{ICON[t](c)}</Svg>
              <Text style={{ fontFamily: FONT, fontSize: 10, fontWeight: t === tab ? '800' : '600', color: c }}>{LABEL[t]}</Text>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}
