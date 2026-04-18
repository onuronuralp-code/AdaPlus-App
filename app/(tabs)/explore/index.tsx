import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { fetchActivities } from '@/services/api';
import { ImageBackground, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View, Dimensions, ScrollView, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import i18n from '@/utils/i18n';
import { useTranslation } from 'react-i18next';


export default function MainMenuScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [heroSlides, setHeroSlides] = useState<any[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    fetchActivities().then(activities => {
      const validActivities = activities.filter((a: any) => a.imageUrl);
      if (validActivities.length > 0) {
        setHeroSlides(validActivities.map((a: any) => ({
          id: a.id,
          title: a.name,
          subtitle: a.description || t('common.exploreServices', { defaultValue: 'Explore services & activities' }),
          imageUrl: a.imageUrl
        })));
      }
    });
  }, []);

  const dummySlides = [
    {
      id: 'default_1',
      title: t('common.readyForAdventure', { defaultValue: 'Macera Zamanı?' }),
      subtitle: t('common.exploreServices', { defaultValue: 'Adalardaki hizmetleri ve en yeni etkinlikleri keşfet' }),
      imageUrl: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800&auto=format&fit=crop&q=80'
    },
    {
      id: 'default_2',
      title: 'Kültürel Rotalar',
      subtitle: 'Adanın tarihi sokaklarında yürüyüşe çıkın.',
      imageUrl: 'https://images.unsplash.com/photo-1542640244-7e672d6cb466?q=80&w=800&auto=format&fit=crop'
    },
    {
      id: 'default_3',
      title: 'Eşsiz Lezzetler',
      subtitle: 'Sahil kenarında yerel restoranları deneyimleyin.',
      imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&auto=format&fit=crop&q=80'
    }
  ];

  const slidesToRender = heroSlides.length > 1 ? heroSlides : (heroSlides.length === 1 ? [...heroSlides, dummySlides[1], dummySlides[2]] : dummySlides);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / width);
    setActiveIndex(index);
  };
  return (
    <View style={styles.container}>
      {/* Hero Header Slider Wrapper */}
      <View style={styles.heroWrapper}>
        <ScrollView 
          horizontal 
          pagingEnabled 
          showsHorizontalScrollIndicator={false}
          bounces={false}
          onMomentumScrollEnd={handleScroll}
        >
          {slidesToRender.map(slide => (
            <ImageBackground 
                key={slide.id}
                source={{ uri: slide.imageUrl }} 
                style={[styles.heroImage, { width }]}
                imageStyle={{ resizeMode: 'cover' }}
            >
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.7)']}
                style={styles.heroOverlay}
              >
                <Text style={styles.heroTitle}>{slide.title}</Text>
                <Text style={styles.heroSubtitle} numberOfLines={2}>{slide.subtitle}</Text>
              </LinearGradient>
            </ImageBackground>
          ))}
        </ScrollView>

        {/* Pagination Dots (Moved under hero) */}
        <View style={styles.paginationUnderHero}>
          {slidesToRender.map((_, index) => (
            <View 
              key={index} 
              style={[
                styles.dot, 
                activeIndex === index ? styles.activeDot : null
              ]} 
            />
          ))}
        </View>

        {/* Top bar with language & notification (Fixed over the slider) */}
        <View pointerEvents="box-none" style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <View style={{ flex: 1 }} />
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => {
                const newLang = i18n.language === 'en' ? 'tr' : 'en';
                i18n.changeLanguage(newLang);
              }}
            >
              <IconSymbol name="globe" size={20} color="#fff" />
              <View style={styles.langBadge}>
                <Text style={styles.langBadgeText}>{i18n.language.toUpperCase()}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* White body — no scrolling */}
      <View style={styles.body}>
        {/* Quick Info Section */}
        <View style={styles.quickInfoSection}>
          <View style={styles.quickInfoRow}>
            <QuickInfoChip icon="sunset.fill" iconColor="#FFD700" label={t('common.sunset', { defaultValue: 'Sunset' })} value="19:45" />
            <QuickInfoChip icon="thermometer.medium" iconColor="#FF6B6B" label={t('common.temp', { defaultValue: 'Temp' })} value="18°C" />
            <QuickInfoChip icon="wind" iconColor="#60A5FA" label={t('common.wind', { defaultValue: 'Wind' })} value="12 km/h" />
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <IconSymbol name={"safari" as any} size={24} color="#EA580C" style={{ marginRight: 8 }} />
          <Text style={styles.sectionTitle}>{t('common.servicesAndActivities', { defaultValue: 'Services & Activities' })}</Text>
        </View>

        {/* Menu Cards */}
        {/* Grid Menu Cards (Side by side) */}
        <View style={styles.gridRow}>
          <GridCard
            icon="ferry"
            color="#3B82F6"
            accentLight="#EFF6FF"
            title={t('common.transportation', { defaultValue: 'Transportation' })}
            subtitle={t('common.islandShuttles', { defaultValue: 'Shuttles & bikes' })}
            onPress={() => router.push({ pathname: '/(tabs)/explore/island/transportation', params: { islandId: '1' } })}
            style={{ marginRight: 6 }}
          />
          <GridCard
            icon="calendar"
            color="#F59E0B"
            accentLight="#FEF3C7"
            title={t('common.events', { defaultValue: 'Etkinlikler' })}
            subtitle={t('common.islandEvents', { defaultValue: 'Discover events' })}
            onPress={() => router.push('/(tabs)/explore/island/events')}
            style={{ marginLeft: 6 }}
          />
        </View>
        <MenuCard
          icon="sparkles"
          color="#EC4899"
          accentLight="#FDF2F8"
          title={t('common.adaAI', { defaultValue: 'Tur Rehberi' })}
          subtitle={t('common.yourSmartGuide', { defaultValue: 'Adalar için akıllı seyahat asistanın' })}
          onPress={() => router.push('/guide')}
        />
        <MenuCard
          icon="bubble.left.and.bubble.right.fill"
          colors={['#8E2DE2', '#4A00E0', '#FF0080', '#FF8C00']}
          title={t('common.agoraForum', { defaultValue: 'Topluluk' })}
          subtitle={t('common.shareExperiences', { defaultValue: 'Diğer gezginlerle deneyimlerini paylaş' })}
          onPress={() => router.push('/signup')}
        />
      </View>
    </View>
  );
}

function MenuCard({ icon, color, accentLight, title, subtitle, onPress, style, colors }: {
  icon: string;
  color?: string;
  accentLight?: string;
  title: string;
  subtitle: string;
  onPress?: () => void;
  style?: any;
  colors?: any;
}) {
  const content = (
    <>
      <View style={[styles.iconContainer, { backgroundColor: colors ? 'rgba(255,255,255,0.2)' : accentLight }]}>
        <IconSymbol name={icon as any} size={28} color={colors ? '#fff' : color!} />
      </View>
      <View style={styles.cardContent}>
        <Text style={[styles.cardTitle, colors && { color: '#fff' }]}>{title}</Text>
        <Text style={[styles.cardSubtitle, colors && { color: 'rgba(255,255,255,0.85)' }]}>{subtitle}</Text>
      </View>
      <IconSymbol name={"chevron.right" as any} size={20} color={colors ? '#fff' : "#C0C0C0"} />
    </>
  );

  if (colors) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={style}>
        <LinearGradient
          colors={colors}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={styles.card}
        >
          {content}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={[styles.card, style]} onPress={onPress} activeOpacity={0.7}>
      {content}
    </TouchableOpacity>
  );
}

function GridCard({ icon, color, accentLight, title, subtitle, onPress, style }: {
  icon: string;
  color: string;
  accentLight: string;
  title: string;
  subtitle: string;
  onPress?: () => void;
  style?: any;
}) {
  return (
    <TouchableOpacity style={[styles.gridCard, style]} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.gridIconContainer, { backgroundColor: accentLight }]}>
        <IconSymbol name={icon as any} size={24} color={color} />
      </View>
      <Text style={styles.gridCardTitle} numberOfLines={1} adjustsFontSizeToFit>{title}</Text>
      <Text style={styles.gridCardSubtitle} numberOfLines={2}>{subtitle}</Text>
    </TouchableOpacity>
  );
}

function QuickInfoChip({ icon, iconColor, label, value }: {
  icon: string;
  iconColor: string;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.quickInfoChip}>
      <IconSymbol name={icon as any} size={16} color={iconColor} />
      <Text style={styles.quickInfoLabel}>{label}</Text>
      <Text style={styles.quickInfoValue}>{value}</Text>
    </View>
  );
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  heroWrapper: {
    height: SCREEN_HEIGHT * 0.33,
    width: '100%',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
  },
  paginationUnderHero: {
    height: 30,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    marginTop: -10, // Pull it slightly up towards the image
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#CBD5E1', // Darker gray for white bg
  },
  activeDot: {
    width: 20,
    backgroundColor: '#3B82F6', // Theme color instead of white
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
    paddingBottom: 32,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '500',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  body: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 0,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0D1B2A',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 10,
    borderColor: '#f0f0f0',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0D1B2A',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#778DA9',
    lineHeight: 18,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  gridCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    borderColor: '#f0f0f0',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  gridCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0D1B2A',
    marginBottom: 2,
    textAlign: 'center',
  },
  gridCardSubtitle: {
    fontSize: 11,
    color: '#778DA9',
    textAlign: 'center',
    lineHeight: 14,
  },
  quickInfoSection: {
    marginBottom: 10,
    paddingTop: 8,
    paddingBottom: 4,
    backgroundColor: 'transparent',
  },
  quickInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickInfoChip: {
    alignItems: 'center',
    flex: 1,
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
});
