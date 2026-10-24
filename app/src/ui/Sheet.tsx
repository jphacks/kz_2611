// ★共有: 下から出るシート（チャット・参加者の詳細で使う）
import { Modal, Pressable, View } from 'react-native';
import { C } from './theme';

export function Sheet({ visible, onClose, height = '88%', children }: { visible: boolean; onClose: () => void; height?: `${number}%` | number; children: React.ReactNode }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(10,10,10,0.35)' }} onPress={onClose} accessibilityLabel="閉じる" />
        <View style={{ height, backgroundColor: C.bg, borderTopWidth: 2, borderTopColor: C.ink }}>
          <View style={{ alignSelf: 'center', width: 36, height: 4, backgroundColor: C.ink, marginTop: 8 }} />
          {children}
        </View>
      </View>
    </Modal>
  );
}
