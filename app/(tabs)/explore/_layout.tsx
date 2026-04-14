import { Stack } from 'expo-router';

export default function ExploreLayout() {
    return (
        <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="island/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="island/restaurant" options={{ headerShown: false }} />
            <Stack.Screen name="island/transportation" options={{ headerShown: false }} />
            <Stack.Screen name="island/forum" options={{ headerShown: false }} />
            <Stack.Screen name="island/guided-tour" options={{ headerShown: false }} />
        </Stack>
    );
}
