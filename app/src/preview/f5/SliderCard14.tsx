// IDEA 14 とまれスライダー（案Bのスライドを、指アイコン＋言葉で）— プレビュー f5 専用の画面。
// API は呼ばない。つまみ（指アイコン）を右へ運ぶと参加、「とまった！」。左へ戻すと取り消し。
import { useEffect, useRef, useState } from 'react';
import { Animated, PanResponder, Platform, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { C, FONT, PILL, RADIUS } from '../../ui/theme';
import { Gauge } from './GaugeFrame';
import { PointingHand } from './PointingHand';
import { S } from './NaviCard13';

const KNOB = 56;

export function SliderCard14() {
  const [joined, setJoined] = useState(false);
  const [laneWidth, setLaneWidth] = useState(0);
  const travel = Math.max(0, laneWidth - KNOB - 8);
  const offset = useRef(new Animated.Value(0)).current;
  const swap = useRef(new Animated.Value(0)).current;
  const wobble = useRef(new Animated.Value(0)).current;
  const dragging = useRef(false);
  const latest = useRef({ travel, joined });
  latest.current = { travel, joined };

  const settle = (right: boolean) => {
    Animated.spring(offset, { toValue: right ? latest.current.travel : 0, useNativeDriver: false, overshootClamping: true }).start();
    Animated.timing(swap, { toValue: right ? 1 : 0, duration: 200, useNativeDriver: false }).start();
  };
  // 参加（右端）・取り消し（左端）の状態を正とし、外から状態が変わったらつまみを合わせる
  useEffect(() => { if (!dragging.current) settle(joined); }, [joined, travel]);
  // 参加前だけ、つまみが「右へ滑らせて」と小さくゆらゆらする（参加後は止まる）
  useEffect(() => {
    if (joined) { wobble.setValue(0); return; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(wobble, { toValue: 1, duration: 1100, useNativeDriver: false }),
      Animated.timing(wobble, { toValue: 0, duration: 320, useNativeDriver: false }),
    ]));
    loop.start();
    return () => { loop.stop(); wobble.setValue(0); };
  }, [joined]);

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    // 縦方向はスクロールに譲り、横方向のドラッグだけを受け取る
    onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
    onPanResponderGrant: () => { dragging.current = true; offset.stopAnimation(); },
    onPanResponderMove: (_, g) => {
      const start = latest.current.joined ? latest.current.travel : 0;
      offset.setValue(Math.max(0, Math.min(start + g.dx, latest.current.travel)));
    },
    onPanResponderRelease: (_, g) => {
      dragging.current = false;
      const start = latest.current.joined ? latest.current.travel : 0;
      const end = start + g.dx;
      const right = end > latest.current.travel / 2;
      settle(right);
      if (right !== latest.current.joined) setJoined(right);
    },
    onPanResponderTerminationRequest: () => true,
    onPanResponderTerminate: () => { dragging.current = false; settle(latest.current.joined); },
  })).current;

  const knobX = Animated.add(offset, wobble.interpolate({ inputRange: [0, 1], outputRange: [0, 14] }));
  return (
    <View style={[s.card, { backgroundColor: C.red }]}>
      <Gauge fraction={0.75} />
      <View style={S.status}><Text style={S.statusText}>{joined ? '参加後' : '参加前'}</Text></View>
      <Text style={s.title}>カラオケ</Text>
      <Text style={s.time}>今日 18:30 · 駅前 · 主催 あおい</Text>

      {/* 専用レーン: つまみ（指アイコン）を右へ運ぶと「とまった！」 */}
      <View
        {...pan.panHandlers}
        onLayout={e => setLaneWidth(e.nativeEvent.layout.width)}
        style={[s.lane, Platform.OS === 'web' ? { touchAction: 'pan-y' } as ViewStyle : null]}
        accessibilityLabel={joined ? 'とまった！ 左へ戻すと参加を取り消す' : 'とまれ。右へスライドで参加'}
      >
        <Animated.Text style={[s.laneText, { opacity: swap.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]}>とまれ › › ›</Animated.Text>
        <Animated.Text style={[s.laneText, s.doneText, { opacity: swap }]}>とまった！</Animated.Text>
        <Animated.View style={[s.knob, { transform: [{ translateX: knobX }] }]}>
          <PointingHand size={40} color={C.red} hatch="rgba(0,0,0,0.14)" />
        </Animated.View>
      </View>

      <View style={s.badgeRow}><View style={S.badge}><Text style={S.badgeText}>あと24分</Text></View></View>
    </View>
  );
}

const s = StyleSheet.create({
  card: { borderRadius: RADIUS, minHeight: 240, padding: 20, overflow: 'hidden' },
  title: { fontFamily: FONT, color: C.white, fontWeight: '900', fontSize: 30, marginTop: 34 },
  time: { fontFamily: FONT, color: 'rgba(255,255,255,0.92)', fontWeight: '700', fontSize: 14, marginTop: 4 },
  lane: { marginTop: 16, height: 66, borderRadius: PILL, backgroundColor: 'rgba(0,0,0,0.30)', justifyContent: 'center', overflow: 'hidden' },
  laneText: { position: 'absolute', alignSelf: 'center', fontFamily: FONT, color: C.white, fontWeight: '900', fontSize: 18, includeFontPadding: false },
  doneText: { fontSize: 20 },
  knob: { width: KNOB, height: KNOB, borderRadius: KNOB / 2, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start', marginLeft: 4, marginVertical: 5 },
  badgeRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 },
});
