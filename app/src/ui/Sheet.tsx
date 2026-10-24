// ★共有: 下から出るシート（チャット・参加者の詳細で使う）。上の角だけ丸い
import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, RADIUS } from './theme';

export function Sheet({ visible, onClose, height = '92%', children }: { visible: boolean; onClose: () => void; height?: `${number}%` | number; children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'center' }}>
        <Pressable style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.25)' }} onPress={onClose} accessibilityLabel="閉じる" />
        <View style={{ height, width: '100%', maxWidth: 480, backgroundColor: C.bg, borderTopLeftRadius: RADIUS + 6, borderTopRightRadius: RADIUS + 6, paddingBottom: insets.bottom, overflow: 'hidden' }}>
          <View style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: '#D8D8D8', marginTop: 8 }} />
          {children}
        </View>
      </View>
    </Modal>
  );
}
