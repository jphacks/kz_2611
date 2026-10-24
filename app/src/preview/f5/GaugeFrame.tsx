// カードの外枠＝残り時間の黒いゲージ（EventCard と同じ見た目の簡易版）。
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { C, RADIUS } from '../../ui/theme';

export function Gauge({ fraction, soon = false }: { fraction: number; soon?: boolean }) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const sw = 6;
  const r = RADIUS - 2;
  const w = Math.max(0, size.width - sw), h = Math.max(0, size.height - sw);
  const perimeter = Math.max(0, 2 * (w + h) - 8 * r + 2 * Math.PI * r);
  // 上辺の中央から時計回りに減っていく残り時間のゲージ
  const gauge = w > 2 * r && h > 2 * r ? `M ${sw / 2 + w / 2} ${sw / 2} H ${sw / 2 + w - r} A ${r} ${r} 0 0 1 ${sw / 2 + w} ${sw / 2 + r} V ${sw / 2 + h - r} A ${r} ${r} 0 0 1 ${sw / 2 + w - r} ${sw / 2 + h} H ${sw / 2 + r} A ${r} ${r} 0 0 1 ${sw / 2} ${sw / 2 + h - r} V ${sw / 2 + r} A ${r} ${r} 0 0 1 ${sw / 2 + r} ${sw / 2} Z` : '';
  return (
    <View
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      onLayout={e => { const l = e.nativeEvent.layout; if (l.width && l.height && (l.width !== size.width || l.height !== size.height)) setSize({ width: l.width, height: l.height }); }}
    >
      <Svg width="100%" height="100%">
        <Rect x={sw / 2} y={sw / 2} width={w} height={h} rx={r} ry={r} fill="none" stroke="rgba(0,0,0,0.10)" strokeWidth={sw} />
        {!!gauge && <Path d={gauge} fill="none" stroke={soon ? C.yellow : C.ink} strokeWidth={sw} strokeLinecap="round" strokeDasharray={`${perimeter * Math.min(1, Math.max(0, fraction))} ${perimeter}`} strokeDashoffset={-perimeter * (1 - Math.min(1, Math.max(0, fraction)))} />}
      </Svg>
    </View>
  );
}
