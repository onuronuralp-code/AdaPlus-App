import {
  Poppins_500Medium,
  Poppins_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/poppins";
import { usePathname, useRouter } from "expo-router";
import * as ExpoSplashScreen from "expo-splash-screen";
import { useEffect, useRef } from "react";
import {
  StyleSheet,
  useWindowDimensions,
  View,
  Text,
  TouchableOpacity,
  Animated,
  Easing,
  ScrollView
} from "react-native";
import {
  SafeAreaView,
} from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import * as Haptics from "expo-haptics";
import { useAuth } from "../context/AuthContext";

const NAVY = "#1E3A5F";
const SEA = "#2F84C8";
// Keep this in sync with expo-splash-screen's imageWidth in app.json so the
// native splash and the first React frame use the exact same logo size.
const SPLASH_LOGO_WIDTH = 240;

// The native splash screen can only be hidden once per app launch. This screen can
// remount later (e.g. router.replace('/') after deleting the account, or any other
// return trip to "/"), and calling hideAsync() again throws "No native splash screen
// registered for given view controller" since it was already hidden the first time.
let hasHiddenNativeSplash = false;
const hideNativeSplashOnce = async () => {
  if (hasHiddenNativeSplash) return;
  hasHiddenNativeSplash = true;
  await ExpoSplashScreen.hideAsync();
};

export default function SplashScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const { width, height } = useWindowDimensions();
  const { i18n } = useTranslation();
  const { isLoggedIn } = useAuth();

  const [fontsLoaded] = useFonts({
    Poppins_500Medium,
    Poppins_800ExtraBold,
  });

  const logoTranslateY = useRef(new Animated.Value(200)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!fontsLoaded) return;

    if (isLoggedIn) {
      const timer = setTimeout(() => {
        hideNativeSplashOnce();
        // A cold-start deep link (e.g. a password reset email link) may already have
        // navigated away from "/" by the time this fires — don't clobber it by forcing
        // the user back to Explore. Only redirect if we're still actually on this screen.
        if (pathname === '/') {
          router.replace("/(tabs)/explore");
        }
      }, 2000);
      return () => clearTimeout(timer);
    }

    hideNativeSplashOnce().then(() => {
      Animated.sequence([
        Animated.delay(2000),
        Animated.parallel([
          Animated.timing(logoTranslateY, {
            toValue: -30,
            duration: 900,
            useNativeDriver: true,
            easing: Easing.out(Easing.cubic)
          }),
          Animated.timing(contentOpacity, {
            toValue: 1,
            duration: 900,
            useNativeDriver: true,
          })
        ])
      ]).start();
    });
  }, [fontsLoaded, isLoggedIn, pathname]);

  if (!fontsLoaded) return <View style={styles.screen} />;

  // Logged-in users only see the launch splash before being redirected. Keep this
  // frame identical to the native splash so the logo does not jump when the native
  // view is replaced by React's first frame.
  if (isLoggedIn) {
    const centeredLogoWidth = Math.min(SPLASH_LOGO_WIDTH, width - 40);
    return (
      <View style={styles.centeredSplash}>
        <Animated.Image
          source={require("../assets/images/adaplus-logo.png")}
          style={{
            width: centeredLogoWidth,
            height: centeredLogoWidth,
            resizeMode: "contain",
          }}
          accessibilityLabel="AdaPlus"
        />
      </View>
    );
  }

  const isCompact = height < 720;
  const horizontalPadding = Math.max(20, Math.min(40, width * 0.08));
  const logoW = Math.min(SPLASH_LOGO_WIDTH, width - horizontalPadding * 2);

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.center, { paddingHorizontal: horizontalPadding, paddingVertical: isCompact ? 16 : 28 }]}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        <Animated.Image
          source={require("../assets/images/adaplus-logo.png")}
          style={{ width: logoW, height: logoW, resizeMode: "contain", transform: [{ translateY: logoTranslateY }], marginTop: isCompact ? 0 : -20 }}
          accessibilityLabel="AdaPlus"
        />

        <Animated.View style={{ marginTop: isCompact ? 4 : 16, alignItems: 'center', opacity: contentOpacity, width: '100%' }}>
          <Text adjustsFontSizeToFit numberOfLines={1} style={{ fontSize: isCompact ? 24 : 28, fontFamily: "Poppins_800ExtraBold", color: NAVY, marginBottom: 6 }}>
            {i18n.language.startsWith('en') ? 'Welcome!' : 'Hoş Geldin!'}
          </Text>
          <View style={{ minHeight: 48, justifyContent: 'center', marginBottom: isCompact ? 16 : 32, paddingHorizontal: 8 }}>
            <Text style={{ fontSize: 15, fontFamily: "Poppins_500Medium", color: '#64748B', textAlign: 'center', lineHeight: 22 }}>
              {i18n.language.startsWith('en') ? 'Please select your preferred language to continue.' : 'Devam etmek için lütfen dil seçimi yapın.'}
            </Text>
          </View>

          {/* Language Toggle */}
          <View style={{ flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 16, padding: 6, marginBottom: isCompact ? 22 : 48, maxWidth: '100%', alignItems: 'center' }}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={{
                flex: 1,
                maxWidth: 150,
                paddingHorizontal: isCompact ? 20 : 28,
                paddingVertical: isCompact ? 11 : 14,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: i18n.language.startsWith('tr') ? '#FFFFFF' : 'transparent',
                shadowColor: i18n.language.startsWith('tr') ? '#000' : 'transparent',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: i18n.language.startsWith('tr') ? 2 : 0,
              }}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                i18n.changeLanguage('tr');
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '800', textAlign: 'center', color: i18n.language.startsWith('tr') ? NAVY : '#94A3B8' }}>Türkçe</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={{
                flex: 1,
                maxWidth: 150,
                paddingHorizontal: isCompact ? 20 : 28,
                paddingVertical: isCompact ? 11 : 14,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: i18n.language.startsWith('en') ? '#FFFFFF' : 'transparent',
                shadowColor: i18n.language.startsWith('en') ? '#000' : 'transparent',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: i18n.language.startsWith('en') ? 2 : 0,
              }}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                i18n.changeLanguage('en');
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '800', textAlign: 'center', color: i18n.language.startsWith('en') ? NAVY : '#94A3B8' }}>English</Text>
            </TouchableOpacity>
          </View>

          {/* Action Buttons */}
          <View style={{ width: '100%', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/signup");
              }}
              style={{ backgroundColor: SEA, paddingHorizontal: 36, paddingVertical: 12, borderRadius: 24, minWidth: 180, shadowColor: SEA, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 4 }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800', textAlign: 'center' }}>
                {i18n.language.startsWith('en') ? 'Sign Up' : 'Kayıt Ol'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                router.replace("/(tabs)/explore");
              }}
              style={{ paddingVertical: 12 }}
            >
              <Text style={{ color: NAVY, fontSize: 15, fontWeight: '700', textAlign: 'center', opacity: 0.7 }}>
                {i18n.language.startsWith('en') ? 'Continue without registering' : 'Kayıt olmadan devam et'}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFFFFF" },
  centeredSplash: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: '100%'
  }
});
