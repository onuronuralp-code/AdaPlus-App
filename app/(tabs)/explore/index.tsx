import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import React, { useState, useEffect, useCallback } from 'react';
import { ImageBackground, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View, Dimensions, ScrollView, NativeScrollEvent, NativeSyntheticEvent, ActivityIndicator, Modal, Animated, TouchableWithoutFeedback } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import i18n from '@/utils/i18n';
import { useTranslation } from 'react-i18next';
import { fetchActivities, fetchListings } from '@/services/api';
import { resolveImageUrl } from '@/services/config';
import { useAuth } from '@/context/AuthContext';



export default function MainMenuScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [selectedIsland, setSelectedIsland] = useState("Büyükada");
  const isSmallScreen = height < 700;
  const isLargeScreen = height > 900;
  const [showIslandPicker, setShowIslandPicker] = useState(false);
  const { user, isLoggedIn } = useAuth();

  const [heroSlides, setHeroSlides] = useState<any[]>([]);

  useFocusEffect(
    useCallback(() => {
      Promise.all([fetchActivities(), fetchListings()]).then(([eventsData, listingsData]) => {
        const events = eventsData || [];
        const listings = listingsData || [];
        
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
            imageUrl: resolveImageUrl(listing.imageUrl) || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&auto=format&fit=crop&q=80'
          }));

        const combined = [...validEvents, ...validListings]
          .sort((a, b) => b.date - a.date) // sort by newest first
          .slice(0, 5);

        if (combined.length > 0) {
          setHeroSlides(combined);
        } else {
          setHeroSlides([]);
        }
      }).catch(err => console.log('Error fetching hero slider data:', err));
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
    title: t('common.readyForAdventure', { defaultValue: 'Macera Zamanı?' }),
    subtitle: t('common.exploreServices', { defaultValue: 'Adalardaki hizmetleri ve en yeni etkinlikleri keşfet' }),
    imageUrl: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800&auto=format&fit=crop&q=80'
  };

  const slidesToRender = heroSlides.length > 0 ? heroSlides : [defaultSlide];

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / width);
    setActiveIndex(index);
  };
  // Set hero height to be much taller as requested (approx 45% of screen height)
  const heroHeight = SCREEN_HEIGHT * 0.45;

  return (
    <View style={styles.container}>
      {/* Hero Header Slider Wrapper (Temporarily Removed) */}
      {/* 
      <View style={[styles.heroWrapper, { height: heroHeight }]}>
         ... 
      </View>
      */}

      {/* Body Content — scrollable on short screens, fills naturally on tall screens */}
      <Animated.ScrollView
        style={[styles.body, { paddingTop: insets.top + 16 }]}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: Math.max(insets.bottom, 12) + 16 }}
        showsVerticalScrollIndicator={false}
        bounces={false}
        scrollEnabled={true}
      >
        {/* Pagination Dots (Temporarily Removed) */}
        {/* 
        <View style={[styles.paginationUnderHero, isSmallScreen && { height: 14, marginBottom: 4 }]}>
          {slidesToRender.map((_, index) => (
            <View
              key={index}
              style={[styles.dot, activeIndex === index ? styles.activeDot : null]}
            />
          ))}
        </View>
        */}

        {/* Services Section */}
        <View style={styles.servicesSection}>
          <View style={[styles.welcomeContainer, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, isSmallScreen && { marginBottom: 12, marginTop: 4 }]}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={[styles.welcomeGreeting, isLargeScreen && { fontSize: 26 }]}>
                {isLoggedIn && user 
                  ? `${i18n.language.startsWith('en') ? 'Welcome' : 'Hoş Geldin'}, ${user.fullName.split(' ')[0]}! 👋`
                  : t('common.welcomeGreeting', { defaultValue: i18n.language.startsWith('en') ? 'Welcome! 👋' : 'Hoş Geldin! 👋' })}
              </Text>
              <Text style={[styles.welcomeSubtitle, isLargeScreen && { fontSize: 15 }]}>
                {t('common.welcomeSubtitle', { defaultValue: i18n.language.startsWith('en') ? 'Ready to explore the islands?' : 'Adaları keşfetmeye hazır mısın?' })}
              </Text>
            </View>
            <TouchableOpacity 
              style={{ backgroundColor: '#F1F5F9', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 }} 
              onPress={() => i18n.changeLanguage(i18n.language.startsWith('en') ? 'tr' : 'en')}
            >
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569' }}>
                {i18n.language.startsWith('en') ? '🇹🇷 TR' : '🇬🇧 EN'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inlineSliderContainer}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              snapToInterval={width - 32 + 12} // card width + right margin
              decelerationRate="fast"
            >
              {slidesToRender.map((slide, index) => (
                <TouchableOpacity 
                  key={index} 
                  style={[styles.inlineSlideCard, { width: width - 32 }]}
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
                  <ImageBackground 
                    source={{ uri: slide.imageUrl }} 
                    style={styles.inlineSlideImage}
                    imageStyle={{ borderRadius: 16 }}
                  >
                    <LinearGradient
                      colors={['transparent', 'rgba(27,27,47,0.9)']}
                      style={styles.inlineSlideGradient}
                    >
                      <Text style={styles.inlineSlideTitle}>{slide.title}</Text>
                      <Text style={styles.inlineSlideSubtitle} numberOfLines={2}>{slide.subtitle}</Text>
                    </LinearGradient>
                  </ImageBackground>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={[styles.sectionHeader, isSmallScreen && { marginBottom: 10 }]}>
            <View style={styles.sectionTitleRow}>
              <IconSymbol name="safari.fill" size={isLargeScreen ? 24 : 20} color="#EA580C" />
              <Text style={[styles.sectionTitle, isLargeScreen && { fontSize: 20 }]}>
                {t('common.servicesAndActivities', { defaultValue: i18n.language.startsWith('tr') ? 'Servisler ve Aktiviteler' : 'Services and Activities' })}
              </Text>
            </View>
          </View>
          <View style={[styles.cardsContainer, { gap: 8 }]}>
            <View style={styles.gridRow}>
              <GridCard
                icon="tag.fill"
                colors={['#3B82F6', '#2563EB']}
                title={t('common.ilanlar', { defaultValue: i18n.language.startsWith('en') ? 'Listings' : 'İlanlar' })}
                subtitle={t('common.ilanlarSubtitle', { defaultValue: i18n.language.startsWith('en') ? 'Real Estate & Services' : 'İş, Emlak, Hizmet' })}
                onPress={() => router.push('/(tabs)/explore/island/ilanlar')}
                style={{ marginRight: 6 }}
                large={isLargeScreen}
              />
              <GridCard
                icon="ticket.fill"
                colors={['#F59E0B', '#D97706']}
                title={t('common.events', { defaultValue: i18n.language.startsWith('en') ? 'Events' : 'Etkinlikler' })}
                subtitle={t('common.islandEvents', { defaultValue: i18n.language.startsWith('en') ? 'Discover local events' : 'Etkinlikleri keşfet' })}
                onPress={() => router.push('/(tabs)/explore/island/events')}
                style={{ marginLeft: 6 }}
                large={isLargeScreen}
              />
            </View>
            <View style={styles.gridRow}>
              <GridCard
                icon="safari.fill"
                colors={['#EC4899', '#BE185D']}
                title={t('common.adaAI', { defaultValue: i18n.language.startsWith('en') ? 'Tour Guide' : 'Tur Rehberi' })}
                subtitle={t('common.yourSmartGuide', { defaultValue: i18n.language.startsWith('en') ? 'Smart Assistant' : 'Akıllı Asistan' })}
                onPress={() => router.push('/guide')}
                style={{ marginRight: 6 }}
                large={isLargeScreen}
              />
              <GridCard
                icon="bag.fill"
                colors={['#8B5CF6', '#6D28D9']}
                title={t('common.delivery', { defaultValue: i18n.language.startsWith('en') ? 'Delivery' : 'Paket Servis' })}
                subtitle={t('common.deliverySubtitle', { defaultValue: i18n.language.startsWith('en') ? 'Food & Groceries' : 'Yemek ve Market' })}
                onPress={() => router.push('/(tabs)/explore/island/delivery')}
                style={{ marginLeft: 6 }}
                large={isLargeScreen}
              />
            </View>
            <MenuCard
              icon="bubble.left.and.bubble.right.fill"
              colors={['#10B981', '#059669']}
              title={t('common.community', { defaultValue: i18n.language.startsWith('en') ? 'Community' : 'Topluluk' })}
              subtitle={t('common.shareExperiences', { defaultValue: i18n.language.startsWith('en') ? 'Stay updated, share your ideas, and make the island a better place' : 'Ada gündemine hakim ol, fikrini diğer adalılarla paylaş' })}
              onPress={() => router.push('/(tabs)/explore/island/forum')}
              large={isLargeScreen}
            />
          </View>
        </View>
      </Animated.ScrollView>
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
        <Text style={[styles.cardSubtitle, large && { fontSize: 12, lineHeight: 16 }, { color: '#64748B' }]} numberOfLines={2}>{subtitle}</Text>
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

function GridCard({ icon, title, subtitle, onPress, style, colors, large }: any) {
  const primaryColor = colors ? colors[0] : '#3B82F6';

  const content = (
    <>
      <View style={[styles.gridIconContainer, { backgroundColor: primaryColor }, large && { width: 40, height: 40, borderRadius: 12 }]}>
        <IconSymbol name={icon as any} size={large ? 22 : 20} color="#fff" />
      </View>
      <Text style={[styles.gridCardTitle, large && { fontSize: 15 }, { color: primaryColor }]}>{title}</Text>
      <Text style={[styles.gridCardSubtitle, large && { fontSize: 11, lineHeight: 14 }, { color: '#64748B' }]} numberOfLines={1}>{subtitle}</Text>
    </>
  );

  return (
    <TouchableOpacity 
      style={[
        styles.gridCard, 
        large && { padding: 16 }, 
        { backgroundColor: '#ffffff' },
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
    backgroundColor: '#1B1B2F',
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
    backgroundColor: '#fff',
    zIndex: 2,
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
    fontSize: 20,
    fontWeight: '900',
    color: '#0D1B2A',
    marginBottom: 2,
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
    marginBottom: 8,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  gridCard: {
    flex: 1,
    minHeight: 84,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
    alignItems: 'center',
    justifyContent: 'center',
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
    height: 280,
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
