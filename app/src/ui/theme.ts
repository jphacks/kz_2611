// ★共有: デザインの基準（Color Pop）。変更は単独PRで
// ビビッドな単色カード＋白文字、太いリング、丸いピル、丸い吹き出し。スマホ操作が前提
import { Platform, StyleSheet } from 'react-native';

export const C = {
  bg: '#FFFFFF',      // 画面の背景
  surface: '#F2F2F2', // 入力欄・タブ（未選択）・相手の吹き出しの下地
  ink: '#111111',     // 文字・選択中のタブ
  red: '#FF5A36',     // メインのアクセント（オレンジ）。送信・公開・選択中の下タブ
  blue: '#3D5AFE',
  pink: '#FF3D9A',
  green: '#00B37E',
  yellow: '#FFD43B',  // 締切間近
  muted: '#8A8A8A',
  line: '#ECECEC',
  white: '#FFFFFF',
};
/** 遊びごとのカードの色（タイトルから決める。同じ遊びはいつも同じ色） */
export const POP = [C.red, C.blue, C.pink, C.green] as const;
const FIXED: Record<string, string> = { カラオケ: C.red, ラーメン: C.blue, ご飯: C.green, ドライブ: C.pink, 夜ドライブ: C.pink, バドミントン: C.green };
export function popColor(title: string) {
  if (FIXED[title]) return FIXED[title];
  let h = 0; for (const ch of title) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return POP[h % POP.length];
}
/** 吹き出し用の淡い色（人ごと） */
export const TINT = ['#FFD9CF', '#D6DDFF', '#FFD3E8', '#C9F0E0', '#FFF0B8'] as const;
export const tint = (id: number) => TINT[Math.abs(id) % TINT.length];

export const RADIUS = 22;   // カード
export const PILL = 999;    // チップ・ボタン・入力欄
export const FONT = Platform.select({ web: 'Inter, "Noto Sans JP", "Hiragino Sans", sans-serif', default: undefined });
export const T = StyleSheet.create({
  screenTitle: { fontFamily: FONT, fontSize: 30, fontWeight: '900', color: C.ink },
  date: { fontFamily: FONT, fontSize: 11, fontWeight: '700', color: C.muted, letterSpacing: 2 },
  h1: { fontFamily: FONT, fontSize: 26, fontWeight: '900', color: C.ink },
  h2: { fontFamily: FONT, fontSize: 17, fontWeight: '800', color: C.ink },
  body: { fontFamily: FONT, fontSize: 15, color: C.ink },
  sub: { fontFamily: FONT, fontSize: 13, color: C.muted },
  small: { fontFamily: FONT, fontSize: 11, fontWeight: '700', color: C.muted },
  huge: { fontFamily: FONT, fontSize: 44, fontWeight: '900', color: C.ink },
});
export const S = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  pad: { paddingHorizontal: 16 },
  // fontSize 16 以上: iPhone のブラウザで入力時に画面が拡大されないように
  input: { fontFamily: FONT, backgroundColor: C.surface, borderRadius: PILL, paddingHorizontal: 18, paddingVertical: 12, fontSize: 16, color: C.ink, minHeight: 48 },
  btn: { backgroundColor: C.ink, borderRadius: PILL, minHeight: 52, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontFamily: FONT, color: C.white, fontSize: 16, fontWeight: '800' },
  btnRed: { backgroundColor: C.red, borderRadius: PILL, minHeight: 52, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' },
  btnGhost: { backgroundColor: C.surface, borderRadius: PILL, minHeight: 52, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' },
  btnGhostText: { fontFamily: FONT, color: C.ink, fontSize: 16, fontWeight: '800' },
  chip: { backgroundColor: C.surface, paddingHorizontal: 16, minHeight: 36, justifyContent: 'center', borderRadius: PILL },
  chipOn: { backgroundColor: C.ink },
  chipText: { fontFamily: FONT, fontSize: 13, fontWeight: '800', color: C.ink },
  chipTextOn: { color: C.white },
  card: { backgroundColor: C.surface, borderRadius: RADIUS, padding: 20 },
  error: { fontFamily: FONT, color: C.red, fontSize: 13, fontWeight: '700' },
});
