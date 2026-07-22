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

const NAVY = "#1E3A5F";
const SEA = "#2F84C8";

export default function SplashScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();

  const [fontsLoaded] = useFonts({
    Poppins_500Medium,
    Poppins_800ExtraBold,
  });

  const logoTranslateY = useRef(new Animated.Value(200)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!fontsLoaded) return;
    ExpoSplashScreen.hideAsync().then(() => {
      Animated.sequence([
        Animated.delay(1200),
        Animated.parallel([
          Animated.timing(logoTranslateY, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
            easing: Easing.out(Easing.cubic)
          }),
          Animated.timing(contentOpacity, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          })
        ])
      ]).start();
    });
  }, [fontsLoaded]);

  if (!fontsLoaded) return <View style={styles.screen} />;

  const logoW = 280;

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.center}>
        <Animated.Image
          source={require("../assets/images/adaplus-logo.png")}
          style={{ width: logoW, height: logoW, resizeMode: "contain", transform: [{ translateY: logoTranslateY }] }}
          accessibilityLabel="AdaPlus"
        />

        <Animated.View style={{ marginTop: 40, alignItems: 'center', opacity: contentOpacity }}>
          <Text style={{ fontSize: 28, fontFamily: "Poppins_800ExtraBold", color: NAVY, marginBottom: 8 }}>
            {i18n.language.startsWith('en') ? 'Welcome!' : 'Hoş Geldin!'}
          </Text>
          <Text style={{ fontSize: 16, fontFamily: "Poppins_500Medium", color: '#64748B', textAlign: 'center', marginBottom: 40, paddingHorizontal: 32 }}>
            {i18n.language.startsWith('en') ? 'Please select your preferred language to continue.' : 'Devam etmek için lütfen dil seçimi yapın.'}
          </Text>

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
          <View style={{ width: '100%', gap: 12 }}>
            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/signup");
              }}
              style={{ backgroundColor: SEA, paddingHorizontal: 48, paddingVertical: 16, borderRadius: 30, shadowColor: SEA, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '800', textAlign: 'center' }}>
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
