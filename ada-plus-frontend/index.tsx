import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

const waveHeight = height * 0.5;

const Wave = ({ color, duration, offset, yOffset }: { color: string, duration: number, offset: number, yOffset: number }) => {
    const progress = useSharedValue(0);

    useEffect(() => {
        progress.value = withRepeat(
            withTiming(1, { duration, easing: Easing.linear }),
            -1,
            false
        );
    }, []);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateX: -progress.value * width }]
        };
    });

    const pathData = `M0,50 C${width * 0.5},0 ${width * 0.5},100 ${width},50 C${width * 1.5},0 ${width * 1.5},100 ${width * 2},50 V${waveHeight} H0 Z`;

    return (
        <Animated.View style={[{ position: 'absolute', left: 0, right: -width, bottom: yOffset }, animatedStyle]}>
            <Svg height={waveHeight} width={width * 2}>
                <Path
                    d={pathData}
                    fill={color}
                />
            </Svg>
        </Animated.View>
    );
};

export default function SplashScreen() {
    const router = useRouter();

    useEffect(() => {
        console.log("Splash screen mounted. Waiting 10 seconds...");
        const timeout = setTimeout(() => {
            console.log("Navigating to (tabs)/home...");
            router.replace('/(tabs)/home');
        }, 10000); // 10 seconds duration

        return () => clearTimeout(timeout);
    }, []);

    return (
        <View style={styles.container}>
            {/* Decorative Waves - Only waves, no logo */}
            <View style={styles.wavesContainer}>
                <Wave color="#A2D9E8" duration={5000} offset={0} yOffset={20} />
                <Wave color="#5AB9C1" duration={7000} offset={0.5} yOffset={10} />
                <Wave color="#2B7A8E" duration={6000} offset={0.2} yOffset={0} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ffffff',
        overflow: 'hidden',
    },
    wavesContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: height * 0.5,
        zIndex: 20,
    },
});
