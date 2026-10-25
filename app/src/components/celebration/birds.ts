// #98 鳥の画像を参加の瞬間より前に読み込んでおく（読み込み待ちで演出が止まらないように）
import { Image, Platform, type ImageSourcePropType } from 'react-native';

export const BIRD_SOURCES: ImageSourcePropType[] = [
  require('./bird_black.png'),
  require('./bird_orange.png'),
  require('./bird_blue.png'),
  require('./bird_pink.png'),
  require('./bird_white.png'),
];

const webImages: HTMLImageElement[] = [];
let preloaded = false;

function assetUri(source: ImageSourcePropType) {
  try {
    return Image.resolveAssetSource(source)?.uri;
  } catch {
    return undefined;
  }
}

interface WebAsset {
  httpServerLocation: string;
  name: string;
  type: string;
}

/**
 * Web の Image には静的メソッド resolveAssetSource が無いので、
 * プレビュー X5 と同じく AssetRegistry から実際の URL を作る。
 */
function webAssetUri(source: ImageSourcePropType) {
  if (typeof source === 'object' && source && 'uri' in source && source.uri) return source.uri;
  if (typeof source !== 'number') return undefined;
  try {
    const registry = require('react-native-web/dist/modules/AssetRegistry') as {
      getAssetByID: (id: number) => WebAsset | undefined;
    };
    const asset = registry.getAssetByID(source);
    if (!asset) return undefined;
    return `${asset.httpServerLocation}/${asset.name}.${asset.type}`;
  } catch {
    return undefined;
  }
}

/**
 * 掲示板を開いたとき（= 参加する前）に呼ぶ。
 * Web は Image を作って decode()、アプリは Image.prefetch で先に用意する。
 */
export function preloadBirdImages() {
  if (preloaded) return;
  preloaded = true;

  if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.Image === 'function') {
    BIRD_SOURCES.forEach(source => {
      const uri = webAssetUri(source);
      if (!uri) return;
      const image = new window.Image();
      image.decoding = 'async';
      image.src = uri;
      // decode できない環境でも src の読み込みは進む
      if (typeof image.decode === 'function') void image.decode().catch(() => { /* 描画時に complete を見る */ });
      webImages.push(image);
    });
    return;
  }

  BIRD_SOURCES.forEach(source => {
    const uri = assetUri(source);
    if (uri) void Image.prefetch(uri).catch(() => { /* 読めなくても粒は丸で描く */ });
  });
}

/** Canvas の drawImage に使う。まだ読めていなければ complete が false のまま */
export function birdWebImages() {
  return webImages;
}
