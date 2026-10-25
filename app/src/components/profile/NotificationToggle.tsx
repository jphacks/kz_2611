// #87 プロフィールの「通知を受け取る」。許可を求めるのはボタンを押したときだけ
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { C, FONT, PILL, S, T } from '../../ui/theme';
import { errMsg } from '../../lib/util';
import { currentPushSupport, currentSubscription, disablePush, enablePush, fetchPushKey, pushPermission } from '../../lib/webPush';

export function NotificationToggle() {
  const [support] = useState(currentPushSupport);
  const [key, setKey] = useState<string | null | undefined>(undefined);
  const [on, setOn] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [denied, setDenied] = useState(false);
  const lock = useRef(false);
  const active = useRef(true);

  useEffect(() => {
    active.current = true;
    if (support.ok) {
      setDenied(pushPermission() === 'denied');
      currentSubscription().then(sub => { if (active.current) setOn(!!sub && pushPermission() === 'granted'); }).catch(() => { if (active.current) setOn(false); });
      // 鍵は先に取っておく（押した直後に許可を求めるため、押してからは通信しない）
      fetchPushKey().then(k => { if (active.current) setKey(k); }).catch(e => { if (active.current) { setKey(null); setError(errMsg(e)); } });
    }
    return () => { active.current = false; };
  }, [support.ok]);

  function toggle() {
    if (lock.current || !key || on === null) return;
    lock.current = true; setBusy(true); setError('');
    // オンにするときは enablePush を最初に呼ぶ（許可の確認がボタンを押した操作の中で出るように）
    const task = on ? disablePush() : enablePush(key);
    task.then(() => { if (active.current) setOn(!on); })
      .catch(e => { if (active.current) setError(errMsg(e)); })
      .finally(async () => {
        lock.current = false;
        if (!active.current) return;
        setBusy(false); setDenied(pushPermission() === 'denied');
        // 失敗しても実際の状態に合わせる
        try { const sub = await currentSubscription(); if (active.current) setOn(!!sub && pushPermission() === 'granted'); } catch { /* 表示はそのまま */ }
      });
  }

  const ready = support.ok && key && on !== null;
  return (
    <View style={styles.box}>
      <Text style={T.h2}>通知</Text>
      <Pressable accessibilityRole="switch" accessibilityLabel="通知を受け取る" accessibilityState={{ checked: !!on, disabled: !ready || busy }}
        disabled={!ready || busy} onPress={toggle} style={[styles.row, (!ready || busy) && styles.disabled]}>
        <View style={styles.text}>
          <Text style={[T.body, styles.label]}>通知を受け取る</Text>
          <Text style={T.sub}>新しい募集・参加・人数がそろったときに、アプリを閉じていても届きます</Text>
        </View>
        {busy ? <ActivityIndicator color={C.ink} accessibilityLabel="処理中" /> :
          <View style={[styles.pill, on ? styles.pillOn : null]}><Text style={[styles.pillText, on ? styles.pillTextOn : null]}>{on ? 'オン' : 'オフ'}</Text></View>}
      </Pressable>
      {!support.ok && <View style={styles.note}>
        <Text style={T.body}>{support.reason}</Text>
        {!!support.guide && <Text style={T.sub}>{support.guide}</Text>}
      </View>}
      {support.ok && key === null && !error && <Text style={T.sub}>サーバーで通知の準備ができていないため、今は使えません</Text>}
      {support.ok && denied && !on && <Text style={T.sub}>通知がブロックされています。ブラウザやiPhoneの設定でこのアプリの通知を許可してから、もう一度オンにしてください</Text>}
      {!!error && <Text accessibilityRole="alert" style={S.error}>{error}</Text>}
    </View>
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
  note: { gap: 6 },
  disabled: { opacity: 0.45 },
});
