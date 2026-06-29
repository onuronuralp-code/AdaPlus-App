import { useRouter } from "expo-router";
import * as ExpoSplashScreen from "expo-splash-screen";
import {
  Poppins_500Medium,
  useFonts,
} from "@expo-google-fonts/poppins";
import React, { useEffect } from "react";
import { Image, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

const NAVY = "#1E3A5F";
const SEA = "#2F84C8";

export default function SplashScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [fontsLoaded] = useFonts({ Poppins_500Medium });

  useEffect(() => {
    if (!fontsLoaded) return;
    ExpoSplashScreen.hideAsync();
    const t = setTimeout(() => router.replace("/(tabs)/explore"), 2500);
    return () => clearTimeout(t);
  }, [fontsLoaded]);

  if (!fontsLoaded) return <View style={styles.screen} />;

  const logoW = Math.max(240, Math.min(width * 0.82, 460));
  const tagSize = Math.max(15, Math.min(width * 0.045, 20));

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.center}>
        <Image
          source={require("../assets/images/adaplus-logo.png")}
          style={{ width: logoW, height: logoW * 0.61, resizeMode: "contain" }}
          accessibilityLabel="AdaPlus"
        />
        <Text style={[styles.tag, { fontSize: tagSize, marginTop: 8 }]}>
          Adaları keşfetmeye hazır mısın?
        </Text>
      </View>


    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFFFFF" },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  tag: {
    fontFamily: "Poppins_500Medium",
    color: NAVY,
    opacity: 0.65,
    textAlign: "center",
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
  dotOn: { width: 26, borderRadius: 5, backgroundColor: SEA },
  dotOff: { width: 8, backgroundColor: NAVY, opacity: 0.22 },
});
