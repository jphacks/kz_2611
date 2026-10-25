import { useEffect, useRef, useState } from "react";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  Path,
  RadialGradient,
  Rect,
  Stop,
  Text as T,
} from "react-native-svg";
export function isPreviewF4() {
  return (
    Platform.OS === "web" &&
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("preview") === "f4"
  );
}
const pink = "#FF3EA5",
  orange = "#FF5A36",
  ink = "#111111";
function Label({
  x,
  y,
  children,
  size = 23,
  fill = "white",
}: {
  x: number;
  y: number;
  children: React.ReactNode;
  size?: number;
  fill?: string;
}) {
  return (
    <T
      x={x}
      y={y}
      fontFamily="sans-serif"
      fontWeight="900"
      fontSize={size}
      fill={fill}
    >
      {children}
    </T>
  );
}
function Face({
  x,
  y,
  value,
  color = "white",
  size = 46,
}: {
  x: number;
  y: number;
  value: string;
  color?: string;
  size?: number;
}) {
  return (
    <G>
      <Circle cx={x} cy={y} r={size / 2} fill={color} />
      <T
        x={x}
        y={y + size * 0.28}
        textAnchor="middle"
        fontFamily="sans-serif"
        fontWeight="900"
        fontSize={size * 0.58}
        fill={color === "white" ? ink : "white"}
      >
        {value}
      </T>
    </G>
  );
}
function Stamp({ joined, progress }: { joined: boolean; progress: number }) {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 658 395">
      <Rect width={658} height={395} rx={48} fill={ink} />
      <Rect y={11} width={658} height={384} rx={48} fill={pink} />
      <Label x={44} y={116} size={54}>
        ドライブ
      </Label>
      <Label x={44} y={155}>
        今日 18:30 · 駅前
      </Label>
      <Circle cx={77} cy={281} r={33} fill="white" />
      <Label x={60} y={294} size={36} fill={pink}>
        あ
      </Label>
      <Label x={124} y={289} size={21}>
        主催 あおい · 2/5
      </Label>
      {joined ? (
        <G
          transform="translate(530 213) rotate(-14)"
          opacity={1 - progress * 0.8}
        >
          {[70, 60, 50, 40, 30, 20].map((r, i) => (
            <Ellipse
              key={r}
              cx={0}
              cy={0}
              rx={r}
              ry={r * 1.27}
              stroke="#B52073"
              strokeWidth={5}
              fill="none"
              strokeDasharray={`${98 - i * 6} 10 ${56 + i * 3} 8`}
            />
          ))}
          <Rect x={-43} y={-19} width={86} height={39} fill={pink} />
          <T
            textAnchor="middle"
            y={9}
            fill="#B52073"
            fontSize={27}
            fontWeight="900"
          >
            参加
          </T>
        </G>
      ) : (
        <G>
          <Circle
            cx={533}
            cy={214}
            r={63}
            fill="none"
            stroke="white"
            strokeWidth={5}
            strokeDasharray="9 9"
          />
          <Path
            d="M533 151 A63 63 0 0 1 578 258"
            fill="none"
            stroke="white"
            strokeWidth={9}
          />
          <Circle
            cx={533}
            cy={214}
            r={63}
            fill="none"
            stroke="white"
            strokeWidth={9}
            strokeDasharray={`${progress * 396} 396`}
            transform="rotate(-90 533 214)"
          />
          <Label x={505} y={223} size={19}>
            長押し
          </Label>
        </G>
      )}
      <Rect x={508} y={329} width={120} height={44} rx={22} fill={ink} />
      <Label x={526} y={359} size={22}>
        あと24分
      </Label>
    </Svg>
  );
}
function Glass({ joined, night }: { joined: boolean; night: boolean }) {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 642 410">
      <Defs>
        {[
          ["o", orange],
          ["p", pink],
          ["b", "#3D5AFE"],
        ].map(([id, c]) => (
          <RadialGradient key={id} id={id}>
            <Stop offset="0" stopColor={c} stopOpacity={0.8} />
            <Stop offset="1" stopColor={c} stopOpacity={0} />
          </RadialGradient>
        ))}
      </Defs>
      <Rect width={642} height={410} rx={40} fill="#F5F0FF" />
      <Ellipse
        cx={130}
        cy={106}
        rx={night ? 170 : 230}
        ry={230}
        fill="url(#o)"
      />
      <Ellipse cx={460} cy={40} rx={180} ry={180} fill="url(#p)" />
      <Ellipse cx={550} cy={365} rx={260} ry={280} fill="url(#b)" />
      <Rect
        x={36}
        y={40}
        width={569}
        height={330}
        rx={48}
        fill="white"
        fillOpacity={joined ? 0.22 : 0.12}
        stroke="white"
        strokeWidth={3}
      />
      <Path
        d="M105 222 C105 171 206 171 206 222 L206 243 C206 295 105 295 105 243 Z"
        fill="#F0EFFB"
      />
      <Path
        d="M137 132 C137 107 175 107 175 132 L175 193 C175 219 137 219 137 193 Z"
        fill="#EDEBFA"
      />
      {joined && (
        <G>
          <Circle
            cx={153}
            cy={135}
            r={47}
            fill="none"
            stroke="white"
            strokeWidth={3}
          />
          <Circle
            cx={153}
            cy={135}
            r={64}
            fill="none"
            stroke="white"
            strokeWidth={2}
            opacity={0.65}
          />
        </G>
      )}
      <Circle cx={153} cy={135} r={24} fill={orange} />
      <Label x={141} y={144} size={25}>
        あ
      </Label>
      <Label x={285} y={143} size={45} fill={ink}>
        カフェ
      </Label>
      <Label x={285} y={181} size={21} fill="#555555">
        今日 15:00 · 駅ナカ
      </Label>
      <Face x={305} y={246} value="り" size={39} />
      <Face x={348} y={246} value="ゆ" size={39} />
      {joined ? (
        <Face x={391} y={246} value="わ" color={pink} size={39} />
      ) : (
        <Circle
          cx={391}
          cy={246}
          r={18}
          stroke="#9999AA"
          strokeWidth={4}
          fill="none"
          strokeDasharray="7 7"
        />
      )}
      <Rect x={456} y={307} width={124} height={43} rx={22} fill="#E4E5FF" />
      <Label x={476} y={336} size={22} fill="black">
        あと24分
      </Label>
    </Svg>
  );
}
function Last({ joined, sway }: { joined: boolean; sway: number }) {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 658 395">
      <Rect width={658} height={395} rx={48} fill={ink} />
      <Label x={44} y={124} size={23} fill="#EEEEEE">
        カラオケ · 今日 18:30 · 駅前
      </Label>
      {joined ? (
        <G>
          <Label x={44} y={277} size={119}>
            満員！
          </Label>
          {["あ", "り", "ゆ", "わ", "け"].map((v, i) => (
            <Face
              key={v}
              x={66 + i * 55}
              y={329}
              value={v}
              color={i === 3 ? orange : "white"}
              size={47}
            />
          ))}
          <Label x={346} y={336} size={20} fill="#CCCCCC">
            指が下りて、集合へ
          </Label>
        </G>
      ) : (
        <G>
          <Label x={43} y={282} size={126}>
            あと
          </Label>
          <G transform={`rotate(${sway} 348 290)`}>
            <Path
              d="M299 205 C306 189 323 199 349 199 C377 199 397 218 398 244 L398 260 C398 284 379 300 356 300 L335 300 C309 300 299 284 297 264 Z"
              fill={orange}
            />
            <Path
              d="M331 154 C331 129 368 129 368 154 L368 216 C368 241 331 241 331 216 Z"
              fill={orange}
              stroke={ink}
              strokeWidth={6}
            />
            <Path
              d="M298 241 L344 241 C366 241 366 270 344 270 L298 270 C282 270 282 241 298 241 Z"
              fill={orange}
              stroke={ink}
              strokeWidth={6}
            />
            <Path
              d="M368 234 L399 234 M362 258 L399 258"
              stroke={ink}
              strokeWidth={6}
            />
          </G>
          <Label x={431} y={282} size={126}>
            人
          </Label>
          <Label x={44} y={347} size={23} fill={orange}>
            このゆび、とまれ。 — 最後の1席
          </Label>
          <Label x={532} y={359} size={22}>
            あと6分
          </Label>
        </G>
      )}
    </Svg>
  );
}
function Demo({ no, name }: { no: number; name: string }) {
  const [joined, setJoined] = useState(false),
    [progress, setProgress] = useState(0),
    [night, setNight] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const start = useRef(0);
  const [sway, setSway] = useState(0);
  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
    },
    [],
  );
  useEffect(() => {
    if (
      no !== 12 ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const t = setInterval(() => setSway(Math.sin(Date.now() / 750) * 3), 40);
    return () => clearInterval(t);
  }, [no]);
  const stop = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    if (Date.now() - start.current >= 1000) {
      setJoined((v) => !v);
      try {
        navigator.vibrate?.(25);
      } catch {}
    }
    setProgress(0);
  };
  return (
    <View style={{ marginTop: 28 }}>
      <Text style={{ fontSize: 13, color: "#999", fontWeight: "800" }}>
        IDEA {no}
      </Text>
      <Text
        style={{
          fontSize: 23,
          fontWeight: "900",
          marginTop: 4,
          marginBottom: 12,
        }}
      >
        {name}
      </Text>
      <View
        style={{ backgroundColor: "#F3F2EF", padding: 12, borderRadius: 24 }}
      >
        <Text
          style={{
            color: "#888",
            fontSize: 12,
            fontWeight: "800",
            marginBottom: 10,
          }}
        >
          {joined ? "参加後" : "参加前"}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`案${no} ${joined ? "参加取消" : "参加"}${no === 10 ? " 長押し" : ""}`}
          onPress={no === 10 ? undefined : () => setJoined((v) => !v)}
          onPressIn={
            no === 10
              ? () => {
                  start.current = Date.now();
                  timer.current = setInterval(
                    () =>
                      setProgress(
                        Math.min(1, (Date.now() - start.current) / 1000),
                      ),
                    24,
                  );
                }
              : undefined
          }
          onPressOut={no === 10 ? stop : undefined}
          style={{
            width: "100%",
            aspectRatio: no === 11 ? 642 / 410 : 658 / 395,
          }}
        >
          {no === 10 ? (
            <Stamp joined={joined} progress={progress} />
          ) : no === 11 ? (
            <Glass joined={joined} night={night} />
          ) : (
            <Last joined={joined} sway={sway} />
          )}
        </Pressable>
      </View>
      <Text
        style={{ fontSize: 12, color: "#777", lineHeight: 20, marginTop: 10 }}
      >
        {no === 10
          ? "円を1秒長押しして離すと、指紋の参加スタンプ。もう一度長押しで取り消し。"
          : no === 11
            ? "カードにタップすると参加。指先の二重の波紋と「わ」が現れ、ガラスが少し曇ります。"
            : "最後の1席。カードをタップすると指が下りて「満員！」に。もう一度で戻ります。"}
      </Text>
      {no === 11 && (
        <Pressable
          onPress={() => setNight((v) => !v)}
          style={{ alignSelf: "flex-start", padding: 8 }}
        >
          <Text style={{ fontSize: 12 }}>
            背景：{night ? "夜（青）" : "朝（オレンジ）"} ↔
          </Text>
        </Pressable>
      )}
    </View>
  );
}
export function PreviewF4() {
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "white" }}
      contentContainerStyle={{
        width: "100%",
        maxWidth: 390,
        alignSelf: "center",
        padding: 16,
        paddingTop: 30,
        paddingBottom: 48,
      }}
    >
      <Text style={{ fontWeight: "900", fontSize: 18 }}>この指とまれ</Text>
      <Text
        style={{ fontSize: 11, color: "#999", letterSpacing: 2, marginTop: 7 }}
      >
        DESIGN IDEAS / 10—12
      </Text>
      <Demo no={10} name="指印スタンプ" />
      <Demo no={11} name="すりガラス×ぷっくり指" />
      <Demo no={12} name="「あと1人」タイポ" />
      <Text style={{ fontSize: 11, color: "#999", marginTop: 28 }}>
        PDF再現 · ローカル状態のみ / API通信なし
      </Text>
    </ScrollView>
  );
}
