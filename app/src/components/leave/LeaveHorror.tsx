// 参加をやめたときのホラー演出。Web だけで流す（アプリでは何も出さずにすぐ終わる）。
// 真っ暗→目が開く→指をにらむ→正面を見つめる→血文字「なんでやめたの」→ブツッと切れる（約8秒）。
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { AccessibilityInfo, Modal, Platform, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { useReducedMotion } from '../celebration/reducedMotion';
import { loadBloodFont } from './bloodFont';
import { startLeaveEye, type LeaveEyeHandle } from './leaveEyeEngine';
import { playLeaveSound } from './leaveSound';
import { LEAVE_TEXT } from './leaveTiming';

export interface LeaveHorrorProps {
  visible: boolean;
  onDone: () => void;
  sound: boolean;
  vibrate: boolean;
}

function buzz(enabled: boolean, pattern: number[]) {
  if (!enabled || typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  try { navigator.vibrate(pattern); } catch { /* 振動できなくてもよい */ }
}

export function LeaveHorror({ visible, onDone, sound, vibrate }: LeaveHorrorProps) {
  const web = Platform.OS === 'web';
  const reduced = useReducedMotion();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const host = useRef<ComponentRef<typeof View>>(null);
  const engine = useRef<LeaveEyeHandle | null>(null);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  // 演出中に親が再描画されても最初の設定のまま動かす
  const settings = useRef({ sound, vibrate });
  settings.current = { sound, vibrate };

  useEffect(() => { if (web) void loadBloodFont(); }, [web]);

  // アプリでは演出を出さない
  useEffect(() => { if (visible && !web) doneRef.current(); }, [visible, web]);

  // 音と振動は表示した瞬間から
  useEffect(() => {
    if (!visible || !web) return;
    const { sound: soundOn, vibrate: vibrateOn } = settings.current;
    const stopSound = playLeaveSound(soundOn, LEAVE_TEXT);
    const timers = [setTimeout(() => buzz(vibrateOn, [30]), 1800), setTimeout(() => buzz(vibrateOn, [200]), 7900)];
    AccessibilityInfo.announceForAccessibility?.('参加を取り消しました');
    return () => { stopSound(); timers.forEach(clearTimeout); };
  }, [visible, web]);

  useEffect(() => {
    if (!visible || !web || size.width <= 0 || size.height <= 0 || engine.current) return;
    const node = host.current as unknown as HTMLElement | null;
    if (!node) return;
    engine.current = startLeaveEye({ host: node, width: size.width, height: size.height, reduced, onEnd: () => doneRef.current() });
  }, [visible, web, size.width, size.height, reduced]);

  useEffect(() => {
    if (visible) return;
    engine.current?.stop();
    engine.current = null;
  }, [visible]);
  useEffect(() => () => { engine.current?.stop(); engine.current = null; }, []);

  if (!visible || !web) return null;
  // 下タブも含めて画面全体を覆うため Modal に出す
  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={() => {}}>
      <View
        style={styles.overlay}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        onLayout={(event: LayoutChangeEvent) => {
          const { width, height } = event.nativeEvent.layout;
          if (width !== size.width || height !== size.height) setSize({ width, height });
        }}
      >
        <View ref={host} style={StyleSheet.absoluteFill} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // 演出のあいだは画面全体を真っ黒で覆い、下の掲示板を触れないようにする
  overlay: { flex: 1, backgroundColor: '#000' },
});
