import {
  Poppins_500Medium,
  Poppins_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/poppins";
import { useRouter } from "expo-router";
import * as ExpoSplashScreen from "expo-splash-screen";
import { useEffect, useRef } from "react";
import {
  Image,
  StyleSheet,
  useWindowDimensions,
  View,
  Text,
  TouchableOpacity,
  Animated,
  Easing
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import * as Haptics from "expo-haptics";
import { useAuth } from "../context/AuthContext";

const NAVY = "#1E3A5F";
const SEA = "#2F84C8";

export default function SplashScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
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
        ExpoSplashScreen.hideAsync();
        router.replace("/(tabs)/explore");
      }, 2000);
      return () => clearTimeout(timer);
    }

    ExpoSplashScreen.hideAsync().then(() => {
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
  }, [fontsLoaded, isLoggedIn]);

  if (!fontsLoaded) return <View style={styles.screen} />;

  const logoW = 280;

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.center}>
        <Animated.Image
          source={require("../assets/images/adaplus-logo.png")}
          style={{ width: logoW, height: logoW, resizeMode: "contain", transform: [{ translateY: logoTranslateY }], marginTop: -20 }}
          accessibilityLabel="AdaPlus"
        />

        <Animated.View style={{ marginTop: 16, alignItems: 'center', opacity: contentOpacity, width: '100%' }}>
          <Text style={{ fontSize: 28, fontFamily: "Poppins_800ExtraBold", color: NAVY, marginBottom: 6 }}>
            {i18n.language.startsWith('en') ? 'Welcome!' : 'Hoş Geldin!'}
          </Text>
          <View style={{ height: 48, justifyContent: 'center', marginBottom: 32, paddingHorizontal: 16 }}>
            <Text style={{ fontSize: 15, fontFamily: "Poppins_500Medium", color: '#64748B', textAlign: 'center', lineHeight: 22 }}>
              {i18n.language.startsWith('en') ? 'Please select your preferred language to continue.' : 'Devam etmek için lütfen dil seçimi yapın.'}
            </Text>
          </View>

          {/* Language Toggle */}
          <View style={{ flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 16, padding: 6, marginBottom: 48 }}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={{ paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12, backgroundColor: i18n.language.startsWith('tr') ? '#FFFFFF' : 'transparent', shadowColor: i18n.language.startsWith('tr') ? '#000' : 'transparent', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: i18n.language.startsWith('tr') ? 2 : 0 }}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                i18n.changeLanguage('tr');
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '800', color: i18n.language.startsWith('tr') ? NAVY : '#94A3B8' }}>Türkçe</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={{ paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12, backgroundColor: i18n.language.startsWith('en') ? '#FFFFFF' : 'transparent', shadowColor: i18n.language.startsWith('en') ? '#000' : 'transparent', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: i18n.language.startsWith('en') ? 2 : 0 }}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                i18n.changeLanguage('en');
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '800', color: i18n.language.startsWith('en') ? NAVY : '#94A3B8' }}>English</Text>
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

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFFFFF" },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 40
  }
});
