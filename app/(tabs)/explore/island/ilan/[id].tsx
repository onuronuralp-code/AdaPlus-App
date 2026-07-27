import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  Share,
  Linking,
  Alert,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { LinearGradient } from 'expo-linear-gradient';
import * as listingApi from '@/services/listingApi';
import { ListingDto, ListingCategory } from '@/services/listingApi';
import { formatDistanceToNowStrict } from 'date-fns';
import { tr, enUS } from 'date-fns/locale';
import i18n from '@/utils/i18n';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context/ThemeContext';
import { resolveImageUrl } from '@/services/config';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const isIphone16 = Platform.OS === 'ios' && SCREEN_HEIGHT >= 852;

type IlanCategory = 'all' | 'emlak' | 'service' | 'lost' | 'job' | 'esya' | 'tasit' | 'pet';

const CATEGORY_CONFIG: Record<IlanCategory, { label: string; icon: string; color: string; bg: string }> = {
  all:     { label: 'TÜMÜ',      icon: 'square.grid.2x2.fill', color: '#3B82F6', bg: '#EFF6FF' },
  emlak:   { label: 'EMLAK',     icon: 'house.fill',           color: '#10B981', bg: '#D1FAE5' },
  esya:    { label: 'EŞYA',      icon: 'archivebox.fill',      color: '#F59E0B', bg: '#FEF3C7' },
  tasit:   { label: 'TAŞIT',     icon: 'car.fill',             color: '#EC4899', bg: '#FCE7F3' },
  service: { label: 'HİZMET',    icon: 'wrench.and.screwdriver.fill', color: '#8B5CF6', bg: '#F5F3FF' },
  job:     { label: 'İŞ İLANI',  icon: 'briefcase.fill',       color: '#6366F1', bg: '#EEF2FF' },
  lost:    { label: 'KAYIP',     icon: 'exclamationmark.triangle.fill', color: '#EF4444', bg: '#FEF2F2' },
  pet:     { label: 'EVCİL HAYVAN', icon: 'cat.fill',          color: '#F43F5E', bg: '#FFE4E6' },
};

export default function IlanDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  const [listing, setListing] = React.useState<ListingDto | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState(false);
  const [loadingContact, setLoadingContact] = React.useState(false);
  const [activeSlide, setActiveSlide] = React.useState(0);

  React.useEffect(() => {
    if (id) {
      listingApi.getListing(id as string)
        .then(data => setListing(data))
        .catch(() => setLoadError(true))
        .finally(() => setIsLoading(false));
    }
  }, [id]);
  
  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (!listing) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, alignItems: 'center', justifyContent: 'center', padding: 20 }]}>
        <IconSymbol name="exclamationmark.triangle.fill" size={64} color="#CBD5E1" />
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#1E293B', marginTop: 16 }}>
          {loadError ? 'Bağlantı hatası.' : 'İlan bulunamadı.'}
        </Text>
        <Text style={{ fontSize: 14, color: '#94A3B8', textAlign: 'center', marginTop: 8 }}>
          {loadError
            ? 'İlan yüklenirken bir sorun oluştu. Lütfen tekrar deneyin.'
            : 'Aradığınız ilan silinmiş veya yayından kaldırılmış olabilir.'}
        </Text>
        <TouchableOpacity
          onPress={() => loadError
            ? listingApi.getListing(id as string).then(d => d && (setListing(d), setLoadError(false))).catch(() => {})
            : (router.canGoBack() ? router.back() : router.replace('/(tabs)/explore/island/ilanlar'))}
          style={{ marginTop: 24, backgroundColor: '#F1F5F9', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 }}
        >
          <Text style={{ color: '#3B82F6', fontWeight: '700' }}>{loadError ? 'Tekrar Dene' : 'Geri Dön'}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const backendToFrontend: Record<ListingCategory, IlanCategory> = {
    [ListingCategory.SATILIK]: 'emlak',
    [ListingCategory.KIRALIK]: 'emlak',
    [ListingCategory.HIZMET]: 'service',
    [ListingCategory.IS_ILANI]: 'job',
    [ListingCategory.ESYA]: 'esya',
    [ListingCategory.TASIT]: 'tasit',
    [ListingCategory.KAYIP]: 'lost',
    [ListingCategory.EVCIL_HAYVAN]: 'pet',
  };
  
  const frontendCat = backendToFrontend[listing.category] || 'emlak';
  const cfg = CATEGORY_CONFIG[frontendCat];

  const timeAgo = formatDistanceToNowStrict(new Date(listing.createdAt), { 
    addSuffix: true, 
    locale: i18n.language.startsWith('tr') ? tr : enUS 
  });

  return (
    <View style={[styles.container, isDark && { backgroundColor: '#000000' }]}>
      {/* Header Overlay */}
      <View style={[styles.headerActions, { top: insets.top + 10 }]}>
        <TouchableOpacity style={[styles.iconButton, isDark && { backgroundColor: 'rgba(0, 0, 0, 0.35)' }]} onPress={() => {
          if (router.canGoBack()) router.back();
          else router.replace('/(tabs)/explore/island/ilanlar');
        }}>
          <IconSymbol name="chevron.left" size={28} color={isDark ? "#FFFFFF" : "#1E293B"} />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.iconButton, isDark && { backgroundColor: 'rgba(0, 0, 0, 0.35)' }]} onPress={async () => {
          try {
            await Share.share({
              message: `${listing.title}\n\n${listing.description}\n\nAdaPlus'ta incele!`,
            });
          } catch (error) {
            console.log('Share error:', error);
          }
        }}>
          <IconSymbol name="square.and.arrow.up" size={24} color={isDark ? "#FFFFFF" : "#1E293B"} />
        </TouchableOpacity>
      </View>

      {/* Hero Section / Image Placeholder (Fixed) */}
      <View style={[styles.imagePlaceholder, isDark && { backgroundColor: '#121212' }]}>
        <LinearGradient
          colors={isDark ? ['#1C1C1E', '#000000'] : [cfg.bg, '#fff']}
          style={StyleSheet.absoluteFill}
        />
        {listing.imageUrls && listing.imageUrls.length > 0 ? (
          <>
            <ScrollView 
              horizontal 
              pagingEnabled 
              showsHorizontalScrollIndicator={false} 
              style={StyleSheet.absoluteFill}
              onMomentumScrollEnd={(e) => {
                const page = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                setActiveSlide(page);
              }}
            >
              {listing.imageUrls.map((url, idx) => (
                <Image key={idx} source={{ uri: resolveImageUrl(url) }} style={{ width: SCREEN_WIDTH, height: '100%', backgroundColor: isDark ? '#121212' : '#F8FAFC' }} resizeMode="cover" />
              ))}
            </ScrollView>
            
            {listing.imageUrls.length > 1 && (
              <View style={styles.paginationContainer}>
                {listing.imageUrls.map((_, idx) => (
                  <View key={idx} style={[styles.dot, activeSlide === idx && styles.activeDot]} />
                ))}
              </View>
            )}
          </>
        ) : listing.imageUrl ? (
          <Image source={{ uri: resolveImageUrl(listing.imageUrl) }} style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? '#121212' : '#F8FAFC' }]} resizeMode="cover" />
        ) : (
          <IconSymbol name={cfg.icon as any} size={80} color={cfg.color} />
        )}
      </View>

      <ScrollView style={{ flex: 1, marginTop: 0 }} showsVerticalScrollIndicator={false} bounces={true} contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>
        <View style={[styles.content, { marginTop: 0 }, isDark && { backgroundColor: '#000000' }]}>
          <View style={styles.categoryRow}>
            <View style={[styles.categoryBadge, { backgroundColor: isDark ? '#1C1C1E' : cfg.bg }]}>
              <Text style={[styles.categoryBadgeText, { color: cfg.color }]}>{t(`ilanlar.category.${frontendCat}`, { defaultValue: cfg.label })}</Text>
            </View>
            <Text style={[styles.timeText, isDark && { color: '#94A3B8' }]}>{timeAgo}</Text>
          </View>

          <Text style={[styles.title, isDark && { color: '#FFFFFF' }]}>{listing.title}</Text>
          {listing.price > 0 && (
            <View style={{ alignSelf: 'flex-start', backgroundColor: '#10B981', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginTop: 8 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFFFFF' }}>{listing.price.toLocaleString('tr-TR')} ₺</Text>
            </View>
          )}

          <View style={[styles.divider, isDark && { backgroundColor: '#1C1C1E' }]} />

          <Text style={[styles.sectionTitle, isDark && { color: '#FFFFFF' }]}>{t('ilanlar.descriptionLabel', { defaultValue: 'Açıklama' })}</Text>
          <Text style={[styles.description, isDark && { color: '#CBD5E1' }]}>{listing.description}</Text>

          <View style={[styles.divider, isDark && { backgroundColor: '#1C1C1E' }]} />

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <View style={[styles.infoIcon, isDark && { backgroundColor: '#1C1C1E' }]}>
                <IconSymbol name="mappin.and.ellipse" size={16} color={isDark ? "#94A3B8" : "#64748B"} />
              </View>
              <View>
                <Text style={[styles.infoLabel, isDark && { color: '#94A3B8' }]}>{t('ilanlar.locationLabel', { defaultValue: 'KONUM' })}</Text>
                <Text style={[styles.infoValue, isDark && { color: '#F8FAFC' }]}>{listing.island}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.infoItem}
              activeOpacity={listing.contactInfo ? 0.6 : 1}
              onPress={() => {
                if (!listing.contactInfo) return;
                
                const contact = listing.contactInfo.trim();
                const isEmail = contact.includes('@');
                const isPhone = /^\+?[0-9\s\-().]{7,20}$/.test(contact);

                if (isEmail) {
                  Linking.openURL(`mailto:${contact}`).catch(() => {
                    Alert.alert('Hata', 'E-posta uygulaması açılamadı.');
                  });
                } else if (isPhone) {
                  Linking.openURL(`tel:${contact.replace(/[^\d+]/g, '')}`).catch(() => {
                    Alert.alert('Arama Yapılamadı', `Bu cihazda arama desteklenmiyor olabilir (simülatör veya tablet vb.).\n\nNumara: ${contact}`);
                  });
                } else {
                  // Fallback: try tel anyway
                  Linking.openURL(`tel:${contact.replace(/[^\d+]/g, '')}`).catch(() => {});
                }
              }}
            >
              <View style={[styles.infoIcon, isDark ? { backgroundColor: '#064E3B' } : (listing.contactInfo && { backgroundColor: '#ECFDF5' })]}>
                <IconSymbol 
                  name={listing.contactInfo?.includes('@') ? "envelope.fill" : "phone.fill"} 
                  size={16} 
                  color={listing.contactInfo ? (isDark ? '#34D399' : '#10B981') : '#64748B'} 
                />
              </View>
              <View>
                <Text style={[styles.infoLabel, isDark && { color: '#94A3B8' }]}>{t('ilanlar.contactLabel', { defaultValue: 'İLETİŞİM' })}</Text>
                <Text style={[styles.infoValue, listing.contactInfo && { color: isDark ? '#34D399' : '#10B981' }, isDark && !listing.contactInfo && { color: '#CBD5E1' }]}>
                  {listing.contactInfo || t('ilanlar.notShared', { defaultValue: 'Paylaşılmamış' })}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Safety Warning */}
          <View style={[styles.warningCard, isDark && { backgroundColor: '#1C1C1E', borderColor: '#2C2C2E' }]}>
            <IconSymbol name="exclamationmark.triangle.fill" size={20} color="#F59E0B" />
            <Text style={[styles.warningText, isDark && { color: '#CBD5E1' }]}>
              {t('ilanlar.safetyWarning', { defaultValue: 'Güvenliğiniz için ödemelerinizi yüz yüze yapmanızı ve ürünü görmeden kapora göndermemenizi öneririz. Oluşabilecek mağduriyetler AdaPlus sorumluluk alanının dışındadır.' })}
            </Text>
          </View>
        </View>
      </ScrollView>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerActions: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
  },
  imagePlaceholder: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 0.78,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 24,
    marginTop: 0,
    backgroundColor: '#fff',
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  timeText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  priceValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#10B981',
    flexShrink: 1,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
  },
  infoGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  infoItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoLabel: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '600',
  },
  warningCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFBEB',
    padding: 16,
    borderRadius: 14,
    marginTop: 16,
    gap: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
    fontWeight: '500',
  },
  paginationContainer: {
    position: 'absolute',
    bottom: 16,
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  activeDot: {
    backgroundColor: '#fff',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
