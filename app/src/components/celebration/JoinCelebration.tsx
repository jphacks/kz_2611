// #93 / #98 参加が成立した瞬間に全画面で流す演出。
// Web は Canvas 1枚 + CSS transform（JoinCelebrationWeb）、アプリは今までの Animated（JoinCelebrationNative）。
import { Platform } from 'react-native';
import { JoinCelebrationNative } from './JoinCelebrationNative';
import { JoinCelebrationWeb } from './JoinCelebrationWeb';

export interface JoinCelebrationProps {
  visible: boolean;
  onDone: () => void;
  sound: boolean;
  vibrate: boolean;
}

export function JoinCelebration(props: JoinCelebrationProps) {
  return Platform.OS === 'web' ? <JoinCelebrationWeb {...props} /> : <JoinCelebrationNative {...props} />;
}
