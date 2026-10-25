import { useEffect, useRef } from 'react';

// Visual clock and haptics share the same millisecond timeline.
export const TIMELINE = {
 duration: 2800,
 hit: 38,
 explosion: 112,
 wave2: 196,
 wave3: 280,
 impact: [38],
 barrage: [18, 12, 12, 12, 16],
 wave: [14, 24, 9],
 cancel: [12],
} as const;
export const vibrationSupported = () => typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
export function useHaptics(enabled: boolean) {
 const enabledRef=useRef(enabled); enabledRef.current=enabled;
 const timers=useRef<ReturnType<typeof setTimeout>[]>([]);
 const last=useRef({at:0,progress:0});
 const reduced=()=>typeof window!=='undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const pulse=(pattern:readonly number[])=>{
  if(!enabledRef.current || !vibrationSupported())return;
  try { navigator.vibrate(pattern.map((v,i)=>i%2?v:Math.max(1,Math.round(v*(reduced()?.5:1))))); } catch { /* Unsupported hardware must not interrupt the gesture. */ }
 };
 const clear=()=>{timers.current.forEach(clearTimeout);timers.current=[];if(vibrationSupported())try{navigator.vibrate(0);}catch{}};
 useEffect(()=>{if(!enabled)clear();},[enabled]);
 useEffect(()=>{const hide=()=>{if(document.hidden)clear();};document.addEventListener('visibilitychange',hide);return()=>{document.removeEventListener('visibilitychange',hide);clear();};},[]);
 // Distance-based heartbeat: thresholds get closer as fingers approach.
 const approach=(progress:number)=>{
  const now=Date.now();const step=progress>.75?.055:progress>.45?.10:.18;
  if(progress<last.current.progress)last.current={at:0,progress};
  if(progress<.97 && progress-last.current.progress>=step && now-last.current.at>=35){pulse([Math.round(8+progress*7)]);last.current={at:now,progress};}
 };
 const reset=()=>{last.current={at:0,progress:0};};
 const join=()=>{clear();pulse(TIMELINE.impact);[[TIMELINE.explosion,TIMELINE.barrage],[TIMELINE.wave2,TIMELINE.wave],[TIMELINE.wave3,[10,24,7]]].forEach(([at,pattern])=>{timers.current.push(setTimeout(()=>pulse(pattern as readonly number[]),at as number));});};
 const cancel=()=>{clear();pulse(TIMELINE.cancel);reset();};
 return {approach,join,cancel,reset};
}
