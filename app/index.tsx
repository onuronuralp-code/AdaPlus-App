import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Dimensions, Image, StyleSheet, Text, View } from 'react-native';
import Animated, {
    Easing,
    interpolate,
    runOnJS,
    useAnimatedProps,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withRepeat,
    withSequence,
    withSpring,
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
} from 'react-native-svg';

const { width: W } = Dimensions.get('window');
const PLUS_SIZE = 160;

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

export default function SplashScreen() {
    const router = useRouter();

    const translateX = useSharedValue(0);
    const scaleIn = useSharedValue(0);
    const heartbeat = useSharedValue(1);
    const gradientRot = useSharedValue(0);

    const navigateAway = () => {
        router.replace('/(tabs)/explore');
    };

    useEffect(() => {
        // Entrance
        scaleIn.value = withTiming(1, {
            duration: 850,
            easing: Easing.out(Easing.back(1.5)),
        }, (done) => {
            if (done) {
                // Heartbeat Lub-Dub Pattern (Continuous loop)
                const singleHeartbeat = withSequence(
                    withTiming(1.15, { duration: 120, easing: Easing.out(Easing.quad) }),
                    withTiming(1.0, { duration: 150, easing: Easing.out(Easing.quad) }),
                    withTiming(1.1, { duration: 100, easing: Easing.out(Easing.quad) }),
                    withTiming(1.0, { duration: 1200, easing: Easing.out(Easing.quad) }) // Pause between beats
                );

                heartbeat.value = withRepeat(singleHeartbeat, -1, false);
            }
        });

        gradientRot.value = withRepeat(
            withTiming(1, { duration: 5000, easing: Easing.linear }),
            -1,
            false
        );
        // Keep centered, then navigate (Triggered via translateX)
        translateX.value = withDelay(
            4000,
            withTiming(0, { duration: 100 }, (fin) => {
                if (fin) runOnJS(navigateAway)();
            })
        );
    }, []);

    const containerStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
    }));

    const plusWrapperStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: scaleIn.value * heartbeat.value },
            { rotate: `${interpolate(scaleIn.value, [0, 1], [-180, 0])}deg` },
        ],
        opacity: interpolate(scaleIn.value, [0, 0.2, 1], [0, 1, 1]),
    }));

    const gradProps = useAnimatedProps(() => {
        const rot = gradientRot.value * Math.PI * 2;
        return {
            x1: `${50 + 70 * Math.cos(rot)}%`,
            y1: `${50 + 70 * Math.sin(rot)}%`,
            x2: `${50 - 70 * Math.cos(rot)}%`,
            y2: `${50 - 70 * Math.sin(rot)}%`,
        };
    });

    const armW = 44;
    const r = 14;
    const half = PLUS_SIZE / 2;
    const armHalf = armW / 2;
    const path = `M ${half - armHalf + r},0 L ${half + armHalf - r},0 Q ${half + armHalf},0 ${half + armHalf},${r} L ${half + armHalf},${half - armHalf} L ${PLUS_SIZE - r},${half - armHalf} Q ${PLUS_SIZE},${half - armHalf} ${PLUS_SIZE},${half - armHalf + r} L ${PLUS_SIZE},${half + armHalf - r} Q ${PLUS_SIZE},${half + armHalf} ${PLUS_SIZE - r},${half + armHalf} L ${half + armHalf},${half + armHalf} L ${half + armHalf},${PLUS_SIZE - r} Q ${half + armHalf},${PLUS_SIZE} ${half + armHalf - r},${PLUS_SIZE} L ${half - armHalf + r},${PLUS_SIZE} Q ${half - armHalf},${PLUS_SIZE} ${half - armHalf},${PLUS_SIZE - r} L ${half - armHalf},${half + armHalf} L ${r},${half + armHalf} Q 0,${half + armHalf} 0,${half + armHalf - r} L 0,${half - armHalf + r} Q 0,${half - armHalf} ${r},${half - armHalf} L ${half - armHalf},${half - armHalf} L ${half - armHalf},${r} Q ${half - armHalf},0 ${half - armHalf + r},0 Z`;

    return (
        <Animated.View style={[styles.container, containerStyle]}>
            {/* Soft Central Glow (Shifted Upwards) */}
            <Animated.View style={[styles.absoluteCentered, { opacity: 0.12, marginTop: -50 }]}>
                <Svg width={PLUS_SIZE * 3.5} height={PLUS_SIZE * 3.5}>
                    <Defs>
                        <RadialGradient id="grad" cx="50%" cy="50%" r="50%">
                            <Stop offset="0" stopColor="#3B82F6" stopOpacity="0.5" />
                            <Stop offset="1" stopColor="#fff" stopOpacity="0" />
                        </RadialGradient>
                    </Defs>
                    <Circle cx={PLUS_SIZE * 1.75} cy={PLUS_SIZE * 1.75} r={PLUS_SIZE * 1.75} fill="url(#grad)" />
                </Svg>
            </Animated.View>

            {/* Main Plus Logo (Shifted Upwards) */}
            <Animated.View style={[styles.plusWrapper, styles.absoluteCentered, plusWrapperStyle, { marginTop: -50 }]}>
                <Svg width={PLUS_SIZE} height={PLUS_SIZE} viewBox={`0 0 ${PLUS_SIZE} ${PLUS_SIZE}`}>
                    <Defs>
                        <AnimatedLinearGradient id="liquidGrad" animatedProps={gradProps}>
                            <Stop offset="0%" stopColor="#3B82F6" />
                            <Stop offset="15%" stopColor="#8B5CF6" />
                            <Stop offset="35%" stopColor="#EF4444" />
                            <Stop offset="55%" stopColor="#F97316" />
                            <Stop offset="75%" stopColor="#FACC15" />
                            <Stop offset="90%" stopColor="#22C55E" />
                            <Stop offset="100%" stopColor="#3B82F6" />
                        </AnimatedLinearGradient>
                        
                        <Filter id="blurInside">
                            <FeGaussianBlur in="SourceGraphic" stdDeviation="6" />
                        </Filter>

                        <ClipPath id="plusClip">
                            <Path d={path} />
                        </ClipPath>

                        <LinearGradient id="sheen" x1="0%" y1="0%" x2="100%" y2="100%">
                            <Stop offset="0%" stopColor="#fff" stopOpacity="0.4" />
                            <Stop offset="100%" stopColor="#fff" stopOpacity="0" />
                        </LinearGradient>
                    </Defs>

                    {/* Content Group (Clipped by sharp plus shape) */}
                    <G clipPath="url(#plusClip)">
                        {/* Blurry Gradient Content */}
                        <Rect 
                            x="-20" 
                            y="-20" 
                            width={PLUS_SIZE + 40} 
                            height={PLUS_SIZE + 40} 
                            fill="url(#liquidGrad)" 
                            filter="url(#blurInside)" 
                        />
                        
                        {/* Clear Sheen on top (also clipped) */}
                        <Path d={path} fill="url(#sheen)" />
                    </G>
                    
                    {/* Optional: Thin stroke for extra sharpness */}
                    <Path d={path} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
                </Svg>
            </Animated.View>

            {/* Footer Attribution: Maximized visibility */}
            <View style={styles.footer}>
                <Text style={styles.footerText}>powered by AdaPlus</Text>
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
        bottom: 70, // Slightly higher for visibility
    },
    footerText: {
        fontSize: 14, // Slightly larger
        fontWeight: 'bold', // Bold for visibility
        color: '#444', // Solid dark gray
        letterSpacing: 1.8,
    },
});
