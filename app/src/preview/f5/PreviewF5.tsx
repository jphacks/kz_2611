import React, { useRef, useState } from 'react';
import Svg, { Path } from 'react-native-svg';

const blue = '#3D5AFE', orange = '#FF5A36';
function Finger({ color, angle = 0, small = false }: { color: string; angle?: number; small?: boolean }) {
  return <div style={{ width: small ? 37 : 102, height: small ? 39 : 113, transform: `rotate(${angle}deg)`, transition: 'transform .35s' }}><Svg width="100%" height="100%" viewBox="0 0 110 125">
    <Path d="M33 59 C13 65 12 84 17 102 C22 119 38 124 57 121 C78 118 91 100 87 82 C85 69 72 60 61 60 Z" fill={small ? color : 'white'} />
    <Path d="M44 68 L44 16 C44 1 66 1 66 16 L66 68 C66 83 44 83 44 68Z" fill={small ? color : 'white'} stroke={small ? 'white' : color} strokeWidth="4" />
    <Path d="M22 83 L51 83 C65 83 65 102 51 102 L22 102 C9 102 9 83 22 83Z" fill={small ? color : 'white'} stroke={small ? 'white' : color} strokeWidth="4" />
    {!small && <Path d="M68 80 L88 80 M67 97 L87 97" stroke={color} strokeWidth="4" strokeLinecap="round" />}
  </Svg></div>;
}
const card: React.CSSProperties = { position: 'relative', width: '100%', aspectRatio: '658 / 395', borderRadius: 26, borderTop: '6px solid #111', color: 'white', overflow: 'hidden', boxSizing: 'border-box' };
const badge: React.CSSProperties = { position: 'absolute', right: 16, bottom: 12, background: '#111', borderRadius: 30, padding: '4px 11px', fontSize: 12, fontWeight: 900 };
function Navi() {
  const [stage, setStage] = useState(0);
  const [turn, setTurn] = useState(0);
  const start = useRef(0);
  return <><div style={{ ...card, background: blue }}>
    <div style={{ position: 'absolute', left: '6.5%', top: '11%', fontSize: 30, fontWeight: 900 }}>集合</div>
    <div style={{ position: 'absolute', left: '6.5%', top: '31%', fontSize: 12, fontWeight: 700 }}>18:30 · 駅前 時計台</div>
    <div style={{ position: 'absolute', left: '6%', top: '66%', display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 900 }}><span style={{ background: 'white', color: blue, borderRadius: '50%', width: 28, height: 28, display: 'grid', placeItems: 'center', fontSize: 17 }}>あ</span>{stage === 0 ? '集合場所の方向を指す' : stage === 1 ? 'あおいはすぐそこ' : 'とまれ！'}</div>
    <div aria-label="方角をドラッグ" onPointerDown={e => { start.current = e.clientX; e.currentTarget.setPointerCapture(e.pointerId); }} onPointerMove={e => { if (e.buttons) setTurn((e.clientX - start.current) * 1.2); }} onPointerUp={() => setTurn(0)} style={{ position: 'absolute', right: '4%', top: '8%', width: '44.5%', height: '82%', borderRadius: 20, background: 'rgba(255,255,255,.13)', display: 'flex', alignItems: 'center', justifyContent: 'center', touchAction: 'pan-y', cursor: 'grab' }}><Finger color={blue} angle={(stage === 0 ? -35 : stage === 1 ? 20 : 0) + turn} /><span style={{ position: 'absolute', bottom: 12, fontSize: 11, fontWeight: 900 }}>{stage === 0 ? '南西 1.2km' : stage === 1 ? '北東 120m' : '到着 0m'}</span></div>
    <span style={badge}>{stage === 0 ? 'あと24分' : stage === 1 ? 'あと3分' : '到着！'}</span>
  </div><div style={controls}>{['参加前', '参加後', '到着'].map((label, i) => <button key={label} onClick={() => { setStage(i); setTurn(0); }} style={button(stage === i)}>{label}</button>)}</div><p style={note}>集合までの距離を切替。指を左右にドラッグして方角を体験できます（位置・方位は疑似）。</p></>;
}
function Slider() {
  const [joined, setJoined] = useState(false);
  const [offset, setOffset] = useState<number | null>(null);
  const start = useRef({ x: 0, at: 0 });
  const lane = useRef<HTMLDivElement>(null);
  // PDF: the knob starts slightly inset and finishes before the rounded end cap.
  const travel = () => (lane.current?.clientWidth ?? 318) - 94;
  const position = offset ?? (joined ? travel() : 0);
  return <><div style={{ ...card, background: orange }}>
    <div style={{ position: 'absolute', left: '6.5%', top: '10%', fontSize: 27, fontWeight: 900 }}>カラオケ</div>
    <div style={{ position: 'absolute', left: '6.5%', top: '30%', fontSize: 12, fontWeight: 700 }}>今日 18:30 · 駅前 · 主催 あおい</div>
    <div ref={lane} style={{ position: 'absolute', left: '5.5%', right: '5.5%', top: '49%', height: '27%', borderRadius: 40, background: 'rgba(0,0,0,.18)' }}>
      <div aria-live="polite" style={{ position: 'absolute', left: joined ? '19%' : '40%', top: '31%', fontSize: 15, fontWeight: 900, letterSpacing: 2 }}>{joined ? 'とまった！' : 'とまれ › › ›'}</div>
      <div role="slider" aria-label="参加スライダー" aria-valuemin={0} aria-valuemax={1} aria-valuenow={joined ? 1 : 0} tabIndex={0} onKeyDown={e => { if (e.key === 'ArrowRight') setJoined(true); if (e.key === 'ArrowLeft') setJoined(false); }}
        onPointerDown={e => { start.current = { x: e.clientX, at: joined ? travel() : 0 }; setOffset(start.current.at); e.currentTarget.setPointerCapture(e.pointerId); }}
        onPointerMove={e => { if (e.buttons) setOffset(Math.max(0, Math.min(travel(), start.current.at + e.clientX - start.current.x))); }}
        onPointerUp={e => { const x = Math.max(0, Math.min(travel(), start.current.at + e.clientX - start.current.x)); setJoined(x > travel() / 2); setOffset(null); }} onPointerCancel={() => setOffset(null)}
        style={{ position: 'absolute', left: 14 + position, top: '9%', height: '82%', aspectRatio: '1', background: 'white', borderRadius: '50%', display: 'grid', placeItems: 'center', touchAction: 'pan-y', cursor: 'grab', transition: offset === null ? 'left .25s' : undefined }}><Finger color={orange} small /></div>
    </div><span style={badge}>あと24分</span>
  </div><p style={note}>指を右へ半分以上スライドして参加。左へ戻すと取り消し。キーボードの左右キーでも操作できます。</p></>;
}
const controls: React.CSSProperties = { display: 'flex', gap: 8, marginTop: 12 };
const button = (active: boolean): React.CSSProperties => ({ border: 0, borderRadius: 20, padding: '8px 16px', background: active ? '#111' : '#eeece9', color: active ? 'white' : '#555', fontWeight: 700, cursor: 'pointer' });
const note: React.CSSProperties = { color: '#777', fontSize: 11, lineHeight: 1.8, margin: '10px 0 0' };
export function PreviewF5() {
  return <div style={{ height: '100dvh', overflowY: 'auto', background: 'white', color: '#111', fontFamily: '"Noto Sans JP", sans-serif' }}><main style={{ width: 390, maxWidth: '100%', padding: '24px 16px 48px', boxSizing: 'border-box', margin: 'auto' }}><div style={{ fontSize: 10, color: '#999', letterSpacing: 1 }}>この指とまれ — DESIGN IDEAS</div><section style={{ marginTop: 25 }}><h1 style={{ fontSize: 22, margin: '0 0 7px', fontWeight: 900 }}><span style={{ fontSize: 36, marginRight: 10 }}>13</span>指さしナビ</h1><p style={{ fontSize: 12, margin: '0 0 16px' }}>集合直前は、指が行き先を指さす。</p><Navi /></section><section style={{ marginTop: 28 }}><h1 style={{ fontSize: 22, margin: '0 0 7px', fontWeight: 900 }}><span style={{ fontSize: 36, marginRight: 10 }}>14</span>とまれスライダー</h1><p style={{ fontSize: 12, margin: '0 0 16px' }}>案Bのスライドを、指アイコン＋言葉で。</p><Slider /></section></main></div>;
}
