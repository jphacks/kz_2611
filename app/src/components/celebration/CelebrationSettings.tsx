// #93 プロフィールの「参加したときの効果音」「参加したときの振動」
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { C, FONT, PILL, T } from '../../ui/theme';
import { useCelebrateSettings } from './settings';

export function CelebrationSettings() {
  const { sound, vibrate, setSound, setVibrate } = useCelebrateSettings();

  return (
    <View style={styles.box}>
      <Text style={T.h2}>参加したときの演出</Text>
      <Toggle
        label="効果音"
        description="参加が成立した瞬間にファンファーレを鳴らします"
        on={sound}
        onChange={setSound}
      />
      <Toggle
        label="振動"
        description="掲示板で指を離して参加を確定したときに短く振動します（通信失敗でも最初の振動は鳴ります）。Androidは対応ブラウザと端末設定によります。iPhoneはiOS 18以降の実験的な対応です（新しいSafariでは制限され、振動しない場合があります）。"
        on={vibrate}
        onChange={setVibrate}
      />
    </View>
  );
}

function Toggle({ label, description, on, onChange }: { label: string; description: string; on: boolean; onChange: (on: boolean) => void }) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={`参加したときの${label}`}
      accessibilityState={{ checked: on }}
      onPress={() => onChange(!on)}
      style={styles.row}
    >
      <View style={styles.text}>
        <Text style={[T.body, styles.label]}>参加したときの{label}</Text>
        <Text style={T.sub}>{description}</Text>
      </View>
      <View style={[styles.pill, on && styles.pillOn]}>
        <Text style={[styles.pillText, on && styles.pillTextOn]}>{on ? 'オン' : 'オフ'}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: { borderTopWidth: 1, borderTopColor: C.line, paddingTop: 16, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, backgroundColor: C.surface, borderRadius: 22, paddingHorizontal: 18, paddingVertical: 12 },
  text: { flex: 1, gap: 4 },
  label: { fontWeight: '800' },
  pill: { minWidth: 56, minHeight: 32, borderRadius: PILL, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  pillOn: { backgroundColor: C.ink },
  pillText: { fontFamily: FONT, fontSize: 13, fontWeight: '800', color: C.muted },
  pillTextOn: { color: C.white },
});
