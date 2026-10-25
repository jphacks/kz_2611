export const ONBOARDED_KEY = 'kz2611.onboarded';

/** 保存済みの端末・ログイン中は初回案内を挟まない。 */
export function shouldShowOnboarding(loggedIn: boolean, saved: string | null): boolean {
  return !loggedIn && saved === null;
}
