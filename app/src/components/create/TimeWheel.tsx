import { useEffect, useRef, type ComponentRef } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { C, T } from '../../ui/theme';
import type { WheelTime } from './time';

const ROW = 48;
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

type ColumnProps = { label: string; values: number[]; value: number; disabled: boolean; onChange: (value: number) => void };
function WheelColumn({ label, values, value, disabled, onChange }: ColumnProps) {
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const offset = useRef(values.indexOf(value) * ROW);
  const callback = useRef(onChange);
  callback.current = onChange;
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const indexAt = (y: number) => Math.max(0, Math.min(values.length - 1, Math.round(y / ROW)));
  const select = (index: number) => {
    if (disabled) return;
    offset.current = index * ROW;
    callback.current(values[index]);
    scroll.current?.scrollTo({ y: offset.current, animated: false });
  };
  const settle = () => select(indexAt(offset.current));
  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    offset.current = event.nativeEvent.contentOffset.y;
    if (!disabled) callback.current(values[indexAt(offset.current)]);
    // Webではマウスホイールの終了にもスナップする。ネイティブは標準のスナップを使う。
    if (Platform.OS === 'web') {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(settle, 160);
    }
  };
  return <View style={styles.column}>
    <Text style={[T.small, styles.unit]}>{label}</Text>
    <View style={styles.viewport}>
      <View pointerEvents="none" style={styles.highlight} />
      <ScrollView ref={scroll} accessibilityLabel={`${label}のホイール`} scrollEnabled={!disabled}
        nestedScrollEnabled showsVerticalScrollIndicator={false} snapToInterval={ROW} decelerationRate="fast"
        contentContainerStyle={styles.items} style={styles.scroll} scrollEventThrottle={16}
        onLayout={() => scroll.current?.scrollTo({ y: offset.current, animated: false })}
        onScroll={onScroll} onMomentumScrollEnd={settle}>
        {values.map((number, index) => <Pressable key={number} accessibilityRole="button"
          accessibilityLabel={`${String(number).padStart(2, '0')}${label}`}
          accessibilityState={{ selected: number === value, disabled }} disabled={disabled}
          onPress={() => select(index)} style={styles.row}>
          <Text style={[T.h1, number === value ? styles.selected : styles.faded]}>{String(number).padStart(2, '0')}</Text>
        </Pressable>)}
      </ScrollView>
    </View>
  </View>;
}

export function TimeWheel({ value, onChange, disabled = false }: { value: WheelTime; onChange: (value: WheelTime) => void; disabled?: boolean }) {
  // 旧データの端数分は初期値として残し、新しい選択肢は5分単位だけにする。
  const initialMinute = useRef(value.minute);
  const minutes = useRef(initialMinute.current % 5 === 0 ? MINUTES : [...MINUTES, initialMinute.current].sort((a, b) => a - b)).current;
  return <View style={[styles.wheel, disabled && styles.disabled]}>
    <WheelColumn label="時" values={HOURS} value={value.hour} disabled={disabled} onChange={hour => onChange({ ...value, hour })} />
    <Text style={[T.h1, styles.colon]}>:</Text>
    <WheelColumn label="分" values={minutes} value={value.minute} disabled={disabled} onChange={minute => onChange({ ...value, minute })} />
  </View>;
}
const styles = StyleSheet.create({
  wheel: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: C.surface, borderRadius: 22, padding: 12, gap: 12 },
  column: { width: 100 },
  unit: { textAlign: 'center', marginBottom: 8 },
  viewport: { height: ROW * 3, overflow: 'hidden', borderRadius: 22 },
  scroll: { height: ROW * 3 },
  items: { paddingVertical: ROW },
  highlight: { position: 'absolute', top: ROW, left: 0, right: 0, height: ROW, borderRadius: 24, backgroundColor: C.red },
  row: { height: ROW, alignItems: 'center', justifyContent: 'center' },
  selected: { color: C.white },
  faded: { color: C.ink, opacity: 0.28 },
  colon: { marginTop: 22, color: C.red },
  disabled: { opacity: 0.35 },
});
