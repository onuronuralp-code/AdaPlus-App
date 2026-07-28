import { IconSymbol } from '@/components/ui/icon-symbol';
import { DELIVERY_PROVIDERS, DeliveryProvider, MenuItem } from '@/constants/DeliveryProviders';
import { useTheme } from '@/context/ThemeContext';
import * as Haptics from 'expo-haptics';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Animated,
  Modal,
  PanResponder,
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
  const { i18n } = useTranslation();
  const isEn = i18n.language.startsWith('en');

  const provider: DeliveryProvider | undefined = DELIVERY_PROVIDERS.find((p) => p.id === id);

  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [cartItems, setCartItems] = useState<{ item: MenuItem; count: number }[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // Onboarding overlay state (defaults to true on first view)
  const [showOnboarding, setShowOnboarding] = useState<boolean>(true);

  // Animated hand position for onboarding gesture demo
  const handAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (showOnboarding) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(handAnim, {
            toValue: 65,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(handAnim, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    }
  }, [showOnboarding, handAnim]);

  const handleAddToCart = (item: MenuItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setCartItems((prev) => {
      const existing = prev.find((ci) => ci.item.name === item.name);
      if (existing) {
        return prev.map((ci) =>
          ci.item.name === item.name ? { ...ci, count: ci.count + 1 } : ci
        );
      }
      return [...prev, { item, count: 1 }];
    });

    setToastMessage(`🛒 ${item.name} sepete eklendi!`);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  const totalCartCount = cartItems.reduce((sum, ci) => sum + ci.count, 0);

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

        {/* Info Help Icon to re-open onboarding */}
        <TouchableOpacity
          style={styles.helpButton}
          onPress={() => setShowOnboarding(true)}
          activeOpacity={0.7}
        >
          <IconSymbol name="info.circle" size={20} color="#8B5CF6" />
        </TouchableOpacity>
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
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <Text style={[styles.sectionHeading, isDark && styles.textLight, { marginBottom: 0 }]}>
            {selectedCategoryFilter === 'all' ? (isEn ? 'Full Menu' : 'Menü İçi Lezzetler') : selectedCategoryFilter}
          </Text>

          <View style={styles.swipeHintBadge}>
            <IconSymbol name="hand.draw" size={13} color="#8B5CF6" />
            <Text style={styles.swipeHintBadgeText}>{isEn ? 'Swipe to add' : 'Kaydırarak Ekle'}</Text>
          </View>
        </View>

        {filteredMenuItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <IconSymbol name="fork.knife" size={32} color={isDark ? '#64748B' : '#94A3B8'} />
            <Text style={[styles.emptyText, isDark && styles.textMutedDark]}>
              {isEn ? 'No menu items available for this category.' : 'Bu kategoride ürün bulunamadı.'}
            </Text>
          </View>
        ) : (
          filteredMenuItems.map((item, index) => (
            <SwipeableMenuCard
              key={index}
              item={item}
              isDark={isDark}
              onAddToCart={handleAddToCart}
            />
          ))
        )}
      </ScrollView>

      {/* Toast Notification Banner */}
      {toastMessage && (
        <View style={[styles.toastContainer, { bottom: insets.bottom + 20 }]}>
          <Text style={styles.toastText}>{toastMessage}</Text>
          {totalCartCount > 0 && (
            <View style={styles.cartCountBadge}>
              <Text style={styles.cartCountBadgeText}>{totalCartCount}</Text>
            </View>
          )}
        </View>
      )}

      {/* Onboarding Swipe Demo Modal */}
      <Modal
        visible={showOnboarding}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOnboarding(false)}
      >
        <View style={styles.onboardingOverlay}>
          <View style={[styles.onboardingCard, isDark && styles.onboardingCardDark]}>
            {/* Tooltip Header */}
            <View style={styles.onboardingHeader}>
              <View style={styles.onboardingBadge}>
                <Text style={styles.onboardingBadgeText}>💡 SEPETE HIZLI EKLE</Text>
              </View>
            </View>

            <Text style={[styles.onboardingTitle, isDark && styles.textLight]}>
              {isEn ? 'Swipe items to add to cart' : 'Kutuyu Sağa Kaydırarak Sepete Ekleyin'}
            </Text>

            <Text style={[styles.onboardingDesc, isDark && styles.textMutedDark]}>
              {isEn
                ? 'Swipe any menu item box sideways to instantly add it to your cart.'
                : 'Menüdeki lezzet kutularını sağa doğru kaydırarak anında sepetinize ekleyebilirsiniz.'}
            </Text>

            {/* Simulated Animated Swipe Demo Area */}
            <View style={styles.demoContainer}>
              <View style={styles.demoBackground}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <IconSymbol name="cart.fill.badge.plus" size={18} color="#FFFFFF" />
                  <Text style={styles.demoSwipeText}>Sepete Eklendi!</Text>
                </View>
              </View>

              {/* Animated Demo Card */}
              <Animated.View
                style={[
                  styles.demoCard,
                  isDark && styles.demoCardDark,
                  { transform: [{ translateX: handAnim }] },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemName, isDark && styles.textLight]}>Maestro Özel Burger</Text>
                  <Text style={[styles.itemDesc, isDark && styles.textMutedDark]} numberOfLines={1}>
                    200g dana köfte, cheddar, patates...
                  </Text>
                </View>
                <Text style={styles.itemPrice}>280 ₺</Text>
              </Animated.View>

              {/* Animated Hand Gesture Cursor Icon */}
              <Animated.View
                style={[
                  styles.handCursor,
                  { transform: [{ translateX: handAnim }] },
                ]}
              >
                <Text style={{ fontSize: 26 }}>👉</Text>
              </Animated.View>
            </View>

            {/* Close Button */}
            <TouchableOpacity
              style={styles.onboardingBtn}
              onPress={() => setShowOnboarding(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.onboardingBtnText}>{isEn ? 'Got It!' : 'Anladım, Başla'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

{/* Swipeable Menu Card Component */}
function SwipeableMenuCard({
  item,
  isDark,
  onAddToCart,
}: {
  item: MenuItem;
  isDark: boolean;
  onAddToCart: (item: MenuItem) => void;
}) {
  const pan = useRef(new Animated.ValueXY()).current;
  const [isAdded, setIsAdded] = useState(false);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dx) > 12,
      onPanResponderMove: Animated.event([null, { dx: pan.x }], { useNativeDriver: false }),
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > 65 || gestureState.dx < -65) {
          onAddToCart(item);
          setIsAdded(true);
          setTimeout(() => setIsAdded(false), 1600);
        }
        Animated.spring(pan, {
          toValue: { x: 0, y: 0 },
          friction: 6,
          useNativeDriver: false,
        }).start();
      },
    })
  ).current;

  return (
    <View style={styles.swipeContainer}>
      {/* Background Action Revealed on Swipe */}
      <View style={styles.swipeBackground}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 16 }}>
          <IconSymbol name="cart.fill.badge.plus" size={18} color="#FFFFFF" />
          <Text style={styles.swipeText}>Sepete Ekle</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: 16 }}>
          <Text style={styles.swipeText}>Sepete Ekle</Text>
          <IconSymbol name="cart.fill.badge.plus" size={18} color="#FFFFFF" />
        </View>
      </View>

      {/* Main Foreground Card */}
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.menuCard,
          isDark && styles.menuCardDark,
          { transform: [{ translateX: pan.x }] },
        ]}
      >
        <View style={{ flex: 1, paddingRight: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
            <Text style={[styles.itemName, isDark && styles.textLight]}>{item.name}</Text>
            {item.badge && (
              <View style={styles.itemBadge}>
                <Text style={styles.itemBadgeText}>{item.badge}</Text>
              </View>
            )}
            {isAdded && (
              <View style={styles.addedBadge}>
                <Text style={styles.addedBadgeText}>✓ Eklendi</Text>
              </View>
            )}
          </View>
          {item.description && (
            <Text style={[styles.itemDesc, isDark && styles.textMutedDark]}>{item.description}</Text>
          )}
          {item.category && <Text style={styles.itemCategoryTag}>{item.category}</Text>}
        </View>
        <View style={{ alignItems: 'flex-end', justifyContent: 'space-between', height: '100%' }}>
          <Text style={styles.itemPrice}>{item.price}</Text>
          <TouchableOpacity
            style={styles.addCartBtnSmall}
            onPress={() => onAddToCart(item)}
            activeOpacity={0.7}
          >
            <IconSymbol name="plus" size={13} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </Animated.View>
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
  helpButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
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
  },
  swipeHintBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  swipeHintBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7C3AED',
  },
  swipeContainer: {
    marginBottom: 10,
    position: 'relative',
    borderRadius: 14,
    overflow: 'hidden',
  },
  swipeBackground: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#059669',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  swipeText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 14,
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
  addedBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  addedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#047857',
  },
  addCartBtnSmall: {
    backgroundColor: '#059669',
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  toastContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
    backgroundColor: '#0F172A',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  cartCountBadge: {
    backgroundColor: '#059669',
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartCountBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
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
  onboardingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  onboardingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },
  onboardingCardDark: {
    backgroundColor: '#1E293B',
  },
  onboardingHeader: {
    marginBottom: 12,
  },
  onboardingBadge: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  onboardingBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#7C3AED',
    letterSpacing: 0.5,
  },
  onboardingTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
  },
  onboardingDesc: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  demoContainer: {
    width: '100%',
    height: 72,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 24,
  },
  demoBackground: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#059669',
    borderRadius: 14,
    justifyContent: 'center',
    paddingLeft: 16,
  },
  demoSwipeText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  demoCard: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  demoCardDark: {
    backgroundColor: '#0F172A',
    borderColor: '#334155',
  },
  handCursor: {
    position: 'absolute',
    left: 20,
    top: 18,
  },
  onboardingBtn: {
    backgroundColor: '#8B5CF6',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  onboardingBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
