import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";
import { Alert } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import * as Notifications from "expo-notifications";

// Show push notifications as alerts even when the app is in the foreground.
// Without this handler, Expo drops all incoming notifications silently.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

import { useColorScheme } from "@/hooks/use-color-scheme";
import { ThemeProvider as CustomThemeProvider } from "../context/ThemeContext";
import { AuthProvider } from "../context/AuthContext";
import { NetworkProvider } from "../context/NetworkContext";
import { store } from "../store/store";
import "../tasks/TourTask";
import "../utils/i18n";
import "../utils/i18n";
import { Provider } from "react-redux";

import { GlobalAlert } from "@/components/GlobalAlert";

import { useFonts, Poppins_800ExtraBold, Poppins_900Black } from "@expo-google-fonts/poppins";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Poppins_800ExtraBold, Poppins_900Black });
  const colorScheme = useColorScheme();
  const notificationListener = useRef<Notifications.EventSubscription | undefined>(undefined);

  useEffect(() => {
    // Show an in-app Alert when a push notification arrives while the app is open.
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        const title = notification.request.content.title ?? "Bildirim";
        const body = notification.request.content.body ?? "";
        Alert.alert(title, body);
      },
    );
    return () => notificationListener.current?.remove();
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <NetworkProvider>
        <AuthProvider>
        <CustomThemeProvider>
          <ThemeProvider
            value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
          >
            <Stack screenOptions={{ animation: "slide_from_right" }}>
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="login" options={{ headerShown: false }} />
              <Stack.Screen name="signup" options={{ headerShown: false }} />
              <Stack.Screen name="reset-password" options={{ headerShown: false }} />
              <Stack.Screen name="verify" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="modal"
                options={{ presentation: "modal", title: "Modal" }}
              />
              <Stack.Screen
                name="guide"
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="ferry-tracking"
                options={{
                  title: "Live Tracking",
                  headerBackTitle: "Back",
                }}
              />
            </Stack>
            <StatusBar style="dark" />
            <GlobalAlert />
          </ThemeProvider>
        </CustomThemeProvider>
        </AuthProvider>
        </NetworkProvider>
      </Provider>
    </GestureHandlerRootView>
  );
}
