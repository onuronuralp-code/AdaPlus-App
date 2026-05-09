import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import ReAnimated, {
    Easing,
    interpolate,
    useAnimatedProps,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withRepeat,
    withSequence,
    withTiming,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";

const CORAL = "#EA580C";
const NAVY = "#0D1B2A";

// Reanimated-animated SVG Path (animates the `d` attribute via worklet)
const AnimatedPath = ReAnimated.createAnimatedComponent(Path);

//
// Wing shape design — coordinate system:
//   Body centre at (0, 80); y increases downward.
//   Using absolute values so all Y coords stay positive → no sign-flip issues.
//
// UP position (Variant C reference — wings curve high):
//   Left:  M 0,80 C -15,70 -52,46 -120,28 C -92,68 -38,80 0,80 Z
// DOWN position (full natural downstroke):
//   Left:  M 0,80 C -14,90 -50,112 -108,134 C -84,108 -38,82 0,80 Z
//
// Right wing is the X-mirror of the left.
//

export default function SplashScreen() {
  const router = useRouter();

  // 0 = wings up (Variant C pose), 1 = wings down (downstroke)
  const wingProg = useSharedValue(0);
  const scale = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const floatY = useSharedValue(0);

  useEffect(() => {
    // Downstroke slightly faster than upstroke — feels like a real seagull
    wingProg.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 680, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 820, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );

    // Bounce-in entrance
    scale.value = withTiming(1, {
      duration: 900,
      easing: Easing.out(Easing.back(1.7)),
    });

    // Gentle soaring float
    floatY.value = withDelay(
      900,
      withRepeat(
        withSequence(
          withTiming(-12, { duration: 2100, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 2100, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      ),
    );

    // Text fades in shortly after entrance
    textOpacity.value = withDelay(
      480,
      withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) }),
    );

    const t = setTimeout(() => router.replace("/(tabs)/explore"), 4200);
    return () => clearTimeout(t);
  }, []);

  // LEFT wing — deforms between Variant C "up" and natural downstroke positions
  // Up:   M 0,80 C -15,70 -52,46 -120,28 C -92,68 -38,80 0,80 Z  (wide upward arc)
  // Down: M 0,80 C -14,90 -50,112 -108,134 C -84,108 -38,82 0,80 Z
  const leftWingProps = useAnimatedProps(() => {
    "worklet";
    const p = wingProg.value;
    const l = (a: number, b: number) => +(a + (b - a) * p).toFixed(1);
    return {
      d: `M 0,80 C ${l(-15, -14)},${l(70, 90)} ${l(-52, -50)},${l(46, 112)} ${l(-120, -108)},${l(28, 134)} C ${l(-92, -84)},${l(68, 108)} ${l(-38, -38)},${l(80, 82)} 0,80 Z`,
    };
  });

  // RIGHT wing — exact X-mirror of left
  const rightWingProps = useAnimatedProps(() => {
    "worklet";
    const p = wingProg.value;
    const l = (a: number, b: number) => +(a + (b - a) * p).toFixed(1);
    return {
      d: `M 0,80 C ${l(15, 14)},${l(70, 90)} ${l(52, 50)},${l(46, 112)} ${l(120, 108)},${l(28, 134)} C ${l(92, 84)},${l(68, 108)} ${l(38, 38)},${l(80, 82)} 0,80 Z`,
    };
  });

  const seagullStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateY: floatY.value }],
    opacity: interpolate(scale.value, [0, 0.3, 1], [0, 1, 1]),
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [
      { translateY: interpolate(textOpacity.value, [0, 1], [20, 0]) },
    ],
  }));

  return (
    <View style={styles.container}>
      <ReAnimated.View style={seagullStyle}>
        <Svg
          width={270}
          height={132}
          viewBox="-135 18 270 132"
          accessibilityElementsHidden
        >
          <AnimatedPath animatedProps={leftWingProps} fill={CORAL} />
          <AnimatedPath animatedProps={rightWingProps} fill={CORAL} />
        </Svg>
      </ReAnimated.View>

      <ReAnimated.View style={[styles.textWrap, textStyle]}>
        <View style={styles.logoRow}>
          <Text style={[styles.logoText, { color: NAVY }]}>Ada</Text>
          <Text style={[styles.logoText, { color: CORAL }]}>Plus</Text>
        </View>
        <Text style={styles.tagline}>Adaları keşfet</Text>
      </ReAnimated.View>

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
