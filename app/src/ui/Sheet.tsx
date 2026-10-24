// ★共有: 下から出るシート（チャット・参加者の詳細で使う）。上の角だけ丸い
import { useEffect, useMemo, useRef } from 'react';
import { Animated, Modal, PanResponder, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, RADIUS } from './theme';

export function Sheet({ visible, onClose, height = '92%', children }: { visible: boolean; onClose: () => void; height?: `${number}%` | number; children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(0)).current;
  const top = useRef(0);
  const fromHeader = useRef(false);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    translateY.stopAnimation();
    translateY.setValue(0);
    fromHeader.current = false;
    return () => translateY.stopAnimation();
  }, [visible, translateY]);
  const pan = useMemo(() => {
    const restore = () => Animated.spring(translateY, { toValue: 0, useNativeDriver: true, overshootClamping: true }).start();
    return PanResponder.create({
      // タップは子へ渡し、上部から始まった下向きドラッグだけを途中で受け取る。
      onStartShouldSetPanResponderCapture: e => {
        const y = e.nativeEvent.pageY - top.current;
        fromHeader.current = y >= 0 && y <= 70;
        return false;
      },
      onMoveShouldSetPanResponderCapture: (_, g) => fromHeader.current && g.numberActiveTouches === 1 && g.dy > 8 && g.dy > Math.abs(g.dx),
      onPanResponderGrant: () => translateY.stopAnimation(),
      onPanResponderMove: (_, g) => translateY.setValue(Math.max(0, g.dy)),
      onPanResponderRelease: (_, g) => {
        if (g.dy >= 120 || (g.dy > 30 && g.vy > 0.8)) close.current();
        else restore();
      },
      onPanResponderTerminate: restore,
      onPanResponderTerminationRequest: () => false,
    });
  }, [translateY]);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'center' }}>
        <Pressable style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.25)' }} onPress={onClose} accessibilityLabel="閉じる" />
        <Animated.View {...pan.panHandlers} onLayout={e => { top.current = e.nativeEvent.layout.y; }} style={{ transform: [{ translateY }], height, width: '100%', maxWidth: 480, backgroundColor: C.bg, borderTopLeftRadius: RADIUS + 6, borderTopRightRadius: RADIUS + 6, paddingBottom: insets.bottom, overflow: 'hidden' }}>
          <View accessibilityLabel="下に引くと閉じる" style={{ alignSelf: 'center', width: 56, height: 6, borderRadius: 3, backgroundColor: C.muted, marginTop: 8, marginBottom: 2 }} />
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}
