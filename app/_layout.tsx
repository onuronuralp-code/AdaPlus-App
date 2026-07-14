import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { Alert, Linking, Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { fetchAppVersion, requiresUpdate } from "@/services/appVersionApi";

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

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const APP_STORE_URL =
  process.env.EXPO_PUBLIC_APP_STORE_URL ??
  "https://apps.apple.com/tr/app/ada-plus/id6743840993";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const notificationListener = useRef<Notifications.EventSubscription | undefined>(undefined);
  const [updateRequired, setUpdateRequired] = useState(false);

  useEffect(() => {
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        const title = notification.request.content.title ?? "Bildirim";
        const body = notification.request.content.body ?? "";
        Alert.alert(title, body);
      },
    );
    SplashScreen.hideAsync();

    const currentVersion = Constants.expoConfig?.version ?? "0.0.0";
    fetchAppVersion()
      .then(({ minimumVersion }) => {
        if (requiresUpdate(currentVersion, minimumVersion)) {
          setUpdateRequired(true);
        }
      })
      .catch(() => {
        // Network error — don't block the app
      });

    return () => notificationListener.current?.remove();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Modal
        visible={updateRequired}
        animationType="fade"
        transparent={false}
        statusBarTranslucent
        onRequestClose={() => {/* blocked — user must update */}}
      >
        <View style={updateStyles.container}>
          <Text style={updateStyles.emoji}>🌊</Text>
          <Text style={updateStyles.title}>Güncelleme Gerekli</Text>
          <Text style={updateStyles.body}>
            Ada+'ı kullanmaya devam etmek için uygulamayı güncellemelisin.
          </Text>
          <TouchableOpacity
            style={updateStyles.button}
            onPress={() => Linking.openURL(APP_STORE_URL)}
          >
            <Text style={updateStyles.buttonText}>App Store'da Güncelle</Text>
          </TouchableOpacity>
        </View>
      </Modal>
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

const updateStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  emoji: { fontSize: 64, marginBottom: 24 },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  body: {
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 40,
  },
  button: {
    backgroundColor: "#EC4899",
    paddingHorizontal: 36,
    paddingVertical: 16,
    borderRadius: 16,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
