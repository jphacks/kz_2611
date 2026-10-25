// 起動時の通信エラー（#128）。
// トークンは消さずに残してあるので、再試行すれば同じセッションのまま戻れる。
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { S, T } from '../ui/theme';

export function StartupError({ onRetry }: { onRetry: () => void | Promise<void> }) {
  const [busy, setBusy] = useState(false);
  return (
    <View style={[S.screen, { padding: 24, justifyContent: 'center', gap: 12 }]}>
      <Text style={T.date}>このゆびとまれ</Text>
      <Text style={T.screenTitle}>通信できませんでした</Text>
      <Text style={T.sub}>電波の状況を確かめて、もう一度お試しください。ログインしたままにしてあります。</Text>
      <Pressable
        accessibilityRole="button"
        disabled={busy}
        onPress={async () => { setBusy(true); try { await onRetry(); } finally { setBusy(false); } }}
        style={[S.btn, busy && { opacity: 0.5 }]}
      >
        <Text style={S.btnText}>再試行</Text>
      </Pressable>
    </View>
  );
}
