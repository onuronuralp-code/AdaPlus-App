import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import React, { useState, useEffect, useCallback } from 'react';
import { ImageBackground, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View, Dimensions, ScrollView, NativeScrollEvent, NativeSyntheticEvent, ActivityIndicator, Modal, Animated, TouchableWithoutFeedback, Alert, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTranslation } from 'react-i18next';
import { fetchActivities, fetchListings } from '@/services/api';
import { resolveImageUrl } from '@/services/config';
import { useAuth } from '@/context/AuthContext';



export default function MainMenuScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [selectedIsland, setSelectedIsland] = useState("Büyükada");
  const isSmallScreen = height < 700;
  const isLargeScreen = height > 900;
  const [showIslandPicker, setShowIslandPicker] = useState(false);
  const { user, isLoggedIn } = useAuth();

  const [heroSlides, setHeroSlides] = useState<any[]>([]);
  const [showSurvey, setShowSurvey] = useState(false);
  const [surveyOptions, setSurveyOptions] = useState<string[]>([]);
  const [surveyOtherText, setSurveyOtherText] = useState('');
  const [surveySubmitted, setSurveySubmitted] = useState(false);

  useFocusEffect(
    useCallback(() => {
      Promise.all([fetchActivities(), fetchListings()]).then(([eventsData, listingsData]) => {
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
    title: t('common.readyForAdventure'),
    subtitle: t('common.exploreServices'),
    imageUrl: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800&auto=format&fit=crop&q=80'
  };

  const slidesToRender = heroSlides.length > 0 ? heroSlides : [defaultSlide];

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / (width - 16));
    setActiveIndex(index);
  };
  const heroHeight = 220;

  return (
    <View style={styles.container}>
      <View style={[styles.welcomeContainer, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: insets.top + 16, paddingHorizontal: 20 }, isSmallScreen && { marginBottom: 12, marginTop: 4 }]}>
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text style={[styles.welcomeGreeting, isLargeScreen && { fontSize: 26 }]}>
            {isLoggedIn && user
              ? t('common.welcomeGreetingUser', { name: user.fullName.split(' ')[0] })
              : t('common.welcomeGreeting')}
          </Text>
          <Text style={[styles.welcomeSubtitle, isLargeScreen && { fontSize: 15 }]}>
            {t('common.welcomeSubtitle')}
          </Text>
        </View>
      </View>

      {/* Hero Header Slider Wrapper */}
      <View style={[styles.heroWrapper, { height: heroHeight }]}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          snapToInterval={width - 8}
          decelerationRate="fast"
          bounces={true}
          contentContainerStyle={{ paddingHorizontal: 4 }}
          onMomentumScrollEnd={(e) => {
            const scrollPosition = e.nativeEvent.contentOffset.x;
            const index = Math.round(scrollPosition / (width - 8));
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
              <View style={[styles.heroImage, { width: width - 16, marginHorizontal: 4, borderRadius: 20, overflow: 'hidden' }]}>
                <ImageBackground 
                    source={{ uri: slide.imageUrl }} 
                    style={{ flex: 1 }}
                    imageStyle={{ resizeMode: 'cover', borderRadius: 24 }}
                >
                  <LinearGradient
                    colors={['transparent', 'rgba(27,27,47,0.8)', '#1B1B2F']}
                    style={styles.heroGradient}
                  >
                    <View style={{ position: 'absolute', bottom: 24, left: 24, right: 24 }}>
                      <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 4 }}>{slide.title}</Text>
                      <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }} numberOfLines={2}>{slide.subtitle}</Text>
                    </View>
                  </LinearGradient>
                </ImageBackground>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Top bar (Fixed over the slider) */}
        <View pointerEvents="box-none" style={[styles.topBar, { paddingTop: insets.top + 8 }]} />
      </View>

      {/* Body Content — scrollable on short screens, fills naturally on tall screens */}
      <Animated.ScrollView
        style={[styles.body, { transform: [{ translateY: slideAnim }] }]}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: Math.max(insets.bottom, 12) + 16 }}
        showsVerticalScrollIndicator={false}
        bounces={false}
        scrollEnabled={true}
      >
        {/* Pagination Dots */}
        <View style={[styles.paginationUnderHero, isSmallScreen && { height: 14, marginBottom: 4 }]}>
          {slidesToRender.map((_, index) => (
            <View
              key={index}
              style={[styles.dot, activeIndex === index ? styles.activeDot : null]}
            />
          ))}
        </View>

        {/* Services Section */}
        <View style={styles.servicesSection}>

          <View style={[styles.sectionHeader, isSmallScreen && { marginBottom: 10 }]}>
            <View style={styles.sectionTitleRow}>
              <IconSymbol name="safari.fill" size={isLargeScreen ? 24 : 20} color="#EA580C" />
              <Text style={[styles.sectionTitle, isLargeScreen && { fontSize: 20 }]}>
                {t('common.servicesAndActivities')}
              </Text>
            </View>
          </View>
          <View style={[styles.cardsContainer, { gap: 10 }]}>
            <View style={styles.gridRow}>
              <GridCard
                icon="tag.fill"
                colors={['#3B82F6', '#2563EB']}
                title={t('common.ilanlar')}
                subtitle={t('common.ilanlarSubtitle')}
                onPress={() => router.push('/(tabs)/explore/island/ilanlar')}
                style={{ marginRight: 4 }}
                large={isLargeScreen}
              />
              <GridCard
                icon="ticket.fill"
                colors={['#F59E0B', '#D97706']}
                title={t('common.events')}
                subtitle={t('common.islandEvents')}
                onPress={() => router.push('/(tabs)/explore/island/events')}
                style={{ marginLeft: 4 }}
                large={isLargeScreen}
              />
            </View>
            <View style={styles.gridRow}>
              <GridCard
                icon="safari.fill"
                colors={['#EC4899', '#BE185D']}
                title={t('common.adaAI')}
                subtitle={t('common.yourSmartGuide')}
                onPress={() => router.push('/guide')}
                style={{ marginRight: 4 }}
                large={isLargeScreen}
              />
              <GridCard
                icon="bag.fill"
                colors={['#8B5CF6', '#6D28D9']}
                title={t('common.delivery', { defaultValue: i18n.language.startsWith('en') ? 'Delivery' : 'Paket Servis' })}
                subtitle={t('common.comingSoon', { defaultValue: i18n.language.startsWith('en') ? 'Coming Soon' : 'Yakında' })}
                onPress={() => {
                  setSurveySubmitted(false);
                  setSurveyOptions([]);
                  setSurveyOtherText('');
                  setShowSurvey(true);
                }}
                style={{ marginLeft: 4, opacity: 0.8 }}
                large={isLargeScreen}
              />
            </View>
            <TouchableOpacity 
              style={{
                backgroundColor: '#F0FDF4',
                borderRadius: 20,
                padding: 16,
                flexDirection: 'row',
                alignItems: 'center',
                marginTop: 2
              }}
              onPress={() => router.push('/(tabs)/explore/island/forum')}
              activeOpacity={0.8}
            >
              <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: '#D1FAE5', alignItems: 'center', justifyContent: 'center' }}>
                <IconSymbol name="bubble.left.and.bubble.right.fill" size={24} color="#059669" />
              </View>
              <View style={{ flex: 1, marginLeft: 12, paddingRight: 8 }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#059669', marginBottom: 2 }}>
                  {t('common.community')}
                </Text>
                <Text style={{ fontSize: 11, color: '#4B5563', lineHeight: 15 }}>
                  {t('common.shareExperiences', { defaultValue: i18n.language.startsWith('en') ? 'Stay updated on the island agenda, express your opinion, transform the island.' : 'Ada gündemine hakim ol, fikrini ifade et, adayı dönüştür.' })}
                </Text>
              </View>
              <View style={{ backgroundColor: '#059669', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: 'bold', marginRight: 4 }}>Join Now</Text>
                <IconSymbol name="arrow.right" size={14} color="#fff" />
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.ScrollView>

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
                  {i18n.language.startsWith('en') ? 'Your feedback has been received. We are working hard to bring delivery services to the islands.' : 'Görüşleriniz alındı. Adalara paket servis hizmetini getirmek için var gücümüzle çalışıyoruz.'}
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
                  {i18n.language.startsWith('en') ? 'Delivery Service' : 'Paket Servis'}
                </Text>
                <Text style={{ fontSize: 15, color: '#64748B', textAlign: 'center', lineHeight: 22, marginBottom: 28 }}>
                  {i18n.language.startsWith('en') ? 'What kind of delivery service would you use most on the island?' : 'Adada en çok hangi paket servis hizmetine ihtiyaç duyuyorsunuz?'}
                </Text>
                
                <ScrollView style={{ width: '100%', maxHeight: 300, marginBottom: 10 }} showsVerticalScrollIndicator={false}>
                  {[
                    i18n.language.startsWith('en') ? 'Food & Restaurant' : 'Yemek & Restoran', 
                    i18n.language.startsWith('en') ? 'Market & Grocery' : 'Market & Bakkal', 
                    i18n.language.startsWith('en') ? 'Water & Gas' : 'Su & Tüp', 
                    i18n.language.startsWith('en') ? 'Pharmacy' : 'Eczane',
                    i18n.language.startsWith('en') ? 'Cargo' : 'Kargo'
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
                  {(surveyOptions.includes('Kargo') || surveyOptions.includes('Cargo')) && (
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
                  onPress={() => setSurveySubmitted(true)}
                  disabled={surveyOptions.length === 0}
                >
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>
                    {i18n.language.startsWith('en') ? 'Submit' : 'Gönder'}
                  </Text>
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

function GridCard({ icon, title, subtitle, onPress, style, colors, large }: any) {
  const primaryColor = colors ? colors[0] : '#3B82F6';

  const content = (
    <View style={{ flex: 1, padding: 10, width: '100%', justifyContent: 'space-between' }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: `${primaryColor}15`, alignItems: 'center', justifyContent: 'center' }}>
          <IconSymbol name={icon as any} size={20} color={primaryColor} />
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={{ fontSize: 13, fontWeight: '800', color: primaryColor, marginBottom: 1 }}>{title}</Text>
          <Text style={{ fontSize: 11, color: '#64748B', lineHeight: 14 }}>{subtitle}</Text>
        </View>
      </View>
      <View style={{ alignSelf: 'flex-end', marginTop: 8, width: 24, height: 24, borderRadius: 12, backgroundColor: `${primaryColor}10`, alignItems: 'center', justifyContent: 'center' }}>
        <IconSymbol name="arrow.right" size={12} color={primaryColor} />
      </View>
    </View>
  );

  return (
    <TouchableOpacity 
      style={[
        styles.gridCard, 
        { backgroundColor: `${primaryColor}10`, padding: 0 },
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
    minHeight: 84,
    borderRadius: 20,
    padding: 10,
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
