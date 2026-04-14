import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Dimensions, StyleSheet, Text as RNText, View } from 'react-native';
import Animated, {
    Easing,
    interpolate,
    runOnJS,
    useAnimatedProps,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withRepeat,
    withTiming,
} from 'react-native-reanimated';
import Svg, {
    Defs,
    LinearGradient,
    Path,
    RadialGradient,
    Stop,
    Circle,
    Filter,
    FeGaussianBlur,
    G,
    ClipPath,
    Rect,
    Text,
} from 'react-native-svg';

const { width: W } = Dimensions.get('window');
const PLUS_SIZE = 120;
const ADA_TEXT_W = 210;
const GAP = 6;
const TOTAL_W = ADA_TEXT_W + GAP + PLUS_SIZE;
const SHIFT = (ADA_TEXT_W + GAP) / 2;

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

export default function SplashScreen() {
    const router = useRouter();

    const scaleIn = useSharedValue(0);       // Phase 1: plus entrance
    const slideProgress = useSharedValue(0); // Phase 2: ada slides out
    const gradientRot = useSharedValue(0);   // Continuous gradient rotation

    const navigateAway = () => {
        router.replace('/(tabs)/explore');
    };

    useEffect(() => {
        // Phase 1: Plus sign spins in
        scaleIn.value = withTiming(1, {
            duration: 850,
            easing: Easing.out(Easing.back(1.5)),
        }, (done) => {
            if (done) {
                // Phase 2: "ada" slides out from plus to the left
                slideProgress.value = withTiming(1, {
                    duration: 800,
                    easing: Easing.out(Easing.cubic),
                });
            }
        });

        // Continuous gradient rotation
        gradientRot.value = withRepeat(
            withTiming(1, { duration: 5000, easing: Easing.linear }),
            -1,
            false
        );

        // Navigate away after animations
        withDelay(4000, 0);
        // Use a separate delayed trigger for navigation
        scaleIn.value; // just referencing
        // Navigate after 4 seconds total
        const navTimer = setTimeout(() => {
            navigateAway();
        }, 4000);

        return () => clearTimeout(navTimer);
    }, []);

    // Row container shifts left as "ada" appears, keeping everything centered
    const rowShiftStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: interpolate(slideProgress.value, [0, 1], [0, -SHIFT]) },
        ],
    }));

    // Plus entrance: spin + scale
    const plusStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: scaleIn.value },
            { rotate: `${interpolate(scaleIn.value, [0, 1], [-180, 0])}deg` },
        ],
        opacity: interpolate(scaleIn.value, [0, 0.2, 1], [0, 1, 1]),
    }));

    // "ada" text: slides from behind plus to the left
    const adaStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: interpolate(slideProgress.value, [0, 1], [ADA_TEXT_W + GAP, 0]) },
        ],
        opacity: interpolate(slideProgress.value, [0, 0.2, 1], [0, 1, 1]),
    }));

    // Animated gradient props (shared rotation)
    const gradProps = useAnimatedProps(() => {
        const rot = gradientRot.value * Math.PI * 2;
        return {
            x1: `${50 + 70 * Math.cos(rot)}%`,
            y1: `${50 + 70 * Math.sin(rot)}%`,
            x2: `${50 - 70 * Math.cos(rot)}%`,
            y2: `${50 - 70 * Math.sin(rot)}%`,
        };
    });

    const gradProps2 = useAnimatedProps(() => {
        const rot = gradientRot.value * Math.PI * 2;
        return {
            x1: `${50 + 70 * Math.cos(rot)}%`,
            y1: `${50 + 70 * Math.sin(rot)}%`,
            x2: `${50 - 70 * Math.cos(rot)}%`,
            y2: `${50 - 70 * Math.sin(rot)}%`,
        };
    });

    // Plus sign SVG path (rounded cross)
    const armW = 34;
    const r = 10;
    const half = PLUS_SIZE / 2;
    const armHalf = armW / 2;
    const plusPath = `M ${half - armHalf + r},0 L ${half + armHalf - r},0 Q ${half + armHalf},0 ${half + armHalf},${r} L ${half + armHalf},${half - armHalf} L ${PLUS_SIZE - r},${half - armHalf} Q ${PLUS_SIZE},${half - armHalf} ${PLUS_SIZE},${half - armHalf + r} L ${PLUS_SIZE},${half + armHalf - r} Q ${PLUS_SIZE},${half + armHalf} ${PLUS_SIZE - r},${half + armHalf} L ${half + armHalf},${half + armHalf} L ${half + armHalf},${PLUS_SIZE - r} Q ${half + armHalf},${PLUS_SIZE} ${half + armHalf - r},${PLUS_SIZE} L ${half - armHalf + r},${PLUS_SIZE} Q ${half - armHalf},${PLUS_SIZE} ${half - armHalf},${PLUS_SIZE - r} L ${half - armHalf},${half + armHalf} L ${r},${half + armHalf} Q 0,${half + armHalf} 0,${half + armHalf - r} L 0,${half - armHalf + r} Q 0,${half - armHalf} ${r},${half - armHalf} L ${half - armHalf},${half - armHalf} L ${half - armHalf},${r} Q ${half - armHalf},0 ${half - armHalf + r},0 Z`;

    return (
        <Animated.View style={styles.container}>
            {/* Soft Central Glow */}
            <View style={[styles.absoluteCentered, { opacity: 0.15 }]}>
                <Svg width={400} height={400}>
                    <Defs>
                        <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
                            <Stop offset="0" stopColor="#3B82F6" stopOpacity="0.5" />
                            <Stop offset="1" stopColor="#fff" stopOpacity="0" />
                        </RadialGradient>
                    </Defs>
                    <Circle cx={200} cy={200} r={200} fill="url(#glow)" />
                </Svg>
            </View>

            {/* Logo Row: [ada] [+] */}
            <Animated.View style={[styles.logoRow, rowShiftStyle]}>

                {/* "ada" text */}
                <Animated.View style={[{ width: ADA_TEXT_W, height: PLUS_SIZE, marginRight: GAP }, adaStyle]}>
                    <Svg width={ADA_TEXT_W} height={PLUS_SIZE} viewBox={`0 0 ${ADA_TEXT_W} ${PLUS_SIZE}`}>
                        <Defs>
                            <AnimatedLinearGradient id="adaGrad" animatedProps={gradProps2}>
                                <Stop offset="0%" stopColor="#3B82F6" />
                                <Stop offset="15%" stopColor="#8B5CF6" />
                                <Stop offset="35%" stopColor="#EF4444" />
                                <Stop offset="55%" stopColor="#F97316" />
                                <Stop offset="75%" stopColor="#FACC15" />
                                <Stop offset="90%" stopColor="#22C55E" />
                                <Stop offset="100%" stopColor="#3B82F6" />
                            </AnimatedLinearGradient>

                            <Filter id="blurText">
                                <FeGaussianBlur in="SourceGraphic" stdDeviation="4" />
                            </Filter>

                            <ClipPath id="textClip">
                                <Text
                                    x="2"
                                    y={PLUS_SIZE * 0.82}
                                    fontSize={PLUS_SIZE * 0.92}
                                    fontWeight="900"
                                    fontFamily="System"
                                >
                                    ada
                                </Text>
                            </ClipPath>

                            <LinearGradient id="sheenText" x1="0%" y1="0%" x2="100%" y2="100%">
                                <Stop offset="0%" stopColor="#fff" stopOpacity="0.35" />
                                <Stop offset="100%" stopColor="#fff" stopOpacity="0" />
                            </LinearGradient>
                        </Defs>

                        <G clipPath="url(#textClip)">
                            <Rect
                                x="-20"
                                y="-20"
                                width={ADA_TEXT_W + 40}
                                height={PLUS_SIZE + 40}
                                fill="url(#adaGrad)"
                                filter="url(#blurText)"
                            />
                            <Rect
                                x="0"
                                y="0"
                                width={ADA_TEXT_W}
                                height={PLUS_SIZE}
                                fill="url(#sheenText)"
                            />
                        </G>
                    </Svg>
                </Animated.View>

                {/* Plus sign */}
                <Animated.View style={[styles.plusWrapper, plusStyle]}>
                    <Svg width={PLUS_SIZE} height={PLUS_SIZE} viewBox={`0 0 ${PLUS_SIZE} ${PLUS_SIZE}`}>
                        <Defs>
                            <AnimatedLinearGradient id="plusGrad" animatedProps={gradProps}>
                                <Stop offset="0%" stopColor="#3B82F6" />
                                <Stop offset="15%" stopColor="#8B5CF6" />
                                <Stop offset="35%" stopColor="#EF4444" />
                                <Stop offset="55%" stopColor="#F97316" />
                                <Stop offset="75%" stopColor="#FACC15" />
                                <Stop offset="90%" stopColor="#22C55E" />
                                <Stop offset="100%" stopColor="#3B82F6" />
                            </AnimatedLinearGradient>

                            <Filter id="blurPlus">
                                <FeGaussianBlur in="SourceGraphic" stdDeviation="5" />
                            </Filter>

                            <ClipPath id="plusClip">
                                <Path d={plusPath} />
                            </ClipPath>

                            <LinearGradient id="sheenPlus" x1="0%" y1="0%" x2="100%" y2="100%">
                                <Stop offset="0%" stopColor="#fff" stopOpacity="0.4" />
                                <Stop offset="100%" stopColor="#fff" stopOpacity="0" />
                            </LinearGradient>
                        </Defs>

                        <G clipPath="url(#plusClip)">
                            <Rect
                                x="-20"
                                y="-20"
                                width={PLUS_SIZE + 40}
                                height={PLUS_SIZE + 40}
                                fill="url(#plusGrad)"
                                filter="url(#blurPlus)"
                            />
                            <Path d={plusPath} fill="url(#sheenPlus)" />
                        </G>

                        <Path d={plusPath} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
                    </Svg>
                </Animated.View>

            </Animated.View>

            {/* Footer */}
            <View style={styles.footer}>
                <RNText style={styles.footerText}>powered by AdaPlus</RNText>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    absoluteCentered: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    plusWrapper: {
        width: PLUS_SIZE,
        height: PLUS_SIZE,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 15,
        elevation: 12,
    },
    footer: {
        position: 'absolute',
        bottom: 70,
    },
    footerText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#444',
        letterSpacing: 1.8,
    },
});
