export const ONBOARDED_KEY = 'kz2611.onboarded';

/** 保存済みの端末・ログイン中は初回案内を挟まない。 */
export function shouldShowOnboarding(loggedIn: boolean, saved: string | null): boolean {
  return !loggedIn && saved === null;
}

/**
 * 案内の中で参加の演出を鳴らしてよいか。
 * 自動デモで勝手に鳴らさないよう、最初のタップ・スワイプより前は音を出さない
 * （ブラウザの自動再生の制限にも合う）。設定（settings.ts）がオフなら鳴らさない。
 */
export function celebrationSoundEnabled(setting: boolean, interacted: boolean): boolean {
  return setting && interacted;
}
