import { api, type Group, type User } from '../api';

type Snapshot = { friends: User[]; groups: Group[]; loading: boolean; error: string };
function createStore() {
  let state: Snapshot = { friends: [], groups: [], loading: true, error: '' };
  let generation = 0;
  let pending: Promise<void> | undefined;
  const listeners = new Set<() => void>();
  const publish = (value: Snapshot) => { state = value; listeners.forEach(fn => fn()); };
  return {
    getSnapshot: () => state,
    subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; },
    // 変更後は取得世代を進め、変更前の応答で巻き戻さない。
    refresh(force = false): Promise<void> {
      if (pending && !force) return pending;
      const current = ++generation;
      const task = Promise.allSettled([
        api<{ friends: User[] }>('/friends'), api<{ groups: Group[] }>('/groups'),
      ]).then(([friends, groups]) => {
        if (current !== generation) return;
        const failed = friends.status === 'rejected' ? friends : groups.status === 'rejected' ? groups : null;
        publish({
          friends: friends.status === 'fulfilled' ? friends.value.friends : state.friends,
          groups: groups.status === 'fulfilled' ? groups.value.groups : state.groups,
          loading: false,
          error: failed ? failed.reason instanceof Error ? failed.reason.message : '問題が起きました' : '',
        });
      }).finally(() => { if (current === generation) pending = undefined; });
      pending = task;
      return task;
    },
  };
}
// 認証ユーザーを跨いでキャッシュを見せない。
let owner: number | undefined;
let store: ReturnType<typeof createStore>;
export function socialStore(userId: number) {
  if (owner !== userId) { owner = userId; store = createStore(); }
  return store;
}
