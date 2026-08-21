import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Linking,
  StatusBar,
  Platform,
  Alert,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import LoginPromptModal from '@/components/LoginPromptModal';
import { DELIVERY_PROVIDERS, DeliveryProvider } from '@/constants/DeliveryProviders';

const PROVIDERS = DELIVERY_PROVIDERS;

export default function PaketServisScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { isLoggedIn, user } = useAuth();
  const { islandId } = useLocalSearchParams<{ islandId?: string }>();
  const isEn = i18n.language.startsWith('en');

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedIsland, setSelectedIsland] = useState<string>(
    islandId && islandId !== 'all' ? islandId : 'Kınalıada'
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  const [showLoginPrompt, setShowLoginPrompt] = useState<boolean>(false);
  
  const categories = [
    { key: 'all', label: isEn ? 'All' : 'Tümü', icon: 'square.grid.2x2.fill' },
    { key: 'market', label: isEn ? 'Market & Grocery' : 'Market & Bakkal', icon: 'cart.fill' },
    { key: 'waterGas', label: isEn ? 'Water & Gas' : 'Su & Tüp', icon: 'drop.fill' },
    { key: 'cargo', label: isEn ? 'Cargo & Parcel' : 'Kargo & Paket', icon: 'shippingbox.fill' },
    { key: 'food', label: isEn ? 'Food & Dining' : 'Restoran & Kafe', icon: 'fork.knife' },
    { key: 'courier', label: isEn ? 'Island Courier' : 'Ada İçi Kurye', icon: 'bolt.fill' },
  ];

  const islandOptions = [
    { key: 'Kınalıada', label: 'Kınalıada' },
    { key: 'Burgazada', label: 'Burgazada' },
    { key: 'Heybeliada', label: 'Heybeliada' },
    { key: 'Büyükada', label: 'Büyükada' },
  ];

  const filteredProviders = PROVIDERS.filter((provider) => {
    const matchesCategory = selectedCategory === 'all' || provider.category === selectedCategory;
    const matchesIsland = selectedIsland === 'all' || provider.island === 'Tüm Adalar' || provider.island === selectedIsland;
    const matchesSearch = searchQuery.trim() === '' || 
      provider.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      provider.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesIsland && matchesSearch;
  });

  const handleCall = (phoneNumber: string) => {
    Linking.openURL(`tel:${phoneNumber}`).catch(() => {});
  };

  const handleWhatsApp = (whatsappNumber: string) => {
    const cleaned = whatsappNumber.replace(/[^0-9]/g, '');
    const url = `whatsapp://send?phone=${cleaned}&text=${encodeURIComponent(isEn ? 'Hello, I reached you via AdaPlus.' : 'Merhaba, AdaPlus üzerinden ulaşıyorum.')}`;
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://wa.me/${cleaned}`).catch(() => {});
    });
  };

  const isNavigatingRef = React.useRef(false);

  const handleOrderPress = (provider: DeliveryProvider) => {
    if (isNavigatingRef.current) return;
    if (!isLoggedIn) {
      setShowLoginPrompt(true);
      return;
    }
    const isResident = user?.userType === 'ISLAND_RESIDENT' || user?.role === 'ADMIN';
    if (!isResident) {
      Alert.alert(
        isEn ? 'Islanders Only' : 'Sadece Adalılar',
        isEn
          ? 'Ordering is currently limited to verified Islanders. Ask an existing Islander to invite you, or reach out via Contact.'
          : 'Sipariş verme özelliği şu an sadece Onaylı Adalılar için açık. Bir Adalıdan davet isteyebilir veya İletişim üzerinden bize ulaşabilirsin.',
        [
          { text: isEn ? 'Cancel' : 'Vazgeç', style: 'cancel' },
          { text: isEn ? 'Contact Us' : 'İletişime Geç', onPress: () => router.push('/(tabs)/contact' as any) },
        ]
      );
      return;
    }
    isNavigatingRef.current = true;
    router.push({ pathname: '/(tabs)/explore/island/menu/[id]', params: { id: provider.id } });
    setTimeout(() => {
      isNavigatingRef.current = false;
    }, 1000);
  };

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, isDark && styles.headerDark, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, isDark && styles.backButtonDark]}>
            <IconSymbol name="chevron.left" size={22} color={isDark ? '#F8FAFC' : '#0F172A'} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, isDark && styles.textLight]}>
              {t('deliveryService.title', { defaultValue: isEn ? 'Delivery & Courier' : 'Paket Servis & Kurye' })}
            </Text>
            <Text style={[styles.headerSubtitle, isDark && styles.textMutedDark]}>
              {t('deliveryService.subtitle', { defaultValue: isEn ? 'Delivery, grocery, water & gas for the islands' : 'Adalara özel paket teslimat, market, su & tüp hizmetleri' })}
            </Text>
          </View>
        </View>
      </View>

      {/* Main Content */}
      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[1]}
      >
        {/* Top Filters: Search & Island Filters (Index 0 - scrolls up) */}
        <View style={{ backgroundColor: isDark ? '#000000' : '#FFFFFF', paddingBottom: 4 }}>
          {/* Search Bar */}
          <View style={[styles.searchContainer, isDark && styles.searchContainerDark, { marginHorizontal: 16, marginTop: 4, marginBottom: 10 }]}>
            <IconSymbol name="magnifyingglass" size={18} color={isDark ? '#94A3B8' : '#64748B'} />
            <TextInput
              style={[styles.searchInput, isDark && styles.textLight]}
              placeholder={t('deliveryService.searchPlaceholder', { defaultValue: isEn ? 'Search service or provider...' : 'Servis veya firma ara...' })}
              placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <IconSymbol name="xmark.circle.fill" size={18} color={isDark ? '#94A3B8' : '#64748B'} />
              </TouchableOpacity>
            )}
          </View>

          {/* Island Filters */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.islandRow} contentContainerStyle={{ paddingHorizontal: 16, gap: 10, marginBottom: 4 }}>
            {islandOptions.map((isl) => (
              <TouchableOpacity
                key={isl.key}
                onPress={() => setSelectedIsland(isl.key)}
                style={[
                  styles.islandChip,
                  isDark && styles.islandChipDark,
                  selectedIsland === isl.key && styles.islandChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.islandChipText,
                    isDark && styles.islandChipTextDark,
                    selectedIsland === isl.key && styles.islandChipTextActive,
                  ]}
                >
                  {isl.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Category Tabs (Index 1 - Sticky Header under Navbar) */}
        <View style={[styles.categorySection, isDark && styles.categorySectionDark, { backgroundColor: isDark ? '#000000' : '#FFFFFF', paddingVertical: 8, zIndex: 10 }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
            {categories.map((cat) => {
              const isActive = selectedCategory === cat.key;
              return (
                <TouchableOpacity
                  key={cat.key}
                  onPress={() => setSelectedCategory(cat.key)}
                  style={[
                    styles.categoryTab,
                    isDark && styles.categoryTabDark,
                    isActive && styles.categoryTabActive,
                  ]}
                >
                  <IconSymbol
                    name={cat.icon as any}
                    size={17}
                    color={isActive ? '#FFFFFF' : isDark ? '#A7F3D0' : '#059669'}
                  />
                  <Text
                    style={[
                      styles.categoryTabText,
                      isDark && styles.categoryTabTextDark,
                      isActive && styles.categoryTabTextActive,
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Provider List (Index 2) */}
        <View style={{ paddingHorizontal: 16, paddingTop: 6 }}>
          {filteredProviders.length === 0 ? (
            <View style={styles.emptyContainer}>
              <IconSymbol name="magnifyingglass" size={36} color={isDark ? '#64748B' : '#94A3B8'} />
              <Text style={[styles.emptyTitle, isDark && styles.textLight]}>
                {isEn ? 'No delivery providers found' : 'Uygun paket servis bulunamadı'}
              </Text>
              <Text style={[styles.emptySubtitle, isDark && styles.textMutedDark]}>
                {isEn ? 'Try selecting another category or island filter.' : 'Farklı bir kategori veya ada filtresi seçmeyi deneyebilirsiniz.'}
              </Text>
            </View>
          ) : (
            filteredProviders.map((provider) => (
              <TouchableOpacity
                key={provider.id}
                activeOpacity={0.88}
                onPress={() => {
                  if (provider.menu && provider.menu.length > 0) {
                    handleOrderPress(provider);
                  } else {
                    handleCall(provider.phone);
                  }
                }}
                style={[styles.providerCard, isDark && styles.providerCardDark]}
              >
                {/* Card Top */}
                <View style={[styles.cardHeader, { justifyContent: 'flex-end' }]}>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>{provider.categoryLabel}</Text>
                  </View>
                </View>

                <Text style={[styles.providerName, isDark && styles.textLight, { marginBottom: 6 }]}>{provider.name}</Text>
                <Text style={[styles.providerDesc, isDark && styles.textMutedDark]}>{provider.description}</Text>

                {/* Meta Info Row */}
                <View style={[styles.metaRow, isDark && styles.metaRowDark]}>
                  <View style={styles.metaItem}>
                    <IconSymbol name="clock" size={13} color={isDark ? '#94A3B8' : '#64748B'} />
                    <Text style={[styles.metaText, isDark && styles.textMutedDark]}>{provider.workingHours}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <IconSymbol name="paperplane.fill" size={13} color={isDark ? '#94A3B8' : '#64748B'} />
                    <Text style={[styles.metaText, isDark && styles.textMutedDark]}>{provider.estimatedTime}</Text>
                  </View>
                  {provider.minOrder && (
                    <View style={styles.metaItem}>
                      <IconSymbol name="tag.fill" size={13} color={isDark ? '#94A3B8' : '#64748B'} />
                      <Text style={[styles.metaText, isDark && styles.textMutedDark]}>Min: {provider.minOrder}</Text>
                    </View>
                  )}
                </View>

                {/* Action Buttons Row */}
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
                  {/* 1. Ara Butonu */}
                  <TouchableOpacity
                    activeOpacity={0.85}
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#059669',
                      borderRadius: 12,
                      paddingVertical: 11,
                      gap: 6,
                      shadowColor: '#059669',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.2,
                      shadowRadius: 3,
                      elevation: 2,
                    }}
                    onPress={() => handleCall(provider.phone)}
                  >
                    <IconSymbol name="phone.fill" size={14} color="#FFFFFF" />
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }}>
                      {isEn ? 'Call' : 'Ara'}
                    </Text>
                  </TouchableOpacity>

                  {/* 2. WhatsApp Butonu */}
                  <TouchableOpacity
                    activeOpacity={0.85}
                    style={{
                      flex: 1.1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#25D366',
                      borderRadius: 12,
                      paddingVertical: 11,
                      gap: 6,
                      shadowColor: '#25D366',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.2,
                      shadowRadius: 3,
                      elevation: 2,
                    }}
                    onPress={() => handleWhatsApp(provider.whatsapp || provider.phone)}
                  >
                    <MaterialCommunityIcons name="whatsapp" size={17} color="#FFFFFF" />
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }}>
                      WhatsApp
                    </Text>
                  </TouchableOpacity>

                  {/* 3. Sipariş Butonu */}
                  <TouchableOpacity
                    activeOpacity={0.85}
                    style={{
                      flex: 1.2,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: provider.menu && provider.menu.length > 0 ? '#8B5CF6' : '#6366F1',
                      borderRadius: 12,
                      paddingVertical: 11,
                      gap: 6,
                      shadowColor: provider.menu && provider.menu.length > 0 ? '#8B5CF6' : '#6366F1',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.2,
                      shadowRadius: 3,
                      elevation: 2,
                    }}
                    onPress={() => {
                      if (provider.menu && provider.menu.length > 0) {
                        handleOrderPress(provider);
                      } else {
                        handleCall(provider.phone);
                      }
                    }}
                  >
                    <IconSymbol 
                      name={provider.menu && provider.menu.length > 0 ? "bag.fill" : "phone.fill"} 
                      size={14} 
                      color="#FFFFFF" 
                    />
                    <Text style={{ 
                      fontSize: 13, 
                      fontWeight: '700', 
                      color: '#FFFFFF' 
                    }}>
                      {isEn ? 'Order' : 'Sipariş Ver'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      <LoginPromptModal visible={showLoginPrompt} onClose={() => setShowLoginPrompt(false)} onLogin={() => { setShowLoginPrompt(false); router.push('/(auth)/login' as any); }} />
    </View>
  );
}

const styles = StyleSheet.create({
  menuButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#8B5CF6',
    borderRadius: 10,
    paddingVertical: 10,
  },
  menuModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  menuSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 3,
  },
  modalCloseIconBtn: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  menuItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  menuItemCardDark: {
    backgroundColor: '#0F172A',
    borderColor: '#334155',
  },
  menuItemName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  menuItemDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16,
  },
  menuItemCategory: {
    fontSize: 11,
    color: '#8B5CF6',
    fontWeight: '600',
    marginTop: 4,
  },
  menuItemPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: '#059669',
  },
  itemBadge: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  itemBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#7C3AED',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  containerDark: {
    backgroundColor: '#000000',
  },
  textLight: {
    color: '#F8FAFC',
  },
  textMutedDark: {
    color: '#94A3B8',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  headerDark: {
    backgroundColor: '#000000',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  backButtonDark: {
    backgroundColor: '#334155',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 50,
    marginBottom: 12,
  },
  searchContainerDark: {
    backgroundColor: '#1C1C1E',
    borderColor: '#2C2C2E',
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
    marginLeft: 10,
    paddingTop: Platform.OS === 'ios' ? 8 : 0,
    paddingBottom: Platform.OS === 'ios' ? 8 : 0,
    paddingVertical: Platform.OS === 'ios' ? 8 : 0,
    textAlignVertical: 'center',
  },
  islandRow: {
    flexDirection: 'row',
  },
  islandChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  islandChipDark: {
    backgroundColor: '#1C1C1E',
    borderColor: '#2C2C2E',
  },
  islandChipActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  islandChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  islandChipTextDark: {
    color: '#CBD5E1',
  },
  islandChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  categorySection: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  categorySectionDark: {
    backgroundColor: '#000000',
    borderBottomColor: '#1E293B',
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  categoryTabDark: {
    backgroundColor: '#064E3B40',
    borderColor: '#065F46',
  },
  categoryTabActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  categoryTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#065F46',
  },
  categoryTabTextDark: {
    color: '#A7F3D0',
  },
  categoryTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 0,
    paddingTop: 4,
    paddingBottom: 40,
  },
  demandBanner: {
    backgroundColor: '#F3E8FF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  demandBannerDark: {
    backgroundColor: '#312E81',
    borderColor: '#4338CA',
  },
  demandBannerHeader: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  demandIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  demandBannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4C1D95',
  },
  demandBannerDesc: {
    fontSize: 12,
    color: '#6D28D9',
    marginTop: 2,
    lineHeight: 17,
  },
  demandBannerBtn: {
    backgroundColor: '#7C3AED',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  demandBannerBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  providerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  providerCardDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  categoryBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  islandBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  islandBadgeDark: {
    backgroundColor: '#0F172A',
  },
  islandBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  islandBadgeTextDark: {
    color: '#94A3B8',
  },
  electricBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  electricBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#047857',
  },
  providerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  providerDesc: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginBottom: 14,
  },
  metaRowDark: {
    borderTopColor: '#334155',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  menuIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  menuIndicatorText: {
    color: '#7C3AED',
    fontSize: 12.5,
    fontWeight: '700',
  },
  phoneIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  phoneIndicatorText: {
    color: '#059669',
    fontSize: 12.5,
    fontWeight: '700',
  },
  arrowCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  callButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#059669',
    borderRadius: 10,
    paddingVertical: 10,
  },
  whatsappButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#25D366',
    borderRadius: 10,
    paddingVertical: 10,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalContentDark: {
    backgroundColor: '#1E293B',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#64748B',
  },
  voteOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  voteOptionCardDark: {
    backgroundColor: '#0F172A',
    borderColor: '#334155',
  },
  voteOptionCardSelected: {
    backgroundColor: '#F3E8FF',
    borderColor: '#8B5CF6',
  },
  voteOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#334155',
  },
  voteInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    fontSize: 13,
    color: '#0F172A',
  },
  voteInputDark: {
    backgroundColor: '#0F172A',
    borderColor: '#334155',
    color: '#FFFFFF',
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
  },
  modalCancelBtnDark: {
    backgroundColor: '#0F172A',
  },
  modalCancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  modalSubmitBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#8B5CF6',
  },
  modalSubmitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  successIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseBtn: {
    width: '100%',
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalCloseBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
