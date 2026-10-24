import { createElement, useRef, useState } from 'react';
import { ActivityIndicator, Image, Modal, PanResponder, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, Mask, Rect } from 'react-native-svg';
import { C, S, T } from '../../ui/theme';
import { cropGeometry, cropRect, type CropPosition } from './crop';

type Asset = { uri: string; width: number; height: number };
export function PhotoCropModal({ asset, busy, error, onCancel, onConfirm }: {
  asset: Asset; busy: boolean; error: string; onCancel: () => void;
  onConfirm: (rect: ReturnType<typeof cropRect>) => void;
}) {
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const frame = Math.max(80, Math.min(320, window.width - 48, window.height - 380));
  const [position, setPosition] = useState<CropPosition>({ zoom: 1, x: 0, y: 0 });
  const current = useRef(position); current.current = position;
  const gesture = useRef<{ count: number; x: number; y: number; distance: number; position: CropPosition } | null>(null);
  const geometry = cropGeometry(asset.width, asset.height, frame, position);
  function update(next: CropPosition) {
    const g = cropGeometry(asset.width, asset.height, frame, next);
    const p = { zoom: g.zoom, x: g.x, y: g.y }; current.current = p; setPosition(p);
  }
  function zoom(value: number) {
    const p = current.current;
    const bounded = Math.max(1, Math.min(4, value));
    update({ zoom: bounded, x: p.x * bounded / p.zoom, y: p.y * bounded / p.zoom });
  }
  const responder = PanResponder.create({
    onStartShouldSetPanResponder: () => !busy,
    onMoveShouldSetPanResponder: () => !busy,
    onPanResponderGrant: () => { gesture.current = null; },
    onPanResponderMove: event => {
      const touches = event.nativeEvent.touches;
      if (!touches.length) return;
      const a = touches[0], b = touches[1];
      const x = b ? (a.pageX + b.pageX) / 2 : a.pageX;
      const y = b ? (a.pageY + b.pageY) / 2 : a.pageY;
      const distance = b ? Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY) : 1;
      const start = gesture.current;
      if (!start || start.count !== touches.length) {
        gesture.current = { count: touches.length, x, y, distance, position: current.current }; return;
      }
      const z = Math.max(1, Math.min(4, start.position.zoom * distance / start.distance));
      const ratio = z / start.position.zoom;
      update({ zoom: z, x: start.position.x * ratio + x - start.x, y: start.position.y * ratio + y - start.y });
    },
    onPanResponderRelease: () => { gesture.current = null; },
    onPanResponderTerminate: () => { gesture.current = null; },
    onPanResponderTerminationRequest: () => false,
  });
  return <Modal visible animationType="slide" onRequestClose={() => { if (!busy) onCancel(); }}>
    <View style={[styles.screen, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.content}>
        <Text style={T.h1}>写真の範囲を選ぶ</Text>
        <Text style={T.sub}>ドラッグで移動・ピンチで拡大縮小</Text>
        <View accessibilityLabel="写真の切り取り範囲" style={[styles.stage, { height: frame + 40 }]} {...responder.panHandlers}>
          <Image source={{ uri: asset.uri }} resizeMode="stretch" style={{ position: 'absolute', width: geometry.width, height: geometry.height, left: '50%', top: '50%', marginLeft: -geometry.width / 2 + geometry.x, marginTop: -geometry.height / 2 + geometry.y }} />
          <Svg pointerEvents="none" width="100%" height="100%" style={StyleSheet.absoluteFill}>
            <Defs><Mask id="photo-crop-mask"><Rect width="100%" height="100%" fill="white" /><Circle cx="50%" cy="50%" r={frame / 2} fill="black" /></Mask></Defs>
            <Rect width="100%" height="100%" fill={C.ink} opacity={0.65} mask="url(#photo-crop-mask)" />
            <Circle cx="50%" cy="50%" r={frame / 2} stroke={C.white} strokeWidth={3} fill="none" />
          </Svg>
        </View>
        <Text style={T.small}>丸の中がアイコンに表示されます</Text>
        <View style={styles.zoom}>
          <Pressable accessibilityRole="button" accessibilityLabel="縮小" disabled={busy} onPress={() => zoom(position.zoom - 0.25)} style={S.btnGhost}><Text style={S.btnGhostText}>−</Text></Pressable>
          {Platform.OS === 'web' ? createElement('input', { type: 'range', min: 1, max: 4, step: 0.01, value: position.zoom, disabled: busy, 'aria-label': '写真の拡大率', onChange: (e: { target: { value: string } }) => zoom(Number(e.target.value)), style: { flex: 1, minWidth: 0, height: 44, accentColor: C.red } }) : <Text style={T.body}>{Math.round(position.zoom * 100)}%</Text>}
          <Pressable accessibilityRole="button" accessibilityLabel="拡大" disabled={busy} onPress={() => zoom(position.zoom + 0.25)} style={S.btnGhost}><Text style={S.btnGhostText}>＋</Text></Pressable>
        </View>
        {!!error && <Text accessibilityRole="alert" style={S.error}>{error}</Text>}
        <View style={styles.actions}>
          <Pressable accessibilityRole="button" disabled={busy} onPress={onCancel} style={[S.btnGhost, styles.button]}><Text style={S.btnGhostText}>キャンセル</Text></Pressable>
          <Pressable accessibilityRole="button" disabled={busy} onPress={() => onConfirm(cropRect(asset.width, asset.height, frame, current.current))} style={[S.btn, styles.button, { backgroundColor: C.red }]}>{busy ? <ActivityIndicator color={C.white} /> : <Text style={S.btnText}>決定</Text>}</Pressable>
        </View>
      </View>
    </View>
  </Modal>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg, justifyContent: 'center', paddingHorizontal: 16 },
  content: { width: '100%', maxWidth: 480, alignSelf: 'center', gap: 16 },
  stage: { overflow: 'hidden', backgroundColor: C.ink, borderRadius: 22, ...(Platform.OS === 'web' ? { touchAction: 'none' } : {}) },
  zoom: { flexDirection: 'row', gap: 16, alignItems: 'center', justifyContent: 'space-between' },
  actions: { flexDirection: 'row', gap: 12 }, button: { flex: 1 },
});
