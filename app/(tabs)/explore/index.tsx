import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { fetchActivities } from '@/services/api';
import { ImageBackground, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View, Dimensions, ScrollView, NativeScrollEvent, NativeSyntheticEvent, ActivityIndicator, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import i18n from '@/utils/i18n';
import { useTranslation } from 'react-i18next';
import { useWeather } from '@/hooks/useWeather';


export default function MainMenuScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { weather, loading: weatherLoading } = useWeather();
  const [selectedIsland, setSelectedIsland] = useState("Büyükada");
  const [showIslandPicker, setShowIslandPicker] = useState(false);

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

        {/* Top bar (Fixed over the slider) */}
        <View pointerEvents="box-none" style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
           {/* Header buttons removed from here */}
        </View>
      </View>

      {/* Body Scrollable Content */}
      <ScrollView 
        style={styles.body} 
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Pagination Dots */}
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

        {/* Services Section */}
        <View style={styles.servicesSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <IconSymbol name="safari.fill" size={20} color="#EA580C" />
              <Text style={styles.sectionTitle}>
                {t('common.servicesAndActivities', { defaultValue: i18n.language.startsWith('tr') ? 'Servisler ve Aktiviteler' : 'Services and Activities' })}
              </Text>
            </View>
            {/* Language Toggle instead of Weather */}
            <TouchableOpacity 
              style={styles.headerLangBtn} 
              onPress={() => {
                const nextLang = i18n.language.startsWith('en') ? 'tr' : 'en';
                i18n.changeLanguage(nextLang);
              }}
            >
              <View style={styles.langIconBox}>
                <IconSymbol name="globe" size={14} color="#0D1B2A" />
              </View>
              <Text style={styles.langValue}>{t('common.currentLang').toUpperCase()}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.cardsContainer}>
            <View style={styles.gridRow}>
              <GridCard
                icon="megaphone.fill"
                color="#3B82F6"
                accentLight="#DBEAFE"
                title={t('common.ilanlar', { defaultValue: 'İlanlar' })}
                subtitle={t('common.ilanlarSubtitle', { defaultValue: 'İş, Emlak, Hizmet' })}
                onPress={() => router.push('/(tabs)/explore/island/ilanlar')}
                style={{ marginRight: 6 }}
              />
              <GridCard
                icon="calendar"
                color="#F59E0B"
                accentLight="#FEF3C7"
                title={t('common.events', { defaultValue: 'Etkinlikler' })}
                subtitle={t('common.islandEvents', { defaultValue: 'Etkinlikleri keşfet' })}
                onPress={() => router.push('/(tabs)/explore/island/events')}
                style={{ marginLeft: 6 }}
              />
            </View>
            <MenuCard
              icon="sparkles"
              color="#EC4899"
              accentLight="#FDF2F8"
              title={t('common.adaAI', { defaultValue: 'Ada AI - Tur Rehberi' })}
              subtitle={t('common.yourSmartGuide', { defaultValue: 'Adalar için akıllı rehberin' })}
              onPress={() => router.push('/guide')}
            />
            <MenuCard
              icon="bubble.left.and.bubble.right.fill"
              colors={['#8E2DE2', '#4A00E0', '#FF0080', '#FF8C00']}
              title={t('common.agoraForum', { defaultValue: 'Agora Forum' })}
              subtitle={t('common.shareExperiences', { defaultValue: 'Toplulukla etkileşime geç' })}
              onPress={() => router.push('/(tabs)/explore/island/forum')}
            />

            {/* Compact Quick Info Ribbon with Labels */}
            <View style={styles.compactInfoRibbon}>
              <View style={styles.ribbonItem}>
                <IconSymbol name="sunset.fill" size={12} color="#FFD700" />
                <View style={styles.ribbonTextRow}>
                  <Text style={styles.ribbonLabel}>{t('common.sunset', { defaultValue: 'Batış' })}</Text>
                  <Text style={styles.ribbonValue}>{weather ? weather.sunset : '...'}</Text>
                </View>
              </View>
              <View style={styles.ribbonDivider} />
              <View style={styles.ribbonItem}>
                <IconSymbol name="thermometer.medium" size={12} color="#FF6B6B" />
                <View style={styles.ribbonTextRow}>
                  <Text style={styles.ribbonLabel}>{t('common.temp', { defaultValue: 'Sıcaklık' })}</Text>
                  <Text style={styles.weatherValue}>{weather ? `${weather.temperature}°C` : '...'}</Text>
                </View>
              </View>
              <View style={styles.ribbonDivider} />
              <View style={styles.ribbonItem}>
                <IconSymbol name="wind" size={12} color="#60A5FA" />
                <View style={styles.ribbonTextRow}>
                  <Text style={styles.ribbonLabel}>{t('common.wind', { defaultValue: 'Rüzgar' })}</Text>
                  <Text style={styles.weatherValue}>{weather ? `${weather.windSpeed} km/h` : '...'}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
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
      <Text style={styles.gridCardSubtitle} numberOfLines={1}>{subtitle}</Text>
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
    height: SCREEN_HEIGHT * 0.35,
    width: '100%',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
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
    paddingBottom: 40,
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
    backgroundColor: '#fff',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    marginTop: -30,
  },
  bodyContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 160, // Significantly increased to fully clear any translucent tab bar
  },
  servicesSection: {
    marginTop: 10,
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
    fontSize: 18,
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
  weatherValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginLeft: 4,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
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
    marginBottom: 12,
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
  compactInfoRibbon: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    marginTop: 4,
    marginBottom: 10,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  ribbonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
  },
  ribbonTextRow: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  ribbonLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
  ribbonValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  ribbonDivider: {
    width: 1,
    height: 14,
    backgroundColor: '#E2E8F0',
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
    justifyContent: 'flex-start',
    paddingBottom: 10,
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
