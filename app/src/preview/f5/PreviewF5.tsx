// 触れるデザインプレビュー（?preview=f5）。API は呼ばず、画面内の状態だけで動く。
// IDEA 13「指さしナビ」と IDEA 14「とまれスライダー」を並べて試せる。
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { C, FONT, RADIUS, T } from '../../ui/theme';
import { NaviCard13 } from './NaviCard13';
import { SliderCard14 } from './SliderCard14';

export function PreviewF5() {
  return (
    <View style={s.root}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.page}>
          <Text style={T.date}>この指とまれ — DESIGN IDEAS · 触れるプレビュー f5</Text>

          <View style={s.section}>
            <View style={s.header}>
              <Text style={s.no}>13</Text>
              <View style={s.headerText}>
                <Text style={T.h1}>指さしナビ</Text>
                <Text style={T.sub}>集合直前は、指が行き先を指さす。参加後〜集合までの画面。</Text>
              </View>
            </View>
            <NaviCard13 />
            <Text style={s.note}>
              うごき: 上のチップで「参加前 → 参加後 → 到着」が変わる。指の四角を左右にドラッグすると指が回り、方角ラベルが変わる（スマホの向きの疑似）。真上に向けると指がまっすぐ上を向く。
            </Text>
          </View>

          <View style={s.section}>
            <View style={s.header}>
              <Text style={s.no}>14</Text>
              <View style={s.headerText}>
                <Text style={T.h1}>とまれスライダー</Text>
                <Text style={T.sub}>案Bのスライドを、指アイコン＋言葉で。右端まで運ぶと「とまった！」。</Text>
              </View>
            </View>
            <SliderCard14 />
            <Text style={s.note}>
              うごき: つまみ（指アイコン）を右へ半分以上スライドすると右端に吸い付き「とまった！」（参加前 → 参加後）。左へ戻すと取り消し。
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { alignItems: 'center' },
  // スマホ幅 390px 前提。PC では画面中央に置く
  page: { width: 390, maxWidth: '100%', paddingHorizontal: 16, paddingTop: 30, paddingBottom: 72 },
  section: { marginTop: 24 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 14 },
  no: { fontFamily: FONT, fontSize: 40, fontWeight: '900', color: C.ink, lineHeight: 44 },
  headerText: { flex: 1, minWidth: 0, paddingTop: 2, gap: 2 },
  note: { fontFamily: FONT, fontSize: 12, lineHeight: 18, color: C.muted, marginTop: 8 },
});
