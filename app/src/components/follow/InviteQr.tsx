import { useMemo } from 'react';
import Svg, { Path, Rect } from 'react-native-svg';
import qrcode from 'qrcode-generator';
import { C } from '../../ui/theme';

// 4セルの余白を含むQR。画像生成やWeb専用APIを使わない。
export function InviteQr({ value }: { value: string }) {
  const { size, path } = useMemo(() => {
    const qr = qrcode(0, 'M');
    qr.addData(value); qr.make();
    const count = qr.getModuleCount();
    let path = '';
    for (let y = 0; y < count; y++) for (let x = 0; x < count; x++) {
      if (qr.isDark(y, x)) path += `M${x + 4} ${y + 4}h1v1h-1z`;
    }
    return { size: count + 8, path };
  }, [value]);
  return <Svg width={216} height={216} viewBox={`0 0 ${size} ${size}`} accessibilityLabel="友達追加の招待QRコード" accessibilityRole="image">
    <Rect width={size} height={size} fill={C.white} /><Path d={path} fill={C.ink} />
  </Svg>;
}
