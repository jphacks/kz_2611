// #93 参加の演出の設定（効果音・振動）。端末に保存し、初期値はどちらもオン
import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const CELEBRATE_SOUND_KEY = 'kz2611.celebrate.sound';
export const CELEBRATE_VIBRATE_KEY = 'kz2611.celebrate.vibrate';

/** 保存値は 'on' / 'off'。未保存や読めない値はオン */
export function parseSetting(value: string | null | undefined) {
  return value !== 'off';
}

export function settingValue(on: boolean) {
  return on ? 'on' : 'off';
}

export interface CelebrateSettings {
  sound: boolean;
  vibrate: boolean;
  ready: boolean; // 保存値を読み終えたか
}

export function useCelebrateSettings() {
  const [settings, setSettings] = useState<CelebrateSettings>({ sound: true, vibrate: true, ready: false });
  const active = useRef(true);

  useEffect(() => {
    active.current = true;
    Promise.all([AsyncStorage.getItem(CELEBRATE_SOUND_KEY), AsyncStorage.getItem(CELEBRATE_VIBRATE_KEY)])
      .then(([sound, vibrate]) => {
        if (active.current) setSettings({ sound: parseSetting(sound), vibrate: parseSetting(vibrate), ready: true });
      })
      .catch(() => {
        // 保存を読めなくても初期値（オン）で使える
        if (active.current) setSettings(old => ({ ...old, ready: true }));
      });
    return () => { active.current = false; };
  }, []);

  const setSound = useCallback((on: boolean) => {
    setSettings(old => ({ ...old, sound: on }));
    void AsyncStorage.setItem(CELEBRATE_SOUND_KEY, settingValue(on)).catch(() => { /* 保存できなくても今の画面では反映する */ });
  }, []);

  const setVibrate = useCallback((on: boolean) => {
    setSettings(old => ({ ...old, vibrate: on }));
    void AsyncStorage.setItem(CELEBRATE_VIBRATE_KEY, settingValue(on)).catch(() => { /* 保存できなくても今の画面では反映する */ });
  }, []);

  return { ...settings, setSound, setVibrate };
}
