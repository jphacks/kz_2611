import React, { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  PanResponder,
  Platform,
  type ViewStyle,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import Svg, { Circle, G, Path, Rect, Text as ST } from "react-native-svg";

const O = "#FF5A36",
  B = "#3D5AFE",
  P = "#FF3EA5",
  K = "#111111",
  S = "#F3F2EF";
const font = "Noto Sans JP, sans-serif";
const txt = { fontFamily: font, color: K };
function Label({
  children,
  white = false,
  size = 14,
}: {
  children: React.ReactNode;
  white?: boolean;
  size?: number;
}) {
  return (
    <Text
      style={[
        txt,
        { fontSize: size, color: white ? "white" : K, fontWeight: "900" },
      ]}
    >
      {children}
    </Text>
  );
}
function Finger({
  size = 100,
  color = K,
  bg = S,
  dot,
  dotted = false,
}: {
  size?: number;
  color?: string;
  bg?: string;
  dot?: string;
  dotted?: boolean;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 -12 100 132">
      <G
        fill={dotted ? "none" : color}
        stroke={dotted ? color : bg}
        strokeWidth={2.8}
        strokeDasharray={dotted ? "4 4" : undefined}
      >
        <Rect x="22" y="57" width="59" height="58" rx="23" />
        <Path d="M61 76H81M61 90H81" fill="none" />
        <Rect x="39" y="17" width="22" height="61" rx="11" />
        <Rect x="16" y="80" width="43" height="18" rx="9" />
      </G>
      {dot && <Circle cx="50" cy="3" r="10" fill={dot} />}
    </Svg>
  );
}
function Swirl({ size = 120, color = K }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <G fill="none" strokeLinecap="round" strokeWidth="5.5">
        <Path d="M55 48C37 54 48 80 64 72C82 61 65 42 65 48" stroke={color} />
        <Path d="M76 42C48 19 22 57 42 80C61 101 91 80 85 57" stroke={color} />
        <Path d="M93 67C104 25 49 9 27 40C6 71 38 110 72 89" stroke={color} />
        <Path
          d="M42 99C4 85 8 40 34 21C70 -4 116 33 104 71C100 86 87 97 72 102"
          stroke={color}
        />
        <Path d="M7 65C2 9 71 -14 105 26C149 78 83 140 24 101" stroke={O} />
      </G>
    </Svg>
  );
}
function One() {
  return (
    <Svg width="138" height="160" viewBox="0 -6 100 126">
      <Path
        d="M24 114C25 99 18 67 42 67V24C42 10 60 10 60 24V62Q68 53 74 63Q82 54 86 66Q98 59 96 86L89 114"
        fill="none"
        stroke={K}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="51" cy="3" r="6" fill={O} />
    </Svg>
  );
}
function Mark({ i }: { i: number }) {
  if (i < 2) return <Finger size={145} dot={i === 1 ? O : undefined} />;
  if (i === 2) return <Swirl size={145} />;
  if (i === 3)
    return (
      <View style={{ alignItems: "center" }}>
        <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
          <Label size={48}>yub</Label>
          <View>
            <View
              style={{
                width: 13,
                height: 13,
                borderRadius: 9,
                backgroundColor: O,
                position: "absolute",
                top: -5,
                left: 3,
              }}
            />
            <Label size={48}>ı</Label>
          </View>
        </View>
        <Text
          style={{
            fontFamily: font,
            color: "#888",
            letterSpacing: 5,
            fontWeight: "700",
          }}
        >
          TOMARE
        </Text>
      </View>
    );
  if (i === 4) return <One />;
  if (i === 5)
    return (
      <View
        style={{
          width: 136,
          height: 136,
          backgroundColor: O,
          borderRadius: 38,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Finger size={90} color="white" bg={O} dot={K} />
      </View>
    );
  if (i === 6)
    return (
      <View style={{ alignItems: "center" }}>
        <Label size={23}>
          この<Text style={{ color: O }}>指</Text>とまれ
        </Label>
        <Label size={23}>
          このゆび、とまれ<Text style={{ color: O }}>.</Text>
        </Label>
      </View>
    );
  if (i === 7)
    return (
      <View
        style={{
          width: 136,
          height: 136,
          backgroundColor: K,
          borderRadius: 38,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Swirl size={110} color="white" />
      </View>
    );
  return (
    <Svg width="136" height="136" viewBox="0 0 136 136">
      <Rect width="136" height="136" rx="38" fill={B} />
      <Rect x="55" y="17" width="27" height="79" rx="14" fill="white" />
      <Circle cx="68.5" cy="110" r="11.5" fill="white" />
    </Svg>
  );
}
const names = [
  "立てた指",
  "指＋とまる点",
  "指紋の渦",
  "yubi の i",
  "一筆の手",
  "アプリアイコン（橙）",
  "ワードマーク",
  "アイコン（指紋）",
  "「！」＝指",
];
const desc = [
  "もっとも素直。幾何学のパーツだけで作るので、太さを揃えれば上品に。",
  "指先に1つの丸＝“とまった誰か”。名前の意味がマーク1つで伝わる。推し。",
  "指を描かずに指を連想させる。いちばんミニマル。最後の1本だけ色。",
  "iの点＝とまった人。英字ロゴにしたい場合。",
  "ワンライン案と連動。手描きの温かさ。",
  "指＋黒い点。ホーム画面で目立つ。",
  "「指」だけ色を変える／句点を色にする。",
  "黒地＋白い渦＋最後の1本だけオレンジ。",
  "感嘆符を指に見立てる。「とまれ！」の勢い。",
];
function Logos() {
  const [picked, pick] = useState(-1);
  return (
    <>
      {names.map((n, i) => (
        <Pressable
          key={n}
          accessibilityRole="button"
          accessibilityLabel={n}
          onPress={() => pick(picked === i ? -1 : i)}
          style={{
            backgroundColor: S,
            borderRadius: 30,
            padding: 20,
            marginBottom: 16,
            borderWidth: 2,
            borderColor: picked === i ? B : S,
          }}
        >
          <View
            style={{
              height: 190,
              alignItems: "center",
              justifyContent: "center",
              transform: [{ scale: picked === i ? 1.12 : 1 }],
            }}
          >
            <Mark i={i} />
          </View>
          <Label>
            {String(i + 1).padStart(2, "0")}　{n}
          </Label>
          <Text style={[txt, { fontSize: 13, lineHeight: 22, marginTop: 6 }]}>
            {desc[i]}
          </Text>
        </Pressable>
      ))}
    </>
  );
}
function Hands({ joined = false }: { joined?: boolean }) {
  return (
    <Svg width="100%" height="108" viewBox="0 0 340 110">
      <G
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <G
          stroke={O}
          strokeDasharray={joined ? undefined : "5 5"}
          transform={joined ? "translate(20 0)" : "translate(-10 0)"}
        >
          <Path d="M-30 47H60M-30 74H60M92 42H138Q151 42 151 51Q151 60 138 60H92M91 38H74Q56 38 56 57V67Q56 82 74 82H101" />
          <Rect x="64" y="47" width="33" height="12" rx="6" />
          <Rect x="83" y="60" width="29" height="11" rx="5" />
          <Rect x="82" y="71" width="26" height="11" rx="5" />
        </G>
        <G stroke="white">
          <Path d="M340 47H272M340 74H272M248 42H187Q173 42 173 51Q173 60 187 60H248M249 38H265Q283 38 283 57V67Q283 82 265 82H240" />
          <Rect x="244" y="47" width="31" height="12" rx="6" />
          <Rect x="225" y="60" width="30" height="11" rx="5" />
          <Rect x="231" y="71" width="26" height="11" rx="5" />
        </G>
        {joined && (
          <G stroke={O}>
            <Circle cx="172" cy="51" r="3" fill={O} />
            <Path d="M172 26V34M158 30L163 37M186 30L181 37M172 69V77M158 73L163 66M186 73L181 66" />
          </G>
        )}
      </G>
    </Svg>
  );
}
const detailNames = [
  "引っぱって更新",
  "読み込み",
  "空っぽの時",
  "通知文言",
  "タブアイコン",
  "参加成功",
];
const detailDesc = [
  "掲示板を下に引くと、指がゆっくり立ち上がる。離すと「ピッ」と最後まで立つ。",
  "3本の指が順番にトントン。待ち時間も世界観に。",
  "点線の指＋「最初に指を立てよう」で募集作成へ誘導。",
  "「〇〇が指を立てました」で通知を統一。参加時は「〇〇がとまりました」。",
  "「誘う」タブだけを指アイコンに（中央強調はせず、形だけ変える）。",
  "どの案でも共通で使える成功アニメ。軽い振動とセットで。",
];
function Detail({ i }: { i: number }) {
  const [on, set] = useState(false),
    [tab, setTab] = useState(1),
    [pull, setPull] = useState(0),
    [beat, setBeat] = useState(1);
  const reduced = useRef(false);
  const pullStart = useRef<number | null>(null);
  const pulled = useRef(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      reduced.current = v;
    });
    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (v) => {
        reduced.current = v;
      },
    );
    return () => sub.remove();
  }, []);
  useEffect(() => {
    if (i !== 1 || !on) return;
    const t = setInterval(() => {
      if (!reduced.current) setBeat((v) => (v + 1) % 3);
    }, 360);
    return () => clearInterval(t);
  }, [i, on]);
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 8,
      onPanResponderMove: (_, g) => setPull(Math.min(55, Math.max(0, g.dy))),
      onPanResponderRelease: () => {
        set(true);
        setPull(0);
      },
    }),
  ).current;
  return (
    <View
      style={{
        backgroundColor: S,
        borderRadius: 30,
        padding: 20,
        marginBottom: 20,
      }}
    >
      <Pressable
        {...(i === 0 ? pan.panHandlers : {})}
        onPointerDown={(event) => {
          if (i === 0) {
            pullStart.current = event.nativeEvent.pageY;
            pulled.current = false;
          }
        }}
        onPointerMove={(event) => {
          if (i === 0 && pullStart.current !== null) {
            const dy = event.nativeEvent.pageY - pullStart.current;
            if (dy > 8) pulled.current = true;
            setPull(Math.max(0, Math.min(55, dy)));
          }
        }}
        onPointerUp={() => {
          if (i === 0) {
            if (pulled.current) set(true);
            setPull(0);
            pullStart.current = null;
          }
        }}
        accessibilityRole="button"
        accessibilityLabel={detailNames[i] + "を試す"}
        onPress={() => {
          if (i === 0 && pulled.current) return;
          set(!on);
        }}
        style={{
          backgroundColor: i === 5 ? K : "white",
          ...(Platform.OS === "web" && i === 0
            ? ({ touchAction: "none" } as ViewStyle)
            : {}),
          borderRadius: 28,
          minHeight: 178,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 24,
          overflow: "hidden",
        }}
      >
        {i === 0 && (
          <>
            <View
              style={{
                transform: [
                  { translateY: pull / 3 },
                  { scaleY: on ? 1 : 0.75 + pull / 180 },
                ],
              }}
            >
              <Finger size={68} color={O} bg="white" />
            </View>
            <Text
              style={{
                color: "#888",
                fontWeight: "700",
                fontSize: 12,
                marginTop: 12,
              }}
            >
              {on ? "更新しました" : "引っぱると指が立ち上がる"}
            </Text>
          </>
        )}
        {i === 1 && (
          <>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {[0, 1, 2].map((x) => (
                <View
                  key={x}
                  style={{
                    transform: [{ translateY: x === beat && on ? -10 : 0 }],
                  }}
                >
                  <Finger
                    size={54}
                    color={x === beat ? O : "#DDD"}
                    bg="white"
                  />
                </View>
              ))}
            </View>
            <Text
              style={{
                color: "#888",
                fontSize: 12,
                marginTop: 18,
                fontWeight: "700",
              }}
            >
              {on ? "指がトントン叩く読み込み" : "タップして読み込みを試す"}
            </Text>
          </>
        )}
        {i === 2 && (
          <>
            <Finger size={82} color={on ? O : "#BBB"} bg="white" dotted={!on} />
            <Text
              style={{
                color: "#888",
                fontSize: 12,
                fontWeight: "700",
                marginTop: 12,
              }}
            >
              {on ? "最初の指を立てました" : "まだ誰も指を立てていません"}
            </Text>
            {on && <Label size={12}>新しい募集：何をして遊ぶ？</Label>}
          </>
        )}
        {i === 3 && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              padding: 10,
            }}
          >
            <View style={{ backgroundColor: O, borderRadius: 16, padding: 5 }}>
              <Finger size={48} color="white" bg={O} />
            </View>
            <View>
              <Label size={13}>
                {on ? "わたし がとまりました" : "あおい が指を立てました"}
              </Label>
              <Text
                style={[txt, { fontSize: 11, color: "#666", marginTop: 5 }]}
              >
                カラオケ 18:30・駅前 — あと{on ? "1" : "2"}人
              </Text>
            </View>
          </View>
        )}
        {i === 4 && (
          <View style={{ flexDirection: "row", width: "100%", padding: 7 }}>
            {["掲示板", "誘う", "トーク", "フォロー", "プロフ"].map((t, x) => (
              <Pressable
                accessibilityRole="tab"
                accessibilityLabel={t}
                accessibilityState={{ selected: tab === x }}
                key={t}
                onPress={() => setTab(x)}
                style={{ flex: 1, alignItems: "center", gap: 6 }}
              >
                {x === 1 ? (
                  <Finger size={35} color={tab === x ? K : "#999"} bg="white" />
                ) : (
                  <Svg width="35" height="35" viewBox="0 0 36 36">
                    <Path
                      d={
                        x === 0
                          ? "M9 5H27Q32 5 32 10V27Q32 32 27 32H9Q4 32 4 27V10Q4 5 9 5Z"
                          : x === 2
                            ? "M5 8H31V25H16L7 32V25H5Z"
                            : x === 3
                              ? "M16 13C16 3 2 3 2 13C2 23 16 23 16 13ZM31 17C31 9 19 9 19 17C19 25 31 25 31 17Z"
                              : "M10 11A8 8 0 1 0 26 11A8 8 0 1 0 10 11M4 34Q18 15 32 34"
                      }
                      stroke={tab === x ? K : "#999"}
                      fill="none"
                      strokeWidth="3"
                    />
                  </Svg>
                )}
                <Text
                  style={{
                    fontFamily: font,
                    fontSize: 10,
                    color: tab === x ? K : "#999",
                    fontWeight: "700",
                  }}
                >
                  {t}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
        {i === 5 && (
          <>
            <Hands joined={on} />
            <Text
              style={{
                color: "#BBB",
                fontWeight: "700",
                fontSize: 12,
                marginBottom: 14,
              }}
            >
              {on ? "参加成功：指先がふれて火花" : "指先にふれて参加"}
            </Text>
          </>
        )}
      </Pressable>
      <Label>
        {String(i + 1).padStart(2, "0")}　{detailNames[i]}
      </Label>
      <Text style={[txt, { fontSize: 13, lineHeight: 22, marginTop: 6 }]}>
        {detailDesc[i]}
      </Text>
      <Text style={{ color: B, fontSize: 11, marginTop: 10 }}>
        {i === 0
          ? "下に引く／タップで更新"
          : i === 4
            ? "各タブをタップ"
            : "タップで試す・もう一度タップで戻す"}
      </Text>
    </View>
  );
}
function Bubble({
  x,
  y,
  t,
  fill = "white",
  ink = B,
  r = 14,
  dash = false,
}: {
  x: number;
  y: number;
  t: string;
  fill?: string;
  ink?: string;
  r?: number;
  dash?: boolean;
}) {
  return (
    <G>
      <Circle
        cx={x}
        cy={y}
        r={r}
        fill={dash ? "none" : fill}
        stroke="white"
        strokeWidth={dash ? 2 : 0}
        strokeDasharray={dash ? "4 4" : undefined}
      />
      <ST
        x={x}
        y={y + 5}
        textAnchor="middle"
        fill={ink}
        fontSize={16}
        fontWeight="900"
        fontFamily={font}
      >
        {t}
      </ST>
    </G>
  );
}
function CardArt({ i, on }: { i: number; on: boolean }) {
  return (
    <Svg width="100%" height="206" viewBox="0 0 340 206">
      <Rect
        width="340"
        height="206"
        rx="25"
        fill={i === 0 ? B : i === 1 ? K : O}
      />
      {i !== 1 && (
        <Path
          d="M0 25Q0 2 25 2H315Q340 2 340 25"
          stroke={K}
          strokeWidth="5"
          fill="none"
        />
      )}
      {i === 0 && (
        <>
          <ST
            x="24"
            y="58"
            fill="white"
            fontSize="29"
            fontWeight="900"
            fontFamily={font}
          >
            ラーメン
          </ST>
          <ST x="24" y="79" fill="white" fontSize="11" fontWeight="700">
            今日 18:30 · 駅前
          </ST>
          <Rect x="33" y="145" width="287" height="12" rx="6" fill="white" />
          <Rect x="6" y="124" width="55" height="60" rx="25" fill="white" />
          <Bubble x={34} y={153} r={19} t="あ" fill={B} ink="white" />
          {[0, 1, 2, 3, 4].map((x) => (
            <Bubble
              key={x}
              x={104 + x * 47}
              y={126}
              t={x < 2 ? ["り", "ゆ"][x] : x === 2 && on ? "わ" : ""}
              fill={x === 2 ? P : "white"}
              ink={x === 2 ? "white" : B}
              dash={x > 1 && !(x === 2 && on)}
            />
          ))}
          {on && (
            <Path
              d="M198 97V90M178 104L172 98M218 104L224 98"
              stroke="white"
              strokeWidth="2"
            />
          )}
          <ST x="24" y="192" fill="white" fontSize="10" fontWeight="700">
            {on
              ? "着地！ あなたがとまりました"
              : "空いている枝をタップ → 飛んでとまる"}
          </ST>
        </>
      )}
      {i === 1 && (
        <>
          <ST
            x="22"
            y="54"
            fill="white"
            fontSize="27"
            fontWeight="900"
            fontFamily={font}
          >
            夜ドライブ
          </ST>
          <ST x="22" y="75" fill="white" fontSize="11" fontWeight="700">
            {on ? "参加しました · 今日 21:00" : "今日 21:00 · 駅前"}
          </ST>
          <Bubble x={301} y={51} t="あ" ink={K} />
          <G transform="translate(0 82)">
            <HandsSvg on={on} />
          </G>
        </>
      )}
      {i === 2 && (
        <>
          <Rect x="48" y="36" width="51" height="162" rx="25" fill="#FF967E" />
          <Bubble x={73.5} y={58} r={22} t="あ" ink={O} />
          {[0, 1, 2, 3, 4].map((x) => (
            <Rect
              key={x}
              x="51"
              y={89 + x * 16}
              width="45"
              height="12"
              rx="6"
              fill={x < (on ? 3 : 2) ? "white" : "#FFAA96"}
              stroke={x === 2 && on ? K : "none"}
              strokeWidth="3"
            />
          ))}
          <Path d="M15 206Q23 170 69 171Q120 168 128 206" fill="white" />
          <Rect
            x="10"
            y="192"
            width="62"
            height="23"
            rx="11"
            fill="white"
            stroke={O}
            strokeWidth="3"
          />
          <ST
            x="142"
            y="65"
            fill="white"
            fontSize="29"
            fontWeight="900"
            fontFamily={font}
          >
            カラオケ
          </ST>
          <ST x="142" y="86" fill="white" fontSize="11" fontWeight="700">
            今日 18:30 · 駅前
          </ST>
          {["り", "ゆ", on ? "わ" : ""].map((t, x) => (
            <Bubble
              key={x}
              x={166 + x * 22}
              y={121}
              r={12}
              t={t}
              fill={x === 2 ? K : x === 1 ? "#FFE8A1" : "#FFD8CC"}
              ink={x === 2 ? "white" : K}
              dash={!on && x === 2}
            />
          ))}
          <ST x="142" y="155" fill="white" fontSize="10" fontWeight="700">
            {on ? "あなたが3つ目の節に" : "指の節が1人ずつ埋まる"}
          </ST>
        </>
      )}
      <Rect x="262" y="173" width="64" height="23" rx="12" fill={K} />
      <ST
        x="294"
        y="189"
        fill="white"
        fontSize="11"
        textAnchor="middle"
        fontWeight="900"
      >
        あと24分
      </ST>
    </Svg>
  );
}
function HandsSvg({ on }: { on: boolean }) {
  return (
    <G fill="none" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <G stroke={O} strokeDasharray={on ? undefined : "5 5"}>
        <Path
          d={
            on
              ? "M0 35H70M0 64H70M96 31H161Q176 31 176 40Q176 49 161 49H96M96 27H82Q62 27 62 47V55Q62 72 82 72H107"
              : "M0 35H42M0 64H42M65 31H124Q139 31 139 40Q139 49 124 49H65M65 27H52Q32 27 32 47V55Q32 72 52 72H77"
          }
        />
        <Rect x={on ? 69 : 39} y="35" width="34" height="12" rx="6" />
        <Rect x={on ? 88 : 58} y="49" width="29" height="11" rx="5" />
        <Rect x={on ? 88 : 58} y="60" width="27" height="11" rx="5" />
      </G>
      <G stroke="white">
        <Path d="M340 35H282M340 64H282M247 31H193Q179 31 179 40Q179 49 193 49H247M247 27H262Q282 27 282 47V55Q282 72 262 72H239" />
        <Rect x="244" y="35" width="31" height="12" rx="6" />
        <Rect x="225" y="49" width="30" height="11" rx="5" />
        <Rect x="231" y="60" width="26" height="11" rx="5" />
      </G>
      {on && (
        <G stroke={O}>
          <Path d="M177 16V23M163 20L167 26M191 20L187 26M177 57V64M163 61L167 55M191 61L187 55" />
          <Circle cx="177" cy="40" r="3" fill={O} />
        </G>
      )}
    </G>
  );
}
const combos = [
  "“とまる”で統一する",
  "黒×線画で、いちばん洗練",
  "現行カードを活かして進化",
];
const comboSub = [
  "02 とまり木 ＋ ロゴ「指＋とまる点」＋ 10 指印スタンプ",
  "03 指先タッチ ＋ 07 ワンライン ＋ ロゴ「一筆の手」",
  "01 指の節ゲージ ＋ 05 指紋リング（ロゴ）＋ 12「あと1人」",
];
function Combo({ i }: { i: number }) {
  const [on, set] = useState(false),
    [drag, sd] = useState(0),
    [stamped, stamp] = useState(false);
  const v = useRef(new Animated.Value(0)).current;
  const reduced = useRef(false);
  const [flying, setFlying] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      reduced.current = value;
    });
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (value) => {
        reduced.current = value;
        if (value) {
          v.stopAnimation();
          v.setValue(0);
          setFlying(false);
        }
      },
    );
    return () => {
      subscription.remove();
      v.stopAnimation();
    };
  }, [v]);
  const finish = () => {
    set(true);
    if (reduced.current) return;
    if (i === 0) {
      setFlying(true);
      v.setValue(-70);
      Animated.timing(v, {
        toValue: 0,
        duration: 430,
        useNativeDriver: false,
      }).start(() => setFlying(false));
    } else {
      Animated.sequence([
        Animated.timing(v, {
          toValue: -8,
          duration: 160,
          useNativeDriver: false,
        }),
        Animated.spring(v, { toValue: 0, useNativeDriver: false }),
      ]).start();
    }
  };
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderMove: (_, g) => sd(Math.min(35, Math.max(0, g.dx / 3))),
      onPanResponderRelease: (_, g) => {
        sd(0);
        if (g.dx > 45) finish();
        if (g.dx < -45) set(false);
      },
    }),
  ).current;
  const pointerStart = useRef<number | null>(null);
  return (
    <View
      style={{
        backgroundColor: [O, K, B][i],
        padding: 20,
        borderRadius: 30,
        marginBottom: 24,
      }}
    >
      <Label white size={64}>
        {"ABC"[i]}
      </Label>
      <Label white size={22}>
        {combos[i]}
      </Label>
      <View style={{ height: 12 }} />
      <Label white size={13}>
        {comboSub[i]}
      </Label>
      <Text
        style={{
          fontFamily: font,
          color: "white",
          fontSize: 13,
          lineHeight: 23,
          marginTop: 20,
          marginBottom: 28,
        }}
      >
        {
          [
            "名前の意味（とまる）を、ロゴ・参加操作・確定演出で一貫させる。一番わかりやすく、発表で説明しやすい。",
            "今のスワイプ実装を流用しつつ見た目を大人っぽく。「おしゃれ」を最優先するならこれ。",
            "スケッチのカード構成（左リング・右情報・外枠ゲージ）をそのまま残し、リングだけを指モチーフに置き換える。手戻り最小。",
          ][i]
        }
      </Text>
      <View
        style={{
          backgroundColor: "white",
          borderRadius: 21,
          padding: 14,
          paddingVertical: 18,
        }}
      >
        <Animated.View
          style={{
            transform: [{ translateY: i === 0 ? 0 : v }, { translateX: drag }],
          }}
        >
          <Pressable
            {...pan.panHandlers}
            style={
              Platform.OS === "web"
                ? ({ touchAction: "pan-y" } as ViewStyle)
                : undefined
            }
            onPointerDown={(event) => {
              pointerStart.current = event.nativeEvent.pageX;
            }}
            onPointerUp={(event) => {
              if (pointerStart.current !== null) {
                const dx = event.nativeEvent.pageX - pointerStart.current;
                if (dx > 45) finish();
                if (dx < -45) {
                  set(false);
                  stamp(false);
                }
              }
              pointerStart.current = null;
            }}
            accessibilityRole="button"
            accessibilityLabel={"組み合わせ" + "ABC"[i] + "に参加"}
            onPress={finish}
            onLongPress={() => {
              finish();
              if (i === 0) stamp(true);
            }}
            delayLongPress={600}
          >
            <CardArt i={i} on={on && !flying} />
            {i === 0 && flying && (
              <Animated.View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  left: "54%",
                  top: 106,
                  width: 25,
                  height: 25,
                  borderRadius: 13,
                  backgroundColor: P,
                  alignItems: "center",
                  justifyContent: "center",
                  transform: [{ translateY: v }],
                }}
              >
                <Text style={{ color: "white", fontWeight: "900" }}>わ</Text>
              </Animated.View>
            )}
            {stamped && i === 0 && (
              <View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  right: 24,
                  top: 60,
                  transform: [{ rotate: "-12deg" }],
                  opacity: 0.7,
                }}
              >
                <Swirl size={76} color={K} />
                <Text
                  style={{
                    position: "absolute",
                    top: 30,
                    left: 18,
                    color: K,
                    fontWeight: "900",
                    fontSize: 16,
                  }}
                >
                  参加
                </Text>
              </View>
            )}
          </Pressable>
        </Animated.View>
      </View>
      <Text style={{ fontSize: 11, color: "white", marginTop: 12 }}>
        右スワイプ／タップ{i === 0 ? "／長押しで指印" : ""}で参加
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={"組み合わせ" + "ABC"[i] + "を戻す"}
        onPress={() => {
          set(false);
          stamp(false);
        }}
        style={{ paddingVertical: 12 }}
      >
        <Text
          style={{
            fontSize: 12,
            color: "white",
            textDecorationLine: "underline",
          }}
        >
          {on ? "参加済み · もう一度試す" : "参加前 · リセット"}
        </Text>
      </Pressable>
    </View>
  );
}
export function PreviewF6() {
  const [page, sp] = useState(() =>
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("p") || "L"
      : "L",
  );
  return (
    <View style={{ flex: 1, backgroundColor: "white", alignItems: "center" }}>
      <View style={{ width: "100%", maxWidth: 390, flex: 1 }}>
        <View style={{ padding: 16, borderBottomWidth: 1, borderColor: S }}>
          <Text
            style={{
              fontFamily: font,
              color: B,
              fontSize: 10,
              fontWeight: "900",
              letterSpacing: 2,
            }}
          >
            この指とまれ / PDF DESIGN PREVIEW
          </Text>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
            {["L", "M", "R"].map((t, i) => (
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: page === t }}
                key={t}
                onPress={() => sp(t)}
                style={{
                  flex: 1,
                  minHeight: 44,
                  backgroundColor: page === t ? B : S,
                  borderRadius: 12,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Label white={page === t} size={11}>
                  {t} {["ロゴ9案", "細部6つ", "組み合わせ"][i]}
                </Label>
              </Pressable>
            ))}
          </View>
        </View>
        <ScrollView
          key={page}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        >
          <Text
            style={{
              color: B,
              fontFamily: font,
              fontWeight: "900",
              fontSize: 12,
              letterSpacing: 2,
              marginTop: 12,
            }}
          >
            {page === "L"
              ? "L — LOGO & ICON"
              : page === "M"
                ? "M — DETAILS"
                : "R — RECOMMEND"}
          </Text>
          <View style={{ marginTop: 12, marginBottom: 24 }}>
            <Label size={26}>
              {page === "L"
                ? "ロゴ・アイコン 9案"
                : page === "M"
                  ? "どの案でも使える、\n細部の演出"
                  : "おすすめの組み合わせ"}
            </Label>
          </View>
          {page === "L" ? (
            <Logos />
          ) : page === "M" ? (
            detailNames.map((_, i) => <Detail key={i} i={i} />)
          ) : (
            <>
              {combos.map((_, i) => (
                <Combo key={i} i={i} />
              ))}
              <Text style={[txt, { fontSize: 12, lineHeight: 22 }]}>
                迷ったら：ロゴ＝「指＋とまる点」はどの組み合わせにも合います。まずロゴを決め、参加操作は
                03（実装が軽い）か 02（デモ映え）で比較するのがおすすめ。
              </Text>
            </>
          )}
          <Text
            style={{
              color: "#888",
              fontSize: 10,
              textAlign: "center",
              marginTop: 16,
            }}
          >
            PDF p.{page === "L" ? "17" : page === "M" ? "18" : "19"} ·
            APIを呼ばないローカルプレビュー
          </Text>
        </ScrollView>
      </View>
    </View>
  );
}
