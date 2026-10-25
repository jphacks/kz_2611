import React, { useRef, useState } from 'react';
import { Animated, Image, PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Ellipse, Circle } from 'react-native-svg';

const ORANGE = '#FF5A36';
function sound(muted: boolean) {
  if (muted) return;
  const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!Ctx) return;
  const c = new Ctx(); const gain = c.createGain(); gain.connect(c.destination);
  gain.gain.setValueAtTime(.12,c.currentTime); gain.gain.exponentialRampToValueAtTime(.001,c.currentTime+.55);
  [523,659,784,1047].forEach((f,i)=>{ const o=c.createOscillator(); o.type='sine'; o.frequency.value=f; o.connect(gain); o.start(c.currentTime+i*.045); o.stop(c.currentTime+.55); });
  setTimeout(()=>void c.close(),800);
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
function Card({kind,muted}:{kind:number;muted:boolean}) {
 const [joined,setJoined]=useState(false); const [progress,setProgress]=useState(0); const [width,setWidth]=useState(330);
 const x=useRef(new Animated.Value(0)).current; const burst=useRef(new Animated.Value(0)).current;
 const pos=useRef(0); const base=useRef(0); const active=useRef(false); const mute=useRef(muted);mute.current=muted;
 const travel=kind===0?width*.06:width*.0584;
 const commit=(yes:boolean)=>{if(yes===active.current)return;active.current=yes;setJoined(yes); if(yes){sound(mute.current);(navigator as any).vibrate?.([20,30,40]);burst.setValue(0);Animated.timing(burst,{toValue:1,duration:850,useNativeDriver:true}).start();}};
 const responder=useRef(PanResponder.create({onStartShouldSetPanResponder:()=>true,onMoveShouldSetPanResponder:(_,g)=>Math.abs(g.dx)>Math.abs(g.dy),onPanResponderGrant:()=>{base.current=pos.current;},onPanResponderMove:(_,g)=>{const next=Math.max(0,Math.min(travel,base.current+g.dx*.3));pos.current=next;x.setValue(next);setProgress(next/travel);commit(next>=travel*.97);},onPanResponderRelease:()=>{const yes=pos.current>=travel*.97;pos.current=yes?travel:0;setProgress(yes?1:0);Animated.spring(x,{toValue:pos.current,useNativeDriver:true,bounciness:9}).start();commit(yes);}})).current;
 const names=['本物の絵に、あなたを。','夜にふれる、創造の線。','指先から、世界がポップ。'];
 return <View style={s.section}><Text style={s.eyebrow}>D4-{['A','B','C'][kind]} / {['ORIGINAL FRESCO','MIDNIGHT DRAWING','COLOR POP'][kind]}</Text><Text style={s.sectionTitle}>{names[kind]}</Text><Text style={s.desc}>{['名画のアダムが動く。神の指先へ、あと少し。','黒 × 白 × 橙。静かな予兆から、まぶしい火花へ。','大きな腕と顔。タッチした瞬間、ハートがはじける。'][kind]}</Text>
 <View style={[s.card,kind===2&&{backgroundColor:'#fff1e9'}]}>
 <View style={s.meta}><Text style={[s.event,kind===2&&s.ink]}>夜ドライブ</Text><Text style={[s.time,kind===2&&s.ink]}>{joined?'参加しました · ':''}今日 21:00 · 駅前</Text><View style={s.badge}><Text style={s.badgeText}>あと24分</Text></View></View>
 <View testID={`scene-${kind}`} onLayout={e=>setWidth(e.nativeEvent.layout.width)} style={[s.scene,{height:kind===0?width*581/1280:205},kind===0&&{backgroundColor:'#b2a887'}]}>
 {kind===0?<Image source={require('./creation.jpg')} style={[s.fill,{clipPath:'inset(0 0 0 38%)'} as any]}/>:<Drawing pop={kind===2}/>}
 <View style={[s.host,{left:kind===0?'55%':'76%',top:kind===0?'10%':'19%'}]}><Avatar host large={kind===2}/></View>
 <Animated.View style={[s.fill,{transform:[{translateX:kind===0?Animated.subtract(x,width*.052):x}]}]} pointerEvents="none">
 {kind===0?<View style={{width:'38%',height:'100%',overflow:'hidden'}}><Image source={require('./creation.jpg')} style={{width,height:width*581/1280}}/></View>:<Drawing pop={kind===2} left/>}
 <View style={{position:'absolute',left:kind===0?'7%':'8%',top:kind===0?'26%':'30%'}}><Avatar large={kind===2}/></View>
 </Animated.View>
 <Animated.View pointerEvents="none" style={[s.glow,{left:kind===0?'38%':'52.2%',top:kind===0?'44%':'48%',opacity:joined?1:progress*.6,transform:[{scale:joined?1.3:1}]}]} />
 {joined&&<Animated.View pointerEvents="none" style={[s.fill,{opacity:burst.interpolate({inputRange:[0,.7,1],outputRange:[1,1,0]}),transform:[{scale:burst.interpolate({inputRange:[0,1],outputRange:[.4,1.8]})}]}]}>{Array.from({length:20},(_,i)=><Text key={i} style={{position:'absolute',left:`${15+(i*37)%75}%`,top:`${(i*19)%85}%`,color:[ORANGE,'#FF3EA5','#3D5AFE','#fff'][i%4],fontSize:kind===2?24:20,transform:[{rotate:`${i*23}deg`}]}}>{kind===2?['♥','✦','●'][i%3]:'✦'}</Text>)}</Animated.View>}
 <View {...responder.panHandlers} testID={`drag-${kind}`} accessibilityLabel="自分の腕を右へスライド、左で取り消し" style={[s.fill,{cursor:'ew-resize',touchAction:'pan-y'} as any]} />
 </View>
 <View style={s.footer}><Text style={[s.instruction,kind===2&&s.ink]}>{joined?'✦ 指先がつながった！':'自分の腕を右へ → ふれて参加'}</Text><Text style={[s.hint,kind===2&&s.ink]}>{joined?'← 左へ戻すと取り消し':'自分 →                         ← 主催者'}</Text><View style={s.track}><View style={{width:`${progress*100}%`,height:3,backgroundColor:ORANGE}}/></View></View>
 </View>{kind===0&&<Text style={s.credit}>画像: Michelangelo, The Creation of Adam（パブリックドメイン、Wikimedia Commons）</Text>}</View>;
}
export function PreviewD4(){const[muted,setMuted]=useState(true);return <ScrollView style={s.page} contentContainerStyle={s.pageContent}><View style={s.top}><Text style={s.brand}>この指とまれ / INTERACTION STUDY</Text><Pressable onPress={()=>setMuted(!muted)} style={s.mute}><Text style={s.muteText}>{muted?'音 OFF':'♪ 音 ON'}</Text></Pressable></View><Text style={s.hero}>{'参加は、\n創造の瞬間。'}</Text><Text style={s.intro}>THE CREATION OF A CONNECTION</Text><Text style={s.lead}>{'あなたがアダム。主催者が神。\n右へスライドして、ふたりの指をつなごう。'}</Text>{[0,1,2].map(k=><Card key={k} kind={k} muted={muted}/>)}<Text style={s.end}>{'D4 · 3 STUDIES / 何度でも、つながろう。\n操作デモです。実際の募集への参加は行いません。'}</Text></ScrollView>}
const s=StyleSheet.create({page:{flex:1,backgroundColor:'#f5f2ed'},pageContent:{padding:22,paddingTop:32,paddingBottom:50,maxWidth:620,width:'100%',alignSelf:'center'},top:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},brand:{fontSize:9,fontWeight:'800',letterSpacing:1,color:'#555'},mute:{backgroundColor:'#111',padding:10,borderRadius:20},muteText:{color:'white',fontSize:11,fontWeight:'700'},hero:{fontSize:46,fontWeight:'900',lineHeight:54,letterSpacing:-2,marginTop:35,color:'#111'},intro:{fontSize:10,letterSpacing:2,color:ORANGE,fontWeight:'800',marginTop:18},lead:{fontSize:13,lineHeight:24,color:'#555',marginTop:14,marginBottom:38},section:{marginBottom:38},eyebrow:{fontSize:10,fontWeight:'800',letterSpacing:1.6,color:ORANGE},sectionTitle:{fontSize:23,fontWeight:'900',marginTop:8,color:'#111'},desc:{fontSize:11,lineHeight:19,color:'#666',marginTop:8,marginBottom:15},card:{backgroundColor:'#111',borderRadius:24,overflow:'hidden'},meta:{padding:20,paddingBottom:16},event:{color:'white',fontSize:29,fontWeight:'900'},time:{color:'#eee',fontSize:13,fontWeight:'700',marginTop:7},badge:{position:'absolute',right:17,top:23,borderWidth:1,borderColor:ORANGE,borderRadius:20,paddingHorizontal:9,paddingVertical:6},badgeText:{color:ORANGE,fontWeight:'800',fontSize:11},scene:{width:'100%',overflow:'hidden'},fill:{position:'absolute',top:0,left:0,width:'100%',height:'100%'},host:{position:'absolute'},avatar:{width:32,height:32,borderRadius:16,backgroundColor:ORANGE,borderWidth:2,borderColor:'#fff',alignItems:'center',justifyContent:'center'},avatarText:{color:'#fff',fontWeight:'900',fontSize:17},footer:{padding:18,paddingTop:17},instruction:{fontWeight:'900',fontSize:15,color:ORANGE,textAlign:'center'},hint:{fontSize:10,color:'#aaa',textAlign:'center',marginTop:9},track:{height:3,backgroundColor:'#444',marginTop:15,borderRadius:2,overflow:'hidden'},credit:{fontSize:8,lineHeight:13,color:'#777',marginTop:8},ink:{color:'#111'},glow:{position:'absolute',width:20,height:20,borderRadius:10,backgroundColor:'#fff',boxShadow:'0 0 24px 14px #FF5A36'} as any,end:{fontSize:10,color:'#777',lineHeight:20,textAlign:'center'}});
