// デザイン案プレビュー（f4）: IDEA 10〜12 を1画面に縦に並べる
// Web の ?preview=f4 でログインなしに表示する。API は呼ばず、画面内の状態だけで動く。
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { C, FONT } from '../../ui/theme';
import { StampCardF4 } from './StampCardF4';
import { GlassCardF4 } from './GlassCardF4';
import { LastOneCardF4 } from './LastOneCardF4';

/** Web かつ URL が ?preview=f4 のとき true（ネイティブでは window を触らない） */
export function isPreviewF4(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || typeof window.location === 'undefined') return false;
  try { return new URLSearchParams(window.location.search).get('preview') === 'f4'; } catch { return false; }
}

// この指とまれ の小さな指のマーク（線画）
function FingerMark() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Path d="M12 21c-4 0-7-2.5-7-6 0-2.2 1.2-3.8 3-4.8V5a2 2 0 0 1 4 0v3.2c1.8 1 3 2.6 3 4.8" fill="none" stroke={C.red} strokeWidth={2.2} strokeLinecap="round" />
      <Path d="M15 13c.8 3.5-1 8-3 8" fill="none" stroke={C.red} strokeWidth={2.2} strokeLinecap="round" />
    </Svg>
  );
}

/** 案の見出し（番号と名前） */
function IdeaHead({ no, name, tag, desc }: { no: number; name: string; tag: string; desc: string }) {
  return (
    <View style={{ marginTop: 30, marginBottom: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
        <Text style={styles.no}>{no}</Text>
        <Text style={styles.ideaLabel}>IDEA</Text>
        <View style={styles.tag}><Text style={styles.tagText}>{tag}</Text></View>
      </View>
      <Text style={styles.name}>{name}</Text>
      <Text style={styles.desc}>{desc}</Text>
    </View>
  );
}

/** うごき（触り方）の一覧 */
function How({ lines }: { lines: string[] }) {
  return (
    <View style={{ marginTop: 10, gap: 5 }}>
      {lines.map((l, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
          <View style={styles.numDot}><Text style={styles.numDotText}>{i + 1}</Text></View>
          <Text style={styles.howText}>{l}</Text>
        </View>
      ))}
    </View>
  );
}

export function PreviewF4() {
  return (
    <View style={[styles.screen, { width: '100%', maxWidth: 390, alignSelf: 'center', flex: 1 }]}>
      <ScrollView contentContainerStyle={{ paddingTop: 28, paddingBottom: 56 }} showsVerticalScrollIndicator={false}>
        {/* ヘッダ */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <FingerMark />
            <Text style={styles.logo}>この指とまれ</Text>
          </View>
          <Text style={styles.headerNote}>DESIGN IDEAS · f4</Text>
        </View>
        <Text style={styles.headerDesc}>デザイン案 10〜12 を、そのまま触って確かめられるプレビュー。API は呼ばず、画面内の状態だけで動きます。</Text>

        {/* IDEA 10 指印スタンプ */}
        <IdeaHead no={10} name="指印スタンプ" tag="C-3の発展 · 誤操作防止" desc="参加の確定は、指でポンと押す。" />
        <View style={{ paddingHorizontal: 16 }}>
          <StampCardF4 />
          <How lines={[
            '点線の円を長押し（円ゲージがたまる）',
            'たまりきると振動＋指紋のスタンプが押される',
            'もう一度長押しで、スタンプがかすれて消える＝取り消し',
          ]} />
        </View>

        {/* IDEA 11 すりガラス×ぷっくり指 */}
        <IdeaHead no={11} name="すりガラス×ぷっくり指" tag="透明感 · トレンド" desc="透明感のある、いまっぽい質感。主催者の指はぷっくりした立体。" />
        <View style={{ paddingHorizontal: 16 }}>
          <GlassCardF4 />
          <How lines={[
            'カードをタップで参加（指先から波紋が2重に広がる・満員はガラスが少し曇る）',
            '下のチップで背景色を朝←→夜に切り替え（朝＝オレンジ／夜＝青）',
          ]} />
        </View>

        {/* IDEA 12 「あと1人」タイポ */}
        <IdeaHead no={12} name="「あと1人」タイポ" tag="プッシュ／決め画面 · ブランド" desc="数字の「1」が、立てた指になる。「残り1人」専用の決めのカード。" />
        <View style={{ paddingHorizontal: 16 }}>
          <LastOneCardF4 />
          <How lines={[
            '「1」の指が、手招きするように小さく揺れる',
            'カードをタップで満員に（指が下りて「満員！」＋全員の顔が並ぶ）',
            'もう一度タップで「あと1人」に戻る',
          ]} />
        </View>

        <Text style={styles.footerNote}>※ 触れるプレビュー（担当 f4）。本物の API・データは使わず、架空のデータで動いています。</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#F1F0F4' },
  logo: { fontFamily: FONT, fontSize: 17, fontWeight: '900', color: C.ink },
  headerNote: { fontFamily: FONT, fontSize: 11, fontWeight: '800', color: '#8A8A98', letterSpacing: 2 },
  headerDesc: { fontFamily: FONT, fontSize: 13, color: '#5A5A66', lineHeight: 20, marginTop: 12, paddingHorizontal: 16 },
  no: { fontFamily: FONT, fontSize: 34, fontWeight: '900', color: C.ink, lineHeight: 38 },
  ideaLabel: { fontFamily: FONT, fontSize: 12, fontWeight: '900', color: C.red, letterSpacing: 2 },
  tag: { marginLeft: 'auto', backgroundColor: C.ink, borderRadius: 999, paddingHorizontal: 10, height: 24, justifyContent: 'center' },
  tagText: { fontFamily: FONT, color: C.white, fontWeight: '800', fontSize: 11 },
  name: { fontFamily: FONT, fontSize: 22, fontWeight: '900', color: C.ink, marginTop: 2 },
  desc: { fontFamily: FONT, fontSize: 13, color: '#5A5A66', marginTop: 4 },
  numDot: { width: 18, height: 18, borderRadius: 9, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  numDotText: { fontFamily: FONT, color: C.white, fontWeight: '900', fontSize: 11 },
  howText: { fontFamily: FONT, fontSize: 12.5, color: '#5A5A66', lineHeight: 18, flex: 1 },
  footerNote: { fontFamily: FONT, fontSize: 11, color: '#8A8A98', marginTop: 34, paddingHorizontal: 16 },
});
