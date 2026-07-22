import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { Alert, Linking, Modal, StyleSheet, Text, TouchableOpacity, View, Platform, Dimensions } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { fetchAppVersion, requiresUpdate } from "@/services/appVersionApi";
import { CopilotProvider, useCopilot } from 'react-native-copilot';
import Svg, { Path } from 'react-native-svg';

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
import { GlobalInvisiblePopup } from "@/components/GlobalInvisiblePopup";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const APP_STORE_URL =
  process.env.EXPO_PUBLIC_APP_STORE_URL ??
  "https://apps.apple.com/tr/app/ada-plus/id6743840993";

const handDrawnSvgMaskPath = ({ size, position, canvasSize, step }: any) => {
  const padding = 8;
  const width = (typeof size.x === 'number' ? size.x : (size.x._value || 0)) + padding * 2;
  const height = (typeof size.y === 'number' ? size.y : (size.y._value || 0)) + padding * 2;
  const x = (typeof position.x === 'number' ? position.x : (position.x._value || 0)) - padding;
  const y = (typeof position.y === 'number' ? position.y : (position.y._value || 0)) - padding;

  // Make the outer canvas bounds much larger than screen to hide the stroke on the edges
  const outer = `M-20,-20 H${(canvasSize.x || 0) + 40} V${(canvasSize.y || 0) + 40} H-20 V-20 Z`;

  // Subtle hand-drawn rounded rectangle
  const r = 20;
  const x1 = x;
  const x2 = x + width;
  const y1 = y;
  const y2 = y + height;
  
  const inner = `
    M ${x1 + r},${y1} 
    L ${x2 - r},${y1}
    Q ${x2},${y1} ${x2},${y1 + r}
    L ${x2},${y2 - r}
    Q ${x2},${y2} ${x2 - r},${y2}
    L ${x1 + r},${y2}
    Q ${x1},${y2} ${x1},${y2 - r}
    L ${x1},${y1 + r}
    Q ${x1},${y1} ${x1 + r},${y1}
    Z
  `;

  return `${outer} ${inner}`;
};


const CustomTooltip = () => {
  const { currentStep, goToNext, goToPrev, stop, isFirstStep, isLastStep } = useCopilot();
  
  return (
    <View style={{ width: '100%', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 24 }}>
      <Text style={{ 
        color: '#FFFFFF', fontSize: 24, fontFamily: Platform.select({ ios: 'Noteworthy', android: 'cursive' }), textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4, marginBottom: 32 }}>
        {currentStep?.text}
      </Text>


    </View>
  );
};



export default function RootLayout() {
  const colorScheme = useColorScheme();
  const notificationListener = useRef<Notifications.EventSubscription | undefined>(undefined);
  const [updateRequired, setUpdateRequired] = useState(true);

  useEffect(() => {
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        const title = notification.request.content.title ?? "Bildirim";
        const body = notification.request.content.body ?? "";
        Alert.alert(title, body);
      },
    );
    SplashScreen.hideAsync();

    const showUpdateAlert = () => {
      Alert.alert(
        "Güncelleme Gerekli",
        "AdaPlus'ı kullanmaya devam etmek için uygulamayı güncellemelisin.",
        [
          {
            text: "App Store'da Güncelle",
            onPress: () => {
              Linking.openURL(APP_STORE_URL);
              // Kullanıcı uygulamaya geri dönerse alerti tekrar göster
              setTimeout(showUpdateAlert, 1000);
            },
          },
        ],
        { cancelable: false }
      );
    };

    const currentVersion = Constants.expoConfig?.version ?? "0.0.0";
    fetchAppVersion()
      .then(({ minimumVersion, latestVersion }) => {
        console.log(`[Version] current=${currentVersion} minimum=${minimumVersion} latest=${latestVersion} requiresUpdate=${requiresUpdate(currentVersion, minimumVersion)}`);
        if (requiresUpdate(currentVersion, minimumVersion)) {
          showUpdateAlert();
        }
      })
      .catch((e) => {
        console.warn('[Version] fetchAppVersion failed:', e);
        // Network error — don't block the app
      });

    return () => notificationListener.current?.remove();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <NetworkProvider>
        <AuthProvider>
        <CustomThemeProvider>
          <ThemeProvider
            value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
          >
            <CopilotProvider 
              backdropColor="rgba(0, 0, 0, 0.65)"
              tooltipStyle={{ backgroundColor: 'transparent', elevation: 0, shadowOpacity: 0, paddingHorizontal: 0, paddingVertical: 0, margin: 0, left: 0, right: 0, borderRadius: 0, width: Dimensions.get('window').width, maxWidth: Dimensions.get('window').width }}
              stepNumberComponent={() => null}
              tooltipComponent={CustomTooltip}
              animated={true}
              labels={{ skip: 'Atla', previous: 'Önceki', next: 'İleri', finish: 'Bitir' }}
              svgMaskPath={handDrawnSvgMaskPath} 
              stopOnOutsideClick={false} 
              androidStatusBarVisible 
              arrowSize={0}
            >
              <Stack screenOptions={{ 
                animation: "slide_from_right",
                gestureEnabled: true,
                fullScreenGestureEnabled: true
              }}>
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
              <GlobalInvisiblePopup />
            </CopilotProvider>
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
    fontSize: 24,
    fontWeight: "700",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 16,
    letterSpacing: -0.5,
    fontFamily: Platform.OS === "android" ? "Roboto" : undefined,
  },
  body: {
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 40,
    fontFamily: Platform.OS === "android" ? "Roboto" : undefined,
  },
  button: {
    backgroundColor: "#EC4899",
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 100, // fully rounded pill for Material 3 buttons
    elevation: 2,
  },
  buttonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
    fontFamily: Platform.OS === "android" ? "Roboto" : undefined,
  },
});
