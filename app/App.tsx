import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Main } from './src/Main';

if (Platform.OS === 'web' && typeof document !== 'undefined' && !document.getElementById('fonts')) {
  const l = document.createElement('link');
  l.id = 'fonts'; l.rel = 'stylesheet';
  l.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&family=Noto+Sans+JP:wght@400;700;900&display=swap';
  document.head.appendChild(l);
  // スマホ: ノッチ領域まで使う・テーマ色
  const vp = document.querySelector('meta[name="viewport"]');
  if (vp) vp.setAttribute('content', 'width=device-width, initial-scale=1, viewport-fit=cover');
  const tc = document.createElement('meta'); tc.name = 'theme-color'; tc.content = '#FFFFFF'; document.head.appendChild(tc);
  // #87 ホーム画面に追加して通知を受け取るための manifest と鳥のアイコン（iPhone は apple-touch-icon）。favicon は Expo が入れたものを差し替える
  document.querySelectorAll('link[rel~="icon"]').forEach(old => old.remove());
  for (const [rel, href] of [['manifest', '/manifest.webmanifest'], ['apple-touch-icon', '/icons/apple-touch-icon.png'], ['icon', '/icons/favicon.png']]) {
    const link = document.createElement('link'); link.rel = rel; link.href = href; document.head.appendChild(link);
  }
  const title = document.createElement('meta'); title.name = 'apple-mobile-web-app-title'; title.content = 'このゆびとまれ'; document.head.appendChild(title);
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Main />
    </SafeAreaProvider>
  );
}
