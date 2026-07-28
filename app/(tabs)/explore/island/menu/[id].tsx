import { IconSymbol } from '@/components/ui/icon-symbol';
import { DELIVERY_PROVIDERS, DeliveryProvider } from '@/constants/DeliveryProviders';
import { useTheme } from '@/context/ThemeContext';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Linking,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function VenueMenuScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { t, i18n } = useTranslation();
  const isEn = i18n.language.startsWith('en');

  const provider: DeliveryProvider | undefined = DELIVERY_PROVIDERS.find((p) => p.id === id);

  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');

  if (!provider) {
    return (
      <View style={[styles.container, isDark && styles.containerDark, { justifyContent: 'center', alignItems: 'center' }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={[styles.title, isDark && styles.textLight]}>{isEn ? 'Venue not found' : 'Mekan bulunamadı'}</Text>
        <TouchableOpacity style={styles.backBtnInline} onPress={() => router.back()}>
          <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>{isEn ? 'Go Back' : 'Geri Dön'}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const menuCategories = Array.from(
    new Set((provider.menu || []).map((item) => item.category).filter(Boolean))
  ) as string[];

  const filteredMenuItems = (provider.menu || []).filter((item) => {
    if (selectedCategoryFilter === 'all') return true;
    return item.category === selectedCategoryFilter;
  });

  const handleCall = () => {
    Linking.openURL(`tel:${provider.phone}`).catch(() => {});
  };

  const handleWhatsApp = () => {
    if (provider.whatsapp) {
      const msg = encodeURIComponent(`Merhaba, ${provider.name} menünüzden sipariş vermek istiyorum.`);
      Linking.openURL(`whatsapp://send?phone=${provider.whatsapp}&text=${msg}`).catch(() => {
        Linking.openURL(`https://wa.me/${provider.whatsapp}?text=${msg}`).catch(() => {});
      });
    }
  };

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Navigation Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }, isDark && styles.headerDark]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backButton, isDark && styles.backButtonDark]}
          activeOpacity={0.7}
        >
          <IconSymbol name="chevron.left" size={20} color={isDark ? '#F8FAFC' : '#0F172A'} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, isDark && styles.textLight]} numberOfLines={1}>
            {provider.name}
          </Text>
          <Text style={[styles.headerSubtitle, isDark && styles.textMutedDark]}>
            {provider.categoryLabel} • {provider.island}
          </Text>
        </View>
      </View>

      {/* Info Card Banner */}
      <View style={[styles.infoBanner, isDark && styles.infoBannerDark]}>
        <View style={styles.infoMetaRow}>
          <View style={styles.infoMetaItem}>
            <IconSymbol name="clock" size={14} color="#8B5CF6" />
            <Text style={[styles.infoMetaText, isDark && styles.textLight]}>{provider.workingHours}</Text>
          </View>
          <View style={styles.infoMetaItem}>
            <IconSymbol name="paperplane.fill" size={14} color="#059669" />
            <Text style={[styles.infoMetaText, isDark && styles.textLight]}>{provider.estimatedTime}</Text>
          </View>
          {provider.minOrder && (
            <View style={styles.infoMetaItem}>
              <IconSymbol name="tag.fill" size={14} color="#D97706" />
              <Text style={[styles.infoMetaText, isDark && styles.textLight]}>Min: {provider.minOrder}</Text>
            </View>
          )}
        </View>
        {provider.description && (
          <Text style={[styles.infoDesc, isDark && styles.textMutedDark]}>{provider.description}</Text>
        )}
      </View>

      {/* Category Chips Bar */}
      {menuCategories.length > 0 && (
        <View style={[styles.categoryBar, isDark && styles.categoryBarDark]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
            <TouchableOpacity
              onPress={() => setSelectedCategoryFilter('all')}
              style={[
                styles.categoryChip,
                isDark && styles.categoryChipDark,
                selectedCategoryFilter === 'all' && styles.categoryChipActive,
              ]}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  isDark && styles.categoryChipTextDark,
                  selectedCategoryFilter === 'all' && styles.categoryChipTextActive,
                ]}
              >
                {isEn ? 'All Items' : 'Tüm Menü'}
              </Text>
            </TouchableOpacity>

            {menuCategories.map((cat) => {
              const isActive = selectedCategoryFilter === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setSelectedCategoryFilter(cat)}
                  style={[
                    styles.categoryChip,
                    isDark && styles.categoryChipDark,
                    isActive && styles.categoryChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      isDark && styles.categoryChipTextDark,
                      isActive && styles.categoryChipTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Menu List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      >
        <Text style={[styles.sectionHeading, isDark && styles.textLight]}>
          {selectedCategoryFilter === 'all' ? (isEn ? 'Full Menu' : 'Menü İçi Lezzetler') : selectedCategoryFilter}
        </Text>

        {filteredMenuItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <IconSymbol name="fork.knife" size={32} color={isDark ? '#64748B' : '#94A3B8'} />
            <Text style={[styles.emptyText, isDark && styles.textMutedDark]}>
              {isEn ? 'No menu items available for this category.' : 'Bu kategoride ürün bulunamadı.'}
            </Text>
          </View>
        ) : (
          filteredMenuItems.map((item, index) => (
            <View key={index} style={[styles.menuCard, isDark && styles.menuCardDark]}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                  <Text style={[styles.itemName, isDark && styles.textLight]}>{item.name}</Text>
                  {item.badge && (
                    <View style={styles.itemBadge}>
                      <Text style={styles.itemBadgeText}>{item.badge}</Text>
                    </View>
                  )}
                </View>
                {item.description && (
                  <Text style={[styles.itemDesc, isDark && styles.textMutedDark]}>{item.description}</Text>
                )}
                {item.category && selectedCategoryFilter === 'all' && (
                  <Text style={styles.itemCategoryTag}>{item.category}</Text>
                )}
              </View>
              <Text style={styles.itemPrice}>{item.price}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  containerDark: {
    backgroundColor: '#0F172A',
  },
  textLight: {
    color: '#F8FAFC',
  },
  textMutedDark: {
    color: '#94A3B8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerDark: {
    backgroundColor: '#1E293B',
    borderBottomColor: '#334155',
  },
  backButton: {
    width: 40,
    height: 40,
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
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  infoBanner: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  infoBannerDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  infoMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  infoMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  infoMetaText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  infoDesc: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  categoryBar: {
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    marginTop: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  categoryBarDark: {
    backgroundColor: '#1E293B',
    borderBottomColor: '#334155',
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryChipDark: {
    backgroundColor: '#0F172A',
    borderColor: '#334155',
  },
  categoryChipActive: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  categoryChipTextDark: {
    color: '#CBD5E1',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  menuCardDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  itemName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  itemDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 3,
    lineHeight: 17,
  },
  itemCategoryTag: {
    fontSize: 11,
    color: '#8B5CF6',
    fontWeight: '600',
    marginTop: 4,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: '#059669',
  },
  itemBadge: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  itemBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#7C3AED',
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 8,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 10,
  },
  bottomBarDark: {
    backgroundColor: '#1E293B',
    borderTopColor: '#334155',
  },
  callButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#059669',
    borderRadius: 14,
    paddingVertical: 14,
  },
  whatsappButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#25D366',
    borderRadius: 14,
    paddingVertical: 14,
  },
  bottomBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  backBtnInline: {
    marginTop: 16,
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
});
