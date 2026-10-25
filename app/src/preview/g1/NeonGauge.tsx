import { useEffect, useRef } from 'react';
const path='M330 9 H606 Q651 9 651 54 V526 Q651 571 606 571 H54 Q9 571 9 526 V54 Q9 9 54 9 Z';
export function NeonGauge({variant,remaining}:{variant:'a'|'b';remaining:number}) {
 const svg=useRef<SVGSVGElement>(null);
 const progress=remaining/1440, urgent=remaining<=60, warm=remaining<=600, ended=remaining===0;
 const color=urgent?'#ff3355':warm?'#ffe64c':'#32cfff';
 useEffect(()=>{const el=svg.current;if(!el)return; const line=el.querySelector<SVGPathElement>('.g1-line');const ball=el.querySelector<SVGCircleElement>('.g1-ball');if(!line||!ball)return;const point=line.getPointAtLength(line.getTotalLength()*progress);ball.setAttribute('cx',String(point.x));ball.setAttribute('cy',String(point.y));},[progress]);
 return <div className={`g1-gauge ${variant==='b'?'rainbow':''} ${urgent?'urgent':''} ${ended?'ended':''}`} data-variant={variant} data-remaining={remaining} style={{'--neon':color,'--speed':urgent?'0.65s':warm?'1.8s':'5s'} as React.CSSProperties}>
 <svg ref={svg} viewBox="0 0 660 580" preserveAspectRatio="none" aria-label={`外枠残り時間ゲージ ${Math.round(progress*100)}%`}>
 <defs><linearGradient id={`spectrum-${variant}`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#ff366e"/><stop offset=".2" stopColor="#ffdb39"/><stop offset=".4" stopColor="#5dff98"/><stop offset=".6" stopColor="#28dfff"/><stop offset=".8" stopColor="#8364ff"/><stop offset="1" stopColor="#ff39bc"/><animateTransform attributeName="gradientTransform" type="rotate" from="0 .5 .5" to="360 .5 .5" dur={urgent?'0.65s':warm?'1.8s':'5s'} repeatCount="indefinite"/></linearGradient></defs>
 <path d={path} className="g1-track"/>
 <path d={path} pathLength="1000" className="g1-line" stroke={variant==='b'?`url(#spectrum-${variant})`:color} strokeDasharray={`${progress*1000} 1000`}/>
 <path d={path} pathLength="1000" className="g1-core" strokeDasharray={`${progress*1000} 1000`}/>
 {!ended&&<circle className="g1-ball" r="9" fill="white"/>}
 {variant==='b'&&!ended&&<path d={path} pathLength="1000" className="g1-runner" strokeDasharray="9 61"/>}
 {ended&&<path d={path} className="g1-burst"/>}
 </svg>{ended&&<div className="g1-closed">TIME UP <small>受付終了</small></div>}
 </div>;
}
export const neonCSS=`
.g1-gauge{position:absolute;inset:0;pointer-events:none;border-radius:27px;z-index:4;color:var(--neon)}
.g1-gauge svg{width:100%;height:100%;overflow:visible}
.g1-gauge path{fill:none;stroke-linecap:round;stroke-linejoin:round}
.g1-track{stroke:var(--neon);stroke-width:12;opacity:.17}
.g1-line{stroke-width:13;filter:drop-shadow(0 0 7px var(--neon));transition:stroke-dasharray .55s,stroke .4s}
.g1-core{stroke:white;stroke-width:2;opacity:.8;transition:stroke-dasharray .55s}
.g1-ball{filter:drop-shadow(0 0 10px white) drop-shadow(0 0 15px var(--neon));animation:g1-ball 1s ease-in-out infinite}
.rainbow .g1-track{stroke:#bd5cff;opacity:.35}.rainbow .g1-line{filter:drop-shadow(0 0 8px #bd5cff);stroke-width:16}
.g1-runner{stroke:white;stroke-width:4;animation:g1-run var(--speed) linear infinite;opacity:.8}
.urgent:not(.ended) .g1-line,.urgent:not(.ended) .g1-core{animation:g1-blink .65s ease-in-out infinite}
.urgent .g1-track{animation:g1-track 1.3s ease-in-out infinite;stroke-width:18;filter:drop-shadow(0 0 10px var(--neon))}.rainbow.urgent .g1-track{stroke:#ff3cd9}.urgent:not(.ended):after{content:"LAST MINUTE";position:absolute;right:16px;top:34%;font:900 9px Inter,sans-serif;letter-spacing:2px;color:var(--neon);text-shadow:0 0 12px currentColor}
.g1-burst{stroke:white;stroke-width:25;filter:drop-shadow(0 0 14px white);animation:g1-burst 1.1s ease-out both;transform-origin:center}
.ended .g1-track{stroke:#eee;opacity:.35;animation:none}.ended .g1-line,.ended .g1-core{opacity:0}
.g1-closed{position:absolute;bottom:9%;left:34%;background:#111;color:white;letter-spacing:3px;font:bold 12px Inter,sans-serif;padding:8px 12px;border-radius:20px;box-shadow:0 0 20px #ffffff55}.g1-closed small{font-size:9px;letter-spacing:0;margin-left:5px}
.g1-controls{display:flex;flex-wrap:wrap;gap:6px;margin-top:14px}.g1-controls span{width:100%;font:800 11px Inter,sans-serif;color:#504d62;margin-bottom:3px}.g1-controls button{font:bold 10px Inter,sans-serif;border:1px solid #d5cfdf;border-radius:18px;background:white;color:#382e51;padding:10px 9px;cursor:pointer;min-height:36px}.g1-controls button:hover{background:#e7d9ff}
@keyframes g1-run{to{stroke-dashoffset:-280}}@keyframes g1-ball{50%{r:13;opacity:.85}}@keyframes g1-blink{50%{opacity:.2}}@keyframes g1-track{50%{opacity:.5}}@keyframes g1-burst{0%{opacity:1;stroke-width:40}100%{opacity:0;stroke-width:2;transform:scale(1.13)}}
@media(prefers-reduced-motion:reduce){.g1-gauge *{animation:none!important;transition:none!important}.g1-burst{display:none}}
`;
