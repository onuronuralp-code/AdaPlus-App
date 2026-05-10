import { useRouter } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import * as ExpoSplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";

const CORAL = "#EA580C";
const NAVY = "#0D1B2A";

export default function SplashScreen() {
  const router = useRouter();

  const player = useVideoPlayer(require("../assets/video.mp4"), (p) => {
    p.loop = false;
    p.muted = true;
    p.play();
  });

  useEffect(() => {
    ExpoSplashScreen.hideAsync();
    const t = setTimeout(() => router.replace("/(tabs)/explore"), 3000);
    return () => clearTimeout(t);
  }, []);

  return (
    <View style={styles.container}>
      <VideoView
        player={player}
        style={styles.video}
        nativeControls={false}
        contentFit="contain"
      />

      <View style={styles.textWrap}>
        <View style={styles.logoRow}>
          <Text style={[styles.logoText, { color: NAVY }]}>Ada</Text>
          <Text style={[styles.logoText, { color: CORAL }]}>Plus</Text>
        </View>
        <Text style={styles.tagline}>Adaları keşfet</Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>POWERED BY ADAPPLUS</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    gap: 28,
  },
  video: {
    width: 270,
    height: 180,
  },
  textWrap: {
    alignItems: "center",
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  logoText: {
    fontSize: 54,
    fontWeight: "900",
    letterSpacing: -1.5,
  },
  tagline: {
    fontSize: 15,
    color: "#8FA3B8",
    fontWeight: "600",
    marginTop: 6,
    letterSpacing: 0.5,
  },
  footer: {
    position: "absolute",
    bottom: 60,
  },
  footerText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#C8D6E0",
    letterSpacing: 2.5,
  },
});
