// イベント内チャット（下から出るシート）（担当 Issue で実装する）
import type { EventItem, Me } from '../api';

export interface ChatSheetProps {
  eventId: number | null;     // null なら閉じている
  me: Me;
  onClose: () => void;
  onChanged: (e: EventItem | null) => void; // 参加・取り消し・削除のあと一覧を更新する（削除なら null）
  onEdit: (eventId: number) => void;        // 主催者の「編集」
}
export function ChatSheet(_p: ChatSheetProps) { return null; }
