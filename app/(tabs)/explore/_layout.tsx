import { Stack } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';

export default function ExploreLayout() {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    return (
        <Stack screenOptions={{ 
            animation: 'slide_from_right',
            gestureEnabled: true,
            fullScreenGestureEnabled: true,
            contentStyle: { backgroundColor: isDark ? '#000000' : '#FFFFFF' }
        }}>
            <Stack.Screen name="index" options={{ headerShown: false, gestureEnabled: false, fullScreenGestureEnabled: false }} />
            <Stack.Screen name="island/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="island/restaurant" options={{ headerShown: false }} />
            <Stack.Screen name="island/transportation" options={{ headerShown: false }} />
            <Stack.Screen name="island/forum" options={{ headerShown: false }} />
            <Stack.Screen name="island/guided-tour" options={{ headerShown: false }} />
            <Stack.Screen name="island/ilanlar" options={{ headerShown: false }} />
            <Stack.Screen name="island/ilan/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="island/events" options={{ headerShown: false }} />
            <Stack.Screen name="island/event/[id]" options={{ headerShown: false }} />
        </Stack>
    );
}
