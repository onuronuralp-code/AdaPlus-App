import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useRouter, useFocusEffect } from 'expo-router';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ImageBackground, Image, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View, Dimensions, ScrollView, NativeScrollEvent, NativeSyntheticEvent, ActivityIndicator, Modal, Animated, TouchableWithoutFeedback, Alert, TextInput, Pressable, Platform, Vibration, KeyboardAvoidingView, Keyboard, Share } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';

const playNote = async (noteModule: any) => {
  try {
    const { sound } = await Audio.Sound.createAsync(noteModule);
    await sound.playAsync();
    sound.setOnPlaybackStatusUpdate((status: any) => {
      if (status.didJustFinish) {
        sound.unloadAsync();
      }
    });
  } catch (e) {
    console.log('Error playing note:', e);
  }
};

import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { AbstractPattern } from '@/components/AbstractPattern';
import { SwipeButton } from '@/components/SwipeButton';
import LoginPromptModal from '@/components/LoginPromptModal';
import { SwipeNavigation } from '@/components/SwipeNavigation';
import { useTranslation } from 'react-i18next';
import { fetchActivities, fetchDepartures, fetchServiceBanner, ServiceBannerDto } from '@/services/api';
import { fetchListings } from '@/services/listingApi';
import { API_BASE_URL, fetchWithTimeout, resolveImageUrl } from '@/services/config';

import { fetchNotifications, markNotificationRead, markAllRead, NotificationDto } from '@/services/notificationApi';
import { ListingDto } from '@/services/listingApi';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { getToken } from '@/utils/tokenStorage';
import { fetchUserCount } from '@/services/authApi';
import { CelebrationModal } from '@/components/CelebrationModal';
import { unregisterPushNotifications } from '@/services/notificationService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useWeather } from '@/hooks/useWeather';
import { createPost, PostType, Island } from '@/services/forumApi';
import { CopilotStep, walkthroughable, useCopilot } from 'react-native-copilot';
const WalkthroughableView = walkthroughable(View);

const getRouteTimeValue = (time: string): number => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

const TodayOnIsland = () => {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { height } = useWindowDimensions();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const isLargeScreen = height > 900;
  
  const { user, isLoggedIn } = useAuth();
  const { weather, loading: weatherLoading } = useWeather();
  const [nextFerry, setNextFerry] = useState<{from: string, to: string, time: string, provider?: string} | null>(null);
  const [ferryLoading, setFerryLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
    let cancelled = false;
    
    const getNormalizedIsland = (rawIsland?: string): string => {
      if (!rawIsland) return isLoggedIn ? "Büyükada" : "Kınalıada";
      const upper = rawIsland.toUpperCase();
      if (upper.includes("BUYUK") || upper.includes("BÜYÜK")) return "Büyükada";
      if (upper.includes("HEYBELI") || upper.includes("HEYBELİ")) return "Heybeliada";
      if (upper.includes("BURGAZ")) return "Burgazada";
      if (upper.includes("KINALI") || upper.includes("KİNALI")) return "Kınalıada";
      return isLoggedIn ? "Büyükada" : "Kınalıada";
    };

    const fetchFerry = async () => {
      try {
        setFerryLoading(true);
        let targetIsland = isLoggedIn ? "Büyükada" : "Kınalıada";
        let defIsland: string | null = null;
        if (isLoggedIn && (user as any)?.island) {
          targetIsland = getNormalizedIsland((user as any)?.island);
        } else if (isLoggedIn) {
          defIsland = await AsyncStorage.getItem('defaultIsland');
          if (defIsland) {
            targetIsland = getNormalizedIsland(defIsland);
          }
        } else {
          targetIsland = "Kınalıada";
        }

        const isIslandName = (name: string): boolean => {
          const upper = name.toUpperCase();
          return upper.includes("BUYUK") || upper.includes("BÜYÜK") ||
                 upper.includes("HEYBELI") || upper.includes("HEYBELİ") ||
                 upper.includes("BURGAZ") ||
                 upper.includes("KINALI") || upper.includes("KİNALI");
        };

        let mainPorts = ["Bostancı", "Kabataş", "Kadıköy"];
        const favRouteStr = await AsyncStorage.getItem('favorite_route');
        if (favRouteStr) {
          try {
            const fav = JSON.parse(favRouteStr);
            if (fav.departure && fav.destination && isIslandName(fav.destination)) {
              mainPorts = [fav.departure, ...mainPorts.filter(p => p !== fav.departure)];
              if (!defIsland) {
                targetIsland = getNormalizedIsland(fav.destination);
              }
            }
          } catch {}
        }

        const dateObj = new Date();
        const yyyy = dateObj.getFullYear();
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const dd = String(dateObj.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;
        const nowMinutes = dateObj.getHours() * 60 + dateObj.getMinutes();

        const routePromises = mainPorts.map(port => fetchDepartures(port, targetIsland, dateStr));
        const results = await Promise.all(routePromises);

        let allUpcoming: { from: string; to: string; time: string; provider?: string; diffMinutes: number }[] = [];

        results.forEach((departures, idx) => {
          const portName = mainPorts[idx];
          departures.forEach(d => {
            const dest = d.to || targetIsland;
            const depFrom = d.from || portName;
            // Only include routes that arrive at or depart from targetIsland
            if (dest.toLowerCase().includes(targetIsland.toLowerCase()) || depFrom.toLowerCase().includes(targetIsland.toLowerCase())) {
              const timeVal = getRouteTimeValue(d.time);
              let diff = timeVal - nowMinutes;
              if (timeVal < 180 && nowMinutes > 180) {
                diff = (timeVal + 1440) - nowMinutes;
              }
              if (diff >= 0) {
                allUpcoming.push({
                  from: depFrom,
                  to: dest,
                  time: d.time,
                  provider: d.provider,
                  diffMinutes: diff,
                });
              }
            }
          });
        });

        allUpcoming.sort((a, b) => a.diffMinutes - b.diffMinutes);

        if (allUpcoming.length === 0) {
          const tomorrow = new Date(dateObj);
          tomorrow.setDate(tomorrow.getDate() + 1);
          const tYyyy = tomorrow.getFullYear();
          const tMm = String(tomorrow.getMonth() + 1).padStart(2, '0');
          const tDd = String(tomorrow.getDate()).padStart(2, '0');
          const tmrwStr = `${tYyyy}-${tMm}-${tDd}`;

          const tmrwPromises = mainPorts.map(port => fetchDepartures(port, targetIsland, tmrwStr));
          const tmrwResults = await Promise.all(tmrwPromises);

          tmrwResults.forEach((departures, idx) => {
            const portName = mainPorts[idx];
            departures.forEach(d => {
              const dest = d.to || targetIsland;
              const depFrom = d.from || portName;
              if (dest.toLowerCase().includes(targetIsland.toLowerCase()) || depFrom.toLowerCase().includes(targetIsland.toLowerCase())) {
                const timeVal = getRouteTimeValue(d.time);
                allUpcoming.push({
                  from: depFrom,
                  to: dest,
                  time: d.time,
                  provider: d.provider,
                  diffMinutes: timeVal + 1440,
                });
              }
            });
          });

          allUpcoming.sort((a, b) => a.diffMinutes - b.diffMinutes);
        }

        if (!cancelled && allUpcoming.length > 0) {
          setNextFerry({
            from: allUpcoming[0].from,
            to: allUpcoming[0].to,
            time: allUpcoming[0].time,
            provider: allUpcoming[0].provider,
          });
        }
      } catch (err) {
        console.log("Failed to fetch next ferry", err);
      } finally {
        if (!cancelled) setFerryLoading(false);
      }
    };
    fetchFerry();
    
    return () => { cancelled = true; };
  }, [user])
  );

  return (
    <View style={{ flexDirection: 'row', gap: 8, marginTop: 2 }}>
      {/* Weather Badge */}
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? '#000000' : '#FFF7ED', paddingHorizontal: 12, paddingVertical: isLargeScreen ? 12 : 8, borderRadius: 8, borderWidth: 2, borderColor: isDark ? '#F97316' : '#FED7AA' }}>
        <IconSymbol 
          name={weatherLoading ? 'sun.max.fill' : (weather?.condition === 'rainy' ? 'cloud.rain.fill' : (weather?.condition === 'cloudy' ? 'cloud.fill' : 'sun.max.fill'))} 
          size={isLargeScreen ? 18 : 14} 
          color={weatherLoading ? '#F97316' : (weather?.condition === 'rainy' ? '#3B82F6' : (weather?.condition === 'cloudy' ? '#94A3B8' : '#F97316'))} 
        />
        <Text style={{ fontSize: isLargeScreen ? 14 : 14, fontWeight: '700', color: isDark ? '#FB923C' : '#C2410C', marginLeft: 6 }}>
          {weatherLoading ? '...' : (weather ? `${weather.temperature}°` : '28°')}
        </Text>
      </View>

      {/* Ferry Badge */}
      <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)', borderless: false }} 
        style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? '#000000' : '#EFF6FF', paddingHorizontal: 12, paddingVertical: isLargeScreen ? 12 : 8, borderRadius: 8, flex: 1, borderWidth: 2, borderColor: isDark ? '#3B82F6' : '#BFDBFE' }}
        onPress={() => {
          if (nextFerry) {
            router.push({
              pathname: '/(tabs)/home',
              params: { from: nextFerry.from, to: nextFerry.to, time: nextFerry.time }
            });
          } else {
            router.push('/(tabs)/home');
          }
        }}
        
      >
        <IconSymbol name="ferry.fill" size={isLargeScreen ? 18 : 14} color={isDark ? '#60A5FA' : '#3B82F6'} />
        <Text style={{ fontSize: isLargeScreen ? 12 : 12, fontWeight: '700', color: isDark ? '#93C5FD' : '#1D4ED8', marginLeft: 6, flexShrink: 1 }} numberOfLines={1}>
          {ferryLoading ? (i18n.language.startsWith('en') ? 'Loading...' : 'Yükleniyor...') : (nextFerry ? `${nextFerry.time} ${nextFerry.from}-${nextFerry.to}${nextFerry.provider ? ' (' + nextFerry.provider + ')' : ''}` : (i18n.language.startsWith('en') ? 'No schedule found' : 'Sefer Bulunamadı'))}
        </Text>
      </Pressable>
    </View>
  );
};
const LanguageToggle = ({ currentLang, onChange }: { currentLang: string, onChange: (lang: string) => void }) => {
  const isTr = currentLang.startsWith('tr');

  return (
    <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)', borderless: false }} 
      style={{ 
        width: 44, 
        height: 44, 
        borderRadius: 22, 
        backgroundColor: '#F1F5F9', 
        alignItems: 'center', 
        justifyContent: 'center'
      }}
      onPress={() => onChange(isTr ? 'en' : 'tr')}
      
    >
      <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A' }}>
        {isTr ? 'TR' : 'EN'}
      </Text>
    </Pressable>
  );
};

export default function MainMenuScreen() {
  const { start } = useCopilot();
  const startOnboardingRef = useRef(start);
  startOnboardingRef.current = start;

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let isMounted = true;

    const showOnboardingOnce = async () => {
      const hasSeenOnboarding = await AsyncStorage.getItem('has_seen_main_menu_onboarding');
      if (!isMounted || hasSeenOnboarding === 'true') return;

      timer = setTimeout(async () => {
        if (!isMounted) return;
        await AsyncStorage.setItem('has_seen_main_menu_onboarding', 'true');
        startOnboardingRef.current();
      }, 600);
    };

    showOnboardingOnce().catch(error => {
      console.log('Error checking main menu onboarding status', error);
    });
    
    return () => {
      isMounted = false;
      if (timer) clearTimeout(timer);
    };
  }, []);

  const { t, i18n } = useTranslation();
  const router = useRouter();
  const isNavigating = useRef(false);
  const navigateWithDebounce = (path: any) => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    router.push(path);
    setTimeout(() => { isNavigating.current = false; }, 1000);
  };
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { isLoggedIn, user } = useAuth();
  const [selectedIsland, setSelectedIsland] = useState(isLoggedIn && (user as any)?.island ? ((user as any).island === 'KINALIADA' ? 'Kınalıada' : (user as any).island === 'BURGAZADA' ? 'Burgazada' : (user as any).island === 'HEYBELIADA' ? 'Heybeliada' : 'Büyükada') : 'Kınalıada');
  const isSmallScreen = height < 820;
  const isLargeScreen = height > 900;
  const isIphone11 = Math.round(height) === 896;
  const isIphone16 = Math.round(height) === 852;
  const menuButtonWidth = (width - 56) / 3.5;
  // Estimate used only until the ScrollView's own onLayout fires below — that gives us
  // the real available height (already excluding the tab bar and safe areas, since this
  // screen only ever occupies the space the tab navigator hands it), which is more
  // reliable across device sizes than guessing a fixed tab-bar-height constant here.
  const [measuredPageHeight, setMeasuredPageHeight] = useState<number | null>(null);
  const pageHeight = measuredPageHeight ?? (height - insets.top - insets.bottom - (Platform.OS === 'ios' ? 65 : 50));
  const [showIslandPicker, setShowIslandPicker] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

const MOCK_SERVICES = [
  { id: 1, title: 'Büyükada Elektrik & Tesisat Uzmanı', categoryTag: 'TADİLAT & TAMİRAT', description: '7/24 Acil elektrik arıza, su tesisatı tamiri ve ev yenileme usta hizmeti.' },
  { id: 2, title: 'Heybeliada Boya & Badana Dekoratörü', categoryTag: 'BOYA & BADANA', description: 'İç ve dış cephe boya, tavan badana, nem yalıtımı ve duvar kaplama.' },
  { id: 3, title: 'Kınalıada Acil Çilingir & Kilit Servisi', categoryTag: 'ÇİLİNGİR & KİLİT', description: 'Kapıda kalma durumlarında 15 dakikada hızlı çilingir ve kilit değişimi.' },
  { id: 4, title: 'Burgazada Bahçe Bakım & Peyzaj Ustası', categoryTag: 'BAHÇE & PEYZAJ', description: 'Ağaç budama, çim biçme, otomatik sulama ve sezonluk bahçe bakımı.' },
  { id: 5, title: 'Büyükada Mobil Kuaför & Güzellik', categoryTag: 'KUAFÖR & BAKIM', description: 'Gelin saçı, kişisel bakım, fön, boya ve adada evde kuaförlük.' },
  { id: 6, title: 'Heybeliada Fiber İnternet & Uydu Servisi', categoryTag: 'İNTERNET & UYDU', description: 'Acil internet arıza giderme, Wi-Fi güçlendirme ve TV uydu ayarı.' },
  { id: 7, title: 'Kınalıada Özel İngilizce & Matematik Dersi', categoryTag: 'ÖZEL DERS', description: 'İlkokul, ortaokul ve lise öğrencilerine birebir sınav hazırlık dersleri.' },
  { id: 8, title: 'Büyükada Evcil Hayvan Oteli & Gezdirme', categoryTag: 'PET CARE', description: 'Köpek gezdirme, kedi bakımı ve adada güvenli evcil hayvan konaklaması.' },
  { id: 9, title: 'Burgazada Nakliye & Eşya Taşıma', categoryTag: 'NAKLİYE & TAŞIMA', description: 'Ada içi eşya taşıma, moloz çıkarma, mobilya nakliyesi ve hamaliye.' },
  { id: 10, title: 'Büyükada Detaylı Ev & Villa Temizliği', categoryTag: 'EV TEMİZLİĞİ', description: 'İnşaat sonrası temizlik, villa ve yazlık sezon açılış temizlik hizmeti.' },
  { id: 11, title: 'Heybeliada Kombi & Şofben Arıza Tamiri', categoryTag: 'TADİLAT & TAMİRAT', description: 'Sıcak su arızası, şofben bakımı ve kat kaloriferi arıza servisi.' },
  { id: 12, title: 'Kınalıada Marangoz & Mobilya Montajı', categoryTag: 'TADİLAT & TAMİRAT', description: 'Özel ahşap mobilya imalatı, kapı tamiri ve dolap montaj ustası.' },
  { id: 13, title: 'Büyükada İskele & Çatı İzolasyon Ustası', categoryTag: 'TADİLAT & TAMİRAT', description: 'Çatı akar tamiri, ahşap kiremit yenileme ve su yalıtım servisi.' },
  { id: 14, title: 'Burgazada Bisiklet Tamir & Bakım Servisi', categoryTag: 'DİĞER HİZMETLER', description: 'Elektrikli ve klasik bisiklet zincir, fren, lastik acil adada tamir servisi.' },
  { id: 15, title: 'Heybeliada Terzi & Özel Dikiş Tadilatı', categoryTag: 'DİĞER HİZMETLER', description: 'Kıyafet daraltma, paça boyu, fermuar değişimi ve perde dikiş hizmeti.' },
  { id: 16, title: 'Kınalıada Cam & Çerçeve Montaj Servisi', categoryTag: 'TADİLAT & TAMİRAT', description: 'Kırık cam değişimi, PVC pencere fitili ve sineklik imalat servisi.' },
  { id: 17, title: 'Büyükada Özel Yüzme & Deniz Eğitmeni', categoryTag: 'ÖZEL DERS', description: 'Çocuklar ve yetişkinler için birebir güvenli deniz ve yüzme dersleri.' },
  { id: 18, title: 'Burgazada Su Deposu Temizlik & İlaçlama', categoryTag: 'EV TEMİZLİĞİ', description: 'Bina ve villa su depolarının dezenfeksiyonu ve haşere ilaçlaması.' },
  { id: 19, title: 'Heybeliada Akü & Güneş Paneli Tamiri', categoryTag: 'İNTERNET & TEKNOLOJİ', description: 'Güneş paneli kurulumu, akü şarj ve yenilenebilir enerji arıza çözümü.' },
  { id: 20, title: 'Kınalıada Sezonluk Bahçe Düzenleme Servisi', categoryTag: 'BAHÇE & PEYZAJ', description: 'Yazlık bahçeleri sezona hazırlama, gübreleme ve peyzaj mimarlığı.' },
];

  // MOCK_SERVICES titles have the island name hardcoded (e.g. "Büyükada Elektrik &
  // Tesisat Uzmanı") — swap it for whichever island is actually selected at the top
  // of the screen so the mock card doesn't visibly contradict the island picker.
  const MOCK_ISLAND_NAMES = ['Büyükada', 'Heybeliada', 'Burgazada', 'Kınalıada'];
  const localizeMockTitle = (title: string, island: string) => {
    const matched = MOCK_ISLAND_NAMES.find(name => title.startsWith(name));
    return matched ? island + title.slice(matched.length) : title;
  };

  const [bannerSlideIndex, setBannerSlideIndex] = useState(0);
  const [mockServiceIndex, setMockServiceIndex] = useState<number | null>(null);
  const [selectedQuickServiceLabel, setSelectedQuickServiceLabel] = useState<string | null>(null);
  const bannerScaleAnim = useRef(new Animated.Value(1)).current;

  const getMockServiceIndexForCategory = (label: string) => {
    const str = (label || '').toLowerCase();
    if (str.includes('internet') || str.includes('i̇nternet') || str.includes('uydu')) {
      return 5; // Heybeliada Fiber İnternet & Uydu Servisi
    }
    if (str.includes('kuaför') || str.includes('kuafor') || str.includes('bakım') || str.includes('bakim') || str.includes('beauty')) {
      return 4; // Büyükada Mobil Kuaför & Güzellik
    }
    if (str.includes('boya') || str.includes('painting')) {
      return 1; // Heybeliada Boya & Badana Dekoratörü
    }
    if (str.includes('çilingir') || str.includes('cilingir') || str.includes('kilit') || str.includes('locksmith')) {
      return 2; // Kınalıada Acil Çilingir & Kilit Servisi
    }
    if (str.includes('bahçıvan') || str.includes('bahcivan') || str.includes('bahçe') || str.includes('bahce') || str.includes('gardener')) {
      return 3; // Burgazada Bahçe Bakım & Peyzaj Ustası
    }
    return 0; // Büyükada Elektrik & Tesisat Uzmanı (Tadilat & Tamirat)
  };

  const [heroSlides, setHeroSlides] = useState<any[]>([]);
  const [showSurvey, setShowSurvey] = useState(false);
  const [surveyOptions, setSurveyOptions] = useState<string[]>([]);
  const [surveyOtherText, setSurveyOtherText] = useState('');
  const [surveySubmitted, setSurveySubmitted] = useState(false);
  const [hasCompletedSurvey, setHasCompletedSurvey] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [totalEventsCount, setTotalEventsCount] = useState(0);
  const [totalListingsCount, setTotalListingsCount] = useState(0);
  const [unseenEventsCount, setUnseenEventsCount] = useState(0);
  const [unseenListingsCount, setUnseenListingsCount] = useState(0);
  const [allEventIds, setAllEventIds] = useState<string[]>([]);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteEmailError, setInviteEmailError] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [isInviteFocused, setIsInviteFocused] = useState(false);
  const [showEmailInviteModal, setShowEmailInviteModal] = useState(false);
  const inviteInputRef = useRef<TextInput>(null);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showIslanderStepsModal, setShowIslanderStepsModal] = useState(false);
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  
  const [showCelebrationModal, setShowCelebrationModal] = useState(false);
  const [showAdaAiModal, setShowAdaAiModal] = useState(false);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const celebrationScale = useRef(new Animated.Value(0)).current;

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const handleShareInvite = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const appStoreUrl = 'https://apps.apple.com/tr/app/ada-plus/id6743840993';
      await Share.share({
        message: i18n.language.startsWith('en')
          ? `Join AdaPlus and discover island events, ferry schedules, and community news! Download on the App Store: ${appStoreUrl}`
          : `AdaPlus ile Adalar parmaklarının ucunda! Sen de aramıza katıl, App Store'dan ücretsiz indir: ${appStoreUrl}`,
        url: appStoreUrl,
      });
    } catch (error) {
      console.log('Share error:', error);
    }
  };

  useEffect(() => {
    AsyncStorage.getItem('has_completed_delivery_survey').then(val => {
      if (val === 'true') {
        setHasCompletedSurvey(true);
      }
    });
  }, []);

  const [celebrationContent, setCelebrationContent] = useState({ title: '', description: '' });

  useEffect(() => {
    const checkCelebration = async () => {
      // 1. Invite 3 celebration
      if (user && (user as any).invitedUsersCount >= 3) {
        const hasSeen = await AsyncStorage.getItem('has_seen_invite_celebration_3');
        if (hasSeen !== 'true') {
          setCelebrationContent({
            title: "Tebrikler!",
            description: "3 kişiyi davet ettin ve Adalı rozetini kazandın!"
          });
          setShowCelebrationModal(true);
          await AsyncStorage.setItem('has_seen_invite_celebration_3', 'true');
          return;
        }
      }

      // 2. Global Users Milestone Celebration
      try {
        const count = await fetchUserCount();
        const milestones = [10000, 5000, 1000];
        for (const milestone of milestones) {
          if (count >= milestone) {
            const hasSeenMilestone = await AsyncStorage.getItem(`has_seen_milestone_${milestone}`);
            if (hasSeenMilestone !== 'true') {
              setCelebrationContent({
                title: "Büyük Kilometre Taşı!",
                description: `İnanılmaz! AdaPlus artık ${milestone} üyeye ulaştı! Büyüyen topluluğumuzun bir parçası olduğun için teşekkürler. 🎉`
              });
              setShowCelebrationModal(true);
              await AsyncStorage.setItem(`has_seen_milestone_${milestone}`, 'true');
              break;
            }
          }
        }
      } catch (err) {
        console.log("Milestone check error:", err);
      }
    };
    checkCelebration();
  }, [user]);

  const closeCelebrationModal = () => {
    setShowCelebrationModal(false);
  };

  const handleSendInvite = async () => {
    if (isInviting) return;

    const invitedCount = (user as any)?.invitedUsersCount || 0;
    if (invitedCount >= 5) {
      Alert.alert(
        i18n.language.startsWith('en') ? 'Invitation Quota Full' : 'Davet Kotanız Doldu',
        i18n.language.startsWith('en')
          ? 'You can invite a maximum of 5 islanders. Your invitation quota (5/5) has been reached.'
          : 'En fazla 5 kişiyi Adalı olarak davet edebilirsiniz. Davet kotanız (5/5) dolmuştur.'
      );
      return;
    }

    const email = inviteEmail.trim();
    if (!email) return;

    if (!EMAIL_REGEX.test(email)) {
      Alert.alert(
        t('common.error', { defaultValue: i18n.language.startsWith('en') ? 'Error' : 'Hata' }),
        i18n.language.startsWith('en') ? 'Please enter a valid email address.' : 'Geçerli bir e-posta adresi girin.'
      );
      return;
    }

    setInviteEmailError('');
    Keyboard.dismiss();
    setIsInviting(true);

    try {
      const token = getToken();
      if (!token) {
        Alert.alert(t('common.error'), i18n.language.startsWith('en') ? 'You must be logged in to send invites.' : 'Davet göndermek için giriş yapmalısın.');
        return;
      }
      const response = await fetchWithTimeout(`${API_BASE_URL}/api/v1/users/invites`, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ email })
      });
      const errorBody = response.ok ? null : await response.json().catch(() => null);
      const errorMessage = String(errorBody?.message || errorBody?.error || '').toLowerCase();

      if (response.status === 409 || errorMessage.includes('already') || errorMessage.includes('zaten')) {
        Alert.alert(
          i18n.language.startsWith('en') ? 'Already Invited' : 'Davet Zaten Gönderilmiş',
          i18n.language.startsWith('en')
            ? 'An invitation has already been sent to this email address.'
            : 'Bu e-posta adresine daha önce davet gönderilmiş.'
        );
        return;
      }
      if (response.status === 400 || response.status === 403 || response.status === 429) {
        Alert.alert(
          i18n.language.startsWith('en') ? 'Invitation Quota Full' : 'Davet Kotanız Doldu',
          i18n.language.startsWith('en')
            ? 'You can invite a maximum of 3 islanders. Your invitation quota (3/3) has been reached.'
            : 'En fazla 3 kişiyi Adalı olarak davet edebilirsiniz. Davet kotanız (3/3) dolmuştur.'
        );
        return;
      }
      if (!response.ok) {
        throw new Error(errorBody?.message || `HTTP ${response.status}`);
      }
      Alert.alert(t('common.success'), t('profile.inviteSendSuccess'));
      setInviteEmail('');
      setInviteEmailError('');
      setShowEmailInviteModal(false);
    } catch (error) {
      console.error('Failed to send invite:', error);
      Alert.alert(t('common.error'), t('profile.inviteSendFailed'));
    } finally {
      setIsInviting(false);
    }
  };

  const [serviceBanner, setServiceBanner] = useState<ServiceBannerDto | null>(null);

  useFocusEffect(
    useCallback(() => {

      const fetchActiveBanner = async () => {
          try {
              const res = await fetch(`${API_BASE_URL}/api/v1/banners/active`);
              if (res.status === 200) {
                  return await res.json();
              }
          } catch (e) { console.log('Banner error', e); }
          return null;
      };

      const fetchInitialNotifications = async () => {
          if (!isLoggedIn) return [];
          try {
              return await fetchNotifications();
          } catch (e) { console.log('Notifications error', e); }
          return [];
      };

      Promise.all([fetchActivities(), fetchListings(), fetchActiveBanner(), fetchInitialNotifications(), fetchServiceBanner()]).then(([eventsData, listingsData, bannerData, notificationsData, serviceBannerData]) => {
        if (serviceBannerData) setServiceBanner(serviceBannerData);
        const events = Array.isArray(eventsData) ? eventsData : ((eventsData as any)?.content || (eventsData as any)?.data || []);
        const listings = Array.isArray(listingsData) ? listingsData : ((listingsData as any)?.content || (listingsData as any)?.data || []);
        if (Array.isArray(notificationsData) && notificationsData.length > 0) {
            setNotifications(notificationsData);
            AsyncStorage.setItem('cached_notifications', JSON.stringify(notificationsData));
        }
        
        const now = new Date();
        const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
        
        const validEvents = (Array.isArray(events) ? events : [])
          .filter((e: any) => {
            if (e.endDate) return new Date(e.endDate) >= now;
            if (e.startDate) return new Date(e.startDate) >= cutoff;
            return true;
          })
          .map((event: any) => ({
            id: event.id,
            type: 'event',
            title: event.name,
            subtitle: event.description || event.organizerName || '',
            island: event.island || event.eventPlace || 'Kınalıada',
            date: event.startDate ? new Date(event.startDate).getTime() : now.getTime(),
            createdAt: event.createdAt ? new Date(event.createdAt).getTime() : (event.startDate ? new Date(event.startDate).getTime() : now.getTime()),
            imageUrl: resolveImageUrl(event.imageUrl) || 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=800&auto=format&fit=crop&q=80'
          }));

        const validListings = listings
          .map((listing: any) => ({
            id: listing.id,
            type: 'listing',
            title: listing.title,
            subtitle: listing.description || '',
            island: listing.island || listing.location || 'Büyükada',
            price: listing.price || 0,
            // If createdAt isn't available, we use now as fallback
            date: listing.createdAt ? new Date(listing.createdAt).getTime() : now.getTime(),
            createdAt: listing.createdAt ? new Date(listing.createdAt).getTime() : now.getTime(),
            imageUrl: resolveImageUrl(listing.imageUrl) || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&auto=format&fit=crop&q=80'
          }));

        const combined = [...validEvents, ...validListings]
          .sort((a, b) => b.date - a.date) // sort by newest first
          .slice(0, 10);

        if (bannerData && bannerData.active) {
            combined.unshift({
                id: bannerData.id,
                type: 'banner',
                title: bannerData.title,
                subtitle: bannerData.body,
                imageUrl: resolveImageUrl(bannerData.imageUrl) || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&auto=format&fit=crop&q=80',
                actionUrl: bannerData.actionUrl
            });
        }

        setTotalEventsCount(validEvents.length);
        setTotalListingsCount(validListings.length);
        AsyncStorage.setItem('cached_total_events', validEvents.length.toString());
        AsyncStorage.setItem('cached_total_listings', validListings.length.toString());

        setAllEventIds(validEvents.map((e: any) => e.id));
        AsyncStorage.getItem('seenEventIds').then(seenStr => {
          const seenIds = seenStr ? JSON.parse(seenStr) : [];
          const unseenCount = validEvents.filter((e: any) => !seenIds.includes(e.id)).length;
          setUnseenEventsCount(unseenCount);
          AsyncStorage.setItem('cached_unseen_events', unseenCount.toString());
        });

        AsyncStorage.getItem('lastViewedListings').then(lastViewedStr => {
          const lastViewed = lastViewedStr ? parseInt(lastViewedStr, 10) : 0;
          const unseenCount = validListings.filter((l: any) => l.createdAt > lastViewed).length;
          setUnseenListingsCount(unseenCount);
          AsyncStorage.setItem('cached_unseen_listings', unseenCount.toString());
        });

        if (combined.length > 0) {
          setHeroSlides(combined);
        } else {
          setHeroSlides([]);
        }
      }).catch(err => console.log('Error fetching hero slider data:', err));

      // Load cached counts immediately on focus so event/listing/notification badges show on reload
      AsyncStorage.multiGet(['cached_unseen_events', 'cached_unseen_listings', 'cached_total_events', 'cached_total_listings', 'cached_notifications', 'lastViewedNotifications']).then(stores => {
        const map = Object.fromEntries(stores);
        if (map['cached_unseen_events']) setUnseenEventsCount(parseInt(map['cached_unseen_events'], 10) || 0);
        if (map['cached_unseen_listings']) setUnseenListingsCount(parseInt(map['cached_unseen_listings'], 10) || 0);
        if (map['cached_total_events']) setTotalEventsCount(parseInt(map['cached_total_events'], 10) || 0);
        if (map['cached_total_listings']) setTotalListingsCount(parseInt(map['cached_total_listings'], 10) || 0);
        if (map['cached_notifications']) {
          try {
            const parsed = JSON.parse(map['cached_notifications']);
            const lastViewedTime = map['lastViewedNotifications'] ? parseInt(map['lastViewedNotifications'], 10) : 0;
            if (Array.isArray(parsed) && parsed.length > 0) {
              const processed = parsed.map(n => ({
                ...n,
                read: n.read || (n.createdAt ? new Date(n.createdAt).getTime() <= lastViewedTime : true)
              }));
              setNotifications(processed);
            }
          } catch (e) {}
        }
      });

      if (isLoggedIn) {
        fetchNotifications().then(async data => {
            if (data && Array.isArray(data) && data.length > 0) {
              const lastViewedStr = await AsyncStorage.getItem('lastViewedNotifications');
              const lastViewedTime = lastViewedStr ? parseInt(lastViewedStr, 10) : 0;
              const processed = data.map(n => ({
                ...n,
                read: n.read || (n.createdAt ? new Date(n.createdAt).getTime() <= lastViewedTime : true)
              }));
              setNotifications(processed);
              AsyncStorage.setItem('cached_notifications', JSON.stringify(processed));
            }
        }).catch(e => console.log('Error prefetching notifications', e));
      }
    }, [isLoggedIn])
  );

  useFocusEffect(
    useCallback(() => {
      return () => {
        inviteInputRef.current?.blur();
        Keyboard.dismiss();
        setIsInviteFocused(false);
      };
    }, [])
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHeroExpanded, setIsHeroExpanded] = useState(false);
  const slideAnim = React.useRef(new Animated.Value(0)).current;

  const toggleHero = () => {
    const toValue = isHeroExpanded ? 0 : 120;
    Animated.spring(slideAnim, {
      toValue,
      useNativeDriver: true,
      friction: 8,
      tension: 40,
    }).start();
    setIsHeroExpanded(!isHeroExpanded);
  };

  const defaultSlide = {
    id: 'default_welcome',
    title: t('common.readyForAdventure'),
    subtitle: t('common.exploreServices'),
    imageUrl: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800&auto=format&fit=crop&q=80'
  };

  const slidesToRender = heroSlides.length > 0 ? heroSlides : [defaultSlide];
  const slideWidth = width - 24;
  const slideGap = 12;
  const snapInterval = slideWidth + slideGap;

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / snapInterval);
    setActiveIndex(index);
  };
  const heroHeight = isSmallScreen ? Math.min(height * 0.30, 235) : Math.min(Math.max(height * 0.35, 275), 330);

  const heroScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (slidesToRender.length <= 1) return;
    
    const interval = setInterval(() => {
      setActiveIndex((current) => {
        const nextIndex = (current + 1) % slidesToRender.length;
        heroScrollRef.current?.scrollTo({ x: nextIndex * snapInterval, animated: true });
        return nextIndex;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [slidesToRender.length, snapInterval]);


  return (
    <SwipeNavigation rightRoute="/(tabs)/home">
    <View style={[styles.container, { paddingTop: insets.top }, isDark && { backgroundColor: '#000000' }]}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ flexGrow: 1 }}
            showsVerticalScrollIndicator={false}
            scrollEnabled={true}
            snapToInterval={pageHeight}
            decelerationRate="fast"
            snapToAlignment="start"
            bounces={false}
            keyboardShouldPersistTaps="handled"
            onLayout={(e) => setMeasuredPageHeight(e.nativeEvent.layout.height)}
          >
            <View style={{ height: pageHeight, justifyContent: 'space-between', paddingBottom: 10 }}>
              <View style={[styles.welcomeContainer, { 
                flexDirection: 'row', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                paddingTop: isIphone11 ? 12 : 6, 
                paddingHorizontal: 12,
                marginBottom: 8,
              }]}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text 
                    style={[styles.welcomeGreeting, isLargeScreen && { fontSize: 30 }, isIphone11 && { fontSize: 28 }, { marginBottom: 2 }, isDark && { color: '#F8FAFC' }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}
                  >
                    {isLoggedIn && user
                      ? `${t('explore.welcome', { defaultValue: 'Hoşgeldin' })}, ${((user as any)?.fullName || (user as any)?.name || (user as any)?.username || '').trim().split(' ')[0] || (i18n.language.startsWith('en') ? 'Islander' : 'Adalı')}\u00A0🌸`
                      : `${t('explore.welcome', { defaultValue: 'Hoşgeldin' })}\u00A0🌸`}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                    <Text style={[styles.welcomeSubtitle, isLargeScreen && { fontSize: 15 }, isDark && { color: '#94A3B8' }]} numberOfLines={1} adjustsFontSizeToFit>
                      {t('explore.readyToExplore', { defaultValue: i18n.language.startsWith('en') ? 'Ready to explore the islands?' : 'Adaları keşfetmeye hazır mısın?' })}
                    </Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 2 }}>
                  <CopilotStep text={t('explore.tour.duyurular', { defaultValue: i18n.language.startsWith('en') ? 'You can view all current island announcements and notifications here.' : 'Tüm güncel ada duyurularını ve bildirimlerini buradan görebilirsin.' })} order={8} name="duyurular">
                    <WalkthroughableView collapsable={false}>
                      <Pressable 
                        style={({ pressed }) => [{
                          width: 44,
                          height: 44,
                          borderRadius: 22,
                          backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                          justifyContent: 'center',
                          alignItems: 'center',
                        }, pressed && { opacity: 0.7 }]}
                        onPress={async () => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setShowNotificationModal(true);
                          setLoadingNotifications(true);
                          
                          let notificationsData: any[] = [];
                          if (!isLoggedIn) {
                              const stored = await AsyncStorage.getItem('guest_notifications');
                              notificationsData = stored ? JSON.parse(stored) : [];
                          } else {
                              try {
                                  const fetchedData = await fetchNotifications();
                                  notificationsData = Array.isArray(fetchedData) ? fetchedData : [];
                                  markAllRead().catch(() => {});
                              } catch (e) {
                                  console.log('Error fetching notifications', e);
                              }
                          }
                          
                          const now = Date.now();
                          const allReadData = notificationsData.map(n => ({ ...n, read: true }));
                          setNotifications(allReadData);
                          await AsyncStorage.setItem('cached_notifications', JSON.stringify(allReadData));
                          await AsyncStorage.setItem('lastViewedNotifications', now.toString());
                          setLoadingNotifications(false);
                        }}
                      >
                        <IconSymbol name="megaphone.fill" size={22} color={isDark ? '#CBD5E1' : '#64748B'} />
                        {/* Dinamik Okunmamış Bildirim Rozeti (Placeholder Kaldırıldı) */}
                        {(() => {
                          const unreadCount = notifications.filter(n => !n.read).length;
                          if (unreadCount <= 0) return null;
                          return (
                            <View style={{
                              position: 'absolute',
                              top: -2,
                              right: -2,
                              backgroundColor: '#EF4444',
                              minWidth: 18,
                              height: 18,
                              borderRadius: 9,
                              alignItems: 'center',
                              justifyContent: 'center',
                              zIndex: 10,
                              borderWidth: 2,
                              borderColor: isDark ? '#1E293B' : '#FFFFFF',
                              paddingHorizontal: 3
                            }}>
                              <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '800', textAlign: 'center', includeFontPadding: false }}>
                                {unreadCount}
                              </Text>
                            </View>
                          );
                        })()}
                      </Pressable>
                    </WalkthroughableView>
                  </CopilotStep>
                </View>
              </View>


      {/* Invite Buttons (Two equal-width buttons: Email Invite & Share Link) */}
      <View style={{ paddingHorizontal: 12, marginBottom: 9 }}>
        <CopilotStep text={t('explore.tour.davet', { defaultValue: i18n.language.startsWith('en') ? 'You can invite island residents from here.' : 'Buradan ada sakinlerini davet edebilirsin.' })} order={7} name="davet">
          <WalkthroughableView collapsable={false}>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              {/* Button 1: Email Invite */}
              <TouchableOpacity
                activeOpacity={0.85}
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                  borderRadius: 12,
                  height: 48,
                  gap: 7,
                  borderWidth: 1.5,
                  borderColor: isDark ? '#047857' : '#059669',
                }}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  if (!(user?.userType === 'ISLAND_RESIDENT' || user?.role === 'ADMIN')) {
                    setShowIslanderStepsModal(true);
                  } else {
                    setShowEmailInviteModal(true);
                  }
                }}
              >
                <View style={{ justifyContent: 'center', alignItems: 'center' }}>
                  <IconSymbol name="envelope.fill" size={16} color={isDark ? '#34D399' : '#059669'} />
                </View>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '700',
                    color: isDark ? '#34D399' : '#059669',
                    includeFontPadding: false,
                  }}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {i18n.language.startsWith('en') ? 'Invite by Email' : 'E-posta ile Davet'}
                </Text>
              </TouchableOpacity>

              {/* Button 2: Share Invite Link */}
              <TouchableOpacity
                activeOpacity={0.85}
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#059669',
                  borderRadius: 12,
                  height: 48,
                  gap: 7,
                  shadowColor: '#059669',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                  elevation: 2,
                }}
                onPress={handleShareInvite}
              >
                <View style={{ justifyContent: 'center', alignItems: 'center', marginTop: 1 }}>
                  <IconSymbol name="square.and.arrow.up" size={17} color="#FFFFFF" />
                </View>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '700',
                    color: '#FFFFFF',
                    includeFontPadding: false,
                  }}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {i18n.language.startsWith('en') ? 'Share AdaPlus' : "AdaPlus'ı Paylaş"}
                </Text>
              </TouchableOpacity>
            </View>
          </WalkthroughableView>
        </CopilotStep>
      </View>

      {/* Weather & Ferry Banner */}
      <View style={{ paddingHorizontal: 12, marginBottom: 10 }}>
        <TodayOnIsland />
      </View>

      {/* Hero Header Slider Wrapper */}
      <CopilotStep text={t('explore.tour.banner', { defaultValue: i18n.language.startsWith('en') ? 'Important announcements, upcoming events, and featured listings are gathered here.' : 'Adadaki en önemli duyurular, yaklaşan etkinlikler ve öne çıkan ilanlar burada toplanır.' })} order={1} name="banner">
        <WalkthroughableView collapsable={false} style={{ height: heroHeight, marginHorizontal: 12, borderRadius: 12 }}>
            <ScrollView 
          ref={heroScrollRef}
          horizontal 
          showsHorizontalScrollIndicator={false}
          snapToInterval={snapInterval}
          snapToAlignment="start"
          decelerationRate="fast"
          disableIntervalMomentum={true}
          bounces={true}
          style={{ overflow: 'visible' }}
          onMomentumScrollEnd={(e) => {
            const scrollPosition = e.nativeEvent.contentOffset.x;
            const index = Math.round(scrollPosition / snapInterval);
            setActiveIndex(index);
          }}
        >
          {slidesToRender.map((slide, index) => (
            <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)', borderless: false }} 
              key={index} 
              style={{
                width: slideWidth,
                marginRight: index === slidesToRender.length - 1 ? 0 : slideGap,
                backgroundColor: '#fff',
                borderRadius: 12
              }}
              onPress={() => {
                if (slide?.id && !slide.id.startsWith('default')) {
                  if (slide.type === 'listing') {
                    navigateWithDebounce({ pathname: '/explore/island/ilan/[id]', params: { id: slide.id } });
                  } else if (slide.type === 'banner') {
                    if (slide.actionUrl) {
                      navigateWithDebounce(slide.actionUrl);
                    }
                  } else {
                    navigateWithDebounce({ pathname: '/explore/island/event/[id]', params: { id: slide.id } });
                  }
                } else {
                  navigateWithDebounce('/(tabs)/explore/island/events');
                }
              }}
            >
              <View style={[styles.heroImage, { width: slideWidth, borderRadius: 12, overflow: 'hidden' }]}>
                <ImageBackground 
                    source={{ uri: slide.imageUrl }} 
                    style={{ flex: 1, padding: 20, justifyContent: 'space-between', paddingHorizontal: 20 }}
                    imageStyle={{ resizeMode: 'cover', borderRadius: 12 }}
                >
                  <LinearGradient
                    colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.8)']}
                    style={[StyleSheet.absoluteFill, { borderRadius: 12 }]}
                  />
                  
                  {/* Top Row */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
                    <View style={{ backgroundColor: slide.type === 'listing' ? '#10B981' : '#3B82F6', flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}>
                      {slide.type === 'banner' && <IconSymbol name="exclamationmark.circle.fill" size={isLargeScreen ? 14 : 12} color="#FFF" />}
                      <Text style={{ color: '#FFF', fontSize: isLargeScreen ? 12 : 12, fontWeight: '700' }}>
                        {slide.type === 'listing' 
                          ? (i18n.language.startsWith('en') ? 'FEATURED LISTING' : 'ÖNE ÇIKAN İLAN') 
                          : (slide.type === 'banner' 
                              ? (i18n.language.startsWith('en') ? 'ANNOUNCEMENT' : 'DUYURU') 
                              : (i18n.language.startsWith('en') ? 'FEATURED EVENT' : 'ÖNE ÇIKAN ETKİNLİK'))}
                      </Text>
                    </View>
                    <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)', borderless: false }} 
                      style={{ backgroundColor: '#FFF', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 }}
                      onPress={() => navigateWithDebounce(slide.type === 'listing' ? '/(tabs)/explore/island/ilanlar' : '/(tabs)/explore/island/events')}
                    >
                      <Text style={{ color: '#0F172A', fontSize: isLargeScreen ? 12 : 12, fontWeight: '700', marginRight: 4 }}>
                        {slide.type === 'listing' 
                          ? (i18n.language.startsWith('en') ? 'All Listings' : 'Tüm İlanlar') 
                          : (i18n.language.startsWith('en') ? 'All Events' : 'Tüm Etkinlikler')}
                      </Text>
                      <IconSymbol name="arrow.right" size={12} color="#0F172A" />
                    </Pressable>
                  </View>

                  {/* Bottom Content */}
                  <View style={{ zIndex: 10, paddingBottom: 10 }}>
                    <Text style={{ color: '#FFF', fontSize: isLargeScreen ? 26 : 22, fontWeight: '800', marginBottom: 12, lineHeight: isLargeScreen ? 34 : 30, width: '90%' }} numberOfLines={2}>
                      {slide.title}
                    </Text>

                    {/* Details Row */}
                    {slide.type !== 'banner' && (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 1 }}>
                          <IconSymbol name="mappin.circle.fill" size={isLargeScreen ? 18 : 15} color="#E2E8F0" />
                          <Text style={{ color: '#E2E8F0', fontSize: isLargeScreen ? 14 : 13, marginLeft: 5, fontWeight: '500' }} numberOfLines={1}>
                            {t('places.' + (slide.island || slide.location || slide.eventPlace || 'Büyükada'), { defaultValue: slide.island || slide.location || slide.eventPlace || 'Büyükada' })}
                          </Text>
                        </View>
                        {slide.type === 'event' && slide.date && (
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <IconSymbol name="calendar" size={isLargeScreen ? 18 : 15} color="#E2E8F0" />
                            <Text style={{ color: '#E2E8F0', fontSize: isLargeScreen ? 14 : 13, marginLeft: 5, fontWeight: '500' }}>
                              {new Date(slide.date).toLocaleDateString(i18n.language.startsWith('en') ? 'en-US' : 'tr-TR', {day: 'numeric', month: 'long'})}
                            </Text>
                          </View>
                        )}
                        {slide.type === 'listing' && slide.price > 0 && (
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <IconSymbol name="tag.fill" size={isLargeScreen ? 18 : 15} color="#E2E8F0" />
                            <Text style={{ color: '#E2E8F0', fontSize: isLargeScreen ? 14 : 13, marginLeft: 5, fontWeight: '500' }}>
                              {slide.price.toLocaleString('tr-TR')} ₺
                            </Text>
                          </View>
                        )}
                      </View>
                    )}

                    {/* Button */}
                    <View style={{ backgroundColor: '#FFF', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 8, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={{ color: '#0F172A', fontSize: isLargeScreen ? 14 : 13, fontWeight: '700', marginRight: 4 }}>
                        {i18n.language.startsWith('en') ? 'View' : 'İncele'}
                      </Text>
                      <IconSymbol name="arrow.right" size={isLargeScreen ? 16 : 14} color="#0F172A" />
                    </View>
                  </View>
                </ImageBackground>
              </View>
            </Pressable>
          ))}
        </ScrollView>

        {/* Top bar (Fixed over the slider) */}
            {/* Pagination Dots */}
        <View pointerEvents="none" style={{ position: 'absolute', bottom: 12, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
          {slidesToRender.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot, 
                activeIndex === index ? styles.activeDot : null,
                { backgroundColor: activeIndex === index ? '#FFFFFF' : 'rgba(255,255,255,0.4)' }
              ]}
            />
          ))}
        </View>
        </WalkthroughableView>
      </CopilotStep>

      {/* 5 Cards Unified Frame Container */}
      <View style={{
        backgroundColor: isDark ? '#121212' : '#FFFFFF',
        marginHorizontal: 12,
        borderRadius: isLargeScreen ? 18 : 14,
        paddingTop: isLargeScreen ? 14 : (isSmallScreen ? 8 : 10),
        paddingBottom: isLargeScreen ? 12 : (isSmallScreen ? 8 : 10),
        paddingHorizontal: isLargeScreen ? 2 : 0,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        borderWidth: 1,
        borderColor: isDark ? '#1C1C1E' : '#F1F5F9',
        marginTop: 14,
        marginBottom: isLargeScreen ? 26 : (isSmallScreen ? 16 : 20),
        gap: isLargeScreen ? 12 : 8
      }}>
        {/* Hızlı Erişim Section (4 Buttons) */}
        <View 
          style={{ flexDirection: 'row', width: '100%', justifyContent: 'space-between', paddingHorizontal: 0 }}
        >
          {/* 1. Etkinlikler */}
          <View style={{ alignItems: 'center', flex: 1, gap: isLargeScreen ? 6 : 4 }}>
            <CopilotStep text={t('explore.tour.events', { defaultValue: i18n.language.startsWith('en') ? 'You can follow all island events from here.' : 'Adadaki tüm etkinlikleri buradan takip edebilirsin.' })} order={2} name="etkinlikler">
              <WalkthroughableView collapsable={false}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    AsyncStorage.setItem('seenEventIds', JSON.stringify(allEventIds));
                    setUnseenEventsCount(0);
                    AsyncStorage.setItem('cached_unseen_events', '0');
                    navigateWithDebounce('/(tabs)/explore/island/events');
                  }}
                  onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)}
                  style={{ width: isLargeScreen ? 68 : (isSmallScreen ? 46 : 55), aspectRatio: 1, borderRadius: isLargeScreen ? 14 : 12, backgroundColor: '#3B82F6', elevation: 6, shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, overflow: 'visible', alignItems: 'center', justifyContent: 'center' }}
                >
                  <IconSymbol name="calendar" size={isLargeScreen ? 29 : (isSmallScreen ? 20 : 24)} color="#FFFFFF" />
                  {unseenEventsCount > 0 && (
                    <View style={{ position: 'absolute', top: -4, right: -4, backgroundColor: '#EF4444', minWidth: isSmallScreen ? 18 : 20, height: isSmallScreen ? 18 : 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', zIndex: 10, borderWidth: 2, borderColor: '#FFF', paddingHorizontal: 3 }}>
                      <Text style={{ color: '#FFF', fontSize: isSmallScreen ? 9 : 10, fontWeight: '700', textAlign: 'center', includeFontPadding: false }}>{unseenEventsCount > 9 ? '9+' : unseenEventsCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </WalkthroughableView>
            </CopilotStep>
            <View style={{ width: '100%', paddingHorizontal: 1, alignItems: 'center', height: isLargeScreen ? 34 : 30, justifyContent: 'flex-start', overflow: 'hidden' }}>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} allowFontScaling={false} style={{ width: '100%', textAlign: 'center', fontSize: isLargeScreen ? 12.5 : (isSmallScreen ? 10 : 11), fontWeight: '700', color: isDark ? '#F8FAFC' : '#1F2937', marginBottom: 1 }}>{t('explore.events')}</Text>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} allowFontScaling={false} style={{ width: '100%', textAlign: 'center', fontSize: isLargeScreen ? 10.5 : (isSmallScreen ? 9 : 9.5), color: isDark ? '#CBD5E1' : '#6B7280', fontWeight: '500' }}>{t('explore.eventsCount', { count: totalEventsCount })}</Text>
            </View>
          </View>

          {/* 2. İlanlar */}
          <View style={{ alignItems: 'center', flex: 1, gap: isLargeScreen ? 6 : 4 }}>
            <CopilotStep text={t('explore.tour.ilanlar', { defaultValue: i18n.language.startsWith('en') ? 'You can browse real estate, items, or job listings here.' : 'Emlak, eşya veya iş ilanlarına buradan göz atabilirsin.' })} order={3} name="ilanlar">
              <WalkthroughableView collapsable={false}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    AsyncStorage.setItem('lastViewedListings', Date.now().toString());
                    setUnseenListingsCount(0);
                    AsyncStorage.setItem('cached_unseen_listings', '0');
                    navigateWithDebounce('/(tabs)/explore/island/ilanlar');
                  }}
                  onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)}
                  style={{ width: isLargeScreen ? 68 : (isSmallScreen ? 46 : 55), aspectRatio: 1, borderRadius: isLargeScreen ? 14 : 12, backgroundColor: '#F59E0B', elevation: 6, shadowColor: '#F59E0B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, overflow: 'visible', alignItems: 'center', justifyContent: 'center' }}
                >
                  <IconSymbol name="tag.fill" size={isLargeScreen ? 29 : (isSmallScreen ? 20 : 24)} color="#FFFFFF" />
                  {unseenListingsCount > 0 && (
                    <View style={{ position: 'absolute', top: -4, right: -4, backgroundColor: '#EF4444', minWidth: isSmallScreen ? 18 : 20, height: isSmallScreen ? 18 : 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', zIndex: 10, borderWidth: 2, borderColor: '#FFF', paddingHorizontal: 3 }}>
                      <Text style={{ color: '#FFF', fontSize: isSmallScreen ? 9 : 10, fontWeight: '700', textAlign: 'center', includeFontPadding: false }}>{unseenListingsCount > 9 ? '9+' : unseenListingsCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </WalkthroughableView>
            </CopilotStep>
            <View style={{ width: '100%', paddingHorizontal: 1, alignItems: 'center', height: isLargeScreen ? 34 : 30, justifyContent: 'flex-start', overflow: 'hidden' }}>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} allowFontScaling={false} style={{ width: '100%', textAlign: 'center', fontSize: isLargeScreen ? 12.5 : (isSmallScreen ? 10 : 11), fontWeight: '700', color: isDark ? '#F8FAFC' : '#1F2937', marginBottom: 1 }}>{t('explore.listings')}</Text>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} allowFontScaling={false} style={{ width: '100%', textAlign: 'center', fontSize: isLargeScreen ? 10.5 : (isSmallScreen ? 9 : 9.5), color: isDark ? '#CBD5E1' : '#6B7280', fontWeight: '500' }}>{t('explore.listingsCount', { count: totalListingsCount })}</Text>
            </View>
          </View>

          {/* 3. Ada AI */}
          <View style={{ alignItems: 'center', flex: 1, gap: isLargeScreen ? 6 : 4 }}>
            <CopilotStep text={t('explore.tour.adaAi', { defaultValue: i18n.language.startsWith('en') ? 'Our AI guide, specially developed for the islands, is currently under development.' : 'Adalar için özel olarak geliştirilen yapay zeka rehberimiz şu an geliştirilme aşamasındadır.' })} order={4} name="ada_ai">
              <WalkthroughableView collapsable={false}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setShowAdaAiModal(true)}
                  onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)}
                  style={{ width: isLargeScreen ? 68 : (isSmallScreen ? 46 : 55), aspectRatio: 1, borderRadius: isLargeScreen ? 14 : 12, backgroundColor: '#EC4899', elevation: 6, shadowColor: '#EC4899', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, overflow: 'visible', alignItems: 'center', justifyContent: 'center' }}
                >
                  <IconSymbol name="pawprint.fill" size={isLargeScreen ? 29 : (isSmallScreen ? 20 : 24)} color="#FFFFFF" />
                  <View style={{ position: 'absolute', bottom: -5, backgroundColor: isDark ? '#831843' : '#FCE7F3', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 6, borderWidth: 1, borderColor: isDark ? '#9F1239' : '#FBCFE8', zIndex: 10 }}>
                    <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ fontSize: isSmallScreen ? 7.5 : 8.5, color: isDark ? '#F472B6' : '#EC4899', fontWeight: '700' }}>{i18n.language.startsWith('en') ? 'Soon' : 'Yakında'}</Text>
                  </View>
                </TouchableOpacity>
              </WalkthroughableView>
            </CopilotStep>
            <View style={{ width: '100%', paddingHorizontal: 1, alignItems: 'center', height: isLargeScreen ? 34 : 30, justifyContent: 'flex-start', overflow: 'hidden' }}>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} allowFontScaling={false} style={{ width: '100%', textAlign: 'center', fontSize: isLargeScreen ? 12.5 : (isSmallScreen ? 10 : 11), fontWeight: '700', color: isDark ? '#F8FAFC' : '#1F2937', marginBottom: 1 }}>{t('explore.adaAi')}</Text>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} allowFontScaling={false} style={{ width: '100%', textAlign: 'center', fontSize: isLargeScreen ? 10.5 : (isSmallScreen ? 9 : 9.5), color: isDark ? '#CBD5E1' : '#6B7280', fontWeight: '500' }}>{t('explore.yourGuide')}</Text>
            </View>
          </View>

          {/* 4. Paket Servis */}
          <View style={{ alignItems: 'center', flex: 1, gap: isLargeScreen ? 6 : 4 }}>
            <CopilotStep text={t('explore.tour.paket', { defaultValue: i18n.language.startsWith('en') ? 'Our delivery service will be available here very soon.' : 'Çok yakında paket servis hizmetimiz de burada olacak.' })} order={5} name="paket">
              <WalkthroughableView collapsable={false}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    Alert.alert(
                      i18n.language.startsWith('en') ? 'Delivery' : 'Paket Servis',
                      i18n.language.startsWith('en')
                        ? 'Delivery service will be available very soon.'
                        : 'Paket Servis hizmeti çok yakında kullanıma açılacak.',
                      [{ text: i18n.language.startsWith('en') ? 'OK' : 'Tamam' }]
                    );
                  }}
                  style={{ width: isLargeScreen ? 68 : (isSmallScreen ? 46 : 55), aspectRatio: 1, borderRadius: isLargeScreen ? 14 : 12, backgroundColor: '#8B5CF6', elevation: 3, shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.18, shadowRadius: 6, overflow: 'visible', alignItems: 'center', justifyContent: 'center' }}
                >
                  <IconSymbol name="bag.fill" size={isLargeScreen ? 29 : (isSmallScreen ? 20 : 24)} color="#FFFFFF" />
                  <View style={{ position: 'absolute', bottom: -5, backgroundColor: isDark ? '#4C1D95' : '#EDE9FE', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 6, borderWidth: 1, borderColor: isDark ? '#6D28D9' : '#DDD6FE', zIndex: 10 }}>
                    <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ fontSize: isSmallScreen ? 7.5 : 8.5, color: isDark ? '#C4B5FD' : '#7C3AED', fontWeight: '700' }}>{i18n.language.startsWith('en') ? 'Soon' : 'Yakında'}</Text>
                  </View>
                </TouchableOpacity>
              </WalkthroughableView>
            </CopilotStep>
            <View style={{ width: '100%', paddingHorizontal: 1, alignItems: 'center', height: isLargeScreen ? 34 : 30, justifyContent: 'flex-start', overflow: 'hidden' }}>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} allowFontScaling={false} style={{ width: '100%', textAlign: 'center', fontSize: isLargeScreen ? 12.5 : (isSmallScreen ? 10 : 11), fontWeight: '700', color: isDark ? '#F8FAFC' : '#1F2937', marginBottom: 1 }}>{i18n.language.startsWith('en') ? 'Delivery' : 'Paket Servis'}</Text>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} allowFontScaling={false} style={{ width: '100%', textAlign: 'center', fontSize: isLargeScreen ? 10.5 : (isSmallScreen ? 9 : 9.5), color: isDark ? '#CBD5E1' : '#6B7280', fontWeight: '500' }}>{i18n.language.startsWith('en') ? 'Coming Soon' : 'Çok Yakında'}</Text>
            </View>
          </View>
        </View>

        {/* 5. Topluluk Banner */}
        <CopilotStep text={t('explore.tour.topluluk', { defaultValue: i18n.language.startsWith('en') ? 'Tap here to chat with islanders and join discussions.' : 'Adalılarla sohbet etmek ve tartışmalara katılmak için buraya dokun.' })} order={6} name="topluluk">
          <WalkthroughableView collapsable={false} style={{ width: '100%' }}>
            <SwipeButton
              isLoggedIn={isLoggedIn}
              onSwipeComplete={() => navigateWithDebounce('/(tabs)/explore/island/forum')}
            />
          </WalkthroughableView>
        </CopilotStep>
      </View>
      </View>
      {/* End of Page 1 */}

      {/* Page 2: Banner Area & Lokal Servisler (Snap Page 2) */}
      <View style={{ height: pageHeight, justifyContent: 'space-between', paddingBottom: 16 }}>
        {/* Centered Island Dropdown Text Selector above Banner */}
        <View style={{ alignItems: 'center', paddingTop: 8, paddingBottom: 6, zIndex: 100 }}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowIslandPicker(!showIslandPicker);
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: 8,
              paddingVertical: 4,
            }}
          >
            <IconSymbol name="mappin.and.ellipse" size={17} color="#3B82F6" />
            <Text style={{ fontSize: 17, fontWeight: '800', color: isDark ? '#FFFFFF' : '#0F172A', letterSpacing: -0.3 }}>
              {selectedIsland}
            </Text>
            <IconSymbol name={showIslandPicker ? "chevron.up" : "chevron.down"} size={14} color={isDark ? '#94A3B8' : '#64748B'} />
          </TouchableOpacity>

          {/* Inline Dropdown Menu */}
          {showIslandPicker && (
            <View 
              style={{
                position: 'absolute',
                top: 38,
                minWidth: 160,
                backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                borderRadius: 14,
                padding: 6,
                borderWidth: 1,
                borderColor: isDark ? '#334155' : '#E2E8F0',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.15,
                shadowRadius: 10,
                elevation: 12,
                zIndex: 999,
              }}
            >
              {['Büyükada', 'Heybeliada', 'Burgazada', 'Kınalıada'].map((islandName) => {
                const isSelected = selectedIsland === islandName;
                return (
                  <TouchableOpacity
                    key={islandName}
                    activeOpacity={0.7}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      setSelectedIsland(islandName);
                      setShowIslandPicker(false);
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingVertical: 10,
                      paddingHorizontal: 14,
                      borderRadius: 10,
                      marginBottom: 2,
                      backgroundColor: isSelected ? (isDark ? '#1E3A8A' : '#EFF6FF') : 'transparent',
                    }}
                  >
                    <Text style={{ fontSize: 16, fontWeight: isSelected ? '800' : '600', color: isSelected ? '#3B82F6' : (isDark ? '#F8FAFC' : '#1E293B') }}>
                      {islandName}
                    </Text>
                    {isSelected && <IconSymbol name="checkmark" size={15} color="#3B82F6" />}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Top Banner Area (Fills upper space completely) */}
        <Animated.View style={{ paddingTop: 6, paddingHorizontal: 12, flex: 1, marginBottom: 14, transform: [{ scale: bannerScaleAnim }] }}>
          {(() => {
            const dynamicSlide = (() => {
              if (mockServiceIndex !== null) {
                const mock = MOCK_SERVICES[mockServiceIndex];
                return {
                  tag: `✨ ${mock.categoryTag}`,
                  header: localizeMockTitle(mock.title, selectedIsland),
                  subtitle: mock.description,
                  actionLabel: i18n.language.startsWith('en') ? 'Join Service Network' : 'Hizmet Ağına Katıl',
                };
              }
              return {
                tag: serviceBanner?.tag || (i18n.language.startsWith('en') ? '✨ LOCAL NETWORK' : '✨ YEREL HİZMET AĞI'),
                header: serviceBanner?.header || (i18n.language.startsWith('en') ? 'Are You a Local Service Provider?' : 'Adada Hizmet mi Veriyorsun?'),
                subtitle: serviceBanner?.subtitle || (i18n.language.startsWith('en') ? 'List your business on AdaPlus and reach islanders directly.' : 'Uzmanlığını adalı komşularınla paylaş, hizmetini hemen öne çıkar.'),
                actionLabel: serviceBanner?.actionLabel || (i18n.language.startsWith('en') ? 'Join Service Network' : 'Hizmet Ağına Katıl'),
              };
            })();

            const bannerTag = dynamicSlide.tag;
            const bannerHeader = dynamicSlide.header;
            const bannerSubtitle = dynamicSlide.subtitle;
            const bannerActionLabel = dynamicSlide.actionLabel;
            const resolvedBannerImg = serviceBanner?.imageUrl ? resolveImageUrl(serviceBanner.imageUrl) : null;

            const handleBannerPress = () => {
              if (serviceBanner?.actionUrl) {
                router.push(serviceBanner.actionUrl as any);
              } else {
                router.push('/(tabs)/explore/island/hizmet-saglayici');
              }
            };

            const content = (
              <View style={{ flex: 1, padding: isLargeScreen ? 24 : 20, justifyContent: 'space-between', zIndex: 5 }}>
                {!resolvedBannerImg && (
                  <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', borderRadius: 12, pointerEvents: 'none' }}>
                    {/* Background Mesh Orbs */}
                    <View style={{ position: 'absolute', right: -30, top: -30, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255, 255, 255, 0.12)' }} />
                    <View style={{ position: 'absolute', right: 40, bottom: -40, width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255, 255, 255, 0.08)' }} />

                    {/* Floating Decorative Vector Icons Pattern (Strictly using only the 6 Quick Access Service Icons) */}
                    {/* 1. Tadilat & Tamirat (Wrench) - Top Right */}
                    <View style={{ position: 'absolute', right: 18, top: 12, opacity: 0.22, transform: [{ rotate: '15deg' }] }}>
                      <IconSymbol name="wrench.and.screwdriver.fill" size={38} color="#FFFFFF" />
                    </View>

                    {/* 2. Kuaför & Bakım (Scissors) - Top Center */}
                    <View style={{ position: 'absolute', right: 130, top: 14, opacity: 0.20, transform: [{ rotate: '-25deg' }] }}>
                      <IconSymbol name="scissors" size={28} color="#FFFFFF" />
                    </View>

                    {/* 3. Boya (Paintbrush) - Upper Right */}
                    <View style={{ position: 'absolute', right: 15, top: 85, opacity: 0.22, transform: [{ rotate: '40deg' }] }}>
                      <IconSymbol name="paintbrush.fill" size={34} color="#FFFFFF" />
                    </View>

                    {/* 4. İnternet (Globe) - Upper Left */}
                    <View style={{ position: 'absolute', left: 20, top: 80, opacity: 0.18, transform: [{ rotate: '-10deg' }] }}>
                      <IconSymbol name="globe" size={30} color="#FFFFFF" />
                    </View>

                    {/* 5. Çilingir (Key) - Center Right */}
                    <View style={{ position: 'absolute', right: 90, top: 135, opacity: 0.20, transform: [{ rotate: '-30deg' }] }}>
                      <IconSymbol name="key.fill" size={32} color="#FFFFFF" />
                    </View>

                    {/* 6. Bahçıvan (Tırmık - Rake) - Center Left */}
                    <View style={{ position: 'absolute', left: 25, top: 140, opacity: 0.20, transform: [{ rotate: '25deg' }] }}>
                      <MaterialCommunityIcons name="rake" size={32} color="#FFFFFF" />
                    </View>

                    {/* 1b. Tadilat & Tamirat (Wrench) - Center Canvas */}
                    <View style={{ position: 'absolute', left: 135, top: 145, opacity: 0.18, transform: [{ rotate: '-15deg' }] }}>
                      <IconSymbol name="wrench.and.screwdriver.fill" size={30} color="#FFFFFF" />
                    </View>

                    {/* 2b. Kuaför & Bakım (Scissors) - Center Right Outer */}
                    <View style={{ position: 'absolute', right: 18, top: 160, opacity: 0.18, transform: [{ rotate: '20deg' }] }}>
                      <IconSymbol name="scissors" size={30} color="#FFFFFF" />
                    </View>

                    {/* 3b. Boya (Paintbrush) - Lower Middle Left */}
                    <View style={{ position: 'absolute', left: 35, top: 200, opacity: 0.18, transform: [{ rotate: '-35deg' }] }}>
                      <IconSymbol name="paintbrush.fill" size={30} color="#FFFFFF" />
                    </View>

                    {/* 4b. İnternet (Globe) - Lower Middle Right */}
                    <View style={{ position: 'absolute', right: 125, top: 200, opacity: 0.20, transform: [{ rotate: '15deg' }] }}>
                      <IconSymbol name="globe" size={28} color="#FFFFFF" />
                    </View>

                    {/* Dead-Center Middle Gap Fillers */}
                    {/* 2c. Kuaför & Bakım (Scissors) - Dead Center */}
                    <View style={{ position: 'absolute', left: 140, top: 245, opacity: 0.20, transform: [{ rotate: '15deg' }] }}>
                      <IconSymbol name="scissors" size={28} color="#FFFFFF" />
                    </View>

                    {/* 3c. Boya (Paintbrush) - Center Right Middle */}
                    <View style={{ position: 'absolute', right: 40, top: 265, opacity: 0.22, transform: [{ rotate: '-30deg' }] }}>
                      <IconSymbol name="paintbrush.fill" size={32} color="#FFFFFF" />
                    </View>


                    {/* 5c. Çilingir (Key) - Lower Middle Inner */}
                    <View style={{ position: 'absolute', right: 140, top: 310, opacity: 0.20, transform: [{ rotate: '-15deg' }] }}>
                      <IconSymbol name="key.fill" size={30} color="#FFFFFF" />
                    </View>

                    {/* 6c. Bahçıvan (Tırmık - Rake) - Bottom Center */}
                    <View style={{ position: 'absolute', left: 130, bottom: 18, opacity: 0.20, transform: [{ rotate: '-10deg' }] }}>
                      <MaterialCommunityIcons name="rake" size={30} color="#FFFFFF" />
                    </View>

                    {/* 3d. Boya (Paintbrush) - Bottom Right */}
                    <View style={{ position: 'absolute', right: 18, bottom: 12, opacity: 0.22, transform: [{ rotate: '30deg' }] }}>
                      <IconSymbol name="paintbrush.fill" size={34} color="#FFFFFF" />
                    </View>

                    {/* 4c. İnternet (Globe) - Bottom Left (Replacing duplicate wrench) */}
                    <View style={{ position: 'absolute', left: 18, bottom: 15, opacity: 0.22, transform: [{ rotate: '15deg' }] }}>
                      <IconSymbol name="globe" size={32} color="#FFFFFF" />
                    </View>
                  </View>
                )}

                <View style={{ zIndex: 10 }}>
                  <View style={{ 
                    alignSelf: 'flex-start', 
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    backgroundColor: 'rgba(255, 255, 255, 0.22)',
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 6,
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor: 'rgba(255, 255, 255, 0.35)',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                  }}>
                    <IconSymbol name="briefcase.fill" size={13} color="#FFFFFF" />
                    <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.6, textTransform: 'uppercase' }}>
                      {bannerTag.replace('✨ ', '')}
                    </Text>
                  </View>

                  <Text style={{ fontSize: isLargeScreen ? 22 : 19, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.4, lineHeight: isLargeScreen ? 28 : 25, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4 }}>
                    {bannerHeader}
                  </Text>
                  <Text style={{ fontSize: isLargeScreen ? 13.5 : 12.5, color: 'rgba(255, 255, 255, 0.92)', marginTop: 6, lineHeight: 18, fontWeight: '500' }}>
                    {bannerSubtitle}
                  </Text>
                </View>

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    handleBannerPress();
                  }}
                  style={{
                    marginTop: 14,
                    alignSelf: 'flex-end',
                    backgroundColor: '#FFFFFF',
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.25,
                    shadowRadius: 8,
                    elevation: 6,
                    zIndex: 10
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '800', color: isDark ? '#312E81' : '#1D4ED8' }}>
                    {bannerActionLabel}
                  </Text>
                  <View style={{ width: 20, height: 20, borderRadius: 6, backgroundColor: isDark ? '#312E81' : '#2563EB', alignItems: 'center', justifyContent: 'center' }}>
                    <IconSymbol name="chevron.right" size={11} color="#FFFFFF" />
                  </View>
                </TouchableOpacity>
              </View>
            );

            if (resolvedBannerImg) {
              return (
                <ImageBackground
                  source={{ uri: resolvedBannerImg }}
                  style={{
                    flex: 1,
                    borderRadius: 12,
                    overflow: 'hidden',
                    shadowColor: '#2563EB',
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.25,
                    shadowRadius: 12,
                    elevation: 6,
                  }}
                  imageStyle={{ borderRadius: 12 }}
                >
                  <LinearGradient
                    colors={['rgba(15,23,42,0.65)', 'rgba(15,23,42,0.92)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={{ flex: 1 }}
                  >
                    {content}
                  </LinearGradient>
                </ImageBackground>
              );
            }

            return (
              <LinearGradient
                colors={isDark ? ['#1E1B4B', '#312E81', '#4338CA'] : ['#2563EB', '#3B82F6', '#1D4ED8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  flex: 1,
                  borderRadius: 12,
                  shadowColor: isDark ? '#4338CA' : '#2563EB',
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.3,
                  shadowRadius: 14,
                  elevation: 8,
                  borderWidth: 1,
                  borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.3)',
                  overflow: 'hidden',
                }}
              >
                {content}
              </LinearGradient>
            );
          })()}
        </Animated.View>

        {/* Lokal Servisler Title & Grid */}
        <View style={{ paddingHorizontal: 20, marginBottom: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <MaterialCommunityIcons name="toolbox" size={24} color="#F97316" />
            <Text style={{ fontSize: 20, fontWeight: '800', color: isDark ? '#F8FAFC' : '#0F172A', letterSpacing: -0.3 }}>
              {i18n.language.startsWith('en') ? 'Quick Access' : 'Hızlı Erişim'}
            </Text>
          </View>
          <Text style={{ fontSize: 13, color: isDark ? '#94A3B8' : '#64748B', marginTop: 4, fontWeight: '500' }}>
            {i18n.language.startsWith('en') ? 'Find local service providers on your island' : 'Adandaki yerel hizmet sağlayıcılarını bul'}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 14 }}>
          {[
            { iconSymbol: 'wrench.and.screwdriver.fill', label: i18n.language.startsWith('en') ? 'Renovation & Repair' : 'Tadilat & Tamirat', color: '#2563EB', bg: isDark ? '#1E3A8A30' : '#EFF6FF', border: '#3B82F650' },
            { iconSymbol: 'scissors', label: i18n.language.startsWith('en') ? 'Beauty & Care' : 'Kuaför & Bakım', color: '#EC4899', bg: isDark ? '#83184330' : '#FDF2F8', border: '#F472B650' },
            { iconSymbol: 'paintbrush.fill', label: i18n.language.startsWith('en') ? 'Painting' : 'Boya', color: '#D97706', bg: isDark ? '#78350F30' : '#FFFBEB', border: '#FBBF2450' },
            { iconSymbol: 'globe', label: i18n.language.startsWith('en') ? 'Internet' : 'İnternet', color: '#0891B2', bg: isDark ? '#164E6330' : '#ECFEFF', border: '#22D3EE50' },
            { iconSymbol: 'key.fill', label: i18n.language.startsWith('en') ? 'Locksmith' : 'Çilingir', color: '#8B5CF6', bg: isDark ? '#4C1D9530' : '#F5F3FF', border: '#A78BFA50' },
            { materialIcon: 'rake', label: i18n.language.startsWith('en') ? 'Gardener' : 'Bahçıvan', color: '#10B981', bg: isDark ? '#064E3B30' : '#ECFDF5', border: '#34D39950' },
          ].map((service, idx) => (
            <Pressable
              key={idx}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setSelectedQuickServiceLabel(service.label);
                const matchedIdx = getMockServiceIndexForCategory(service.label);
                setMockServiceIndex(matchedIdx);
                Animated.sequence([
                  Animated.timing(bannerScaleAnim, { toValue: 0.94, duration: 100, useNativeDriver: true }),
                  Animated.spring(bannerScaleAnim, { toValue: 1, friction: 4, tension: 40, useNativeDriver: true }),
                ]).start();
              }}
              style={({ pressed }) => ({
                width: (width - 46) / 2,
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: isLargeScreen ? 24 : (isSmallScreen ? 16 : 20),
                paddingHorizontal: 14,
                backgroundColor: pressed ? service.color : service.bg,
                borderRadius: 18,
                borderWidth: 1.5,
                borderColor: isDark ? service.color + '60' : service.border,
                shadowColor: service.color,
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: isDark ? 0.2 : 0.1,
                shadowRadius: 6,
              })}
            >
              {({ pressed }) => (
                <>
                  <View style={{
                    width: 44,
                    height: 44,
                    borderRadius: 13,
                    backgroundColor: pressed ? '#FFFFFF' : service.color,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 10,
                    shadowColor: service.color,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.3,
                    shadowRadius: 4,
                    elevation: 3,
                  }}>
                    {(service as any).materialIcon ? (
                      <MaterialCommunityIcons name={(service as any).materialIcon} size={24} color={pressed ? service.color : '#FFFFFF'} />
                    ) : (
                      <IconSymbol name={(service as any).iconSymbol as any} size={22} color={pressed ? service.color : '#FFFFFF'} />
                    )}
                  </View>

                  <View style={{ flex: 1, justifyContent: 'center' }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: pressed ? '#FFFFFF' : (isDark ? '#F8FAFC' : '#0F172A') }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
                      {service.label}
                    </Text>
                  </View>
                </>
              )}
            </Pressable>
          ))}
        </View>
      </View>

</ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>



      {/* Notification Modal */}
      <Modal
        visible={showNotificationModal}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setShowNotificationModal(false)}
      >
        <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)', borderless: false }} 
           
          onPress={() => setShowNotificationModal(false)} 
          style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.15)', justifyContent: 'flex-start', alignItems: 'center' }}
        >
          <View 
            onStartShouldSetResponder={() => true}
            style={{ 
              backgroundColor: isDark ? '#121212' : '#fff', 
              borderRadius: 16, 
              width: '95%', 
              maxHeight: '65%', 
              marginTop: insets.top + 65, 
              padding: 24, 
              elevation: 10,
              borderWidth: isDark ? 1 : 0,
              borderColor: '#2C2C2E',
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: isDark ? '#FFFFFF' : '#0F172A' }}>Duyurular</Text>
              <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)', borderless: false }} onPress={() => setShowNotificationModal(false)} style={{ width: 32, height: 32, borderRadius: 12, backgroundColor: isDark ? '#1C1C1E' : '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}>
                <IconSymbol name="xmark" size={14} color={isDark ? '#94A3B8' : '#64748B'} />
              </Pressable>
            </View>
            
            {loadingNotifications ? (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#3B82F6" />
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Static Community Announcement */}
                <View style={{ backgroundColor: isDark ? '#2A1215' : '#FEF2F2', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: isDark ? '#7F1D1D' : '#FECACA' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                    <IconSymbol name="exclamationmark.triangle.fill" size={16} color="#EF4444" style={{ marginRight: 6 }} />
                    <Text style={{ fontSize: 16, fontWeight: '700', color: isDark ? '#FCA5A5' : '#991B1B' }}>
                      {i18n.language.startsWith('en') ? 'Community Announcement' : 'Topluluk Duyurusu'}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 14, color: isDark ? '#FEE2E2' : '#7F1D1D', lineHeight: 22 }}>
                    {i18n.language.startsWith('en')
                      ? 'Please only invite people you know live on the Islands to the community. For the safety and integrity of the AdaPlus community, we kindly ask you to adhere to this rule.'
                      : 'Topluluğa lütfen sadece adalarda yaşadığını bildiğiniz insanları davet edin. AdaPlus topluluğunun güvenliği ve bütünlüğü için bu kurala uymanızı rica ederiz.'}
                  </Text>
                </View>
              </ScrollView>
            )}
          </View>
        </Pressable>
      </Modal>

      {/* Islander Steps Modal */}
      <Modal
        visible={showIslanderStepsModal}
        transparent
        animationType="fade"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => setShowIslanderStepsModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.78)', justifyContent: 'center', alignItems: 'center' }}>
          <TouchableWithoutFeedback onPress={() => setShowIslanderStepsModal(false)}>
            <View style={{ ...StyleSheet.absoluteFillObject }} />
          </TouchableWithoutFeedback>
          <View style={{ width: '85%', backgroundColor: isDark ? '#121212' : '#ffffff', borderRadius: 20, padding: 24, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, borderWidth: isDark ? 1 : 0, borderColor: '#2C2C2E' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <IconSymbol name="pin.fill" size={16} color="#10B981" />
                <Text style={{ fontSize: 18, fontWeight: '800', color: isDark ? '#34D399' : '#064E3B' }}>
                  {i18n.language.startsWith('en') ? 'Steps to Become an Islander' : 'Adalı Olma Adımları'}
                </Text>
              </View>
              <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)', borderless: false }} onPress={() => setShowIslanderStepsModal(false)} style={{ width: 32, height: 32, borderRadius: 12, backgroundColor: isDark ? '#1C1C1E' : '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}>
                <IconSymbol name="xmark" size={14} color={isDark ? '#94A3B8' : '#64748B'} />
              </Pressable>
            </View>
            
            <View style={{ backgroundColor: isDark ? '#064E3B' : '#F0FDF4', borderRadius: 12, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: isDark ? '#047857' : '#BBF7D0' }}>
              <Text style={{ fontSize: 14, color: isDark ? '#A7F3D0' : '#065F46', lineHeight: 22 }}>
                {i18n.language.startsWith('en') ? (
                  <>
                    {'Follow these steps to enjoy all the privileges of AdaPlus and achieve "Verified Islander" status:'}
                    {"\n\n"}• Sign up for the application.
                    {"\n"}• Reach out via Contact or have an Islander invite you.
                    {"\n\n"}{'"Islanders" can invite other islanders and order from island restaurants through delivery.'}
                  </>
                ) : (
                  <>
                    {'AdaPlus\'ın tüm ayrıcalıklarından yararlanmak ve "Onaylı Adalı" statüsüne geçmek için şu adımları izle:'}
                    {"\n\n"}• Uygulamaya kayıt ol.
                    {"\n"}• İletişimden ulaş veya Adalı biri seni davet etsin.
                    {"\n\n"}{'"Adalılar" diğer adalıları davet edebilir ve ada restoranlarından paket servis siparişi verebilir.'}
                  </>
                )}
              </Text>
            </View>
            
            <TouchableOpacity 
              onPress={() => { setShowIslanderStepsModal(false); navigateWithDebounce('/(tabs)/contact'); }} 
              style={{ backgroundColor: '#10B981', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>
                {i18n.language.startsWith('en') ? 'Send Request' : 'Talep Gönder'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Email Invite Modal */}
      <Modal
        visible={showEmailInviteModal}
        transparent
        animationType="fade"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => setShowEmailInviteModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.78)', justifyContent: 'center', alignItems: 'center' }}>
            <TouchableWithoutFeedback onPress={() => setShowEmailInviteModal(false)}>
              <View style={{ ...StyleSheet.absoluteFillObject }} />
            </TouchableWithoutFeedback>
            <View style={{ width: '88%', backgroundColor: isDark ? '#121212' : '#ffffff', borderRadius: 20, padding: 22, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 14, borderWidth: isDark ? 1 : 0, borderColor: '#2C2C2E' }}>
              {/* Header */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <IconSymbol name="envelope.fill" size={18} color={isDark ? '#34D399' : '#059669'} />
                  <Text style={{ fontSize: 17, fontWeight: '800', color: isDark ? '#F8FAFC' : '#0F172A' }}>
                    {i18n.language.startsWith('en') ? 'Invite by Email' : 'E-posta ile Davet Et'}
                  </Text>
                </View>
                <Pressable
                  android_ripple={{ color: 'rgba(0,0,0,0.1)', borderless: false }}
                  onPress={() => setShowEmailInviteModal(false)}
                  style={{ width: 32, height: 32, borderRadius: 12, backgroundColor: isDark ? '#1C1C1E' : '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}
                >
                  <IconSymbol name="xmark" size={14} color={isDark ? '#94A3B8' : '#64748B'} />
                </Pressable>
              </View>

              <Text style={{ fontSize: 13, color: isDark ? '#94A3B8' : '#64748B', lineHeight: 18, marginBottom: 16 }}>
                {i18n.language.startsWith('en')
                  ? 'Enter the email address of an island resident to invite them as a verified islander.'
                  : 'Ada sakini komşunuzun e-posta adresini girerek AdaPlus\'a davet edin.'}
              </Text>

              {/* Email Input */}
              <View style={{ backgroundColor: isDark ? '#1C1C1E' : '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: isDark ? '#334155' : '#E2E8F0', paddingHorizontal: 14, height: 48, justifyContent: 'center', marginBottom: 6 }}>
                <TextInput
                  style={{ fontSize: 14.5, color: isDark ? '#F8FAFC' : '#0F172A', paddingVertical: 0 }}
                  placeholder={i18n.language.startsWith('en') ? 'neighbour@example.com' : 'komsu@email.com'}
                  placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                  value={inviteEmail}
                  onChangeText={v => { setInviteEmail(v); if (inviteEmailError) setInviteEmailError(''); }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {!!inviteEmailError && (
                <Text style={{ color: '#EF4444', fontSize: 11, marginBottom: 10, marginLeft: 2 }}>{inviteEmailError}</Text>
              )}

              {/* Submit Button */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleSendInvite}
                disabled={!inviteEmail.trim() || isInviting}
                style={{
                  backgroundColor: '#059669',
                  paddingVertical: 13,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: 10,
                  opacity: inviteEmail.trim() ? 1 : 0.6,
                }}
              >
                {isInviting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 15 }}>
                    {i18n.language.startsWith('en') ? 'Send Invitation' : 'Davet Gönder'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Survey Modal */}
      <Modal
        visible={showSurvey}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setShowSurvey(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <View style={[{ width: '100%', backgroundColor: '#fff', borderRadius: 28, padding: 28, alignItems: 'center', elevation: 10 }, isDark && { backgroundColor: '#121212', borderWidth: 1, borderColor: '#2C2C2E' }]}>
            {surveySubmitted ? (
              <>
                <View style={[{ width: 64, height: 64, borderRadius: 20, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }, isDark && { backgroundColor: '#064E3B' }]}>
                  <IconSymbol name="checkmark" size={28} color={isDark ? "#34D399" : "#10B981"} />
                </View>
                <Text style={[{ fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 8, textAlign: 'center' }, isDark && { color: '#FFFFFF' }]}>
                  {i18n.language.startsWith('en') ? 'Thank You!' : 'Teşekkürler!'}
                </Text>
                <Text style={[{ fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 22, marginBottom: 28 }, isDark && { color: '#CBD5E1' }]}>
                  {i18n.language.startsWith('en') ? 'Your feedback has been received. We are working hard to bring delivery services to the islands.' : 'Görüşleriniz alındı. Adalara paket servis hizmetini getirmek için var gücümüzle çalışıyoruz.'}
                </Text>
                <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)', borderless: false }} 
                  style={{ width: '100%', backgroundColor: '#10B981', borderRadius: 12, paddingVertical: 16, alignItems: 'center' }} 
                  onPress={() => setShowSurvey(false)}
                >
                  <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>
                    {i18n.language.startsWith('en') ? 'Close' : 'Kapat'}
                  </Text>
                </Pressable>
              </>
            ) : (
              <>
                <View style={[{ width: 64, height: 64, borderRadius: 20, backgroundColor: '#F3E8FF', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }, isDark && { backgroundColor: '#3B0764' }]}>
                  <IconSymbol name="bag.fill" size={28} color={isDark ? "#C084FC" : "#8B5CF6"} />
                </View>
                <Text style={[{ fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 8, textAlign: 'center' }, isDark && { color: '#FFFFFF' }]}>
                  {i18n.language.startsWith('en') ? 'Delivery' : 'Paket Servis'}
                </Text>
                <Text style={[{ fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 22, marginBottom: 28 }, isDark && { color: '#CBD5E1' }]}>
                  {i18n.language.startsWith('en') ? 'What kind of delivery service would you use most on the island?' : 'Adada en çok hangi paket servis hizmetine ihtiyaç duyuyorsunuz?'}
                </Text>
                
                <ScrollView style={{ width: '100%', maxHeight: 300, marginBottom: 10 }} showsVerticalScrollIndicator={false}>
                  {[
                    i18n.language.startsWith('en') ? 'Cargo / Parcel' : 'Kargo', 
                    i18n.language.startsWith('en') ? 'Supermarket / Restaurant' : 'Market / Restorant', 
                    i18n.language.startsWith('en') ? 'Water / Gas Cylinder' : 'Su / Tüp', 
                    i18n.language.startsWith('en') ? 'Other' : 'Diğer'
                  ].map((option) => (
                    <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)', borderless: false }} 
                      key={option}
                      style={[{ 
                        width: '100%', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, marginBottom: 10,
                        backgroundColor: surveyOptions.includes(option) ? '#F3E8FF' : '#F8FAFC',
                        borderWidth: 1, borderColor: surveyOptions.includes(option) ? '#8B5CF6' : '#E2E8F0',
                        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'
                      }, isDark && {
                        backgroundColor: surveyOptions.includes(option) ? '#3B0764' : '#18181B',
                        borderColor: surveyOptions.includes(option) ? '#A855F7' : '#2C2C2E'
                      }]}
                      onPress={() => setSurveyOptions(prev => prev.includes(option) ? prev.filter(o => o !== option) : [...prev, option])}
                    >
                      <Text style={[{ fontSize: 14, fontWeight: surveyOptions.includes(option) ? '700' : '500', color: surveyOptions.includes(option) ? '#6D28D9' : '#334155' }, isDark && { color: surveyOptions.includes(option) ? '#E9D5FF' : '#E2E8F0' }]}>
                        {option}
                      </Text>
                      {surveyOptions.includes(option) && <IconSymbol name="checkmark.circle.fill" size={20} color={isDark ? "#C084FC" : "#8B5CF6"} />}
                    </Pressable>
                  ))}
                  {(surveyOptions.includes('Diğer') || surveyOptions.includes('Other')) && (
                    <TextInput
                      style={[{
                        width: '100%', backgroundColor: '#F8FAFC', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16,
                        borderWidth: 1, borderColor: '#E2E8F0', fontSize: 14, color: '#0F172A', marginTop: 4, marginBottom: 10,
                      }, isDark && { backgroundColor: '#18181B', borderColor: '#2C2C2E', color: '#FFFFFF' }]}
                      placeholder={i18n.language.startsWith('en') ? 'Please specify...' : 'Lütfen belirtin...'}
                      placeholderTextColor={isDark ? "#64748B" : "#94A3B8"}
                      value={surveyOtherText}
                      onChangeText={setSurveyOtherText}
                    />
                  )}
                </ScrollView>

                <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)', borderless: false }} 
                  style={{ width: '100%', backgroundColor: surveyOptions.length > 0 ? '#8B5CF6' : (isDark ? '#2C2C2E' : '#CBD5E1'), borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 8 }} 
                  onPress={() => {
                    setSurveySubmitted(true);
                    setHasCompletedSurvey(true);
                    AsyncStorage.setItem('has_completed_delivery_survey', 'true');
                  }}
                  disabled={surveyOptions.length === 0}
                >
                  <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>
                    {i18n.language.startsWith('en') ? 'Submit' : 'Gönder'}
                  </Text>
                </Pressable>
                <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)', borderless: false }} style={{ width: '100%', paddingVertical: 14, alignItems: 'center', marginTop: 4 }} onPress={() => setShowSurvey(false)}>
                  <Text style={[{ color: '#94A3B8', fontSize: 14, fontWeight: '600' }, isDark && { color: '#64748B' }]}>
                    {i18n.language.startsWith('en') ? 'Cancel' : 'İptal'}
                  </Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>

      <LoginPromptModal 
        visible={showLoginPrompt} 
        onClose={() => setShowLoginPrompt(false)} 
        onLogin={() => { setShowLoginPrompt(false); router.push('/(auth)/login' as any); }}
      />

      <Modal
        visible={showAdaAiModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAdaAiModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <View style={{ width: '100%', maxWidth: 340, backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', borderRadius: 24, padding: 24, alignItems: 'center', elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 20 }}>
            <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: isDark ? '#2D1B28' : '#FDF2F8', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <IconSymbol name="pawprint.fill" size={34} color="#EC4899" />
            </View>
            <View style={{ backgroundColor: isDark ? '#831843' : '#FCE7F3', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginBottom: 12 }}>
              <Text style={{ color: '#EC4899', fontSize: 12, fontWeight: '800', letterSpacing: 0.5 }}>{t('explore.adaAiModalTitle', { defaultValue: i18n.language.startsWith('en') ? 'ADA+ • COMING SOON' : 'ADA+ • YAKINDA' })}</Text>
            </View>
            <Text style={{ fontSize: 18, fontWeight: '800', color: isDark ? '#FFFFFF' : '#0F172A', textAlign: 'center', marginBottom: 12 }}>
              {t('explore.adaAi', { defaultValue: 'ADA+' })}
            </Text>
            <Text style={{ fontSize: 14, lineHeight: 22, color: isDark ? '#CBD5E1' : '#475569', textAlign: 'center', marginBottom: 24, fontWeight: '500' }}>
              {t('explore.adaAiModalDesc', { defaultValue: i18n.language.startsWith('en') ? 'Our work with the Islands Municipality and the Museum of the Princes\' Islands is ongoing to develop our AI guide tailored for the Islands.' : 'Adalar\'a özel yapay zeka rehberimizi geliştirmek için Adalar Belediyesi ve Adalar Müzesi ile çalışmalarımız devam etmektedir.' })}
            </Text>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setShowAdaAiModal(false)}
              style={{ width: '100%', paddingVertical: 14, borderRadius: 14, backgroundColor: '#EC4899', alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '700' }}>{t('common.gotIt', { defaultValue: i18n.language.startsWith('en') ? 'Got it' : 'Anladım' })}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Campaign Modal */}
      <Modal
        visible={showCampaignModal}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setShowCampaignModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.75)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <View style={[{ width: '100%', maxWidth: 360, backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', borderRadius: 24, padding: 24, alignItems: 'center', shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 12, borderWidth: 1, borderColor: isDark ? '#3A3A3C' : '#F1F5F9' }]}>
            
            {/* Campaign Header Icon Badge */}
            <View style={{ width: 72, height: 72, borderRadius: 24, backgroundColor: isDark ? '#4C1D95' : '#F3E8FF', alignItems: 'center', justifyContent: 'center', marginBottom: 16, borderWidth: 1, borderColor: isDark ? '#6D28D9' : '#DDD6FE' }}>
              <Text style={{ fontSize: 36 }}>🎁</Text>
            </View>

            {/* Campaign Pill Badge */}
            <View style={{ backgroundColor: '#7C3AED', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginBottom: 12 }}>
              <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 }}>
                {i18n.language.startsWith('en') ? '🎉 SPECIAL CAMPAIGN' : '🎉 ÖZEL KAMPANYA'}
              </Text>
            </View>

            {/* Campaign Title */}
            <Text style={[{ fontSize: 20, fontWeight: '800', color: '#0F172A', textAlign: 'center', marginBottom: 10, lineHeight: 26 }, isDark && { color: '#FFFFFF' }]}>
              {i18n.language.startsWith('en') ? 'Special Spring Discount for Islanders! 🌸' : 'Adalılara Özel Bahar Fırsatı! 🌸'}
            </Text>

            {/* Campaign Description */}
            <Text style={[{ fontSize: 13.5, color: '#64748B', textAlign: 'center', lineHeight: 20, marginBottom: 22 }, isDark && { color: '#94A3B8' }]}>
              {i18n.language.startsWith('en') 
                ? 'Enjoy exclusive 20% discounts at participating local island businesses with your AdaPlus membership. Valid until May 31!'
                : 'AdaPlus üyelerine özel, anlaşmalı yerel ada işletmelerinde %20 indirim fırsatını kaçırmayın. Son gün 31 Mayıs!'}
            </Text>

            {/* Action Buttons */}
            <Pressable
              style={({ pressed }) => [{
                width: '100%',
                backgroundColor: pressed ? '#6D28D9' : '#7C3AED',
                borderRadius: 14,
                paddingVertical: 15,
                alignItems: 'center',
                marginBottom: 10,
                shadowColor: '#7C3AED',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 4,
              }]}
              onPress={() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                setShowCampaignModal(false);
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '800' }}>
                {i18n.language.startsWith('en') ? 'Use Campaign' : 'Kampanyadan Faydalan'}
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [{
                width: '100%',
                paddingVertical: 12,
                alignItems: 'center',
                opacity: pressed ? 0.6 : 1,
              }]}
              onPress={() => setShowCampaignModal(false)}
            >
              <Text style={[{ color: '#94A3B8', fontSize: 14, fontWeight: '700' }, isDark && { color: '#64748B' }]}>
                {i18n.language.startsWith('en') ? 'Close' : 'Daha Sonra'}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <CelebrationModal 
        visible={showCelebrationModal} 
        onClose={() => setShowCelebrationModal(false)}
        title={celebrationContent.title}
        description={celebrationContent.description}
      />
    </View>
    </SwipeNavigation>
  );
}

function MenuCard({ icon, title, subtitle, onPress, style, colors, large }: any) {
  const iconSize = large ? 24 : 20;
  const containerSize = large ? 48 : 40;
  const cardPadding = large ? 14 : 12;
  const primaryColor = colors ? colors[0] : '#3B82F6';

  const content = (
    <>
      <View style={[styles.iconContainer, { width: containerSize, height: containerSize, backgroundColor: primaryColor }]}>
        <IconSymbol name={icon as any} size={iconSize} color="#fff" />
      </View>
      <View style={styles.cardContent}>
        <Text style={[styles.cardTitle, large && { fontSize: 14 }, { color: primaryColor }]} numberOfLines={1}>{title}</Text>
        <Text style={[styles.cardSubtitle, large && { fontSize: 14, lineHeight: 16 }, { color: '#64748B' }]}>{subtitle}</Text>
      </View>
      <IconSymbol name={"chevron.right" as any} size={20} color={primaryColor} />
    </>
  );

  return (
    <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)', borderless: false }} 
      style={[
        styles.card, 
        { padding: cardPadding, backgroundColor: '#ffffff' },
        style
      ]} 
      onPress={onPress} 
      
    >
      {content}
    </Pressable>
  );
}

function GridCard({ icon, title, subtitle, onPress, style, colors, large, iconImage }: any) {
  const primaryColor = colors ? colors[0] : '#3B82F6';

  const content = (
    <View style={{ flex: 1, padding: 8, width: '100%' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', height: 48 }}>
        {iconImage ? (
          <Image source={iconImage} style={{ width: 44, height: 44, borderRadius: 8, marginRight: 8 }} resizeMode="contain" />
        ) : (
          <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: `${primaryColor}15`, alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
            <IconSymbol name={icon as any} size={16} color={primaryColor} />
          </View>
        )}
        <View style={{ flex: 1, paddingRight: 16, justifyContent: 'center' }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: primaryColor }}>{title}</Text>
        </View>
      </View>
      <View style={{ position: 'absolute', bottom: 8, right: 8, width: 20, height: 20, borderRadius: 10, backgroundColor: `${primaryColor}15`, alignItems: 'center', justifyContent: 'center' }}>
        <IconSymbol name="arrow.right" size={10} color={primaryColor} />
      </View>
    </View>
  );

  return (
    <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)', borderless: false }} 
      style={[
        styles.gridCard, 
        { backgroundColor: '#FFFFFF', padding: 0, borderWidth: 1, borderColor: '#F1F5F9' },
        style
      ]} 

      onPress={onPress} 
      
    >
      {content}
    </Pressable>
  );
}


const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  heroWrapper: {
    width: '100%',
    overflow: 'visible',
    zIndex: 1,
  },
  heroImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
  },
  heroGradient: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
    height: 120,
  },
  paginationUnderHero: {
    height: 20,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E2E8F0',
  },
  activeDot: {
    width: 18,
    backgroundColor: '#3B82F6',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 20,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  langBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#000',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  langBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  heroOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 24,
    paddingBottom: 50, // More padding to avoid being covered by body by default
  },
  heroExpandedInfo: {
    position: 'absolute',
    bottom: -90, // Positioned partially outside the heroWrapper
    left: 0,
    right: 0,
    height: 120,
    backgroundColor: '#1B1B2F',
    justifyContent: 'center',
    paddingHorizontal: 24,
    zIndex: 10,
  },
  expandedInfoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  expandedInfoTextGroup: {
    flex: 1,
  },
  expandedInfoTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  expandedInfoSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    lineHeight: 18,
  },
  heroActionButton: {
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 4,
  },
  heroActionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  body: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
  },
  servicesSection: {
    flex: 1,
    marginTop: 0, // Adjusted because we added welcomeContainer
  },
  welcomeContainer: {
    marginBottom: 16,
    paddingHorizontal: 4,
    marginTop: 4,
  },
  welcomeGreeting: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0D1B2A',
    marginBottom: 2,
    letterSpacing: -0.5,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#778DA9',
    fontWeight: '500',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: 0,
    marginBottom: 16,
  },
  headerLangBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 2,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0D1B2A',
  },
  headerWeather: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    elevation: 8,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0D1B2A',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#778DA9',
    lineHeight: 14,
  },
  gridRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  gridCard: {
    flex: 1,
    minHeight: 64,
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  gridIconContainer: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  gridCardGradient: {
    flex: 1,
    width: '100%',
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0D1B2A',
    marginBottom: 2,
    textAlign: 'center',
  },
  gridCardSubtitle: {
    fontSize: 14,
    color: '#778DA9',
    textAlign: 'center',
    lineHeight: 12,
  },

  langIconBox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  langValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0D1B2A',
    marginLeft: 6,
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  islandSheet: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 28,
    padding: 20,
    elevation: 10,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0D1B2A',
    marginBottom: 20,
    textAlign: 'center',
  },
  islandItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  islandItemText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '600',
  },
  cardsContainer: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  quickInfoLabel: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
    fontWeight: '500',
  },
  quickInfoValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0D1B2A',
    marginTop: 1,
  },
  inlineSliderContainer: {
    marginBottom: 20,
    marginTop: -8,
  },
  inlineSlideCard: {
    height: 140,
    marginRight: 12,
    borderRadius: 12,
    elevation: 6,
    backgroundColor: '#1B1B2F',
  },
  inlineSlideImage: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  inlineSlideGradient: {
    padding: 16,
    paddingTop: 40,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  inlineSlideTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  inlineSlideSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
});
