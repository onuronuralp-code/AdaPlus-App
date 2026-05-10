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
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { LinearGradient } from 'expo-linear-gradient';
import * as listingApi from '@/services/listingApi';
import { ListingDto, ListingCategory } from '@/services/listingApi';
import { formatDistanceToNow } from 'date-fns';
import { tr, enUS } from 'date-fns/locale';
import i18n from '@/utils/i18n';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type IlanCategory = 'all' | 'emlak' | 'service' | 'lost' | 'job';

const CATEGORY_CONFIG: Record<IlanCategory, { label: string; icon: string; color: string; bg: string }> = {
  all:     { label: 'Tümü',      icon: 'square.grid.2x2.fill', color: '#3B82F6', bg: '#EFF6FF' },
  emlak:   { label: 'Emlak',     icon: 'house.fill',           color: '#10B981', bg: '#ECFDF5' },
  service: { label: 'Hizmet',    icon: 'wrench.and.screwdriver.fill', color: '#8B5CF6', bg: '#F5F3FF' },
  job:     { label: 'İş İlanı',  icon: 'briefcase.fill',       color: '#6366F1', bg: '#EEF2FF' },
  lost:    { label: 'Kayıp',     icon: 'exclamationmark.triangle.fill', color: '#EF4444', bg: '#FEF2F2' },
};

export default function IlanDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [listing, setListing] = React.useState<ListingDto | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (id) {
      listingApi.getListing(id as string).then(data => {
        setListing(data);
        setIsLoading(false);
      });
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
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#1E293B', marginTop: 16 }}>İlan bulunamadı.</Text>
        <Text style={{ fontSize: 14, color: '#94A3B8', textAlign: 'center', marginTop: 8 }}>
          Aradığınız ilan silinmiş veya yayından kaldırılmış olabilir.
        </Text>
        <TouchableOpacity 
          onPress={() => router.navigate('/(tabs)/explore/island/ilanlar')}
          style={{ marginTop: 24, backgroundColor: '#F1F5F9', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 }}
        >
          <Text style={{ color: '#3B82F6', fontWeight: '700' }}>Geri Dön</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const backendToFrontend: Record<ListingCategory, IlanCategory> = {
    [ListingCategory.SATILIK]: 'emlak',
    [ListingCategory.KIRALIK]: 'emlak',
    [ListingCategory.HIZMET]: 'service',
    [ListingCategory.IS_ILANI]: 'job',
    [ListingCategory.KAYIP]: 'lost',
  };
  
  const frontendCat = backendToFrontend[listing.category] || 'emlak';
  const cfg = CATEGORY_CONFIG[frontendCat];

  const timeAgo = formatDistanceToNow(new Date(listing.createdAt), { 
    addSuffix: true, 
    locale: i18n.language.startsWith('tr') ? tr : enUS 
  });

  return (
    <View style={styles.container}>
      {/* Header Overlay */}
      <View style={[styles.headerActions, { top: insets.top + 10 }]}>
        <TouchableOpacity style={styles.iconButton} onPress={() => router.navigate('/(tabs)/explore/island/ilanlar')}>
          <IconSymbol name="chevron.left" size={24} color="#1E293B" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton}>
          <IconSymbol name="square.and.arrow.up" size={22} color="#1E293B" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>
        {/* Hero Section / Image Placeholder */}
        <View style={styles.imagePlaceholder}>
          <LinearGradient
            colors={[cfg.bg, '#fff']}
            style={StyleSheet.absoluteFill}
          />
          {listing.imageUrl ? (
            <Image source={{ uri: listing.imageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : (
            <IconSymbol name={cfg.icon as any} size={80} color={cfg.color} />
          )}
        </View>

        <View style={styles.content}>
          <View style={styles.categoryRow}>
            <View style={[styles.categoryBadge, { backgroundColor: cfg.bg }]}>
              <Text style={[styles.categoryBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
            <Text style={styles.timeText}>{timeAgo}</Text>
          </View>

          <Text style={styles.title}>{listing.title}</Text>
          
          {listing.price > 0 && (
            <View style={styles.priceContainer}>
              <Text style={styles.priceLabel}>Fiyat</Text>
              <Text style={styles.priceValue}>{listing.price} ₺</Text>
              {listing.priceLabel && <Text style={{ fontSize: 14, color: '#94A3B8', marginLeft: 4 }}>{listing.priceLabel}</Text>}
            </View>
          )}

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Açıklama</Text>
          <Text style={styles.description}>{listing.description}</Text>

          <View style={styles.divider} />

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <View style={styles.infoIcon}>
                <IconSymbol name="mappin.and.ellipse" size={20} color="#64748B" />
              </View>
              <View>
                <Text style={styles.infoLabel}>Konum</Text>
                <Text style={styles.infoValue}>{listing.island}</Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <View style={styles.infoIcon}>
                <IconSymbol name="phone.fill" size={20} color="#64748B" />
              </View>
              <View>
                <Text style={styles.infoLabel}>İletişim</Text>
                <Text style={styles.infoValue}>{listing.contactInfo || 'Paylaşılmamış'}</Text>
              </View>
            </View>
          </View>

          {/* Safety Warning */}
          <View style={styles.warningCard}>
            <IconSymbol name="shield.fill" size={20} color="#F59E0B" />
            <Text style={styles.warningText}>
              Güvenliğiniz için ödemelerinizi yüz yüze yapmanızı ve ürünü görmeden kapora göndermemenizi öneririz.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom Actions */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 10 }]}>
        <TouchableOpacity style={styles.messageButton}>
          <IconSymbol name="bubble.left.fill" size={20} color="#fff" />
          <Text style={styles.messageButtonText}>Mesaj Gönder</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.callButton}>
          <IconSymbol name="phone.fill" size={20} color="#3B82F6" />
        </TouchableOpacity>
      </View>
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
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  imagePlaceholder: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 0.8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 24,
    marginTop: -20,
    backgroundColor: '#fff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
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
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  timeText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
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
    fontSize: 28,
    fontWeight: '900',
    color: '#10B981',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#475569',
    lineHeight: 26,
  },
  infoGrid: {
    gap: 20,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  infoIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoLabel: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '700',
  },
  warningCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFBEB',
    padding: 16,
    borderRadius: 20,
    marginTop: 32,
    gap: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    lineHeight: 20,
    fontWeight: '500',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 16,
    flexDirection: 'row',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  messageButton: {
    flex: 1,
    height: 56,
    backgroundColor: '#3B82F6',
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  messageButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  callButton: {
    width: 56,
    height: 56,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
