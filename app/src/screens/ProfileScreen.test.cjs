// 破損した写真を選んでも切り取り画面へ進まず、プロフィール操作を続けられる。
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { load, mount, text, press, flush, styles } = require('../testing/render.cjs');

test('破損写真を選ぶと日本語エラーを表示して元の写真を維持する', async () => {
  const profile = load(path.join(__dirname, '../components/profile/profile.ts'), {});
  const { ProfileScreen } = load(path.join(__dirname, 'ProfileScreen.tsx'), {
    'react-native': { View: 'View', Text: 'Text', Pressable: 'Pressable', ScrollView: 'ScrollView', TextInput: 'TextInput', ActivityIndicator: 'ActivityIndicator', StyleSheet: { create: s => s }, Platform: { OS: 'web' } },
    'expo-image-picker': { launchImageLibraryAsync: async () => ({ canceled: false, assets: [{ uri: 'blob:broken', width: 0, height: 0 }] }) },
    'expo-image-manipulator': {},
    '../api': {},
    '../ui/Header': { Header: () => null },
    '../ui/Avatar': { Avatar: () => null },
    '../ui/theme': { C: styles, S: styles, T: styles },
    '../lib/util': { errMsg: e => e.message },
    '../components/profile/profile': profile,
    '../components/profile/PhotoCropModal': { PhotoCropModal: () => '写真の範囲を選ぶ' },
    '../components/profile/NotificationToggle': { NotificationToggle: () => null },
    '../components/celebration/CelebrationSettings': { CelebrationSettings: () => null },
  });
  const h = mount(() => ProfileScreen({ me: { id: 1, name: '名前', handle: 'me', avatar: null }, setMe: () => {}, logout: () => {} }));
  press(h.tree, '写真を変更');
  await flush();
  assert.match(text(h.tree), /画像を読み込めませんでした/);
  assert.doesNotMatch(text(h.tree), /写真の範囲を選ぶ/);
  assert.match(text(h.tree), /写真を変更/);
});
