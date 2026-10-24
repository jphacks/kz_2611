// ★共有: API の呼び出しと共通型。型の追加は末尾へ。契約は docs/api.md
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const API_BASE = Platform.OS === 'web' ? '' : 'https://kz2611.pages.dev';
const KEY = 'kz2611.token';
let token: string | null = null;
export async function loadToken() { token = await AsyncStorage.getItem(KEY); return token; }
export async function setToken(t: string | null) { token = t; if (t) await AsyncStorage.setItem(KEY, t); else await AsyncStorage.removeItem(KEY); }

export class ApiError extends Error { constructor(public status: number, message: string) { super(message) } }
export async function api<T = any>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(API_BASE + '/api' + path, {
    method: opts.method || (opts.body ? 'POST' : 'GET'),
    headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error || '通信に失敗しました');
  return data as T;
}

export interface User { id: number; handle: string; name: string; avatar: string | null }
export interface Me extends User { invite_code: string }
export interface Group { id: number; name: string; profile: string; owner_id: number; members: User[] }
export interface EventItem {
  id: number; title: string; place: string; time_text: string;
  capacity: number;              // 人数の上限（主催者を含む）
  capacity_min: number;          // 人数の下限（主催者を含む）。0 なら下限なし（capacity だけの表示）
  duration_min: number; expires_at: number; created_at: number;
  group_id: number | null; group_name: string | null;
  host: User; members: User[];   // members は主催者を除く参加者
  count: number;                 // 主催者を含む人数
  joined: boolean; is_host: boolean;
}
export interface Message { id: number; event_id: number; user: User | null; kind: 'text' | 'system'; body: string; created_at: number }
export interface Talk { event: EventItem; last: Message | null; active: boolean }
