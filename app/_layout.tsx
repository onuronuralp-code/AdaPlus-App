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
import "../utils/configureTextScaling";
import type * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { fetchAppVersion, requiresUpdate } from "@/services/appVersionApi";
import { getNotificationsModule } from "@/services/notificationService";
import { CopilotProvider, useCopilot } from 'react-native-copilot';
import { useTranslation } from 'react-i18next';
import Svg, { Path } from 'react-native-svg';

// expo-notifications isn't supported in Expo Go (removed since SDK 53) — importing or
// touching it there throws "Your JavaScript code tried to access a native module that
// doesn't exist" via the legacy PushNotificationIOS shim. getNotificationsModule()
// already detects Expo Go and returns null there, so this stays a no-op instead of
// crashing whenever something (e.g. backgrounding the app to open a link, then
// returning) causes this module to actually be evaluated.
const NotificationsModule = getNotificationsModule();

// Show push notifications as alerts even when the app is in the foreground.
// Without this handler, Expo drops all incoming notifications silently.
NotificationsModule?.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

import { useColorScheme } from "@/hooks/use-color-scheme";
import { ThemeProvider as CustomThemeProvider, useTheme } from "../context/ThemeContext";
import { AuthProvider } from "../context/AuthContext";
import { NetworkProvider } from "../context/NetworkContext";
import { store } from "../store/store";
import "../tasks/TourTask";
import "../utils/i18n";
import "../utils/i18n";
import { Provider } from "react-redux";

import { GlobalAlert } from "@/components/GlobalAlert";
import { GlobalInvisiblePopup } from "@/components/GlobalInvisiblePopup";
import { PromoPopupModal } from "@/components/PromoPopupModal";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const APP_STORE_URL =
  process.env.EXPO_PUBLIC_APP_STORE_URL ??
  "https://apps.apple.com/tr/app/ada-plus/id6743840993";

const handDrawnSvgMaskPath = ({ size, position, canvasSize, step }: any) => {
  const padding = 4;
  const rawW = typeof size.x === 'number' ? size.x : (size.x?._value || 0);
  const rawH = typeof size.y === 'number' ? size.y : (size.y?._value || 0);
  const rawX = typeof position.x === 'number' ? position.x : (position.x?._value || 0);
  const rawY = typeof position.y === 'number' ? position.y : (position.y?._value || 0);

  const width = rawW + padding * 2;
  const height = rawH + padding * 2;
  const x = rawX - padding;
  const y = rawY - padding;

  // Make the outer canvas bounds much larger than screen to hide the stroke on the edges
  const outer = `M-20,-20 H${(canvasSize.x || 0) + 40} V${(canvasSize.y || 0) + 40} H-20 V-20 Z`;

  // Adaptive rounded rectangle corner radius matching target element dimensions
  const r = Math.min(16, Math.max(6, Math.min(width, height) / 3.8));
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
  const { currentStep, currentStepNumber, goToNth, stop, isFirstStep, isLastStep } = useCopilot();
  const { i18n } = useTranslation();
  const isEn = i18n.language?.startsWith('en');
  const isChangingStep = useRef(false);

  const changeStep = async (direction: 'next' | 'previous') => {
    if (isChangingStep.current) return;
    isChangingStep.current = true;

    const targetStep = direction === 'next'
      ? currentStepNumber + 1
      : currentStepNumber - 1;

    await goToNth(targetStep);
    setTimeout(() => {
      isChangingStep.current = false;
    }, 350);
  };

  return (
    <View style={{ width: '100%', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 24 }}>
      <Text style={{
        color: '#FFFFFF', fontSize: 24, fontFamily: Platform.select({ ios: 'Noteworthy', android: 'cursive' }), textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4, marginBottom: 32 }}>
        {currentStep?.text}
      </Text>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        {!isFirstStep && (
          <TouchableOpacity
            onPress={() => changeStep('previous')}
            style={{ paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)' }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>
              {isEn ? 'Back' : 'Geri'}
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={() => isLastStep ? stop() : changeStep('next')}
          style={{ paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, backgroundColor: '#FFFFFF' }}
        >
          <Text style={{ color: '#0F172A', fontSize: 16, fontWeight: '700' }}>
            {isLastStep ? (isEn ? 'Finish' : 'Bitir') : (isEn ? 'Next' : 'İleri')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

function RootLayoutNav() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const bgColor = isDark ? "#000000" : "#FFFFFF";

  // Version checking lives solely in RootLayout's 30s poll now — this used to also fire
  // an independent, uncoordinated check (with its own non-cancelable Alert) on every
  // single navigation, which could pile up alongside the poll and, if ever triggered,
  // stack blocking alerts with no way to dismiss the app back to a usable state.

  return (
    <View style={{ flex: 1, backgroundColor: bgColor }}>
      <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
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
            fullScreenGestureEnabled: true,
            contentStyle: { backgroundColor: bgColor }
          }}>
          <Stack.Screen name="index" options={{ headerShown: false, gestureEnabled: false, fullScreenGestureEnabled: false }} />
          <Stack.Screen name="login" options={{ headerShown: false, gestureEnabled: false, fullScreenGestureEnabled: false }} />
          <Stack.Screen name="signup" options={{ headerShown: false }} />
          <Stack.Screen name="reset-password" options={{ headerShown: false }} />
          <Stack.Screen name="verify" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false, gestureEnabled: false, fullScreenGestureEnabled: false }} />
          <Stack.Screen name="settings" options={{ headerShown: false, animation: "none" }} />
          <Stack.Screen name="edit-account" options={{ headerShown: false, animation: "none" }} />
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
        <StatusBar style={theme === "dark" ? "light" : "dark"} />
        <GlobalAlert />
        <GlobalInvisiblePopup />
        <PromoPopupModal />
      </CopilotProvider>
    </ThemeProvider>
  </View>
);
}

export default function RootLayout() {
  const notificationListener = useRef<Notifications.EventSubscription | undefined>(undefined);
  const [updateRequired, setUpdateRequired] = useState(true);

  // Guards against a second overlapping check (e.g. the 30s poll firing again before a
  // slow prior request settled) from stacking a duplicate non-cancelable alert on top of
  // an existing one — that combination can leave the app with no visible/tappable way
  // back to a usable state.
  const isCheckingVersion = useRef(false);
  const isShowingUpdateAlert = useRef(false);

  const checkVersion = useRef(() => {
    if (isCheckingVersion.current) return;
    isCheckingVersion.current = true;
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
      })
      .finally(() => {
        isCheckingVersion.current = false;
      });
  }).current;

  const showUpdateAlert = () => {
    if (isShowingUpdateAlert.current) return;
    isShowingUpdateAlert.current = true;
    Alert.alert(
      "Güncelleme Gerekli",
      "AdaPlus'ı kullanmaya devam etmek için uygulamayı güncellemelisin.",
      [
        {
          text: "App Store'da Güncelle",
          onPress: () => {
            Linking.openURL(APP_STORE_URL);
            // Kullanıcı uygulamaya geri dönerse alerti tekrar göster
            setTimeout(() => {
              isShowingUpdateAlert.current = false;
              showUpdateAlert();
            }, 1000);
          },
        },
      ],
      { cancelable: false }
    );
  };

  useEffect(() => {
    notificationListener.current = NotificationsModule?.addNotificationReceivedListener(
      (notification: any) => {
        const title = notification.request.content.title ?? "Bildirim";
        const body = notification.request.content.body ?? "";
        Alert.alert(title, body);
      },
    );

    // Initial version check
    checkVersion();

    // Poll every 30 seconds
    const pollingInterval = setInterval(() => {
      checkVersion();
    }, 30_000);

    return () => {
      notificationListener.current?.remove();
      clearInterval(pollingInterval);
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      <Provider store={store}>
        <NetworkProvider>
          <AuthProvider>
            <CustomThemeProvider>
              <RootLayoutNav />
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
