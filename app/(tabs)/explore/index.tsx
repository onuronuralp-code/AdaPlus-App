import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useRouter, useFocusEffect } from 'expo-router';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ImageBackground, Image, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View, Dimensions, ScrollView, NativeScrollEvent, NativeSyntheticEvent, ActivityIndicator, Modal, Animated, TouchableWithoutFeedback, Alert, TextInput, Pressable, Platform, Vibration, KeyboardAvoidingView, Keyboard } from 'react-native';
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

import { IconSymbol } from '@/components/ui/icon-symbol';
import { AbstractPattern } from '@/components/AbstractPattern';
import { SwipeButton } from '@/components/SwipeButton';
import LoginPromptModal from '@/components/LoginPromptModal';
import { SwipeNavigation } from '@/components/SwipeNavigation';
import { useTranslation } from 'react-i18next';
import { fetchActivities, fetchDepartures } from '@/services/api';
import { fetchListings } from '@/services/listingApi';
import { API_BASE_URL, resolveImageUrl } from '@/services/config';

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
  
  const { weather, loading: weatherLoading } = useWeather();
  const [nextFerry, setNextFerry] = useState<{from: string, to: string, time: string, provider?: string} | null>(null);
  const [ferryLoading, setFerryLoading] = useState(true);
  


  useFocusEffect(
    useCallback(() => {
    let cancelled = false;
    
    const fetchFerry = async () => {
      try {
        let dep = "Bostancı";
        let dest = "Büyükada";
        const favRouteStr = await AsyncStorage.getItem('favorite_route');
        if (favRouteStr) {
          const fav = JSON.parse(favRouteStr);
          dep = fav.departure;
          dest = fav.destination;
        }

        const dateObj = new Date();
        const yyyy = dateObj.getFullYear();
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const dd = String(dateObj.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;
        const departures = await fetchDepartures(dep, dest, dateStr);

        if (!cancelled) {
          const nowMinutes = dateObj.getHours() * 60 + dateObj.getMinutes();
          let upcoming = departures.filter(d => {
            const timeVal = getRouteTimeValue(d.time);
            // Handle next-day ferries (00:00 - 03:00) when currently before midnight
            if (timeVal < 180 && nowMinutes > 180) {
                return timeVal + 1440 >= nowMinutes;
            }
            return timeVal >= nowMinutes;
          });
          
          upcoming.sort((a, b) => {
            const valA = getRouteTimeValue(a.time) < 180 && nowMinutes > 180 ? getRouteTimeValue(a.time) + 1440 : getRouteTimeValue(a.time);
            const valB = getRouteTimeValue(b.time) < 180 && nowMinutes > 180 ? getRouteTimeValue(b.time) + 1440 : getRouteTimeValue(b.time);
            return valA - valB;
          });

          if (upcoming.length === 0) {
            const tomorrow = new Date(dateObj);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tYyyy = tomorrow.getFullYear();
            const tMm = String(tomorrow.getMonth() + 1).padStart(2, '0');
            const tDd = String(tomorrow.getDate()).padStart(2, '0');
            const tmrwStr = `${tYyyy}-${tMm}-${tDd}`;
            const tmrwDepartures = await fetchDepartures(dep, dest, tmrwStr);
            upcoming = tmrwDepartures;
            upcoming.sort((a, b) => getRouteTimeValue(a.time) - getRouteTimeValue(b.time));
          }

          if (upcoming.length > 0) {
            setNextFerry({ from: dep, to: dest, time: upcoming[0].time, provider: upcoming[0].provider });
          }
        }
      } catch (err) {
        console.log("Failed to fetch next ferry", err);
      } finally {
        if (!cancelled) setFerryLoading(false);
      }
    };
    fetchFerry();
    
    return () => { cancelled = true; };
  }, [])
  );

  return (
    <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
      {/* Weather Badge */}
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? '#000000' : '#FFF7ED', paddingHorizontal: 12, paddingVertical: isLargeScreen ? 12 : 8, borderRadius: 8, borderWidth: 1, borderColor: isDark ? '#F97316' : '#FED7AA' }}>
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
        style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? '#000000' : '#EFF6FF', paddingHorizontal: 12, paddingVertical: isLargeScreen ? 12 : 8, borderRadius: 8, flex: 1, borderWidth: 1, borderColor: isDark ? '#3B82F6' : '#BFDBFE' }}
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
  const { start, copilotEvents } = useCopilot();

  useEffect(() => {
    // Reverted the auto-start for testing. 
    // Now you can start it manually using the question mark button in the header.
    const handleStop = () => {
      AsyncStorage.setItem('has_seen_onboarding_tour', 'true');
    };
    copilotEvents?.on('stop', handleStop);
    
    return () => {
      copilotEvents?.off('stop', handleStop);
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
  const [selectedIsland, setSelectedIsland] = useState("Büyükada");
  const isSmallScreen = height < 820;
  const isLargeScreen = height > 900;
  const isIphone11 = Math.round(height) === 896;
  const isIphone16 = Math.round(height) === 852;
  const menuButtonWidth = (width - 56) / 3.5;
  const [showIslandPicker, setShowIslandPicker] = useState(false);
  const { isLoggedIn, user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

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
  const inviteInputRef = useRef<TextInput>(null);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showIslanderStepsModal, setShowIslanderStepsModal] = useState(false);
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  
  const [showCelebrationModal, setShowCelebrationModal] = useState(false);
  const celebrationScale = useRef(new Animated.Value(0)).current;

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
      // 1. Invite 5 celebration
      if (user && (user as any).invitedUsersCount >= 5) {
        const hasSeen = await AsyncStorage.getItem('has_seen_invite_celebration_5');
        if (hasSeen !== 'true') {
          setCelebrationContent({
            title: "Tebrikler!",
            description: "5 kişiyi davet ettin ve Adalı rozetini kazandın! Juju Kafe'den nakit alışverişlerinde %25 indirim kazandın."
          });
          setShowCelebrationModal(true);
          await AsyncStorage.setItem('has_seen_invite_celebration_5', 'true');
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
      const response = await fetch(`${API_BASE_URL}/api/v1/users/invites`, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ email })
      });
      if (response.status === 409) {
        Alert.alert(
          t('common.error', { defaultValue: i18n.language.startsWith('en') ? 'Error' : 'Hata' }),
          i18n.language.startsWith('en') ? 'An invite has already been sent to this address.' : 'Bu adrese zaten bir davet gönderildi.'
        );
        return;
      }
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      Alert.alert(t('common.success'), t('profile.inviteSendSuccess'));
      setInviteEmail('');
      setInviteEmailError('');
    } catch (error) {
      console.error('Failed to send invite:', error);
      Alert.alert(t('common.error'), t('profile.inviteSendFailed'));
    } finally {
      setIsInviting(false);
    }
  };

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

      Promise.all([fetchActivities(), fetchListings(), fetchActiveBanner(), fetchInitialNotifications()]).then(([eventsData, listingsData, bannerData, notificationsData]) => {
        const events = Array.isArray(eventsData) ? eventsData : (eventsData?.content || eventsData?.data || []);
        const listings = Array.isArray(listingsData) ? listingsData : (listingsData?.content || listingsData?.data || []);
        if (Array.isArray(notificationsData) && notificationsData.length > 0) {
            setNotifications(notificationsData);
            AsyncStorage.setItem('cached_notifications', JSON.stringify(notificationsData));
        }
        
        const now = new Date();
        const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
        
        const validEvents = events
          .filter(e => {
            if (e.endDate) return new Date(e.endDate) >= now;
            return new Date(e.startDate) >= cutoff;
          })
          .map(event => ({
            id: event.id,
            type: 'event',
            title: event.name,
            subtitle: event.description || event.organizerName || '',
            island: event.island || event.eventPlace || 'Büyükada',
            date: new Date(event.startDate).getTime(),
            createdAt: event.createdAt ? new Date(event.createdAt).getTime() : new Date(event.startDate).getTime(),
            imageUrl: resolveImageUrl(event.imageUrl) || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800&auto=format&fit=crop&q=80'
          }));

        const validListings = listings
          .map(listing => ({
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
          .slice(0, 5);

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

        setAllEventIds(validEvents.map(e => e.id));
        AsyncStorage.getItem('seenEventIds').then(seenStr => {
          const seenIds = seenStr ? JSON.parse(seenStr) : [];
          const unseenCount = validEvents.filter(e => !seenIds.includes(e.id)).length;
          setUnseenEventsCount(unseenCount);
          AsyncStorage.setItem('cached_unseen_events', unseenCount.toString());
        });

        AsyncStorage.getItem('lastViewedListings').then(lastViewedStr => {
          const lastViewed = lastViewedStr ? parseInt(lastViewedStr, 10) : 0;
          const unseenCount = validListings.filter(l => l.createdAt > lastViewed).length;
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

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / width);
    setActiveIndex(index);
  };
  const heroHeight = isSmallScreen ? Math.min(height * 0.25, 210) : Math.min(Math.max(height * 0.31, 230), 340);

  const heroScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (slidesToRender.length <= 1) return;
    
    const interval = setInterval(() => {
      setActiveIndex((current) => {
        const nextIndex = (current + 1) % slidesToRender.length;
        heroScrollRef.current?.scrollTo({ x: nextIndex * width, animated: true });
        return nextIndex;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [slidesToRender.length, width]);


  return (
    <SwipeNavigation rightRoute="/(tabs)/home" downRoute="/(tabs)/home">
    <View style={[styles.container, isDark && { backgroundColor: '#000000' }]}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, justifyContent: 'space-between', paddingBottom: insets.bottom + 36 }} showsVerticalScrollIndicator={false} scrollEnabled={false} bounces={false}>
      <View style={[styles.welcomeContainer, { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start', 
        paddingTop: insets.top + (isIphone11 ? 16 : 12), 
        paddingHorizontal: 20 
      }, isSmallScreen && { marginBottom: 8 }, isLargeScreen && { marginBottom: 12 }]}>
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text style={[styles.welcomeGreeting, isLargeScreen && { fontSize: 30 }, isIphone11 && { fontSize: 28 }, { marginBottom: 8 }, isDark && { color: '#F8FAFC' }]}>
            {isLoggedIn && user
              ? `${t('explore.welcome', { defaultValue: 'Hoşgeldin' })}, ${user.fullName.split(' ')[0]}! 🌸`
              : `${t('explore.welcome', { defaultValue: 'Hoşgeldin' })}! 🌸`}
          </Text>
          {isLoggedIn ? (
            <TouchableOpacity 
              activeOpacity={0.7}
              onPress={() => router.push('/(tabs)/profile')}
              style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? '#1E1B4B' : '#EEF2FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, alignSelf: 'flex-start' }}
            >
              <IconSymbol name="person.2.fill" size={13} color={isDark ? '#818CF8' : '#6366F1'} />
              <Text style={{ fontSize: 12, color: isDark ? '#93C5FD' : '#4338CA', marginLeft: 6, fontWeight: '700' }}>
                {t('profile.invitedIslanders', { defaultValue: i18n.language.startsWith('tr') ? 'Davet Edilen Adalılar' : 'Invited Islanders' })}
              </Text>
              <View style={{ width: 60, height: 6, backgroundColor: isDark ? '#312E81' : '#E0E7FF', borderRadius: 3, marginHorizontal: 8, overflow: 'hidden' }}>
                <View style={{ 
                    width: `${Math.min((((user as any)?.invitedUsersCount || 0) / 5) * 100, 100)}%`, 
                    height: '100%', 
                    backgroundColor: '#6366F1', 
                    borderRadius: 3 
                }} />
              </View>
              <Text style={{ fontSize: 11, color: isDark ? '#818CF8' : '#6366F1', fontWeight: '800' }}>
                {(user as any)?.invitedUsersCount || 0}/5
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[styles.welcomeSubtitle, isLargeScreen && { fontSize: 15 }, isDark && { color: '#94A3B8' }]} numberOfLines={1} adjustsFontSizeToFit>
                {t('explore.readyToExplore', { defaultValue: i18n.language.startsWith('en') ? 'Ready to explore the islands?' : 'Adaları keşfetmeye hazır mısın?' })}
              </Text>
            </View>
          )}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable 
            style={({ pressed }) => [{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
              justifyContent: 'center',
              alignItems: 'center',
              borderWidth: 1,
              borderColor: isDark ? '#334155' : '#E2E8F0',
            }, pressed && { opacity: 0.7 }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setTimeout(() => {
                start();
              }, 300); // Slight delay for smoother start
            }}
          >
            <IconSymbol name="questionmark.circle" size={22} color={isDark ? '#CBD5E1' : '#64748B'} />
          </Pressable>

          <CopilotStep text={t('explore.tour.duyurular', { defaultValue: i18n.language.startsWith('en') ? 'You can view all current island announcements and notifications here.' : 'Tüm güncel ada duyurularını ve bildirimlerini buradan görebilirsin.' })} order={8} name="duyurular">
            <WalkthroughableView>
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
                {notifications.filter(n => !n.read).length > 0 && (
                  <View style={{ position: 'absolute', top: -2, right: -2, backgroundColor: '#EF4444', borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4, zIndex: 10, borderWidth: 2, borderColor: '#FFFFFF', elevation: 3 }}>
                    <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '800', textAlign: 'center', includeFontPadding: false }}>
                      {notifications.filter(n => !n.read).length > 99 ? '99+' : notifications.filter(n => !n.read).length}
                    </Text>
                  </View>
                )}
              </Pressable>
            </WalkthroughableView>
          </CopilotStep>
        </View>
      </View>


      {/* Invite User Input (Visible to all, usable only by Islanders/Admins) */}
      <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
        <CopilotStep text={t('explore.tour.davet', { defaultValue: i18n.language.startsWith('en') ? 'You can invite island residents from here.' : 'Buradan ada sakinlerini davet edebilirsin.' })} order={7} name="davet">
          <WalkthroughableView style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? '#1C1C1E' : '#ffffff', borderRadius: 12, paddingHorizontal: 16, height: isLargeScreen ? 60 : 50, elevation: 2, borderWidth: 1, borderColor: isDark ? '#047857' : '#059669' }}>
              <IconSymbol name="envelope.fill" size={20} color={isDark ? '#34D399' : '#059669'} />
              <TextInput
                ref={inviteInputRef}
                style={{ flex: 1, fontSize: isLargeScreen ? 14 : 14, color: isDark ? '#F8FAFC' : '#0F172A', opacity: (user?.userType === 'ISLAND_RESIDENT' || user?.role === 'ADMIN') ? 1 : 0.6, textAlign: 'left', marginLeft: 12 }}
                onFocus={() => { setIsInviteFocused(true); setInviteEmailError(''); }}
                onBlur={() => {
                  setIsInviteFocused(false);
                  const email = inviteEmail.trim();
                  if (email && !EMAIL_REGEX.test(email)) {
                    Alert.alert(
                      t('common.error', { defaultValue: i18n.language.startsWith('en') ? 'Error' : 'Hata' }),
                      i18n.language.startsWith('en') ? 'Please enter a valid email address.' : 'Geçerli bir e-posta adresi girin.'
                    );
                  }
                }}
                placeholder={isInviteFocused ? '' : ((user?.userType === 'ISLAND_RESIDENT' || user?.role === 'ADMIN') ? t('profile.inviteFriend', { defaultValue: 'Arkadaşını Davet Et' }) : t('common.islanderOnly', { defaultValue: i18n.language.startsWith('en') ? 'Only "Islanders" can invite' : 'Sadece "Adalılar" davet edebilir' }))}
                placeholderTextColor={isDark ? '#6EE7B7' : '#059669'}
                value={inviteEmail}
                onChangeText={v => { setInviteEmail(v); if (inviteEmailError) setInviteEmailError(''); }}
                onSubmitEditing={handleSendInvite}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={user?.userType === 'ISLAND_RESIDENT' || user?.role === 'ADMIN'}
              />
            </View>

            {!(user?.userType === 'ISLAND_RESIDENT' || user?.role === 'ADMIN') && (
              <Pressable 
                style={StyleSheet.absoluteFillObject} 
                onPress={() => setShowIslanderStepsModal(true)} 
              />
            )}
          </View>
          <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)', borderless: false }}
             style={{ width: isLargeScreen ? 60 : 50, height: isLargeScreen ? 60 : 50, backgroundColor: '#059669', borderRadius: 12, alignItems: 'center', justifyContent: 'center', opacity: ((user?.userType === 'ISLAND_RESIDENT' || user?.role === 'ADMIN') && inviteEmail.trim()) ? 1 : 0.5 }}
             onPress={() => {
               if (!(user?.userType === 'ISLAND_RESIDENT' || user?.role === 'ADMIN')) {
                 setShowIslanderStepsModal(true);
               } else {
                 handleSendInvite();
               }
             }}
             disabled={((user?.userType === 'ISLAND_RESIDENT' || user?.role === 'ADMIN') && !inviteEmail.trim()) || isInviting}
          >
             {isInviting ? <ActivityIndicator color="#FFF" size="small" /> : <IconSymbol name="person.badge.plus" size={20} color="#FFF" />}
          </Pressable>
        </View>
          </WalkthroughableView>
        </CopilotStep>
        {!!inviteEmailError && (
          <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 6, marginLeft: 4 }}>{inviteEmailError}</Text>
        )}
        <TodayOnIsland />
      </View>

      {/* Hero Header Slider Wrapper */}
      <CopilotStep text={t('explore.tour.banner', { defaultValue: i18n.language.startsWith('en') ? 'Important announcements, upcoming events, and featured listings are gathered here.' : 'Adadaki en önemli duyurular, yaklaşan etkinlikler ve öne çıkan ilanlar burada toplanır.' })} order={1} name="banner">
        <WalkthroughableView style={{ height: heroHeight, marginHorizontal: 12, borderRadius: 12 }}>
            <ScrollView 
          ref={heroScrollRef}
          horizontal 
          showsHorizontalScrollIndicator={false}
          snapToInterval={width}
          decelerationRate="fast"
          bounces={true}
          style={{ overflow: 'visible' }}
          onMomentumScrollEnd={(e) => {
            const scrollPosition = e.nativeEvent.contentOffset.x;
            const index = Math.round(scrollPosition / width);
            setActiveIndex(index);
          }}
        >
          {slidesToRender.map((slide, index) => (
            <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)', borderless: false }} 
              key={index} 
              style={{
                width: width - 24,
                marginRight: 24,
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
              <View style={[styles.heroImage, { width: width - 24, borderRadius: 12, overflow: 'hidden' }]}>
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
                            {slide.island || slide.location || slide.eventPlace || 'Büyükada'}
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
                        {slide.type === 'listing' 
                          ? (i18n.language.startsWith('en') ? 'View' : 'İncele') 
                          : (i18n.language.startsWith('en') ? 'Register' : 'Kayıt Ol')}
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

      {/* 5 Cards Container */}
      <View style={{ backgroundColor: isDark ? '#121212' : '#FFFFFF', marginHorizontal: 12, borderRadius: isLargeScreen ? 24 : 20, paddingVertical: isLargeScreen ? 12 : (isSmallScreen ? 6 : 8), elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, marginTop: isLargeScreen ? 16 : (isSmallScreen ? 8 : 12), marginBottom: isLargeScreen ? 12 : (isSmallScreen ? 6 : 8) }}>
        
        {/* Hızlı Erişim Section */}
        <View 
          style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: isLargeScreen ? 16 : 12, paddingBottom: isLargeScreen ? 8 : 4, gap: isLargeScreen ? 8 : 6 }}
        >
          {/* 1. Etkinlikler */}
          <CopilotStep text={t('explore.tour.events', { defaultValue: i18n.language.startsWith('en') ? 'You can follow all island events from here.' : 'Adadaki tüm etkinlikleri buradan takip edebilirsin.' })} order={2} name="etkinlikler">
            <WalkthroughableView style={{ alignItems: 'center', flex: 1, gap: isLargeScreen ? 6 : 4 }}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  AsyncStorage.setItem('seenEventIds', JSON.stringify(allEventIds));
                  setUnseenEventsCount(0);
                  AsyncStorage.setItem('cached_unseen_events', '0');
                  navigateWithDebounce('/(tabs)/explore/island/events');
                }}
                onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)}
                style={{ width: isLargeScreen ? 72 : (isSmallScreen ? 50 : 58), aspectRatio: 1, borderRadius: isLargeScreen ? 18 : (isSmallScreen ? 14 : 15), backgroundColor: '#3B82F6', elevation: 6, shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, overflow: 'visible', alignItems: 'center', justifyContent: 'center' }}
              >
                <IconSymbol name="calendar" size={isLargeScreen ? 32 : (isSmallScreen ? 22 : 25)} color="#FFFFFF" />
                {unseenEventsCount > 0 && (
                  <View style={{ position: 'absolute', top: -4, right: -4, backgroundColor: '#EF4444', minWidth: isSmallScreen ? 18 : 20, height: isSmallScreen ? 18 : 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', zIndex: 10, borderWidth: 2, borderColor: '#FFF', paddingHorizontal: 3 }}>
                    <Text style={{ color: '#FFF', fontSize: isSmallScreen ? 9 : 10, fontWeight: '700', textAlign: 'center', includeFontPadding: false }}>{unseenEventsCount > 9 ? '9+' : unseenEventsCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: isLargeScreen ? 13 : (isSmallScreen ? 11 : 12), fontWeight: '700', color: isDark ? '#F8FAFC' : '#1F2937', marginBottom: 1 }}>{t('explore.events')}</Text>
                <Text style={{ fontSize: isLargeScreen ? 11 : (isSmallScreen ? 9.5 : 10), color: isDark ? '#CBD5E1' : '#6B7280', fontWeight: '500' }}>{t('explore.eventsCount', { count: totalEventsCount })}</Text>
              </View>
            </WalkthroughableView>
          </CopilotStep>

          {/* 2. Ada AI */}
          <CopilotStep text={t('explore.tour.adaAi', { defaultValue: i18n.language.startsWith('en') ? 'You can ask any question to the island AI guide.' : 'Adanın yapay zeka rehberine her türlü soruyu sorabilirsin.' })} order={3} name="ada_ai">
            <WalkthroughableView style={{ alignItems: 'center', flex: 1, gap: isLargeScreen ? 6 : 4 }}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => navigateWithDebounce('/guide')}
                onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)}
                style={{ width: isLargeScreen ? 72 : (isSmallScreen ? 50 : 58), aspectRatio: 1, borderRadius: isLargeScreen ? 18 : (isSmallScreen ? 14 : 15), backgroundColor: '#EC4899', elevation: 6, shadowColor: '#EC4899', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, overflow: 'visible', alignItems: 'center', justifyContent: 'center' }}
              >
                <IconSymbol name="pawprint.fill" size={isLargeScreen ? 32 : (isSmallScreen ? 22 : 25)} color="#FFFFFF" />
              </TouchableOpacity>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: isLargeScreen ? 13 : (isSmallScreen ? 11 : 12), fontWeight: '700', color: isDark ? '#F8FAFC' : '#1F2937', marginBottom: 1 }}>{t('explore.adaAi')}</Text>
                <Text style={{ fontSize: isLargeScreen ? 11 : (isSmallScreen ? 9.5 : 10), color: isDark ? '#CBD5E1' : '#6B7280', fontWeight: '500' }}>{t('explore.yourGuide')}</Text>
              </View>
            </WalkthroughableView>
          </CopilotStep>

          {/* 3. İlanlar */}
          <CopilotStep text={t('explore.tour.ilanlar', { defaultValue: i18n.language.startsWith('en') ? 'You can browse real estate, items, or job listings here.' : 'Emlak, eşya veya iş ilanlarına buradan göz atabilirsin.' })} order={4} name="ilanlar">
            <WalkthroughableView style={{ alignItems: 'center', flex: 1, gap: isLargeScreen ? 6 : 4 }}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  AsyncStorage.setItem('lastViewedListings', Date.now().toString());
                  setUnseenListingsCount(0);
                  AsyncStorage.setItem('cached_unseen_listings', '0');
                  navigateWithDebounce('/(tabs)/explore/island/ilanlar');
                }}
                onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)}
                style={{ width: isLargeScreen ? 72 : (isSmallScreen ? 50 : 58), aspectRatio: 1, borderRadius: isLargeScreen ? 18 : (isSmallScreen ? 14 : 15), backgroundColor: '#F59E0B', elevation: 6, shadowColor: '#F59E0B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, overflow: 'visible', alignItems: 'center', justifyContent: 'center' }}
              >
                <IconSymbol name="tag.fill" size={isLargeScreen ? 32 : (isSmallScreen ? 22 : 25)} color="#FFFFFF" />
                {unseenListingsCount > 0 && (
                  <View style={{ position: 'absolute', top: -4, right: -4, backgroundColor: '#EF4444', minWidth: isSmallScreen ? 18 : 20, height: isSmallScreen ? 18 : 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', zIndex: 10, borderWidth: 2, borderColor: '#FFF', paddingHorizontal: 3 }}>
                    <Text style={{ color: '#FFF', fontSize: isSmallScreen ? 9 : 10, fontWeight: '700', textAlign: 'center', includeFontPadding: false }}>{unseenListingsCount > 9 ? '9+' : unseenListingsCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: isLargeScreen ? 13 : (isSmallScreen ? 11 : 12), fontWeight: '700', color: isDark ? '#F8FAFC' : '#1F2937', marginBottom: 1 }}>{t('explore.listings')}</Text>
                <Text style={{ fontSize: isLargeScreen ? 11 : (isSmallScreen ? 9.5 : 10), color: isDark ? '#CBD5E1' : '#6B7280', fontWeight: '500' }}>{t('explore.listingsCount', { count: totalListingsCount })}</Text>
              </View>
            </WalkthroughableView>
          </CopilotStep>

          {/* 4. Paket Servis */}
          <CopilotStep text={t('explore.tour.paket', { defaultValue: i18n.language.startsWith('en') ? 'Our delivery service will be available here very soon.' : 'Çok yakında paket servis hizmetimiz de burada olacak.' })} order={5} name="paket">
            <WalkthroughableView style={{ alignItems: 'center', flex: 1, gap: isLargeScreen ? 6 : 4 }}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  if (!isLoggedIn) {
                    setShowLoginPrompt(true);
                  } else {
                    setSurveySubmitted(hasCompletedSurvey);
                    setSurveyOptions([]);
                    setSurveyOtherText('');
                    setShowSurvey(true);
                  }
                }}
                onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)}
                style={{ width: isLargeScreen ? 72 : (isSmallScreen ? 50 : 58), aspectRatio: 1, borderRadius: isLargeScreen ? 18 : (isSmallScreen ? 14 : 15), backgroundColor: '#8B5CF6', elevation: 6, shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, overflow: 'visible', alignItems: 'center', justifyContent: 'center' }}
              >
                <IconSymbol name="bag.fill" size={isLargeScreen ? 32 : (isSmallScreen ? 22 : 25)} color="#FFFFFF" />
                <View style={{ position: 'absolute', bottom: -5, backgroundColor: '#F3E8FF', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 6, borderWidth: 1, borderColor: '#D8B4FE', zIndex: 10 }}>
                  <Text style={{ fontSize: isSmallScreen ? 7.5 : 8.5, color: '#8B5CF6', fontWeight: '700' }}>{i18n.language.startsWith('en') ? 'Soon' : 'Yakında'}</Text>
                </View>
              </TouchableOpacity>
              <View style={{ alignItems: 'center', marginTop: 2 }}>
                <Text style={{ fontSize: isLargeScreen ? 13 : (isSmallScreen ? 11 : 12), lineHeight: isLargeScreen ? 14 : (isSmallScreen ? 12 : 13), fontWeight: '700', color: isDark ? '#F8FAFC' : '#1F2937', marginBottom: 1, textAlign: 'center' }}>{i18n.language.startsWith('en') ? 'Delivery' : 'Paket\nServis'}</Text>
              </View>
            </WalkthroughableView>
          </CopilotStep>
        </View>
      </View>

      {/* 5. Topluluk Banner (Positioned cleanly at bottom of screen above navbar) */}
      <View style={{ paddingHorizontal: 16, marginTop: 'auto', paddingTop: isLargeScreen ? 6 : (isSmallScreen ? 2 : 4), marginBottom: isLargeScreen ? 44 : (isSmallScreen ? 18 : 28), backgroundColor: 'transparent' }}>
        <CopilotStep text={t('explore.tour.topluluk', { defaultValue: i18n.language.startsWith('en') ? 'Scroll here to chat with islanders and join discussions.' : 'Adalılarla sohbet etmek ve tartışmalara katılmak için burayı kaydır.' })} order={6} name="topluluk">
          <WalkthroughableView style={{ width: '100%' }}>
            <SwipeButton 
              isLoggedIn={isLoggedIn} 
              onSwipeComplete={() => {
                if (!(user?.userType === 'ISLAND_RESIDENT' || user?.role === 'ADMIN')) {
                  setShowIslanderStepsModal(true);
                } else {
                  navigateWithDebounce('/(tabs)/explore/island/forum');
                }
              }} 
            />
          </WalkthroughableView>
        </CopilotStep>
      </View>

</ScrollView>
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
              maxHeight: '60%', 
              marginTop: insets.top + 90, 
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
                    <Text style={{ fontSize: 16, fontWeight: '700', color: isDark ? '#FCA5A5' : '#991B1B' }}>Topluluk Duyurusu</Text>
                  </View>
                  <Text style={{ fontSize: 14, color: isDark ? '#FEE2E2' : '#7F1D1D', lineHeight: 22 }}>
                    Topluluğa lütfen sadece Adada yaşadığını bildiğiniz insanları davet edin. AdaPlus topluluğunun güvenliği ve bütünlüğü için bu kurala uymanızı rica ederiz.
                  </Text>
                </View>

                {notifications.map(notif => (
                  <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)', borderless: false }} 
                    key={notif.id} 
                    style={{ backgroundColor: isDark ? (notif.read ? '#18181B' : '#1E293B') : (notif.read ? '#F8FAFC' : '#EFF6FF'), borderRadius: 12, padding: 20, marginBottom: 12, borderWidth: 1, borderColor: isDark ? (notif.read ? '#27272A' : '#3B82F6') : (notif.read ? '#F1F5F9' : '#BFDBFE') }}
                    onPress={async () => {
                      if (!notif.read) {
                        await markNotificationRead(notif.id);
                        setNotifications(prev => {
                          const updated = prev.map(n => n.id === notif.id ? { ...n, read: true } : n);
                          AsyncStorage.setItem('cached_notifications', JSON.stringify(updated));
                          return updated;
                        });
                      }
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <Text style={{ fontSize: 16, fontWeight: '700', color: isDark ? '#FFFFFF' : '#0F172A', flex: 1, marginRight: 12 }}>{notif.title}</Text>
                      <Text style={{ fontSize: 14, color: '#94A3B8' }}>{new Date(notif.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}</Text>
                    </View>
                    <Text style={{ fontSize: 14, color: isDark ? '#CBD5E1' : '#475569', lineHeight: 24 }}>{notif.body}</Text>
                  </Pressable>
                ))}
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
        onRequestClose={() => setShowIslanderStepsModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <TouchableWithoutFeedback onPress={() => setShowIslanderStepsModal(false)}>
            <View style={{ ...StyleSheet.absoluteFillObject }} />
          </TouchableWithoutFeedback>
          <View style={{ width: '85%', backgroundColor: isDark ? '#121212' : '#ffffff', borderRadius: 20, padding: 24, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, borderWidth: isDark ? 1 : 0, borderColor: '#2C2C2E' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <IconSymbol name="pin.fill" size={16} color="#10B981" />
                <Text style={{ fontSize: 18, fontWeight: '800', color: isDark ? '#34D399' : '#064E3B' }}>Adalı Olma Adımları</Text>
              </View>
              <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)', borderless: false }} onPress={() => setShowIslanderStepsModal(false)} style={{ width: 32, height: 32, borderRadius: 12, backgroundColor: isDark ? '#1C1C1E' : '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}>
                <IconSymbol name="xmark" size={14} color={isDark ? '#94A3B8' : '#64748B'} />
              </Pressable>
            </View>
            
            <View style={{ backgroundColor: isDark ? '#064E3B' : '#F0FDF4', borderRadius: 12, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: isDark ? '#047857' : '#BBF7D0' }}>
              <Text style={{ fontSize: 14, color: isDark ? '#A7F3D0' : '#065F46', lineHeight: 22 }}>
                AdaPlus'ın tüm ayrıcalıklarından yararlanmak ve "Onaylı Adalı" statüsüne geçmek için şu adımları izle:
                {"\n\n"}• Profilindeki bilgileri eksiksiz doldur.
                {"\n"}• İletişimden ulaş veya Adalı biri seni davet etsin.
                {"\n\n"}"Adalılar" toplulukta fikirlerini özgürce paylaşabilir, diğer adalılarla iletişime geçebilir.
              </Text>
            </View>
            
            <TouchableOpacity 
              onPress={() => { setShowIslanderStepsModal(false); navigateWithDebounce('/(tabs)/contact'); }} 
              style={{ backgroundColor: '#10B981', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Talep Gönder</Text>
            </TouchableOpacity>
          </View>
        </View>
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
                  {i18n.language.startsWith('en') ? 'Your feedback has been received. We are working hard to bring electric vehicle services to the islands.' : 'Görüşleriniz alındı. Adalara elektrikli taşıt hizmetini getirmek için var gücümüzle çalışıyoruz.'}
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
      />

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
