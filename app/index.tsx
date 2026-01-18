import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');

export default function SplashScreen() {
    const router = useRouter();

    const logoY = useSharedValue(0);

    useEffect(() => {
        console.log("Splash screen mounted. Waiting 10 seconds...");

        // Bounce animation
        logoY.value = withRepeat(
            withSequence(
                withTiming(-30, { duration: 600, easing: Easing.out(Easing.quad) }), // Jump up
                withTiming(0, { duration: 600, easing: Easing.bounce }) // Land with bounce
            ),
            -1,
            false
        );

        const timeout = setTimeout(() => {
            console.log("Navigating to (tabs)/home...");
            router.replace('/(tabs)/explore');
        }, 10000); // 10 seconds duration

        return () => clearTimeout(timeout);
    }, []);

    const logoStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: logoY.value }]
    }));

    return (
        <View style={styles.container}>
            <Animated.Image
                source={require('../assets/images/splash-logo.png')}
                style={[styles.logo, logoStyle]}
                resizeMode="contain"
            />
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
    logo: {
        width: width * 0.5,
        height: width * 0.5,
        marginBottom: 50,
    },
});

