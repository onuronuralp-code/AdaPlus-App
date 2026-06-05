import { useRouter } from "expo-router";
import * as ExpoSplashScreen from "expo-splash-screen";
import {
  Poppins_500Medium,
  Poppins_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/poppins";
import React, { useEffect } from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path, Rect } from "react-native-svg";

const CORAL = "#EC5C46";
const INK = "#23262B";

function AdaPlusMark({ width }: { width: number }) {
  return (
    <Svg width={width} height={width * 0.44} viewBox="0 32 100 44">
      <Path
        d="M6 67 C10 60 15 59 19 61 C23 63 25 55 31 50 C37 45 41 35 48 34 C53 33 56 39 60 44 C65 50 71 54 77 52 C83 50 87 59 94 67 Z"
        fill={CORAL}
      />
      <Rect x="6" y="71" width="30" height="3.2" rx="1.6" fill={CORAL} />
      <Rect x="42" y="71" width="20" height="3.2" rx="1.6" fill={CORAL} />
      <Rect x="68" y="71" width="26" height="3.2" rx="1.6" fill={CORAL} />
    </Svg>
  );
}

export default function SplashScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [fontsLoaded] = useFonts({ Poppins_500Medium, Poppins_800ExtraBold });

  useEffect(() => {
    if (!fontsLoaded) return;
    ExpoSplashScreen.hideAsync();
    const t = setTimeout(() => router.replace("/(tabs)/explore"), 2500);
    return () => clearTimeout(t);
  }, [fontsLoaded]);

  if (!fontsLoaded) return <View style={styles.screen} />;

  const markW = Math.max(120, Math.min(width * 0.42, 196));
  const wmSize = Math.max(40, Math.min(width * 0.16, 64));
  const tagSize = Math.max(14, Math.min(width * 0.045, 19));

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.center}>
        <AdaPlusMark width={markW} />
        <Text style={[styles.wm, { fontSize: wmSize, marginTop: markW * 0.12 }]}>
          <Text style={{ color: INK }}>Ada</Text>
          <Text style={{ color: CORAL }}>Plus</Text>
        </Text>
        <Text style={[styles.tag, { fontSize: tagSize }]}>
          Adaları keşfetmeye hazır mısın?
        </Text>
      </View>

      <View style={[styles.dots, { bottom: insets.bottom + 32 }]}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={[styles.dot, i === 0 ? styles.dotOn : styles.dotOff]} />
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  wm: {
    fontFamily: "Poppins_800ExtraBold",
    letterSpacing: -1.5,
  },
  tag: {
    fontFamily: "Poppins_500Medium",
    color: INK,
    opacity: 0.6,
    textAlign: "center",
    marginTop: 10,
  },
  dots: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  dot: { height: 8, borderRadius: 4 },
  dotOn: { width: 26, borderRadius: 5, backgroundColor: CORAL },
  dotOff: { width: 8, backgroundColor: INK, opacity: 0.22 },
});
