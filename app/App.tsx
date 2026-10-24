import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Main } from './src/Main';
import { PreviewF4, isPreviewF4 } from './src/preview/f4/PreviewF4';

if (Platform.OS === 'web' && typeof document !== 'undefined' && !document.getElementById('fonts')) {
  const l = document.createElement('link');
  l.id = 'fonts'; l.rel = 'stylesheet';
  l.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&family=Noto+Sans+JP:wght@400;700;900&display=swap';
  document.head.appendChild(l);
  // スマホ: ノッチ領域まで使う・テーマ色
  const vp = document.querySelector('meta[name="viewport"]');
  if (vp) vp.setAttribute('content', 'width=device-width, initial-scale=1, viewport-fit=cover');
  const tc = document.createElement('meta'); tc.name = 'theme-color'; tc.content = '#FFFFFF'; document.head.appendChild(tc);
}

export default function App() {
  // Web のみ: ?preview=f4 はデザイン案の触れるプレビュー（f4）をログインなしで出す
  if (isPreviewF4()) return <PreviewF4 />;
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Main />
    </SafeAreaProvider>
  );
}
