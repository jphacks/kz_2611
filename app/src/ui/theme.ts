// ★共有: デザインの基準（Swiss）。白・黒・赤だけ、角丸ゼロ、巨大な数字。変更は単独PRで
import { Platform, StyleSheet } from 'react-native';

export const C = {
  bg: '#FFFFFF',      // 画面の背景
  surface: '#F4F4F4', // カード・入力欄・相手の吹き出し
  ink: '#0A0A0A',     // 文字・選択中のタブ・自分の吹き出し
  red: '#FF2D20',     // アクセント（残り時間・人数の縁・送信ボタン）。赤はこの1色だけ
  muted: '#8A8A8A',   // 補助の文字
  line: '#E2E2E2',    // 区切り線・インジケーターの残り部分
  white: '#FFFFFF',
};
export const RADIUS = 0; // 角丸は使わない（アバターの丸だけ例外）
export const FONT = Platform.select({
  web: 'Inter, "Noto Sans JP", "Hiragino Sans", sans-serif',
  default: undefined,
});
export const T = StyleSheet.create({
  screenTitle: { fontFamily: FONT, fontSize: 34, fontWeight: '900', color: C.ink, letterSpacing: -0.5 },
  date: { fontFamily: FONT, fontSize: 11, fontWeight: '700', color: C.muted, letterSpacing: 2 },
  h1: { fontFamily: FONT, fontSize: 28, fontWeight: '900', color: C.ink },
  h2: { fontFamily: FONT, fontSize: 18, fontWeight: '800', color: C.ink },
  body: { fontFamily: FONT, fontSize: 14, color: C.ink },
  sub: { fontFamily: FONT, fontSize: 13, color: C.muted },
  small: { fontFamily: FONT, fontSize: 11, fontWeight: '700', color: C.muted },
  huge: { fontFamily: FONT, fontSize: 52, fontWeight: '900', color: C.ink, letterSpacing: -2 },
});
export const S = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  pad: { paddingHorizontal: 16 },
  input: { fontFamily: FONT, backgroundColor: C.surface, borderRadius: RADIUS, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: C.ink },
  btn: { backgroundColor: C.ink, borderRadius: RADIUS, paddingVertical: 14, alignItems: 'center' },
  btnText: { fontFamily: FONT, color: C.white, fontSize: 15, fontWeight: '800' },
  btnRed: { backgroundColor: C.red, borderRadius: RADIUS, paddingVertical: 14, alignItems: 'center' },
  btnGhost: { borderWidth: 1, borderColor: C.ink, borderRadius: RADIUS, paddingVertical: 13, alignItems: 'center' },
  btnGhostText: { fontFamily: FONT, color: C.ink, fontSize: 15, fontWeight: '800' },
  chip: { borderWidth: 1, borderColor: C.line, paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS },
  chipOn: { backgroundColor: C.ink, borderColor: C.ink },
  chipText: { fontFamily: FONT, fontSize: 13, fontWeight: '700', color: C.muted },
  chipTextOn: { color: C.white },
  error: { fontFamily: FONT, color: C.red, fontSize: 13, fontWeight: '700' },
});
