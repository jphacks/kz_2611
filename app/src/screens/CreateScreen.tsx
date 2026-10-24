// 誘う：募集の作成・主催者による編集
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { api, type EventItem, type Group } from '../api';
import type { ScreenProps } from '../Main';
import { validateDraft, type Draft } from '../components/create/form';
import { errMsg } from '../lib/util';
import { Chip } from '../ui/Chip';
import { Header } from '../ui/Header';
import { C, S, T } from '../ui/theme';

const TIMES = ['今すぐ', '30分後', '1時間後'];
const emptyDraft = (): Draft => ({ title: '', place: '', time_text: '今すぐ', capacity: 4, capacity_min: 2, duration_min: 30, group_id: null });

export function CreateScreen(props: ScreenProps) {
  const editId = props.editEventId;
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const saving = useRef(false);
  const generation = useRef(0);
  const [original, setOriginal] = useState<EventItem | null>(null);
  useEffect(() => {
    let active = true;
    generation.current += 1;
    setLoading(true); setLoadError(''); setError(''); setOriginal(null); setDraft(emptyDraft());
    (async () => {
      try {
        const [list, detail] = await Promise.all([
          api<{ groups: Group[] }>('/groups'),
          editId ? api<{ event: EventItem }>(`/events/${editId}`) : Promise.resolve(null),
        ]);
        if (!active) return;
        if (detail && (!detail.event.is_host || detail.event.host.id !== props.me.id)) throw new Error('編集できるのは主催者だけです');
        setGroups(list.groups);
        if (detail) {
          const e = detail.event;
          setOriginal(e);
          setDraft({ title: e.title, place: e.place, time_text: e.time_text, capacity: e.capacity, capacity_min: e.capacity_min || e.capacity, duration_min: e.duration_min, group_id: e.group_id });
        }
      } catch (e) { if (active) setLoadError(errMsg(e)); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; generation.current += 1; };
  }, [editId, props.me.id, attempt]);
  const change = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft(d => ({ ...d, [key]: value }));
  const submit = async () => {
    if (saving.current || loading || loadError) return;
    const invalid = validateDraft(draft);
    if (invalid) { setError(invalid); return; }
    saving.current = true; setBusy(true); setError('');
    const current = generation.current;
    try {
      const body: Partial<Draft> = { ...draft, title: draft.title.trim(), place: draft.place.trim(), time_text: draft.time_text.trim() };
      // 編集で表示時間を変えなければ、締切を計算し直さない。
      if (original && original.duration_min === draft.duration_min) delete body.duration_min;
      await api(editId ? `/events/${editId}` : '/events', { method: editId ? 'PATCH' : 'POST', body });
      if (current !== generation.current) return;
      props.clearNav(); props.go('board');
    } catch (e) { if (current === generation.current) setError(errMsg(e)); }
    finally { saving.current = false; if (current === generation.current) setBusy(false); }
  };
  return (
    <KeyboardAvoidingView style={S.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header title={editId ? '募集を編集' : '誘う'} />
      {loading ? <View style={styles.status}><ActivityIndicator color={C.ink} /><Text style={T.sub}>読み込み中…</Text></View> : loadError ? (
        <View style={[S.pad, styles.status]}>
          <Text accessibilityRole="alert" style={S.error}>{loadError}</Text>
          <Pressable accessibilityRole="button" style={S.btnGhost} onPress={() => setAttempt(n => n + 1)}><Text style={S.btnGhostText}>再読み込み</Text></Pressable>
          {editId && <Pressable accessibilityRole="button" onPress={() => { props.clearNav(); props.go('board'); }}><Text style={T.body}>編集をやめる</Text></Pressable>}
        </View>
      ) : (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.form}>
          <View style={styles.section}>
            <Text style={T.h2}>やること</Text>
            <TextInput accessibilityLabel="やること" editable={!busy} style={[S.input, styles.titleInput]} placeholder="何して遊ぶ？（20文字以内）" maxLength={20} value={draft.title} onChangeText={v => change('title', v)} />
          </View>
          <View style={styles.section}>
            <Text style={T.h2}>場所<Text style={T.sub}>　任意</Text></Text>
            <TextInput accessibilityLabel="場所" editable={!busy} style={S.input} placeholder="駅前、いつものお店など" maxLength={30} value={draft.place} onChangeText={v => change('place', v)} />
          </View>
          <View style={styles.section}>
            <Text style={T.h2}>時間<Text style={T.sub}>　任意</Text></Text>
            <View style={styles.chips}>{TIMES.map(time => <Chip key={time} label={time} on={draft.time_text === time} onPress={() => !busy && change('time_text', time)} />)}</View>
            <TextInput accessibilityLabel="時間" editable={!busy} style={S.input} placeholder="自由に入力（20文字以内）" maxLength={20} value={draft.time_text} onChangeText={v => change('time_text', v)} />
          </View>
          <View style={styles.section}>
            <Text style={T.h2}>人数<Text style={T.sub}>　あなたを含めて</Text></Text>
            <Text accessibilityLiveRegion="polite" style={T.h2}>{draft.capacity_min}〜{draft.capacity}人</Text>
            {(['capacity_min', 'capacity'] as const).map(key => {
              const lower = key === 'capacity_min';
              const min = lower ? 2 : draft.capacity_min;
              const max = lower ? draft.capacity : 20;
              const label = lower ? '下限' : '上限';
              return <View key={key} style={styles.counter}>
                <Text style={T.body}>{label}</Text>
                <Pressable accessibilityRole="button" accessibilityLabel={`${label}を減らす`} disabled={busy || draft[key] <= min} style={[styles.step, draft[key] <= min && styles.disabled]} onPress={() => change(key, Math.max(min, draft[key] - 1))}><Text style={T.h1}>−</Text></Pressable>
                <Text style={T.h1}>{draft[key]}人</Text>
                <Pressable accessibilityRole="button" accessibilityLabel={`${label}を増やす`} disabled={busy || draft[key] >= max} style={[styles.step, draft[key] >= max && styles.disabled]} onPress={() => change(key, Math.min(max, draft[key] + 1))}><Text style={T.h1}>＋</Text></Pressable>
              </View>;
            })}
            <Text style={T.small}>2〜20人</Text>
          </View>
          <View style={styles.section}>
            <Text style={T.h2}>表示時間</Text>
            <View style={styles.chips}>{[15, 30, 60, 120].map(minutes => <Chip key={minutes} label={`${minutes}分`} on={draft.duration_min === minutes} onPress={() => !busy && change('duration_min', minutes)} />)}</View>
            <Text style={T.sub}>{editId ? '変更すると、作成した時刻からの表示時間になります。' : '公開してから、掲示板に表示する時間です。'}</Text>
          </View>
          <View style={styles.section}>
            <Text style={T.h2}>公開先</Text>
            <View style={styles.chips}>
              <Chip label="全体" on={draft.group_id === null} onPress={() => !busy && change('group_id', null)} />
              {groups.map(group => <Chip key={group.id} label={group.name} on={draft.group_id === group.id} onPress={() => !busy && change('group_id', group.id)} />)}
            </View>
            <Text style={T.sub}>{draft.group_id === null ? 'あなたの友達全員に表示されます。' : '選んだグループのメンバーに表示されます。'}</Text>
          </View>
          {!!error && <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={S.error}>{error}</Text>}
          <Pressable accessibilityRole="button" disabled={busy} accessibilityState={{ disabled: busy, busy }} style={[S.btnRed, busy && styles.disabled]} onPress={submit}><Text style={S.btnText}>{busy ? '保存中…' : editId ? '変更を保存する' : '公開する'}</Text></Pressable>
          {editId && <Pressable accessibilityRole="button" disabled={busy} style={S.btnGhost} onPress={() => { props.clearNav(); props.go('board'); }}><Text style={S.btnGhostText}>編集をやめる</Text></Pressable>}
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  form: { paddingHorizontal: 16, paddingBottom: 32, gap: 24 },
  section: { gap: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  titleInput: { fontSize: 22, fontWeight: '800' },
  counter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.surface, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 8 },
  step: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: C.white },
  disabled: { opacity: 0.35 },
  status: { paddingVertical: 32, gap: 16 },
});
