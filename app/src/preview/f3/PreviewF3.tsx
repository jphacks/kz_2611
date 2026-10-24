import { ScrollView, Text, View, StyleSheet } from "react-native";
import { FONT, RADIUS } from "../../ui/theme";
import { Idea07 } from "./Idea07";
import { Idea08 } from "./Idea08";
import { Idea09 } from "./Idea09";

const INK = "rgb(17,17,17)";
const MUTED = "rgb(138,138,138)";
const BG = "rgb(245,245,245)";

export function PreviewF3() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>preview/f3 — この指とまれ DESIGN IDEAS</Text>
      <Text style={styles.pageSub}>担当: 07 ワンライン / 08 かぞえゆび / 09 ゆびピン（地図）</Text>

      <Section number="07" name="ワンライン">
        <Idea07 />
      </Section>
      <Section number="08" name="かぞえゆび">
        <Idea08 />
      </Section>
      <Section number="09" name="ゆびピン（地図）">
        <Idea09 />
      </Section>
    </ScrollView>
  );
}

function Section({ number, name, children }: { number: string; name: string; children: any }) {
  return (
    <View style={styles.section}>
      <Text style={styles.heading}>{number}  {name}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  content: { padding: 16, gap: 24, paddingBottom: 48 },
  pageTitle: { fontFamily: FONT, fontSize: 20, fontWeight: "900", color: INK },
  pageSub: { fontFamily: FONT, fontSize: 12, color: MUTED, marginBottom: 8 },
  section: { gap: 12 },
  heading: { fontFamily: FONT, fontSize: 22, fontWeight: "900", color: INK, marginTop: 8 },
});