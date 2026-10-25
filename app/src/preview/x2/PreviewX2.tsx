import { TIMELINE, useHaptics, vibrationSupported } from './haptics';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Ellipse, Circle } from 'react-native-svg';

const ORANGE = '#FF5A36';
let audio: any;
function sound(muted: boolean) {
 if(muted) return;
 const Ctx=(window as any).AudioContext || (window as any).webkitAudioContext;
 if(!Ctx)return; audio ||= new Ctx(); const c=audio; void c.resume();
 [130.81,196,261.63,329.63,392,523.25,659.25,783.99].forEach((f,i)=>{
 const o=c.createOscillator(),g=c.createGain(),filter=c.createBiquadFilter();o.type=i<3?'triangle':'sawtooth';o.frequency.value=f;filter.type='lowpass';filter.frequency.value=1200;
 o.connect(filter);filter.connect(g);g.connect(c.destination); const t=c.currentTime+i*.025;g.gain.setValueAtTime(.001,t);g.gain.linearRampToValueAtTime(.025,t+.15);g.gain.exponentialRampToValueAtTime(.001,t+2.8);o.start(t);o.stop(t+3);
 });
}
function Genesis({clock,origin}:{clock:Animated.Value;origin:{x:number;y:number}}) {
 const reduced=typeof window!=='undefined'&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const fade=clock.interpolate({inputRange:[0,.05,.78,1],outputRange:[0,1,1,0]});
 return <Animated.View pointerEvents="none" style={[s.fill,{position:'fixed',zIndex:1000,opacity:fade,overflow:'hidden',backgroundColor:'rgba(54,26,0,.22)',transform:[{translateX:clock.interpolate({inputRange:[0,.06,.09,.12,.15,.18,.25,1],outputRange:reduced?[0,0,0,0,0,0,0,0]:[0,-13,14,-10,9,-5,0,0]})}]} as any]}>
 <Animated.View style={[s.fill,{backgroundColor:'#fff8d1',opacity:clock.interpolate({inputRange:[0,.04,.1,.13,.18,1],outputRange:reduced?[0,.15,0,0,0,0]:[0,1,0,.7,0,0]})}]}/>
 <View style={[s.fill,{backgroundImage:'radial-gradient(ellipse at 44% 73%, #fff9bf 0%, #ffd45088 18%, #e8a01933 48%, transparent 75%)'} as any]}/>
 {[0,1,2,3].map(i=><Animated.View key={'ring'+i} style={{position:'absolute',left:`${origin.x}%`,top:`${origin.y}%`,width:160,height:160,marginLeft:-80,marginTop:-80,borderRadius:100,borderWidth:3-i*.5,borderColor:'#fff3b1',boxShadow:'0 0 30px #ffcf40',opacity:clock.interpolate({inputRange:[0,(TIMELINE.explosion+i*(TIMELINE.wave2-TIMELINE.explosion))/TIMELINE.duration,.6+i*.08,1],outputRange:[0,1,0,0]}),transform:[{scale:clock.interpolate({inputRange:[0,1],outputRange:[.05,9-i]})}] } as any}/>)}
 {Array.from({length:20},(_,i)=><Animated.View key={'ray'+i} style={{position:'absolute',left:`${origin.x}%`,top:`${origin.y}%`,width:3,height:900,transformOrigin:'top',backgroundImage:'linear-gradient(#fffde5, #ffd66a55, transparent)',transform:[{rotate:`${i*18}deg`}],opacity:clock.interpolate({inputRange:[0,.15,.65,1],outputRange:[0,.8,.35,0]})} as any}/>)}
 {[20,44,70].map((x,i)=><Animated.View key={x} style={{position:'absolute',left:`${x}%`,top:0,height:'100%',width:i===1?60:14,backgroundColor:'#fff5bd',boxShadow:'0 0 55px 18px #ffe18b',opacity:clock.interpolate({inputRange:[0,.1,.55,1],outputRange:[0,.8,.35,0]}),transform:[{scaleY:clock.interpolate({inputRange:[0,.18,1],outputRange:[0,1,1]})}] } as any}/>)}
 <Svg width="100%" height="100%" viewBox="0 0 390 844" style={{position:'absolute'}}><Path d="M172 420 L105 310 L137 325 L50 140 M172 420 L260 290 L230 315 L345 140 M172 420 L110 550 L140 528 L40 720 M172 420 L290 550 L256 530 L355 760" fill="none" stroke="#fff9c6" strokeWidth="3"/></Svg>
 {Array.from({length:135},(_,i)=><Animated.Text key={'p'+i} style={{position:'absolute',left:`${(i*37)%100}%`,top:`${(i*19)%100}%`,color:i%3?'#ffe9a2':'#fff',fontSize:i%5===0?36:12+i%13,textShadowColor:'#ffbd27',textShadowRadius:12,opacity:fade,transform:[{translateY:clock.interpolate({inputRange:[0,1],outputRange:[i%2?120:-90,i%2?-160:180]})},{rotate:`${i*29}deg`}]}}>{i%5===0?'🪶':['✦','✧','·','✶'][i%4]}</Animated.Text>)}
 <Animated.View style={{position:'absolute',top:`${Math.max(30,origin.y-25)}%`,left:0,width:'100%',alignItems:'center',transform:[{scale:clock.interpolate({inputRange:[0,.08,.18,.25,.75,1],outputRange:reduced?[1,1,1,1,1,1]:[.05,.05,1.18,1,1,1.08]})}]}}><Text style={{fontSize:11,fontWeight:'900',letterSpacing:6,color:'#fff6cb',textShadowColor:'#8e4a00',textShadowRadius:10}}>THE MOMENT OF CREATION</Text><Text style={{fontSize:47,fontWeight:'900',letterSpacing:-3,color:'#fff5c5',textShadowColor:'#b07700',textShadowRadius:20,marginTop:10}}>この指とまれ!!</Text><Text style={{fontSize:14,color:'#fff',letterSpacing:8,marginTop:14,fontWeight:'900'}}>世界が、つながった。</Text></Animated.View>
 </Animated.View>;
}
function Avatar({host=false,large=false}:{host?:boolean;large?:boolean}) { return <View style={[s.avatar,large&&{width:48,height:48,borderRadius:24},host&&{backgroundColor:'#3D5AFE'}]}><Text style={s.avatarText}>{host?'主':'自'}</Text></View>; }
function Drawing({pop=false,left=false}:{pop?:boolean;left?:boolean}) {
 return <Svg width="100%" height="100%" viewBox="0 0 360 205">
 {left ? <>
 {!pop&&<><Path d="M0 172 Q40 140 78 159 L119 141 Q135 125 145 144 L122 182 L64 192 L0 190" fill="#111" stroke={ORANGE} strokeWidth="3"/><Path d="M30 153 Q15 117 47 90 Q58 81 74 94 L89 116" fill="none" stroke={ORANGE} strokeWidth="3"/></>}
 <Path d={pop?'M-35 160 Q45 175 92 127 L148 98 L168 99':'M54 105 Q78 127 103 115 L146 99 L168 99'} fill="none" stroke={pop?'#FF5A36':ORANGE} strokeWidth={pop?30:12} strokeLinecap="round"/><Path d="M145 100 L167 99 M144 102 L158 110" fill="none" stroke={pop?'#111':ORANGE} strokeWidth={pop?5:3} strokeLinecap="round"/>
 </> : <>
 {!pop&&<><Path d="M235 24 Q314 -3 357 40 Q381 84 348 156 Q300 182 237 147 Q201 101 235 24Z" fill="#242020" stroke="#eee" strokeWidth="2"/><Path d="M284 81 Q326 82 316 121 L350 151 M293 111 L259 145 L302 154" fill="none" stroke="#eee" strokeWidth="3"/></>}
 <Path d={pop?'M398 55 Q327 22 273 74 L212 99 L188 99':'M285 72 Q267 75 245 90 L212 99 L188 99'} fill="none" stroke={pop?'#3D5AFE':'#fff'} strokeWidth={pop?30:12} strokeLinecap="round"/><Path d="M211 99 L188 99 M212 102 L200 111" fill="none" stroke={pop?'#111':'#fff'} strokeWidth={pop?5:3} strokeLinecap="round"/>
 {pop&&<><Circle cx="323" cy="162" r="18" fill="#FF3EA5"/><Path d="M20 20 L30 35 M32 18 L18 35" stroke="#FF3EA5" strokeWidth="5"/></>}
 </>}
 </Svg>;
}
function Card({kind,muted,hapticOn}:{kind:number;muted:boolean;hapticOn:boolean}) {
 const haptics=useHaptics(hapticOn);
 const [joined,setJoined]=useState(false); const [progress,setProgress]=useState(0); const [width,setWidth]=useState(330);
 const x=useRef(new Animated.Value(0)).current; const burst=useRef(new Animated.Value(0)).current;
 const pos=useRef(0); const base=useRef(0); const active=useRef(false); const mute=useRef(muted);mute.current=muted;
 const travel=kind===0?width*.06:width*.0584;
 const travelRef=useRef(travel);travelRef.current=travel;
 const sceneRef=useRef<React.ElementRef<typeof View>>(null);const [origin,setOrigin]=useState({x:44,y:73});const [celebrating,setCelebrating]=useState(false);const timer=useRef<ReturnType<typeof setTimeout>|null>(null);useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current)},[]);
 const commit=(yes:boolean)=>{if(yes===active.current)return;active.current=yes;setJoined(yes);if(timer.current)clearTimeout(timer.current);burst.stopAnimation();if(yes){sceneRef.current?.measureInWindow((a,b,w,h)=>setOrigin({x:(a+w*.408)/window.innerWidth*100,y:(b+h*.5)/window.innerHeight*100}));sound(mute.current);haptics.join();setCelebrating(true);burst.setValue(0);Animated.timing(burst,{toValue:1,duration:TIMELINE.duration,useNativeDriver:true}).start();timer.current=setTimeout(()=>setCelebrating(false),2950);}else{haptics.cancel();setCelebrating(false);burst.setValue(0);}};
 const responder=useRef(PanResponder.create({onStartShouldSetPanResponder:()=>true,onMoveShouldSetPanResponder:(_,g)=>Math.abs(g.dx)>Math.abs(g.dy),onPanResponderGrant:()=>{base.current=pos.current;haptics.reset();},onPanResponderMove:(_,g)=>{if(Math.abs(g.dy)>Math.abs(g.dx))return;const t=travelRef.current;const next=Math.max(0,Math.min(t,base.current+g.dx*.3));pos.current=next;x.setValue(next);if(!active.current)haptics.approach(next/t);setProgress(next/t);if(next>=t*.97)commit(true);else if(base.current>=t*.97&&next<=t*.1)commit(false);},onPanResponderRelease:()=>{const t=travelRef.current;const yes=pos.current>=t*.97;pos.current=yes?t:0;setProgress(yes?1:0);Animated.spring(x,{toValue:pos.current,useNativeDriver:true,bounciness:9}).start();commit(yes);},onPanResponderTerminationRequest:()=>true})).current;
 const names=['指がふれたら、天地創造。','夜にふれる、創造の線。','指先から、世界がポップ。'];
 return <View style={s.section}><Text style={s.eyebrow}>X2-{['A','B','C'][kind]} / {['ORIGINAL FRESCO','MIDNIGHT DRAWING','COLOR POP'][kind]}</Text><Text style={s.sectionTitle}>{names[kind]}</Text><Text style={s.desc}>{['右へスライド。神々しい祝福を、その指先から。','黒 × 白 × 橙。静かな予兆から、まぶしい火花へ。','大きな腕と顔。タッチした瞬間、ハートがはじける。'][kind]}</Text>
 {celebrating&&<Genesis clock={burst} origin={origin}/>}
 <View style={[s.card,kind===2&&{backgroundColor:'#fff1e9'}]}>
 <View style={s.meta}><Text style={[s.event,kind===2&&s.ink]}>夜ドライブ</Text><Text style={[s.time,kind===2&&s.ink]}>{joined?'参加しました · ':''}今日 21:00 · 駅前</Text><View style={s.badge}><Text style={s.badgeText}>あと24分</Text></View></View>
 <View ref={sceneRef} testID={`scene-${kind}`} onLayout={e=>setWidth(e.nativeEvent.layout.width)} style={[s.scene,{height:kind===0?width*581/1280:205},kind===0&&{backgroundColor:'#b2a887'}]}>
 {kind===0?<Image source={require('./creation.jpg')} style={[s.fill,{filter:celebrating?'sepia(.8) saturate(2) brightness(1.5)':'none'} as any]}/>:<Drawing pop={kind===2}/>}
 <View style={[s.host,{left:kind===0?'55%':'76%',top:kind===0?'10%':'19%'}]}><Avatar host large={kind===2}/></View>
 <Animated.View style={[s.fill,{transform:[{translateX:kind===0?Animated.subtract(x,width*.052):x}]}]} pointerEvents="none">
 {kind===0?<View style={{width:'38%',height:'100%',overflow:'hidden'}}><Image source={require('./creation.jpg')} style={{width,height:width*581/1280}}/></View>:<Drawing pop={kind===2} left/>}
 <View style={{position:'absolute',left:kind===0?'7%':'8%',top:kind===0?'26%':'30%'}}><Avatar large={kind===2}/></View>
 </Animated.View>
 <Animated.View pointerEvents="none" style={[s.glow,{left:kind===0?'38%':'52.2%',top:kind===0?'44%':'48%',opacity:joined?1:progress*.6,transform:[{scale:joined?1.3:1}]}]} />
 {false&&joined&&<Animated.View pointerEvents="none" style={[s.fill,{opacity:burst.interpolate({inputRange:[0,.7,1],outputRange:[1,1,0]}),transform:[{scale:burst.interpolate({inputRange:[0,1],outputRange:[.4,1.8]})}]}]}>{Array.from({length:20},(_,i)=><Text key={i} style={{position:'absolute',left:`${15+(i*37)%75}%`,top:`${(i*19)%85}%`,color:[ORANGE,'#FF3EA5','#3D5AFE','#fff'][i%4],fontSize:kind===2?24:20,transform:[{rotate:`${i*23}deg`}]}}>{kind===2?['♥','✦','●'][i%3]:'✦'}</Text>)}</Animated.View>}
 <View {...responder.panHandlers} testID={`drag-${kind}`} accessibilityLabel="自分の腕を右へスライド、左で取り消し" style={[s.fill,{cursor:'ew-resize',touchAction:'pan-y'} as any]} />
 </View>
 <View style={s.footer}><Text style={[s.instruction,kind===2&&s.ink]}>{joined?'✦ 指先がつながった！':'自分の腕を右へ → ふれて参加'}</Text><Text style={[s.hint,kind===2&&s.ink]}>{joined?'← 左へ戻すと取り消し':'自分 →                         ← 主催者'}</Text><View style={s.track}><View style={{width:`${progress*100}%`,height:3,backgroundColor:ORANGE}}/></View></View>
 </View>{kind===0&&<Text style={s.credit}>画像: Michelangelo, The Creation of Adam（パブリックドメイン、Wikimedia Commons）</Text>}</View>;
}
export function PreviewX2(){const[muted,setMuted]=useState(true),[hapticOn,setHapticOn]=useState(true);return <ScrollView style={s.page} contentContainerStyle={s.pageContent}><View style={s.top}><Text style={s.brand}>この指とまれ / INTERACTION STUDY</Text><Pressable onPress={()=>setMuted(!muted)} style={s.mute}><Text style={s.muteText}>{muted?'音 OFF':'♪ 音 ON'}</Text></Pressable></View><View style={{alignItems:"flex-end",marginTop:10}}>{vibrationSupported()?<Pressable accessibilityLabel="振動の切り替え" onPress={()=>setHapticOn(!hapticOn)} style={{padding:10,backgroundColor:"white",borderRadius:20}}><Text style={{fontSize:11,fontWeight:"700"}}>{hapticOn?"振動 オン":"振動 オフ"}</Text></Pressable>:<Text style={{fontSize:10,color:"#777"}}>この端末は振動非対応</Text>}</View><Text style={s.hero}>{'参加は、\n創造の瞬間。'}</Text><Text style={s.intro}>THE CREATION OF A CONNECTION / MAX</Text><Text style={s.lead}>{'あなたがアダム。主催者が神。\n右へスライドして、ふたりの指をつなごう。'}</Text>{[0].map(k=><Card key={k} kind={k} muted={muted} hapticOn={hapticOn}/>)}<Text style={s.end}>{'X2 · GENESIS / D4-A MAX / 何度でも、つながろう。\n操作デモです。実際の募集への参加は行いません。'}</Text></ScrollView>}
const s=StyleSheet.create({page:{flex:1,backgroundColor:'#f5f2ed'},pageContent:{padding:22,paddingTop:32,paddingBottom:50,maxWidth:620,width:'100%',alignSelf:'center'},top:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},brand:{fontSize:9,fontWeight:'800',letterSpacing:1,color:'#555'},mute:{backgroundColor:'#111',padding:10,borderRadius:20},muteText:{color:'white',fontSize:11,fontWeight:'700'},hero:{fontSize:46,fontWeight:'900',lineHeight:54,letterSpacing:-2,marginTop:35,color:'#111'},intro:{fontSize:10,letterSpacing:2,color:ORANGE,fontWeight:'800',marginTop:18},lead:{fontSize:13,lineHeight:24,color:'#555',marginTop:14,marginBottom:38},section:{marginBottom:38},eyebrow:{fontSize:10,fontWeight:'800',letterSpacing:1.6,color:ORANGE},sectionTitle:{fontSize:23,fontWeight:'900',marginTop:8,color:'#111'},desc:{fontSize:11,lineHeight:19,color:'#666',marginTop:8,marginBottom:15},card:{backgroundColor:'#111',borderRadius:24,overflow:'hidden'},meta:{padding:20,paddingBottom:16},event:{color:'white',fontSize:29,fontWeight:'900'},time:{color:'#eee',fontSize:13,fontWeight:'700',marginTop:7},badge:{position:'absolute',right:17,top:23,borderWidth:1,borderColor:ORANGE,borderRadius:20,paddingHorizontal:9,paddingVertical:6},badgeText:{color:ORANGE,fontWeight:'800',fontSize:11},scene:{width:'100%',overflow:'hidden'},fill:{position:'absolute',top:0,left:0,width:'100%',height:'100%'},host:{position:'absolute'},avatar:{width:32,height:32,borderRadius:16,backgroundColor:ORANGE,borderWidth:2,borderColor:'#fff',alignItems:'center',justifyContent:'center'},avatarText:{color:'#fff',fontWeight:'900',fontSize:17},footer:{padding:18,paddingTop:17},instruction:{fontWeight:'900',fontSize:15,color:ORANGE,textAlign:'center'},hint:{fontSize:10,color:'#aaa',textAlign:'center',marginTop:9},track:{height:3,backgroundColor:'#444',marginTop:15,borderRadius:2,overflow:'hidden'},credit:{fontSize:8,lineHeight:13,color:'#777',marginTop:8},ink:{color:'#111'},glow:{position:'absolute',width:20,height:20,borderRadius:10,backgroundColor:'#fff',boxShadow:'0 0 24px 14px #FF5A36'} as any,end:{fontSize:10,color:'#777',lineHeight:20,textAlign:'center'}});
