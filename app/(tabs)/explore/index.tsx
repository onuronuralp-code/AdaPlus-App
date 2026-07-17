import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useRouter, useFocusEffect } from 'expo-router';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ImageBackground, Image, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View, Dimensions, ScrollView, NativeScrollEvent, NativeSyntheticEvent, ActivityIndicator, Modal, Animated, TouchableWithoutFeedback, Alert, TextInput, Pressable, Platform, Vibration, KeyboardAvoidingView } from 'react-native';
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
import { SwipeButton } from '@/components/SwipeButton';
import { useTranslation } from 'react-i18next';
import { fetchActivities, fetchDepartures } from '@/services/api';
import { fetchListings } from '@/services/listingApi';
import { API_BASE_URL, resolveImageUrl } from '@/services/config';
import { EventDto, getEventsList } from '@/services/eventApi';
import { fetchNotifications, markNotificationRead, NotificationDto } from '@/services/notificationApi';
import { ListingDto } from '@/services/listingApi';
import { useAuth } from '@/context/AuthContext';
import { unregisterPushNotifications } from '@/services/notificationService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useWeather } from '@/hooks/useWeather';
import { createPost, PostType, Island } from '@/services/forumApi';
import { getToken } from '@/utils/tokenStorage';

const getRouteTimeValue = (time: string): number => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

const TodayOnIsland = () => {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { height } = useWindowDimensions();
  const isLargeScreen = height > 900;
  
  const { weather, loading: weatherLoading } = useWeather();
  const [nextFerry, setNextFerry] = useState<{from: string, to: string, time: string, provider?: string} | null>(null);
  const [ferryLoading, setFerryLoading] = useState(true);
  


  useEffect(() => {
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
        const dateStr = dateObj.toISOString().split("T")[0];
        const departures = await fetchDepartures(dep, dest, dateStr);

        if (!cancelled) {
          const nowMinutes = dateObj.getHours() * 60 + dateObj.getMinutes();
          const upcoming = departures.filter(d => getRouteTimeValue(d.time) >= nowMinutes);
          upcoming.sort((a, b) => getRouteTimeValue(a.time) - getRouteTimeValue(b.time));

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
  }, []);

  return (
    <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
      {/* Weather Badge */}
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF7ED', paddingHorizontal: 12, paddingVertical: isLargeScreen ? 12 : 8, borderRadius: 12 }}>
        <IconSymbol name="sun.max.fill" size={isLargeScreen ? 18 : 14} color="#F97316" />
        <Text style={{ fontSize: isLargeScreen ? 14 : 13, fontWeight: '700', color: '#C2410C', marginLeft: 6 }}>
          {weatherLoading ? '...' : (weather ? `${weather.temperature}°` : '28°')}
        </Text>
      </View>

      {/* Ferry Badge */}
      <TouchableOpacity 
        style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', paddingHorizontal: 12, paddingVertical: isLargeScreen ? 12 : 8, borderRadius: 12, flex: 1 }}
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
        activeOpacity={0.8}
      >
        <IconSymbol name="ferry.fill" size={isLargeScreen ? 18 : 14} color="#3B82F6" />
        <Text style={{ fontSize: isLargeScreen ? 14 : 13, fontWeight: '700', color: '#1D4ED8', marginLeft: 6, flexShrink: 1 }} numberOfLines={1}>
          {ferryLoading ? (i18n.language.startsWith('en') ? 'Loading...' : 'Yükleniyor...') : (nextFerry ? `${nextFerry.time} ${nextFerry.from}-${nextFerry.to}${nextFerry.provider ? ' (' + nextFerry.provider + ')' : ''}` : (i18n.language.startsWith('en') ? 'No schedule found' : 'Sefer Bulunamadı'))}
        </Text>
      </TouchableOpacity>
    </View>
  );
};
const LanguageToggle = ({ currentLang, onChange }: { currentLang: string, onChange: (lang: string) => void }) => {
  const isTr = currentLang.startsWith('tr');

  return (
    <TouchableOpacity 
      style={{ 
        width: 44, 
        height: 44, 
        borderRadius: 22, 
        backgroundColor: '#F1F5F9', 
        alignItems: 'center', 
        justifyContent: 'center'
      }}
      onPress={() => onChange(isTr ? 'en' : 'tr')}
      activeOpacity={0.7}
    >
      <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }}>
        {isTr ? 'TR' : 'EN'}
      </Text>
    </TouchableOpacity>
  );
};

export default function MainMenuScreen() {
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
  const isSmallScreen = height < 700;
  const isLargeScreen = height > 900;
  const isIphone11 = Math.round(height) === 896;
  const isIphone16 = Math.round(height) === 852;
  const [showIslandPicker, setShowIslandPicker] = useState(false);
  const { user, isLoggedIn } = useAuth();

  const [heroSlides, setHeroSlides] = useState<any[]>([]);
  const [showSurvey, setShowSurvey] = useState(false);
  const [surveyOptions, setSurveyOptions] = useState<string[]>([]);
  const [surveyOtherText, setSurveyOtherText] = useState('');
  const [surveySubmitted, setSurveySubmitted] = useState(false);
  const [surveySubmitting, setSurveySubmitting] = useState(false);
  const [totalEventsCount, setTotalEventsCount] = useState(0);
  const [totalListingsCount, setTotalListingsCount] = useState(0);
  const [unseenEventsCount, setUnseenEventsCount] = useState(0);
  const [unseenListingsCount, setUnseenListingsCount] = useState(0);
  const [allEventIds, setAllEventIds] = useState<string[]>([]);

  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);

  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  const OPTION_CODES: Record<string, string> = {
    'Cargo / Parcel': 'CARGO', 'Kargo': 'CARGO',
    'Supermarket / Restaurant': 'SUPERMARKET', 'Market / Restorant': 'SUPERMARKET',
    'Water / Gas Cylinder': 'WATER_GAS', 'Su / Tüp': 'WATER_GAS',
    'Other': 'OTHER', 'Diğer': 'OTHER',
  };

  const handleSurveySubmit = async () => {
    if (!isLoggedIn) {
      Alert.alert(
        i18n.language.startsWith('en') ? 'Login Required' : 'Giriş Gerekli',
        i18n.language.startsWith('en') ? 'Please log in to vote.' : 'Oy kullanmak için giriş yapmalısınız.'
      );
      return;
    }
    const codes = surveyOptions.map(o => OPTION_CODES[o]).filter(Boolean);
    if (codes.length === 0) return;
    setSurveySubmitting(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/api/v1/demand/delivery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ options: codes, otherText: surveyOtherText || null, island: null }),
      });
      if (res.status === 409) {
        setSurveySubmitted(true);
        return;
      }
      if (!res.ok) throw new Error('failed');
      setSurveySubmitted(true);
    } catch {
      Alert.alert(
        i18n.language.startsWith('en') ? 'Error' : 'Hata',
        i18n.language.startsWith('en') ? 'Could not submit. Please try again.' : 'Gönderilemedi, tekrar deneyin.'
      );
    } finally {
      setSurveySubmitting(false);
    }
  };

  const handleSendInvite = async () => {
    const email = inviteEmail.trim();
    if (!email) return;
    
    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!EMAIL_REGEX.test(email)) {
      Alert.alert(t('common.error'), t('profile.inviteEmailError'));
      return;
    }

    Keyboard.dismiss();
    setIsInviting(true);

    try {
      const { getToken } = require('@/utils/tokenStorage');
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/api/v1/users/invites`, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ email })
      });
      if (!response.ok) {
          throw new Error(t('profile.inviteSendFailed'));
      }
      Alert.alert(t('common.success'), t('profile.inviteSendSuccess'));
      setInviteEmail('');
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

      Promise.all([fetchActivities(), fetchListings(), fetchActiveBanner()]).then(([eventsData, listingsData, bannerData]) => {
        const events = Array.isArray(eventsData) ? eventsData : (eventsData?.content || eventsData?.data || []);
        const listings = Array.isArray(listingsData) ? listingsData : (listingsData?.content || listingsData?.data || []);
        
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

        setAllEventIds(validEvents.map(e => e.id));
        AsyncStorage.getItem('seenEventIds').then(seenStr => {
          const seenIds = seenStr ? JSON.parse(seenStr) : [];
          const unseenCount = validEvents.filter(e => !seenIds.includes(e.id)).length;
          setUnseenEventsCount(unseenCount);
        });

        AsyncStorage.getItem('lastViewedListings').then(lastViewedStr => {
          const lastViewed = lastViewedStr ? parseInt(lastViewedStr, 10) : 0;
          const unseenCount = validListings.filter(l => l.createdAt > lastViewed).length;
          setUnseenListingsCount(unseenCount);
        });

        if (combined.length > 0) {
          setHeroSlides(combined);
        } else {
          setHeroSlides([]);
        }
      }).catch(err => console.log('Error fetching hero slider data:', err));

      if (isLoggedIn) {
        fetchNotifications().then(data => {
            if (data && Array.isArray(data)) setNotifications(data);
        }).catch(e => console.log('Error prefetching notifications', e));
      }
    }, [isLoggedIn])
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
  const heroHeight = isLargeScreen ? 300 : 260;

  return (
    <View style={styles.container}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: insets.bottom + 80 }} showsVerticalScrollIndicator={false} scrollEnabled={false}>
      <View style={[styles.welcomeContainer, { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start', 
        paddingTop: insets.top + (isIphone11 ? 24 : 12), 
        paddingHorizontal: 20 
      }, isSmallScreen && { marginBottom: 12 }, isLargeScreen && { marginBottom: 20 }]}>
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text style={[styles.welcomeGreeting, isLargeScreen && { fontSize: 32 }, { marginBottom: 8 }]}>
            {isLoggedIn && user
              ? `${t('explore.welcome', { defaultValue: 'Hoşgeldin' })}, ${user.fullName.split(' ')[0]}! 🌸`
              : `${t('explore.welcome', { defaultValue: 'Hoşgeldin' })}! 🌸`}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }}>
            <Text style={[styles.welcomeSubtitle, isLargeScreen && { fontSize: 17 }]}>
              {t('explore.todayEventsWaiting', { count: totalEventsCount })}
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity 
            style={{ 
              width: 44, 
              height: 44, 
              borderRadius: 22, 
              backgroundColor: '#F1F5F9', 
              alignItems: 'center', 
              justifyContent: 'center'
            }}
            onPress={async () => {
              setShowNotificationModal(true);
              setLoadingNotifications(true);
              let notificationsData: any[] = [];
              if (isLoggedIn) {
                  try {
                      const fetchedData = await fetchNotifications();
                      notificationsData = Array.isArray(fetchedData) ? fetchedData : [];
                  } catch (e) {
                      console.log('Error fetching notifications', e);
                  }
              }
              
              setNotifications(notificationsData);
              setLoadingNotifications(false);
            }}
            activeOpacity={0.7}
          >
            <IconSymbol name="bell.fill" size={20} color="#0F172A" />
            {notifications.filter(n => !n.read).length > 0 && (
              <View style={{ position: 'absolute', top: -4, right: -4, backgroundColor: '#EF4444', borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 }}>
                <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>
                  {notifications.filter(n => !n.read).length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>


      {/* Invite User Input (Visible to all, usable only by Islanders/Admins) */}
      <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 16, paddingHorizontal: 16, height: isLargeScreen ? 60 : 50, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
            <IconSymbol name="envelope.fill" size={20} color="#059669" />
            <TextInput
              style={{ flex: 1, fontSize: isLargeScreen ? 16 : 15, color: '#0F172A', opacity: (user?.role === 'ISLANDER' || user?.role === 'ADMIN') ? 1 : 0.6, textAlign: 'center' }}
              placeholder={(user?.role === 'ISLANDER' || user?.role === 'ADMIN') ? t('profile.inviteFriend', { defaultValue: 'Arkadaşını Davet Et' }) : t('common.islanderOnly', { defaultValue: i18n.language.startsWith('en') ? 'Only Islanders can invite' : 'Sadece Adalılar davet edebilir' })}
              placeholderTextColor="#059669"
              value={inviteEmail}
              onChangeText={setInviteEmail}
              onSubmitEditing={handleSendInvite}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={user?.role === 'ISLANDER' || user?.role === 'ADMIN'}
            />
          </View>
          <TouchableOpacity 
             style={{ width: isLargeScreen ? 60 : 50, height: isLargeScreen ? 60 : 50, backgroundColor: '#059669', borderRadius: 16, alignItems: 'center', justifyContent: 'center', opacity: ((user?.role === 'ISLANDER' || user?.role === 'ADMIN') && inviteEmail.trim()) ? 1 : 0.5 }}
             onPress={handleSendInvite}
             disabled={!(user?.role === 'ISLANDER' || user?.role === 'ADMIN') || !inviteEmail.trim() || isInviting}
          >
            {isInviting ? <ActivityIndicator color="#FFF" size="small" /> : <IconSymbol name="paperplane.fill" size={20} color="#FFF" />}
          </TouchableOpacity>
        </View>
        <TodayOnIsland />
      </View>

      {/* Hero Header Slider Wrapper */}
      <View style={[styles.heroWrapper, { height: heroHeight, marginBottom: 0 }]}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          snapToInterval={width}
          decelerationRate="fast"
          bounces={true}
          onMomentumScrollEnd={(e) => {
            const scrollPosition = e.nativeEvent.contentOffset.x;
            const index = Math.round(scrollPosition / width);
            setActiveIndex(index);
          }}
        >
          {slidesToRender.map((slide, index) => (
            <TouchableOpacity 
              key={index} 
              activeOpacity={0.9}
              onPress={() => {
                if (slide?.id && !slide.id.startsWith('default')) {
                  if (slide.type === 'listing') {
                    router.push({ pathname: '/explore/island/ilan/[id]', params: { id: slide.id } });
                  } else {
                    router.push({ pathname: '/explore/island/event/[id]', params: { id: slide.id } });
                  }
                } else {
                  router.push('/(tabs)/explore/island/events');
                }
              }}
            >
              <View style={[styles.heroImage, { width: width - 24, marginHorizontal: 12, borderRadius: 20, overflow: 'hidden' }]}>
                <ImageBackground 
                    source={{ uri: slide.imageUrl }} 
                    style={{ flex: 1, padding: 20, justifyContent: 'space-between', paddingHorizontal: 20 }}
                    imageStyle={{ resizeMode: 'cover', borderRadius: 20 }}
                >
                  <LinearGradient
                    colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.8)']}
                    style={[StyleSheet.absoluteFill, { borderRadius: 20 }]}
                  />
                  
                  {/* Top Row */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
                    <View style={{ backgroundColor: slide.type === 'listing' ? '#10B981' : '#3B82F6', flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 }}>
                      {slide.type === 'banner' && <IconSymbol name="exclamationmark.circle.fill" size={isLargeScreen ? 14 : 12} color="#FFF" />}
                      <Text style={{ color: '#FFF', fontSize: isLargeScreen ? 12 : 11, fontWeight: '800' }}>
                        {slide.type === 'listing' 
                          ? (i18n.language.startsWith('en') ? 'FEATURED LISTING' : 'ÖNE ÇIKAN İLAN') 
                          : (slide.type === 'banner' 
                              ? (i18n.language.startsWith('en') ? 'ANNOUNCEMENT' : 'DUYURU') 
                              : (i18n.language.startsWith('en') ? 'FEATURED EVENT' : 'ÖNE ÇIKAN ETKİNLİK'))}
                      </Text>
                    </View>
                    <TouchableOpacity 
                      style={{ backgroundColor: '#FFF', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 }}
                      onPress={() => router.push(slide.type === 'listing' ? '/(tabs)/explore/island/ilanlar' : '/(tabs)/explore/island/events')}
                    >
                      <Text style={{ color: '#0F172A', fontSize: isLargeScreen ? 13 : 12, fontWeight: '700', marginRight: 4 }}>
                        {slide.type === 'listing' 
                          ? (i18n.language.startsWith('en') ? 'All Listings' : 'Tüm İlanlar') 
                          : (i18n.language.startsWith('en') ? 'All Events' : 'Tüm Etkinlikler')}
                      </Text>
                      <IconSymbol name="arrow.right" size={12} color="#0F172A" />
                    </TouchableOpacity>
                  </View>

                  {/* Bottom Content */}
                  <View style={{ zIndex: 10, paddingBottom: 10 }}>
                    <Text style={{ color: '#FFF', fontSize: isLargeScreen ? 24 : 22, fontWeight: '900', marginBottom: 12, lineHeight: isLargeScreen ? 32 : 28, width: '90%' }} numberOfLines={2}>
                      {slide.title}
                    </Text>

                    {/* Details Row */}
                    {slide.type !== 'banner' && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <IconSymbol name="mappin.circle.fill" size={isLargeScreen ? 16 : 14} color="#E2E8F0" />
                          <Text style={{ color: '#E2E8F0', fontSize: isLargeScreen ? 13 : 12, marginLeft: 4 }}>{slide.island || 'Büyükada'}</Text>
                        </View>
                        {slide.type === 'event' && slide.date && (
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <IconSymbol name="calendar" size={isLargeScreen ? 16 : 14} color="#E2E8F0" />
                            <Text style={{ color: '#E2E8F0', fontSize: isLargeScreen ? 13 : 12, marginLeft: 4 }}>
                              {new Date(slide.date).toLocaleDateString(i18n.language.startsWith('en') ? 'en-US' : 'tr-TR', {day: 'numeric', month: 'long'})}
                            </Text>
                          </View>
                        )}
                        {slide.type === 'listing' && slide.price > 0 && (
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <IconSymbol name="tag.fill" size={isLargeScreen ? 16 : 14} color="#E2E8F0" />
                            <Text style={{ color: '#E2E8F0', fontSize: isLargeScreen ? 13 : 12, marginLeft: 4 }}>
                              {slide.price.toLocaleString('tr-TR')} ₺
                            </Text>
                          </View>
                        )}
                      </View>
                    )}

                    {/* Button */}
                    <View style={{ backgroundColor: '#FFF', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={{ color: '#0F172A', fontSize: isLargeScreen ? 15 : 13, fontWeight: '800', marginRight: 4 }}>
                        {slide.type === 'listing' 
                          ? (i18n.language.startsWith('en') ? 'View' : 'İncele') 
                          : (i18n.language.startsWith('en') ? 'Register' : 'Kayıt Ol')}
                      </Text>
                      <IconSymbol name="arrow.right" size={isLargeScreen ? 16 : 14} color="#0F172A" />
                    </View>
                  </View>
                </ImageBackground>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Top bar (Fixed over the slider) */}
        <View pointerEvents="box-none" style={[styles.topBar, { paddingTop: insets.top + 8 }]} />

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
      </View>




      {/* Hızlı Erişim Section (Header Removed) */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={{ marginTop: isIphone11 ? 24 : (isLargeScreen ? 20 : 16), marginBottom: 0 }}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 12, paddingBottom: 20 }}
      >
        {/* Etkinlikler */}
        <Pressable 
          style={({ pressed }) => [{ width: isLargeScreen ? 104 : 98, height: isLargeScreen ? 144 : 124, backgroundColor: pressed ? '#BFDBFE' : '#FFFFFF', borderRadius: 20, borderWidth: 1.5, borderColor: '#BFDBFE', padding: 10, paddingTop: 16, alignItems: 'center', justifyContent: 'flex-start', shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }]}
          onPress={() => {
            AsyncStorage.setItem('seenEventIds', JSON.stringify(allEventIds));
            setUnseenEventsCount(0);
            navigateWithDebounce('/(tabs)/explore/island/events');
          }}
          onPressIn={() => { 
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); 
          }}
        >
          <View>
            <View style={{ width: isLargeScreen ? 52 : 44, height: isLargeScreen ? 52 : 44, borderRadius: 12, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
              <IconSymbol name="calendar" size={isLargeScreen ? 28 : 24} color="#3B82F6" />
            </View>
            {unseenEventsCount > 0 && (
              <View style={{ position: 'absolute', top: -6, right: -6, backgroundColor: '#EF4444', minWidth: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', zIndex: 10, borderWidth: 2, borderColor: '#FFF', paddingHorizontal: 4 }}>
                <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '800' }}>{unseenEventsCount > 9 ? '9+' : unseenEventsCount}</Text>
              </View>
            )}
          </View>
          <Text style={{ fontSize: isLargeScreen ? 15 : 14, fontWeight: '800', color: '#3B82F6', marginBottom: 2 }}>{t('explore.events')}</Text>
          <Text style={{ fontSize: isLargeScreen ? 12 : 11, color: '#64748B' }}>{t('explore.eventsCount', { count: totalEventsCount })}</Text>
        </Pressable>

        {/* Ada AI */}
        <Pressable 
          style={({ pressed }) => [{ width: isLargeScreen ? 104 : 98, height: isLargeScreen ? 144 : 124, backgroundColor: pressed ? '#FBCFE8' : '#FFFFFF', borderRadius: 20, borderWidth: 1.5, borderColor: '#FBCFE8', padding: 10, paddingTop: 16, alignItems: 'center', justifyContent: 'flex-start', shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }]}
          onPress={() => navigateWithDebounce('/guide')}
          onPressIn={() => { 
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); 
          }}
        >
          <View style={{ width: isLargeScreen ? 52 : 44, height: isLargeScreen ? 52 : 44, borderRadius: 12, backgroundColor: '#FCE7F3', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
            <IconSymbol name="pawprint.fill" size={isLargeScreen ? 28 : 24} color="#EC4899" />
          </View>
          <Text style={{ fontSize: isLargeScreen ? 15 : 14, fontWeight: '800', color: '#EC4899', marginBottom: 2 }}>{t('explore.adaAi')}</Text>
          <Text style={{ fontSize: isLargeScreen ? 12 : 11, color: '#64748B' }}>{t('explore.yourGuide')}</Text>
        </Pressable>

        {/* İlanlar */}
        <Pressable 
          style={({ pressed }) => [{ width: isLargeScreen ? 104 : 98, height: isLargeScreen ? 144 : 124, backgroundColor: pressed ? '#FEF08A' : '#FFFFFF', borderRadius: 20, borderWidth: 1.5, borderColor: '#FEF08A', padding: 10, paddingTop: 16, alignItems: 'center', justifyContent: 'flex-start', shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }]}
          onPress={() => {
            AsyncStorage.setItem('lastViewedListings', Date.now().toString());
            setUnseenListingsCount(0);
            navigateWithDebounce('/(tabs)/explore/island/ilanlar');
          }}
          onPressIn={() => { 
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); 
          }}
        >
          <View>
            <View style={{ width: isLargeScreen ? 52 : 44, height: isLargeScreen ? 52 : 44, borderRadius: 12, backgroundColor: '#FEF9C3', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
              <IconSymbol name="megaphone.fill" size={isLargeScreen ? 28 : 24} color="#EAB308" />
            </View>
            {unseenListingsCount > 0 && (
              <View style={{ position: 'absolute', top: -6, right: -6, backgroundColor: '#EF4444', minWidth: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', zIndex: 10, borderWidth: 2, borderColor: '#FFF', paddingHorizontal: 4 }}>
                <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '800' }}>{unseenListingsCount > 9 ? '9+' : unseenListingsCount}</Text>
              </View>
            )}
          </View>
          <Text style={{ fontSize: isLargeScreen ? 15 : 14, fontWeight: '800', color: '#EAB308', marginBottom: 2 }}>{t('explore.listings')}</Text>
          <Text style={{ fontSize: isLargeScreen ? 12 : 11, color: '#64748B' }}>{t('explore.listingsCount', { count: totalListingsCount })}</Text>
        </Pressable>

        {/* Paket Servis */}
        <Pressable 
          style={({ pressed }) => [{ width: isLargeScreen ? 104 : 98, height: isLargeScreen ? 144 : 124, backgroundColor: pressed ? '#DDD6FE' : '#FFFFFF', borderRadius: 20, borderWidth: 1.5, borderColor: '#DDD6FE', padding: 10, paddingTop: 16, alignItems: 'center', justifyContent: 'flex-start', shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }]}
          onPress={() => {
            if (!isLoggedIn) {
              router.push('/login');
              return;
            }
            setSurveySubmitted(false);
            setSurveyOptions([]);
            setSurveyOtherText('');
            setShowSurvey(true);
          }}
          onPressIn={() => { 
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); 
          }}
        >
          <View style={{ width: isLargeScreen ? 52 : 44, height: isLargeScreen ? 52 : 44, borderRadius: 12, backgroundColor: '#F5F3FF', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
            <IconSymbol name="bag.fill" size={isLargeScreen ? 28 : 24} color="#8B5CF6" />
          </View>
          <Text style={{ fontSize: isLargeScreen ? 15 : 14, fontWeight: '800', color: '#8B5CF6', marginBottom: 4, textAlign: 'center' }}>{i18n.language.startsWith('en') ? 'Delivery' : 'Paket Servis'}</Text>
          <View style={{ backgroundColor: '#F3E8FF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, borderWidth: 1, borderColor: '#D8B4FE' }}>
            <Text style={{ fontSize: isLargeScreen ? 11 : 9, color: '#8B5CF6', fontWeight: '700' }}>{i18n.language.startsWith('en') ? 'Soon' : 'Yakında'}</Text>
          </View>
        </Pressable>
      </ScrollView>

      {/* Topluluk Banner (At the bottom) */}
      <View style={{ paddingHorizontal: 20, paddingTop: 0, marginTop: isIphone11 ? 4 : (isLargeScreen ? -4 : (isIphone16 ? -16 : -8)), paddingBottom: 60, backgroundColor: 'transparent' }}>
        <SwipeButton isLoggedIn={isLoggedIn} onSwipeComplete={() => navigateWithDebounce('/(tabs)/explore/island/forum')} />
      </View>

      </ScrollView>



      {/* Notification Modal */}
      <Modal
        visible={showNotificationModal}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setShowNotificationModal(false)}
      >
        <TouchableOpacity 
          activeOpacity={1} 
          onPress={() => setShowNotificationModal(false)} 
          style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.15)', justifyContent: 'flex-start', alignItems: 'center' }}
        >
          <View 
            onStartShouldSetResponder={() => true}
            style={{ 
              backgroundColor: '#fff', 
              borderRadius: 24, 
              width: '95%', 
              minHeight: 300,
              maxHeight: '60%', 
              marginTop: insets.top + 90, 
              padding: 24, 
              shadowColor: '#000', 
              shadowOffset: { width: 0, height: 10 }, 
              shadowOpacity: 0.2, 
              shadowRadius: 20, 
              elevation: 10 
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#0F172A' }}>Bildirimler</Text>
              <TouchableOpacity onPress={() => setShowNotificationModal(false)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}>
                <IconSymbol name="xmark" size={14} color="#64748B" />
              </TouchableOpacity>
            </View>
            
            {loadingNotifications ? (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#3B82F6" />
              </View>
            ) : notifications.length === 0 ? (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <IconSymbol name="bell.fill" size={48} color="#CBD5E1" />
                <Text style={{ marginTop: 16, fontSize: 16, fontWeight: '600', color: '#64748B' }}>Henüz bildiriminiz yok.</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {notifications.map(notif => (
                  <TouchableOpacity 
                    key={notif.id} 
                    style={{ backgroundColor: notif.read ? '#F8FAFC' : '#EFF6FF', borderRadius: 16, padding: 20, marginBottom: 12, borderWidth: 1, borderColor: notif.read ? '#F1F5F9' : '#BFDBFE' }}
                    onPress={async () => {
                      if (!notif.read) {
                        await markNotificationRead(notif.id);
                        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
                      }
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <Text style={{ fontSize: 18, fontWeight: '700', color: '#0F172A', flex: 1, marginRight: 12 }}>{notif.title}</Text>
                      <Text style={{ fontSize: 14, color: '#94A3B8' }}>{new Date(notif.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}</Text>
                    </View>
                    <Text style={{ fontSize: 16, color: '#475569', lineHeight: 24 }}>{notif.body}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Survey Modal */}
      <Modal
        visible={showSurvey}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setShowSurvey(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.5)', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <View style={{ width: '100%', backgroundColor: '#fff', borderRadius: 28, padding: 28, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 10 }}>
            {surveySubmitted ? (
              <>
                <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                  <IconSymbol name="checkmark" size={28} color="#10B981" />
                </View>
                <Text style={{ fontSize: 20, fontWeight: '800', color: '#0F172A', marginBottom: 8, textAlign: 'center' }}>
                  {i18n.language.startsWith('en') ? 'Thank You!' : 'Teşekkürler!'}
                </Text>
                <Text style={{ fontSize: 15, color: '#64748B', textAlign: 'center', lineHeight: 22, marginBottom: 28 }}>
                  {i18n.language.startsWith('en') ? 'Your feedback has been received. We are working hard to bring electric vehicle services to the islands.' : 'Görüşleriniz alındı. Adalara elektrikli taşıt hizmetini getirmek için var gücümüzle çalışıyoruz.'}
                </Text>
                <TouchableOpacity 
                  style={{ width: '100%', backgroundColor: '#10B981', borderRadius: 16, paddingVertical: 16, alignItems: 'center' }} 
                  onPress={() => setShowSurvey(false)}
                >
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>
                    {i18n.language.startsWith('en') ? 'Close' : 'Kapat'}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#F3E8FF', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                  <IconSymbol name="bag.fill" size={28} color="#8B5CF6" />
                </View>
                <Text style={{ fontSize: 20, fontWeight: '800', color: '#0F172A', marginBottom: 8, textAlign: 'center' }}>
                  {i18n.language.startsWith('en') ? 'Delivery' : 'Paket Servis'}
                </Text>
                <Text style={{ fontSize: 15, color: '#64748B', textAlign: 'center', lineHeight: 22, marginBottom: 28 }}>
                  {i18n.language.startsWith('en') ? 'What kind of delivery service would you use most on the island?' : 'Adada en çok hangi paket servis hizmetine ihtiyaç duyuyorsunuz?'}
                </Text>
                
                <ScrollView style={{ width: '100%', maxHeight: 300, marginBottom: 10 }} showsVerticalScrollIndicator={false}>
                  {[
                    i18n.language.startsWith('en') ? 'Cargo / Parcel' : 'Kargo', 
                    i18n.language.startsWith('en') ? 'Supermarket / Restaurant' : 'Market / Restorant', 
                    i18n.language.startsWith('en') ? 'Water / Gas Cylinder' : 'Su / Tüp', 
                    i18n.language.startsWith('en') ? 'Other' : 'Diğer'
                  ].map((option) => (
                    <TouchableOpacity 
                      key={option}
                      style={{ 
                        width: '100%', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 16, marginBottom: 10,
                        backgroundColor: surveyOptions.includes(option) ? '#F3E8FF' : '#F8FAFC',
                        borderWidth: 1, borderColor: surveyOptions.includes(option) ? '#8B5CF6' : '#E2E8F0',
                        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'
                      }}
                      onPress={() => setSurveyOptions(prev => prev.includes(option) ? prev.filter(o => o !== option) : [...prev, option])}
                    >
                      <Text style={{ fontSize: 15, fontWeight: surveyOptions.includes(option) ? '700' : '500', color: surveyOptions.includes(option) ? '#6D28D9' : '#334155' }}>
                        {option}
                      </Text>
                      {surveyOptions.includes(option) && <IconSymbol name="checkmark.circle.fill" size={20} color="#8B5CF6" />}
                    </TouchableOpacity>
                  ))}
                  {(surveyOptions.includes('Diğer') || surveyOptions.includes('Other')) && (
                    <TextInput
                      style={{
                        width: '100%', backgroundColor: '#F8FAFC', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16,
                        borderWidth: 1, borderColor: '#E2E8F0', fontSize: 15, color: '#0F172A', marginTop: 4, marginBottom: 10,
                      }}
                      placeholder={i18n.language.startsWith('en') ? 'Please specify...' : 'Lütfen belirtin...'}
                      placeholderTextColor="#94A3B8"
                      value={surveyOtherText}
                      onChangeText={setSurveyOtherText}
                    />
                  )}
                </ScrollView>

                <TouchableOpacity 
                  style={{ width: '100%', backgroundColor: surveyOptions.length > 0 ? '#8B5CF6' : '#CBD5E1', borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 8 }} 
                  onPress={handleSurveySubmit}
                  disabled={surveyOptions.length === 0 || surveySubmitting}
                >
                  {surveySubmitting
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>
                        {i18n.language.startsWith('en') ? 'Submit' : 'Gönder'}
                      </Text>
                  }
                </TouchableOpacity>
                <TouchableOpacity style={{ width: '100%', paddingVertical: 14, alignItems: 'center', marginTop: 4 }} onPress={() => setShowSurvey(false)}>
                  <Text style={{ color: '#94A3B8', fontSize: 15, fontWeight: '600' }}>
                    {i18n.language.startsWith('en') ? 'Cancel' : 'İptal'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

    </View>
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
        <Text style={[styles.cardTitle, large && { fontSize: 15 }, { color: primaryColor }]} numberOfLines={1}>{title}</Text>
        <Text style={[styles.cardSubtitle, large && { fontSize: 12, lineHeight: 16 }, { color: '#64748B' }]}>{subtitle}</Text>
      </View>
      <IconSymbol name={"chevron.right" as any} size={20} color={primaryColor} />
    </>
  );

  return (
    <TouchableOpacity 
      style={[
        styles.card, 
        { padding: cardPadding, backgroundColor: '#ffffff' },
        style
      ]} 
      onPress={onPress} 
      activeOpacity={0.7}
    >
      {content}
    </TouchableOpacity>
  );
}

function GridCard({ icon, title, subtitle, onPress, style, colors, large, iconImage }: any) {
  const primaryColor = colors ? colors[0] : '#3B82F6';

  const content = (
    <View style={{ flex: 1, padding: 8, width: '100%' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', height: 48 }}>
        {iconImage ? (
          <Image source={iconImage} style={{ width: 44, height: 44, borderRadius: 12, marginRight: 8 }} resizeMode="contain" />
        ) : (
          <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: `${primaryColor}15`, alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
            <IconSymbol name={icon as any} size={16} color={primaryColor} />
          </View>
        )}
        <View style={{ flex: 1, paddingRight: 16, justifyContent: 'center' }}>
          <Text style={{ fontSize: 13, fontWeight: '800', color: primaryColor }}>{title}</Text>
        </View>
      </View>
      <View style={{ position: 'absolute', bottom: 8, right: 8, width: 20, height: 20, borderRadius: 10, backgroundColor: `${primaryColor}15`, alignItems: 'center', justifyContent: 'center' }}>
        <IconSymbol name="arrow.right" size={10} color={primaryColor} />
      </View>
    </View>
  );

  return (
    <TouchableOpacity 
      style={[
        styles.gridCard, 
        { backgroundColor: '#FFFFFF', padding: 0, borderWidth: 1, borderColor: '#F1F5F9' },
        style
      ]} 

      onPress={onPress} 
      activeOpacity={0.7}
    >
      {content}
    </TouchableOpacity>
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
    borderRadius: 20,
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
    fontSize: 8,
    fontWeight: '800',
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
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  expandedInfoSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    lineHeight: 18,
  },
  heroActionButton: {
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 4,
  },
  heroActionButtonText: {
    color: '#fff',
    fontSize: 13,
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
    marginBottom: 28,
    paddingHorizontal: 4,
    marginTop: 4,
  },
  welcomeGreeting: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0D1B2A',
    marginBottom: 2,
    letterSpacing: -0.5,
  },
  welcomeSubtitle: {
    fontSize: 12,
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
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0D1B2A',
  },
  headerWeather: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0D1B2A',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 11,
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
    borderRadius: 20,
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
    fontWeight: '800',
    color: '#0D1B2A',
    marginBottom: 2,
    textAlign: 'center',
  },
  gridCardSubtitle: {
    fontSize: 10,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  langValue: {
    fontSize: 11,
    fontWeight: '900',
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
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '900',
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
    fontSize: 16,
    color: '#475569',
    fontWeight: '600',
  },
  cardsContainer: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  quickInfoLabel: {
    fontSize: 10,
    color: '#999',
    marginTop: 4,
    fontWeight: '500',
  },
  quickInfoValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0D1B2A',
    marginTop: 1,
  },
  inlineSliderContainer: {
    marginBottom: 20,
    marginTop: -8,
  },
  inlineSlideCard: {
    height: 200,
    marginRight: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
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
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  inlineSlideSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
  },
});
