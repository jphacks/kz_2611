import { useEffect, useState } from 'react';
const route='M 30 4 H 630 Q 656 4 656 30 V 550 Q 656 576 630 576 H 30 Q 4 576 4 550 V 30 Q 4 4 30 4';
function point(t:number){const d=((t%1)+1)%1*2440;if(d<660)return{x:d,y:0,nx:0,ny:-1};if(d<1240)return{x:660,y:d-660,nx:1,ny:0};if(d<1900)return{x:1900-d,y:580,nx:0,ny:1};return{x:0,y:2440-d,nx:-1,ny:0};}
export function FireGauge({seconds,variant}:{seconds:number;variant:'fuse'|'flame'}){
 const [phase,setPhase]=useState(0);useEffect(()=>{setPhase(v=>v+1)},[seconds===0]);
 const left=Math.min(1,seconds/1440),hot=seconds<=60,urgent=seconds<=600,dead=seconds===0;
 const tip=point(left),id=`fire-${variant}`;
 return <div aria-hidden="true" style={{position:'absolute',inset:0,pointerEvents:'none',overflow:'visible'}}>
 <style>{`
 @keyframes g2-flicker{0%,100%{opacity:1;filter:brightness(1);transform:scaleY(.8)}50%{opacity:.85;filter:brightness(1.8);transform:scaleY(1.15)}}
 @keyframes g2-spark{0%{opacity:1;transform:translate(0,0) scale(1)}100%{opacity:0;transform:translate(var(--dx),var(--dy)) scale(.1)}}
 @keyframes g2-end{0%{opacity:1;transform:scale(.2)}30%{opacity:1;transform:scale(1.15)}100%{opacity:0;transform:scale(1.8)}}
 @keyframes g2-ash{0%{opacity:.95;transform:translate(0,0)}100%{opacity:0;transform:translate(var(--dx),-120px) rotate(140deg)}}
 @keyframes g2-pulse{50%{opacity:.5;stroke-width:19}}
 @media(prefers-reduced-motion:reduce){.g2-fire *{animation:none!important}}
 `}</style>
 <svg className="g2-fire" viewBox="0 0 660 580" width="100%" height="100%" style={{overflow:'visible',position:'absolute',inset:0}}>
 <defs><filter id={`${id}-glow`} x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation={hot?9:5}/></filter></defs>
 <path d={route} fill="none" stroke={dead?'#504237':'#4d3325'} strokeWidth="9"/>
 {!dead&&<><path d={route} pathLength="1" fill="none" stroke={hot?'#ff2315':'#ff792c'} strokeWidth={hot?17:12} strokeDasharray={`${left} 1`} filter={`url(#${id}-glow)`}/><path d={route} pathLength="1" fill="none" stroke={variant==='fuse'?'#d6a36b':hot?'#ff3b15':'#ff9a27'} strokeWidth={variant==='fuse'?7:8} strokeDasharray={`${left} 1`} style={{animation:hot?'g2-pulse .35s infinite':undefined}}/><path d={route} pathLength="1" fill="none" stroke="#fff3a1" strokeWidth="2" strokeDasharray={`${left} 1`}/></>}
 {!dead&&variant==='flame'&&Array.from({length:88},(_,i)=>{const t=i/88;if(t>left)return null;const q=point(t),h=(hot?53:urgent?31:18)+(i%5)*4;return <g key={i} transform={`translate(${q.x} ${q.y}) rotate(${q.nx===1?90:q.nx===-1?-90:q.ny===1?180:0})`}><g style={{animation:`g2-flicker ${.25+i%4*.09}s ${-i*.13}s infinite`,transformOrigin:'0px 0px'}}><path d={`M-10 3 Q-18 -${h*.3} 0 -${h} Q-3 -${h*.45} 9 -${h*.2} Q15 2 -10 3`} fill={hot?'#ff3a15':'#ff731c'} opacity=".9"/><path d={`M-5 3 Q-8 -${h*.2} 1 -${h*.64} Q1 -5 6 2Z`} fill="#ffe582"/></g></g>})}
 {!dead&&variant==='fuse'&&<g transform={`translate(${tip.x} ${tip.y})`}><circle r={hot?24:16} fill="#ff5420" filter={`url(#${id}-glow)`}/><circle r="8" fill="#fff6b3"/>{Array.from({length:hot?32:14},(_,i)=><circle key={i} r={i%3===0?3:2} fill={i%2?'#ff842c':'#fff2a1'} style={{'--dx':`${Math.cos(i*2.4)*(hot?92:50)}px`,'--dy':`${Math.sin(i*2.4)*(hot?92:50)}px`,animation:`g2-spark ${hot?.45:.8}s ${-i*.037}s infinite`} as React.CSSProperties}/>)}</g>}
 {dead&&<g key={phase}>{Array.from({length:variant==='fuse'?44:70},(_,i)=>{const q=point(i/70);return <rect key={i} x={variant==='fuse'?330:q.x} y={variant==='fuse'?290:q.y} width={i%3+3} height={i%4+4} fill={variant==='fuse'?(i%2?'#ff792c':'#fff2b0'):'#a2988e'} style={{'--dx':`${Math.cos(i*2.4)*240}px`,'--dy':`${Math.sin(i*2.4)*210}px`,animation:`${variant==='fuse'?'g2-spark':'g2-ash'} 2.4s ease-out both`} as React.CSSProperties}/>})}{variant==='fuse'&&<g style={{transformOrigin:'330px 290px',animation:'g2-end 1.2s ease-out both'}}><circle cx="330" cy="290" r="94" fill="#ff5a1699"/><path d="M330 140 L350 242 450 200 390 280 480 310 374 330 380 430 324 352 250 410 278 326 180 292 285 275 245 190 310 240Z" fill="#ffe876"/></g>}</g>}
 </svg>
 {dead&&<div style={{position:'absolute',left:'28%',right:'28%',bottom:12,textAlign:'center',fontWeight:900,fontSize:12,color:'#f8d6ac',background:'#29231e',borderRadius:20,padding:6}}>受付終了 / {variant==='fuse'?'BOOM!':'ASHES'}</div>}
 </div>
}
