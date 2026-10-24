// 「この指とまれ」の指アイコン（線画＋塗り）。プレビュー f5 専用の部品。
import Svg, { Line, Rect } from 'react-native-svg';
import { C } from '../../ui/theme';

export function PointingHand({ size = 100, color = C.white, hatch = 'rgba(0,0,0,0.16)' }: { size?: number; color?: string; hatch?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {/* 立てた人差し指 */}
      <Rect x={41} y={4} width={18} height={54} rx={9} fill={color} />
      {/* 揃えた他の指のつけ根 */}
      <Rect x={40} y={40} width={20} height={26} rx={10} fill={color} />
      {/* こぶし（まるごと一塊） */}
      <Rect x={26} y={48} width={48} height={38} rx={16} fill={color} />
      {/* 親指 */}
      <Rect x={20} y={56} width={18} height={26} rx={9} fill={color} />
      {/* こぶしの節のハッチ（カードの色が透ける線） */}
      <Line x1={34} y1={60} x2={62} y2={60} stroke={hatch} strokeWidth={3.5} strokeLinecap="round" />
      <Line x1={34} y1={68} x2={66} y2={68} stroke={hatch} strokeWidth={3.5} strokeLinecap="round" />
      <Line x1={36} y1={76} x2={62} y2={76} stroke={hatch} strokeWidth={3.5} strokeLinecap="round" />
    </Svg>
  );
}
