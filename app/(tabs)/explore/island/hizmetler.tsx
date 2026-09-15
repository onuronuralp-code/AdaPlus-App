import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Linking,
  Alert,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { IconSymbol } from '@/components/ui/icon-symbol';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTheme } from '@/context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { IslandDropdown } from '@/components/IslandDropdown';
import { fetchServiceProviders, ServiceProviderDto } from '@/services/serviceProviderApi';

export interface ServiceProvider {
  id: string;
  name: string;
  title: string;
  category: string; // matches category id
  categoryLabel: string;
  island: string;
  phone: string;
  whatsapp: string;
  rating: number;
  reviewCount: number;
  experienceYears: number;
  description: string;
  tags: string[];
  isVerified: boolean;
  avatarBg: string;
}

const ISLAND_LIST = ['Tümü', 'Kınalıada', 'Burgazada', 'Heybeliada', 'Büyükada'];

const CATEGORY_META: Record<string, { id: string; labelTr: string; labelEn: string; color: string }> = {
  REPAIR: { id: 'repair', labelTr: 'Tadilat & Tamirat', labelEn: 'Renovation & Repair', color: '#2563EB' },
  PAINTING: { id: 'painting', labelTr: 'Boya', labelEn: 'Painting', color: '#D97706' },
  LOCKSMITH: { id: 'locksmith', labelTr: 'Çilingir', labelEn: 'Locksmith', color: '#8B5CF6' },
  CLEANING: { id: 'cleaning', labelTr: 'Temizlik', labelEn: 'Cleaning', color: '#6366F1' },
  GARDEN: { id: 'gardener', labelTr: 'Bahçıvan', labelEn: 'Gardener', color: '#10B981' },
  TRANSPORT: { id: 'transport', labelTr: 'Ulaşım', labelEn: 'Transport', color: '#0891B2' },
  TUTORING: { id: 'tutoring', labelTr: 'Özel Ders', labelEn: 'Tutoring', color: '#EC4899' },
  PET: { id: 'pet', labelTr: 'Evcil Hayvan', labelEn: 'Pet Care', color: '#F59E0B' },
  OTHER: { id: 'other', labelTr: 'Diğer', labelEn: 'Other', color: '#64748B' },
};

const ISLAND_LABELS: Record<string, string> = {
  KINALIADA: 'Kınalıada',
  BURGAZADA: 'Burgazada',
  HEYBELIADA: 'Heybeliada',
  BUYUKADA: 'Büyükada',
};

const mapProvider = (dto: ServiceProviderDto, isEn: boolean): ServiceProvider => {
  const rawCategory = String(dto.category || 'OTHER').toUpperCase();
  const meta = CATEGORY_META[rawCategory] ?? CATEGORY_META.OTHER;
  const description = dto.description || dto.offeredServices || dto.experienceNotes || '';
  const derivedTags = dto.tags?.length
    ? dto.tags
    : description.split(/[,;•]/).map(value => value.trim()).filter(Boolean).slice(0, 3);

  return {
    id: String(dto.id),
    name: dto.fullName || dto.name || (isEn ? 'Service Provider' : 'Hizmet Sağlayıcı'),
    title: dto.title || dto.offeredServices || (isEn ? meta.labelEn : meta.labelTr),
    category: meta.id,
    categoryLabel: dto.categoryLabel || (isEn ? meta.labelEn : meta.labelTr),
    island: ISLAND_LABELS[String(dto.island || '').toUpperCase()] || String(dto.island || ''),
    phone: dto.phone || '',
    whatsapp: dto.whatsapp || (dto.phone || '').replace(/[^0-9]/g, ''),
    rating: Number(dto.rating || 0),
    reviewCount: Number(dto.reviewCount || 0),
    experienceYears: Number(dto.experienceYears || 0),
    description,
    tags: derivedTags,
    isVerified: dto.isVerified ?? String(dto.status || '').toUpperCase() === 'APPROVED',
    avatarBg: meta.color,
  };
};

export default function HizmetlerScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { i18n } = useTranslation();
  const params = useLocalSearchParams();

  // Normalize incoming category param
  const initialCategoryParam = typeof params.category === 'string' ? params.category.toLowerCase() : '';
  const initialCategory = useMemo(() => {
    if (!initialCategoryParam) return 'all';
    if (initialCategoryParam.includes('tadil') || initialCategoryParam.includes('tamir') || initialCategoryParam.includes('repair')) return 'repair';
    if (initialCategoryParam.includes('kuaf') || initialCategoryParam.includes('bakım') || initialCategoryParam.includes('beauty')) return 'beauty';
    if (initialCategoryParam.includes('boya') || initialCategoryParam.includes('paint')) return 'painting';
    if (initialCategoryParam.includes('inter') || initialCategoryParam.includes('uydu')) return 'internet';
    if (initialCategoryParam.includes('çiling') || initialCategoryParam.includes('kilit') || initialCategoryParam.includes('lock')) return 'locksmith';
    if (initialCategoryParam.includes('bahç') || initialCategoryParam.includes('garden')) return 'gardener';
    if (initialCategoryParam.includes('temiz') || initialCategoryParam.includes('clean')) return 'cleaning';
    return 'all';
  }, [initialCategoryParam]);

  const selectedCategory = initialCategory;
  const [selectedIsland, setSelectedIsland] = useState<string>(
    typeof params.island === 'string' && params.island ? params.island : 'Tümü'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const loadProviders = useCallback(async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const data = await fetchServiceProviders();
      setProviders(data.map(item => mapProvider(item, i18n.language.startsWith('en'))));
      setLoadError(false);
    } catch {
      setProviders([]);
      setLoadError(true);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [i18n.language]);

  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  const filteredProviders = useMemo(() => {
    return providers.filter((p) => {
      // Category filter
      if (selectedCategory !== 'all' && p.category !== selectedCategory) {
        return false;
      }
      // Island filter
      if (selectedIsland !== 'Tümü' && p.island !== selectedIsland) {
        return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesTitle = p.title.toLowerCase().includes(q);
        const matchesDesc = p.description.toLowerCase().includes(q);
        const matchesTags = p.tags.some(t => t.toLowerCase().includes(q));
        if (!matchesName && !matchesTitle && !matchesDesc && !matchesTags) {
          return false;
        }
      }
      return true;
    });
  }, [providers, selectedCategory, selectedIsland, searchQuery]);

  const handleCall = (phone: string, name: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert(
        i18n.language.startsWith('en') ? 'Could not open phone' : 'Telefon Açılamadı',
        i18n.language.startsWith('en') ? `Please dial ${phone}` : `Lütfen doğrudan arayın: ${phone}`
      );
    });
  };

  const handleWhatsApp = (wa: string, name: string, title: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const text = encodeURIComponent(
      i18n.language.startsWith('en')
        ? `Hello ${name}, I am contacting you through AdaPlus for your service: "${title}".`
        : `Merhaba ${name}, AdaPlus üzerinden "${title}" hizmetiniz için iletişime geçiyorum.`
    );
    Linking.openURL(`https://wa.me/${wa}?text=${text}`).catch(() => {
      Alert.alert(
        'WhatsApp',
        i18n.language.startsWith('en') ? 'WhatsApp is not installed.' : 'WhatsApp açılamadı.'
      );
    });
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }, isDark && styles.containerDark]} edges={['left', 'right']}>
      {/* Header */}
      <View style={[styles.header, isDark && styles.headerDark]}>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.backButton}
        >
          <IconSymbol name="chevron.left" size={24} color={isDark ? '#FFFFFF' : '#0F172A'} />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, isDark && styles.textWhite]}>
            {i18n.language.startsWith('en') ? 'Services' : 'Hizmetler'}
          </Text>
          <Text style={[styles.headerSubtitle, isDark && styles.textMuted]}>
            {i18n.language.startsWith('en') ? 'Island Local Craftsmen & Experts' : 'Adalı Yerel Ustalar & Uzmanlar'}
          </Text>
        </View>

        <IslandDropdown
          options={ISLAND_LIST.map(island => ({
            value: island,
            label: island === 'Tümü' && i18n.language.startsWith('en') ? 'All Islands' : island,
          }))}
          value={selectedIsland}
          onChange={setSelectedIsland}
          isDark={isDark}
          menuTop={insets.top + 70}
          compact
          triggerLabel={selectedIsland === 'Tümü' ? (i18n.language.startsWith('en') ? 'All' : 'Tümü') : undefined}
        />
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
          <View style={[styles.searchBar, isDark && styles.searchBarDark]}>
            <IconSymbol name="magnifyingglass" size={18} color={isDark ? '#94A3B8' : '#64748B'} />
            <TextInput
              style={[styles.searchInput, isDark && styles.textWhite]}
              placeholder={i18n.language.startsWith('en') ? 'Search service or expert...' : 'Hizmet veya uzman ara...'}
              placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
              value={searchQuery}
              onChangeText={setSearchQuery}
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && Platform.OS !== 'ios' && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <IconSymbol name="xmark.circle.fill" size={18} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>
      </View>

      {/* Provider List */}
      <ScrollView
        style={styles.listContainer}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 40 },
          (isLoading || filteredProviders.length === 0) && { flexGrow: 1 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={() => loadProviders(true)} tintColor="#2563EB" />
        }
      >
        <View style={styles.resultsHeader}>
          <Text style={[styles.resultsTitle, isDark && styles.textWhite]}>
            {i18n.language.startsWith('en') ? 'Recommended experts' : 'Önerilen uzmanlar'}
          </Text>
          <View style={[styles.resultCountBadge, isDark && { backgroundColor: '#1E3A8A' }]}>
            <Text style={styles.resultCountText}>{filteredProviders.length}</Text>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563EB" />
          </View>
        ) : filteredProviders.length === 0 ? (
          <View style={[styles.emptyContainer, isDark && styles.cardDark]}>
            <IconSymbol name={loadError ? 'wifi.exclamationmark' : 'magnifyingglass'} size={48} color={isDark ? '#64748B' : '#94A3B8'} />
            <Text style={[styles.emptyTitle, isDark && styles.textWhite]}>
              {i18n.language.startsWith('en') ? 'No service found' : 'Hizmet bulunamadı'}
            </Text>
            <Text style={[styles.emptySubtitle, isDark && styles.textMuted]}>
              {loadError
                ? (i18n.language.startsWith('en') ? 'Pull down to try again.' : 'Tekrar denemek için ekranı aşağı çekin.')
                : (i18n.language.startsWith('en') ? 'Try changing the island or your search.' : 'Farklı bir ada seçerek veya aramanızı değiştirerek tekrar deneyebilirsiniz.')}
            </Text>
          </View>
        ) : (
          filteredProviders.map((provider) => (
            <View
              key={provider.id}
              style={[
                styles.card,
                { borderLeftColor: provider.avatarBg },
                isDark && styles.cardDark,
              ]}
            >
              <View style={styles.cardTopRow}>
                <View style={[styles.categoryBadge, { backgroundColor: `${provider.avatarBg}14` }]}>
                  <Text style={[styles.categoryBadgeText, { color: provider.avatarBg }]}>
                    {provider.categoryLabel}
                  </Text>
                </View>
                {provider.isVerified && (
                  <View style={styles.verifiedBadge}>
                    <IconSymbol name="checkmark.seal.fill" size={14} color="#059669" />
                    <Text style={styles.verifiedText}>
                      {i18n.language.startsWith('en') ? 'Verified' : 'Onaylı'}
                    </Text>
                  </View>
                )}
              </View>

              {/* Card Top: Avatar, Names, Badges */}
              <View style={styles.cardHeader}>
                <View style={[styles.avatar, { backgroundColor: provider.avatarBg }]}>
                  <Text style={styles.avatarText}>
                    {provider.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </Text>
                </View>

                <View style={styles.headerInfo}>
                  <View style={styles.nameRow}>
                    <Text style={[styles.providerName, isDark && styles.textWhite]} numberOfLines={1}>
                      {provider.name}
                    </Text>
                  </View>

                  <Text style={[styles.providerTitle, isDark && styles.textMuted]} numberOfLines={1}>
                    {provider.title}
                  </Text>

                  {/* Island & Rating info */}
                  <View style={styles.subInfoRow}>
                    <View style={styles.islandTag}>
                      <IconSymbol name="mappin" size={12} color="#2563EB" />
                      <Text style={styles.islandTagText}>{provider.island}</Text>
                    </View>
                    <View style={styles.ratingBox}>
                      <IconSymbol name="star.fill" size={12} color="#F59E0B" />
                      <Text style={styles.ratingText}>{provider.rating.toFixed(1)}</Text>
                      <Text style={[styles.reviewCountText, isDark && styles.textMuted]}>
                        ({provider.reviewCount})
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Description */}
              <Text style={[styles.descriptionText, isDark && { color: '#CBD5E1' }]} numberOfLines={2}>
                {provider.description}
              </Text>

              {/* Tags */}
              <View style={styles.tagsRow}>
                {provider.tags.slice(0, 3).map((tag, idx) => (
                  <View key={idx} style={[styles.tagBadge, isDark && styles.tagBadgeDark]}>
                    <Text style={[styles.tagText, isDark && styles.tagTextDark]}>{tag}</Text>
                  </View>
                ))}
              </View>

              {/* Action Buttons */}
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.callBtn, isDark && { backgroundColor: '#18181B' }]}
                  onPress={() => handleCall(provider.phone, provider.name)}
                  activeOpacity={0.8}
                >
                  <IconSymbol name="phone.fill" size={16} color="#2563EB" />
                  <Text style={styles.callBtnText}>
                    {i18n.language.startsWith('en') ? 'Call' : 'Ara'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, styles.waBtn]}
                  onPress={() => handleWhatsApp(provider.whatsapp, provider.name, provider.title)}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="whatsapp" size={18} color="#FFFFFF" />
                  <Text style={styles.actionBtnTextWhite}>WhatsApp</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  containerDark: {
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  headerDark: {
    backgroundColor: '#121212',
  },
  backButton: {
    padding: 4,
    marginRight: 8,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
    fontWeight: '500',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  searchBarDark: {
    backgroundColor: '#18181B',
    borderColor: '#27272A',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    padding: 0,
  },
  islandFilterContainer: {
    marginBottom: 8,
  },
  islandScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  islandPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  islandPillDark: {
    backgroundColor: '#18181B',
    borderColor: '#27272A',
  },
  islandPillActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  islandPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  islandPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 2,
    gap: 14,
  },
  loadingContainer: {
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    marginBottom: 1,
  },
  resultsTitle: {
    color: '#0F172A',
    fontSize: 17,
    fontWeight: '800',
  },
  resultCountBadge: {
    minWidth: 30,
    height: 26,
    paddingHorizontal: 8,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
  },
  resultCountText: {
    color: '#2563EB',
    fontSize: 12,
    fontWeight: '800',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    gap: 11,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  cardDark: {
    backgroundColor: '#18181B',
    borderColor: '#27272A',
  },
  cardHeader: {
    flexDirection: 'row',
    gap: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  providerName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    flexShrink: 1,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  providerTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 4,
  },
  subInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  islandTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  islandTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
  },
  ratingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#F59E0B',
  },
  reviewCountText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#94A3B8',
  },
  descriptionText: {
    fontSize: 13.5,
    lineHeight: 20,
    color: '#475569',
    fontWeight: '400',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagBadge: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tagBadgeDark: {
    backgroundColor: '#27272A',
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  tagTextDark: {
    color: '#94A3B8',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
  },
  callBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#2563EB',
  },
  waBtn: {
    backgroundColor: '#10B981',
  },
  actionBtnTextWhite: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  callBtnText: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '800',
  },
  emptyContainer: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 32,
    gap: 10,
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  textWhite: {
    color: '#FFFFFF',
  },
  textMuted: {
    color: '#94A3B8',
  },
});
