import { useEffect, useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Path, Rect, Text as Label } from 'react-native-svg';
import { FONT } from '../../ui/theme';

const ORANGE = '#FF5A36', BLUE = '#3D5AFE', PINK = '#FF3EA5', BLACK = '#111111';
const font = '"Noto Sans JP", "Hiragino Sans", sans-serif';
function Words({ x, y, size = 22, fill = 'white', children }: { x: number; y: number; size?: number; fill?: string; children: React.ReactNode }) {
  return <Label x={x} y={y} fontFamily={font} fontWeight="900" fontSize={size} fill={fill}>{children}</Label>;
}
function Face({ x, y, name, r = 24, fill = 'white', ink = BLACK, dashed = false }: { x: number; y: number; name?: string; r?: number; fill?: string; ink?: string; dashed?: boolean }) {
  return <G><Circle cx={x} cy={y} r={r} fill={dashed ? 'none' : fill} stroke={dashed ? '#FFFFFFB3' : 'none'} strokeWidth={4} strokeDasharray={dashed ? '8 7' : undefined} />{name && <Label x={x} y={y + r * .35} textAnchor="middle" fontFamily={font} fontWeight="900" fontSize={r * 1.1} fill={ink}>{name}</Label>}</G>;
}
function Badge({ plain = false }: { plain?: boolean }) {
  return <G>{!plain && <Rect x={510} y={330} width={120} height={44} rx={22} fill={BLACK} />}<Words x={528} y={360}>あと24分</Words></G>;
}
function Gauge({ joined }: { joined: boolean }) {
  return <Svg width="100%" height="100%" viewBox="0 0 660 396">
    <Rect width={660} height={396} rx={48} fill={BLACK} /><Path d="M0 60 Q0 11 48 11 H612 Q660 11 660 60 V348 Q660 396 612 396 H48 Q0 396 0 348Z" fill={ORANGE} />
    <Path d="M92 326 V118 A51 51 0 0 1 194 118 V326Z" fill="#FFFFFF33" />
    <Face x={143} y={113} r={44} name="あ" ink={ORANGE} />
    {[0, 1, 2, 3, 4].map(i => <Rect key={i} x={99} y={172 + i * 31} width={88} height={24} rx={12} fill={i < (joined ? 3 : 2) ? 'white' : '#FFFFFF55'} stroke={joined && i === 2 ? BLACK : 'none'} strokeWidth={5} />)}
    <Path d="M47 368 Q68 333 104 333 H172 Q238 333 246 396 H25 Q25 372 47 372 H120 Q144 372 143 396" fill="white" />
    <Path d="M25 371 H120 Q145 371 143 396" fill="none" stroke={ORANGE} strokeWidth={6} />
    <Words x={274} y={131} size={54}>カラオケ</Words><Words x={274} y={172}>今日 18:30 · 駅前</Words>
    <Face x={322} y={238} name="り" fill="#FFD9CF" /><Face x={363} y={238} name="ゆ" fill="#FFF0B8" /><Face x={403} y={238} name={joined ? 'わ' : undefined} fill={BLACK} ink="white" dashed={!joined} />
    <Words x={274} y={304} size={20}>{joined ? 'あなたが3つ目の節に' : '指の節が1人ずつ埋まる'}</Words><Badge />
  </Svg>;
}
function Perch({ joined }: { joined: boolean }) {
  const [flight, setFlight] = useState(1);
  useEffect(() => {
    if (!joined) return;
    setFlight(0);
    const start = Date.now();
    const timer = setInterval(() => {
      const t = Math.min(1, (Date.now() - start) / 420);
      setFlight(t);
      if (t === 1) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [joined]);
  return <Svg width="100%" height="100%" viewBox="0 0 660 396">
    <Rect width={660} height={396} rx={48} fill={BLACK} /><Path d="M0 60 Q0 11 48 11 H612 Q660 11 660 60 V348 Q660 396 612 396 H48 Q0 396 0 348Z" fill={BLUE} />
    <Words x={44} y={116} size={54}>ラーメン</Words><Words x={44} y={157}>今日 18:30 · 駅前</Words>
    <Path d="M80 287 H610" stroke="white" strokeWidth={26} strokeLinecap="round" />
    <Path d="M12 283 Q12 234 57 234 H75 Q118 234 118 277 V304 Q118 347 75 347 H57 Q12 347 12 304Z" fill="white" /><Face x={65} y={291} r={35} name="あ" fill={BLUE} ink="white" />
    {[201, 293, 385, 477, 565].map((x, i) => <Face key={i} x={x - (joined && i === 2 ? 90 * (1 - flight) : 0)} y={238 - (joined && i === 2 ? 100 * Math.sin(Math.PI * flight) : 0)} r={27} name={i === 0 ? 'り' : i === 1 ? 'ゆ' : i === 2 && joined ? 'わ' : undefined} dashed={i > 1 && !(i === 2 && joined)} fill={i === 2 ? PINK : 'white'} ink={i === 2 ? 'white' : BLUE} />)}
    {joined && <Path d="M385 187 V171 M345 197 L334 186 M425 197 L436 186" stroke="white" strokeWidth={5} strokeLinecap="round" />}
    <Words x={44} y={370} size={20}>{joined ? '着地！ あなたがとまりました' : '空いている枝をタップ → 飛んでとまる'}</Words><Badge />
  </Svg>;
}
// The same horizontal line drawing is mirrored for the host's hand.
function Hand({ x = 0, flip = false, dashed = false, color = 'white' }: { x?: number; flip?: boolean; dashed?: boolean; color?: string }) {
  return <G transform={`translate(${x} 0)${flip ? ' translate(660 0) scale(-1 1)' : ''}`} stroke={color} strokeWidth={4.5} fill={BLACK} strokeDasharray={dashed ? '9 7' : undefined} strokeLinejoin="round" strokeLinecap="round">
    <Path d="M-180 226 H61 V281 H-180" /><Path d="M86 211 H119 Q147 211 147 239 V267 Q147 295 119 295 H86 Q55 295 55 267 V239 Q55 211 86 211Z" />
    <Path d="M129 220 H250 A16 16 0 0 1 250 253 H112" /><Rect x={108} y={253} width={62} height={20} rx={10} /><Rect x={108} y={273} width={55} height={20} rx={10} /><Rect x={70} y={232} width={62} height={20} rx={10} />
  </G>;
}
function Touch({ joined, progress }: { joined: boolean; progress: number }) {
  return <Svg width="100%" height="100%" viewBox="0 0 660 396">
    <Rect width={660} height={396} rx={48} fill={BLACK} /><Words x={44} y={108} size={48}>夜ドライブ</Words><Words x={44} y={147}>{joined ? '参加しました · 今日 21:00' : '今日 21:00 · 駅前'}</Words><Face x={583} y={99} r={29} name="あ" />
    <Hand x={progress * 64} dashed={!joined} color={ORANGE} /><Hand x={joined ? -64 : 0} flip />
    {joined ? <G stroke={ORANGE} strokeWidth={4} strokeLinecap="round"><Circle cx={336} cy={237} r={5} fill={ORANGE} /> <Path d="M336 192 V211 M336 282 V264 M311 201 L321 216 M361 201 L351 216 M311 273 L321 258 M361 273 L351 258" /></G> : <Words x={260} y={344} size={20} fill={ORANGE}>ふれて参加 →</Words>}<Badge plain />
  </Svg>;
}
function Idea({ number, title, hint }: { number: number; title: string; hint: string }) {
  const [joined, setJoined] = useState(false);
  const [progress, setProgress] = useState(0);
  const state = useRef({ joined: false, width: 358, start: 0 });
  const bounce = useRef(new Animated.Value(0)).current;
  const change = (value: boolean) => {
    state.current.joined = value; setJoined(value); setProgress(value ? 1 : 0);
    if (value && number === 2) {
      bounce.setValue(-15);
      Animated.sequence([Animated.timing(bounce, { toValue: 4, duration: 170, useNativeDriver: true }), Animated.spring(bounce, { toValue: 0, useNativeDriver: true })]).start();
    }
  };
  const responder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => number !== 1,
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > Math.abs(g.dy),
    onPanResponderGrant: () => { state.current.start = state.current.joined ? 1 : 0; },
    onPanResponderMove: (_, g) => {
      if (number === 3 && Math.abs(g.dx) > Math.abs(g.dy)) {
        const p = Math.max(0, Math.min(1, state.current.start + g.dx / (state.current.width * .15)));
        setProgress(p); if (p === 1 && !state.current.joined) change(true);
      }
    },
    onPanResponderRelease: (_, g) => {
      if (number === 2) { if (g.dy > 20) change(false); else if (g.dy < -20 || Math.abs(g.dx) < 8) change(true); }
      if (number === 3) { if (g.dx > state.current.width * .10 && Math.abs(g.dx) > Math.abs(g.dy)) change(true); else if (g.dx < -20) change(false); else { setProgress(state.current.joined ? 1 : 0); } }
    },
    onPanResponderTerminationRequest: () => true,
  })).current;
  return <View style={styles.section}>
    <View style={styles.heading}><Text style={styles.number}>{`0${number}`}</Text><Text style={styles.name}>{title}</Text></View>
    <Text style={styles.status}>{joined ? '参加後' : '参加前'}</Text>
    <Animated.View style={{ transform: [{ translateY: bounce }] }}>
      <View onLayout={e => { state.current.width = e.nativeEvent.layout.width; }} {...(number !== 1 ? responder.panHandlers : {})} style={[styles.card, { touchAction: number === 2 ? 'none' : 'pan-y' } as object]} accessibilityLabel={`${title}のプレビュー`}>
        {number === 1 ? <Pressable accessibilityLabel="指の節をタップして参加" onPress={() => change(!joined)} style={{ flex: 1 }}><Gauge joined={joined} /></Pressable> : number === 2 ? <Perch joined={joined} /> : <Touch joined={joined} progress={progress} />}
      </View>
    </Animated.View>
    <Text style={styles.hint}>{hint}</Text>
    <Pressable accessibilityLabel={`${title}をリセット`} onPress={() => change(false)} style={styles.reset}><Text style={styles.resetText}>参加前に戻す ↺</Text></Pressable>
  </View>;
}
export function PreviewF1() {
  return <ScrollView style={styles.screen} contentContainerStyle={styles.content}><Text style={styles.eyebrow}>この指とまれ — DESIGN IDEAS</Text><Text style={styles.title}>「指」で、つながる。</Text><Text style={styles.intro}>PDF デザイン案 01—03 · タップやスワイプで体験\nこの画面だけのプレビューです。</Text><Idea number={1} title="指の節ゲージ" hint="左の指をタップすると、あなたの節がひとつ光ります。" /><Idea number={2} title="とまり木" hint="点線の丸をタップして着地。下へはじくと飛び立ちます。" /><Idea number={3} title="指先タッチ" hint="左の指を右へスワイプしてタッチ。左へ戻すと取り消し。" /><Text style={styles.footer}>橙 #FF5A36 / 青 #3D5AFE / 桃 #FF3EA5</Text></ScrollView>;
}
export default PreviewF1;
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'white' }, content: { width: '100%', maxWidth: 620, alignSelf: 'center', padding: 16, paddingTop: 28, paddingBottom: 48 },
  eyebrow: { fontFamily: FONT, color: '#888', fontSize: 10, letterSpacing: 1.3 }, title: { fontFamily: FONT, fontWeight: '900', fontSize: 29, marginTop: 14, color: BLACK }, intro: { fontFamily: FONT, fontSize: 12, lineHeight: 21, color: '#888', marginTop: 10, marginBottom: 16 },
  section: { marginTop: 22, marginBottom: 20 }, heading: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 }, number: { fontFamily: FONT, fontSize: 40, fontWeight: '900', color: BLACK }, name: { fontFamily: FONT, fontSize: 23, fontWeight: '900', color: BLACK }, status: { fontFamily: FONT, fontWeight: '900', fontSize: 11, color: '#888', marginBottom: 10, marginLeft: 5 },
  card: { width: '100%', aspectRatio: 660 / 396, overflow: 'hidden', borderRadius: 26 }, hint: { fontFamily: FONT, color: '#777', fontSize: 11, lineHeight: 19, marginTop: 12 }, reset: { alignSelf: 'flex-start', backgroundColor: '#F3F2F0', borderRadius: 30, paddingHorizontal: 13, paddingVertical: 9, marginTop: 9 }, resetText: { fontFamily: FONT, color: BLACK, fontSize: 11, fontWeight: '700' }, footer: { fontFamily: FONT, fontSize: 10, color: '#999', marginTop: 18 },
});
