import AsyncStorage from '@react-native-async-storage/async-storage';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { DELIVERY_PROVIDERS, DeliveryProvider, MenuItem } from '@/constants/DeliveryProviders';
import { useTheme } from '@/context/ThemeContext';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Animated,
  Linking,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
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
  const [cartItems, setCartItems] = useState<{ item: MenuItem; count: number; note?: string }[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isScrollEnabled, setIsScrollEnabled] = useState<boolean>(true);
  
  // Cart & Checkout Modal State
  const [showCartModal, setShowCartModal] = useState<boolean>(false);
  const [orderAddress, setOrderAddress] = useState<string>('');
  const [generalNote, setGeneralNote] = useState<string>('');

  // Onboarding overlay state
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);

  // Selected Item for Detail Modal
  const [selectedDetailItem, setSelectedDetailItem] = useState<MenuItem | null>(null);
  const [detailQuantity, setDetailQuantity] = useState<number>(1);
  const [detailNote, setDetailNote] = useState<string>('');

  // Cart Modal & Detail Modal Slide-up animations
  const cartModalAnim = useRef(new Animated.Value(0)).current;
  const detailModalAnim = useRef(new Animated.Value(0)).current;
  const handAnim = useRef(new Animated.Value(0)).current;

  // Floating Cart Bar Scroll Hide/Show Animation
  const cartBarAnim = useRef(new Animated.Value(1)).current;
  const isCartBarVisible = useRef(true);
  const scrollStopTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (showCartModal) {
      cartModalAnim.setValue(0);
      Animated.spring(cartModalAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 70,
        friction: 11,
      }).start();
    }
  }, [showCartModal]);

  const closeCartModal = () => {
    Animated.timing(cartModalAnim, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      setShowCartModal(false);
    });
  };

  useEffect(() => {
    if (selectedDetailItem) {
      detailModalAnim.setValue(0);
      Animated.spring(detailModalAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 70,
        friction: 11,
      }).start();
    }
  }, [selectedDetailItem]);

  const closeDetailModal = () => {
    Animated.timing(detailModalAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setSelectedDetailItem(null);
    });
  };

  const hideCartBar = () => {
    if (isCartBarVisible.current) {
      isCartBarVisible.current = false;
      Animated.timing(cartBarAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }).start();
    }
  };

  const showCartBar = () => {
    if (!isCartBarVisible.current) {
      isCartBarVisible.current = true;
      Animated.timing(cartBarAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  };

  const handleScrollBeginDrag = () => {
    if (scrollStopTimeout.current) clearTimeout(scrollStopTimeout.current);
    hideCartBar();
  };

  const handleScroll = () => {
    hideCartBar();
    if (scrollStopTimeout.current) clearTimeout(scrollStopTimeout.current);
    scrollStopTimeout.current = setTimeout(() => {
      showCartBar();
    }, 280);
  };

  const handleScrollEndDrag = (e: any) => {
    const velocity = e?.nativeEvent?.velocity?.y ?? 0;
    if (Math.abs(velocity) < 0.1) {
      if (scrollStopTimeout.current) clearTimeout(scrollStopTimeout.current);
      showCartBar();
    }
  };

  const handleMomentumScrollEnd = () => {
    if (scrollStopTimeout.current) clearTimeout(scrollStopTimeout.current);
    showCartBar();
  };

  useEffect(() => {
    return () => {
      if (scrollStopTimeout.current) clearTimeout(scrollStopTimeout.current);
    };
  }, []);

  useEffect(() => {
    const checkMenuOnboarding = async () => {
      try {
        const hasSeen = await AsyncStorage.getItem('has_seen_menu_onboarding');
        if (hasSeen !== 'true') {
          setTimeout(() => {
            setShowOnboarding(true);
          }, 400);
        }
      } catch (e) {
        console.log('Error checking menu onboarding', e);
      }
    };
    checkMenuOnboarding();
  }, []);

  const handleDismissOnboarding = async () => {
    setShowOnboarding(false);
    try {
      await AsyncStorage.setItem('has_seen_menu_onboarding', 'true');
    } catch (e) {}
  };

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

  const parsePrice = (priceStr: string): number => {
    if (!priceStr) return 0;
    const clean = priceStr.replace(/[^0-9.,]/g, '').replace(/\./g, '').replace(',', '.');
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  };

  const totalPrice = cartItems.reduce((sum, ci) => {
    const p = parsePrice(ci.item.price);
    return sum + p * ci.count;
  }, 0);

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('tr-TR').format(val) + ' ₺';
  };

  const handleAddToCart = (item: MenuItem, quantity: number = 1, note?: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setCartItems((prev) => {
      const existing = prev.find((ci) => ci.item.name === item.name);
      if (existing) {
        return prev.map((ci) =>
          ci.item.name === item.name ? { ...ci, count: ci.count + quantity, note: note || ci.note } : ci
        );
      }
      return [...prev, { item, count: quantity, note }];
    });

    setToastMessage(`🛒 ${item.name} (${quantity} adet) sepete eklendi!`);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  const handleIncreaseCartItem = (name: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setCartItems((prev) =>
      prev.map((ci) => (ci.item.name === name ? { ...ci, count: ci.count + 1 } : ci))
    );
  };

  const handleDecreaseCartItem = (name: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setCartItems((prev) =>
      prev
        .map((ci) => (ci.item.name === name ? { ...ci, count: ci.count - 1 } : ci))
        .filter((ci) => ci.count > 0)
    );
  };

  const handleRemoveCartItem = (name: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setCartItems((prev) => prev.filter((ci) => ci.item.name !== name));
  };

  const handleClearCart = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    setCartItems([]);
    setShowCartModal(false);
  };

  const handleCheckoutWhatsApp = () => {
    if (!provider?.whatsapp || cartItems.length === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const cleaned = provider.whatsapp.replace(/[^0-9]/g, '');
    
    let msg = `*AdaPlus Sipariş Talebi - ${provider.name}*\n\n`;
    cartItems.forEach((ci, idx) => {
      msg += `${idx + 1}. ${ci.item.name} x${ci.count} - ${ci.item.price}`;
      if (ci.note) msg += ` (Not: ${ci.note})`;
      msg += '\n';
    });
    msg += `\n*Toplam Tutar:* ${formatPrice(totalPrice)}`;
    if (orderAddress.trim()) {
      msg += `\n*Adres / Konum:* ${orderAddress.trim()}`;
    }
    if (generalNote.trim()) {
      msg += `\n*Sipariş Notu:* ${generalNote.trim()}`;
    }
    msg += `\n\n_AdaPlus mobil uygulaması üzerinden gönderildi._`;

    const url = `whatsapp://send?phone=${cleaned}&text=${encodeURIComponent(msg)}`;
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://wa.me/${cleaned}?text=${encodeURIComponent(msg)}`).catch(() => {});
    });
  };

  const handleCall = () => {
    if (!provider?.phone) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    Linking.openURL(`tel:${provider.phone}`).catch(() => {});
  };

  const openItemDetail = (item: MenuItem) => {
    setSelectedDetailItem(item);
    setDetailQuantity(1);
    setDetailNote('');
  };

  const handleDetailAddToCart = () => {
    if (selectedDetailItem) {
      handleAddToCart(selectedDetailItem, detailQuantity, detailNote.trim() || undefined);
      setSelectedDetailItem(null);
    }
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

  const groupedMenuSections = React.useMemo(() => {
    if (!provider?.menu) return [];

    if (selectedCategoryFilter !== 'all') {
      const items = provider.menu.filter((item) => item.category === selectedCategoryFilter);
      return items.length > 0 ? [{ category: selectedCategoryFilter, items }] : [];
    }

    const groups: { category: string; items: MenuItem[] }[] = [];
    const map = new Map<string, MenuItem[]>();

    provider.menu.forEach((item) => {
      const cat = item.category || (isEn ? 'Other' : 'Diğer Ürünler');
      if (!map.has(cat)) {
        map.set(cat, []);
      }
      map.get(cat)!.push(item);
    });

    map.forEach((items, category) => {
      groups.push({ category, items });
    });

    return groups;
  }, [provider?.menu, selectedCategoryFilter, isEn]);

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false, fullScreenGestureEnabled: false }} />
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

        {/* Cart Header Button */}
        <TouchableOpacity
          style={[styles.headerCartButton, isDark && styles.headerCartButtonDark]}
          onPress={() => setShowCartModal(true)}
          activeOpacity={0.7}
        >
          <IconSymbol name="bag.fill" size={20} color={isDark ? '#F8FAFC' : '#0F172A'} />
          {totalCartCount > 0 && (
            <View style={styles.headerCartBadge}>
              <Text style={styles.headerCartBadgeText}>{totalCartCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Menu List */}
      <ScrollView
        scrollEnabled={isScrollEnabled}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={menuCategories.length > 0 ? [1] : undefined}
        contentContainerStyle={{ paddingBottom: 90 }}
        onScrollBeginDrag={handleScrollBeginDrag}
        onScroll={handleScroll}
        onScrollEndDrag={handleScrollEndDrag}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        scrollEventThrottle={16}
      >
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

        <View style={{ paddingHorizontal: 16, paddingTop: 4 }}>
          {groupedMenuSections.length === 0 ? (
            <View style={styles.emptyContainer}>
              <IconSymbol name="fork.knife" size={32} color={isDark ? '#64748B' : '#94A3B8'} />
              <Text style={[styles.emptyText, isDark && styles.textMutedDark]}>
                {isEn ? 'No menu items available for this category.' : 'Bu kategoride ürün bulunamadı.'}
              </Text>
            </View>
          ) : (
            groupedMenuSections.map((section, sIdx) => (
              <View key={section.category} style={{ marginBottom: 14 }}>
                {/* Category Subheader */}
                <View style={{ marginTop: sIdx === 0 ? 6 : 18, marginBottom: 10 }}>
                  <Text style={[{ fontSize: 17, fontWeight: '800', color: '#0F172A' }, isDark && styles.textLight]}>
                    {section.category}
                  </Text>
                </View>

                {section.items.map((item, index) => {
                  const inCartItem = cartItems.find((ci) => ci.item.name === item.name);
                  const cartQuantity = inCartItem ? inCartItem.count : 0;
                  return (
                    <SwipeableMenuCard
                      key={`${section.category}-${index}`}
                      item={item}
                      isDark={isDark}
                      cartQuantity={cartQuantity}
                      onAddToCart={handleAddToCart}
                      onPressItem={openItemDetail}
                      onSwipeStart={() => setIsScrollEnabled(false)}
                      onSwipeEnd={() => setIsScrollEnabled(true)}
                    />
                  );
                })}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Toast Notification Banner */}
      {toastMessage && (
        <View style={[styles.toastContainer, { bottom: totalCartCount > 0 ? 76 : 14 }]}>
          <Text style={styles.toastText}>{toastMessage}</Text>
          {totalCartCount > 0 && (
            <View style={styles.cartCountBadge}>
              <Text style={styles.cartCountBadgeText}>{totalCartCount}</Text>
            </View>
          )}
        </View>
      )}

      {/* Floating Bottom Cart Bar (Visible when cart has items, hides during scroll) */}
      {totalCartCount > 0 && (
        <Animated.View
          style={[
            styles.floatingCartBar,
            {
              bottom: 8,
              opacity: cartBarAnim,
              transform: [
                {
                  translateY: cartBarAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [70, 0],
                  }),
                },
              ],
            },
          ]}
          pointerEvents={totalCartCount > 0 ? 'auto' : 'none'}
        >
          <TouchableOpacity
            style={styles.floatingCartBtn}
            onPress={() => setShowCartModal(true)}
            activeOpacity={0.9}
          >
            <View style={styles.floatingCartLeft}>
              <View style={styles.floatingCartIconWrapper}>
                <IconSymbol name="bag.fill" size={20} color="#FFFFFF" />
                <View style={styles.floatingCartBadge}>
                  <Text style={styles.floatingCartBadgeText}>{totalCartCount}</Text>
                </View>
              </View>
              <View>
                <Text style={styles.floatingCartLabel}>{isEn ? 'Total' : 'Toplam'}</Text>
                <Text style={styles.floatingCartPrice}>{formatPrice(totalPrice)}</Text>
              </View>
            </View>

        <View style={styles.floatingCartRight}>
              <Text style={styles.floatingCartBtnText}>{isEn ? 'View Cart & Order' : 'Sepeti Gör & Sipariş Ver'}</Text>
              <IconSymbol name="chevron.right" size={16} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Cart & Checkout Modal */}
      <Modal
        visible={showCartModal}
        transparent
        animationType="fade"
        onRequestClose={closeCartModal}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={closeCartModal}
          />
          <Animated.View
            style={[
              styles.cartSheetContent,
              isDark && styles.modalContentDark,
              {
                transform: [
                  {
                    translateY: cartModalAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [500, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            {/* Cart Header */}
            <View style={styles.cartSheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cartSheetTitle, isDark && styles.textLight]}>
                  {isEn ? 'Your Cart' : 'Sepetiniz'}
                </Text>
                <Text style={[styles.cartSheetSubtitle, isDark && styles.textMutedDark]}>
                  {provider.name} • {totalCartCount} {isEn ? 'items' : 'ürün'}
                </Text>
              </View>

              <TouchableOpacity style={styles.cartClearBtn} onPress={handleClearCart}>
                <Text style={styles.cartClearBtnText}>{isEn ? 'Clear' : 'Temizle'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalCloseBtn, { marginLeft: 8 }]}
                onPress={closeCartModal}
              >
                <IconSymbol name="xmark" size={18} color={isDark ? '#F8FAFC' : '#0F172A'} />
              </TouchableOpacity>
            </View>

            {/* Cart Item List */}
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 320, marginVertical: 6 }}>
              {cartItems.map((ci, idx) => (
                <View key={idx} style={[styles.cartItemRow, isDark && styles.cartItemRowDark]}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={[styles.cartItemName, isDark && styles.textLight]}>{ci.item.name}</Text>
                    <Text style={styles.cartItemPrice}>{ci.item.price}</Text>
                    {ci.note ? (
                      <Text style={[styles.cartItemNote, isDark && styles.textMutedDark]}>📝 {ci.note}</Text>
                    ) : null}
                  </View>

                  <View style={styles.cartQuantityControls}>
                    <TouchableOpacity
                      style={styles.cartQtyBtn}
                      onPress={() => handleDecreaseCartItem(ci.item.name)}
                    >
                      <Text style={styles.cartQtyBtnText}>-</Text>
                    </TouchableOpacity>
                    <Text style={[styles.cartQtyText, isDark && styles.textLight]}>{ci.count}</Text>
                    <TouchableOpacity
                      style={styles.cartQtyBtn}
                      onPress={() => handleIncreaseCartItem(ci.item.name)}
                    >
                      <Text style={styles.cartQtyBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>

            {/* Delivery Address Input */}
            <View style={{ marginTop: 8 }}>
              <Text style={[styles.inputFieldLabel, isDark && styles.textLight]}>
                {isEn ? 'Delivery Address & Location:' : 'Teslimat Adresi & Konum:'}
              </Text>
              <TextInput
                style={[styles.modalInput, isDark && styles.modalInputDark]}
                placeholder={isEn ? 'e.g. Kinaliada Bazaar Ave. No: 12...' : 'Örn: Kınalıada Çarşı Cad. No: 12...'}
                placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                value={orderAddress}
                onChangeText={setOrderAddress}
              />
            </View>

            {/* Note to Venue */}
            <View style={{ marginTop: 8 }}>
              <Text style={[styles.inputFieldLabel, isDark && styles.textLight]}>
                {isEn ? 'Order Note (Optional):' : 'Sipariş Notu (İsteğe Bağlı):'}
              </Text>
              <TextInput
                style={[styles.modalInput, isDark && styles.modalInputDark]}
                placeholder={isEn ? 'e.g. Please ring the doorbell, payment by card...' : 'Örn: Kapıda kredi kartı ile ödeme...'}
                placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                value={generalNote}
                onChangeText={setGeneralNote}
              />
            </View>

            {/* Cart Total Summary */}
            <View style={styles.cartSummaryRow}>
              <Text style={[styles.cartSummaryLabel, isDark && styles.textLight]}>
                {isEn ? 'Total Amount:' : 'Toplam Tutar:'}
              </Text>
              <Text style={styles.cartSummaryValue}>{formatPrice(totalPrice)}</Text>
            </View>

            {/* Order Action Buttons */}
            <View style={{ marginTop: 14 }}>
              <TouchableOpacity
                style={[styles.whatsappOrderBtn, { flex: undefined, width: '100%', height: 50 }]}
                onPress={handleCheckoutWhatsApp}
                activeOpacity={0.85}
              >
                <MaterialCommunityIcons name="whatsapp" size={22} color="#FFFFFF" />
                <Text style={styles.whatsappOrderBtnText}>
                  {isEn ? 'Order via WhatsApp' : 'WhatsApp ile Sipariş Ver'}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Item Detail Sheet Modal */}
      <Modal
        visible={!!selectedDetailItem}
        transparent
        animationType="fade"
        onRequestClose={closeDetailModal}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={closeDetailModal}
          />
          <Animated.View
            style={[
              styles.detailSheetContent,
              isDark && styles.modalContentDark,
              {
                transform: [
                  {
                    translateY: detailModalAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [500, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            {selectedDetailItem && (
              <>
                <View style={styles.detailSheetHeader}>
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      {selectedDetailItem.category && (
                        <View style={styles.itemCategoryBadge}>
                          <Text style={styles.itemCategoryBadgeText}>{selectedDetailItem.category}</Text>
                        </View>
                      )}
                      {selectedDetailItem.badge && (
                        <View style={styles.itemBadge}>
                          <Text style={styles.itemBadgeText}>{selectedDetailItem.badge}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.detailSheetTitle, isDark && styles.textLight]}>
                      {selectedDetailItem.name}
                    </Text>
                    <Text style={styles.detailSheetPrice}>{selectedDetailItem.price}</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.modalCloseBtn}
                    onPress={closeDetailModal}
                  >
                    <IconSymbol name="xmark" size={18} color={isDark ? '#F8FAFC' : '#0F172A'} />
                  </TouchableOpacity>
                </View>

                {selectedDetailItem.description && (
                  <Text style={[styles.detailDesc, isDark && styles.textMutedDark]}>
                    {selectedDetailItem.description}
                  </Text>
                )}

                <View style={styles.detailPriceRow}>
                  <Text style={styles.detailPriceLabel}>{isEn ? 'Unit Price:' : 'Birim Fiyat:'}</Text>
                  <Text style={styles.detailPriceValue}>{selectedDetailItem.price}</Text>
                </View>

                {/* Quantity Controls */}
                <View style={styles.quantityContainer}>
                  <Text style={[styles.quantityLabel, isDark && styles.textLight]}>{isEn ? 'Quantity:' : 'Adet:'}</Text>
                  <View style={styles.quantitySelector}>
                    <TouchableOpacity
                      style={styles.quantityBtn}
                      onPress={() => setDetailQuantity((q) => Math.max(1, q - 1))}
                    >
                      <Text style={styles.quantityBtnText}>-</Text>
                    </TouchableOpacity>
                    <Text style={[styles.quantityText, isDark && styles.textLight]}>{detailQuantity}</Text>
                    <TouchableOpacity
                      style={styles.quantityBtn}
                      onPress={() => setDetailQuantity((q) => q + 1)}
                    >
                      <Text style={styles.quantityBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Special Request Note Input */}
                <View style={{ marginTop: 14, marginBottom: 16 }}>
                  <Text style={[styles.noteLabel, isDark && styles.textLight]}>
                    {isEn ? 'Special Request / Note:' : 'Sipariş Notu (İsteğe Bağlı):'}
                  </Text>
                  <TextInput
                    style={[styles.noteInput, isDark && styles.noteInputDark]}
                    placeholder={isEn ? 'e.g. Extra sauce, no onions...' : 'Örn. Sos bol olsun, acısız olsun...'}
                    placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                    value={detailNote}
                    onChangeText={setDetailNote}
                  />
                </View>

                {/* Add to Cart Submit Button */}
                <TouchableOpacity
                  style={styles.detailAddToCartBtn}
                  onPress={handleDetailAddToCart}
                  activeOpacity={0.85}
                >
                  <IconSymbol name="cart.fill.badge.plus" size={18} color="#FFFFFF" />
                  <Text style={styles.detailAddToCartBtnText}>
                    {isEn ? 'Add to Cart' : 'Sepete Ekle'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </Animated.View>
        </View>
      </Modal>

      {/* Onboarding Swipe Demo Modal */}
      <Modal
        visible={showOnboarding}
        transparent
        animationType="fade"
        onRequestClose={handleDismissOnboarding}
      >
        <View style={styles.onboardingOverlay}>
          <View style={[styles.onboardingCard, isDark && styles.onboardingCardDark]}>
            {/* Tooltip Header */}
            <View style={styles.onboardingHeader}>
              <View style={styles.onboardingBadge}>
                <Text style={styles.onboardingBadgeText}>💡 İNTERAKTİF MENÜ İPUCU</Text>
              </View>
            </View>

            <Text style={[styles.onboardingTitle, isDark && styles.textLight]}>
              {isEn ? 'Tap for details or Swipe to Add' : 'Ürün Ekranını Açın veya Sağa Kaydırın'}
            </Text>

            <Text style={[styles.onboardingDesc, isDark && styles.textMutedDark]}>
              {isEn
                ? 'Tap any item to see details and customize your order, or swipe sideways to quickly add it to your cart.'
                : 'Detayları görmek için ürüne tıklayabilir veya sağa kaydırarak anında sepetinize ekleyebilirsiniz.'}
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
                  <Text style={[styles.itemName, isDark && styles.textLight]}>{provider.menu?.[0]?.name || 'Maestro Özel Burger'}</Text>
                  <Text style={[styles.itemDesc, isDark && styles.textMutedDark]} numberOfLines={1}>
                    {provider.menu?.[0]?.description || '200g dana köfte, cheddar, patates...'}
                  </Text>
                </View>
                <Text style={styles.itemPrice}>{provider.menu?.[0]?.price || '280 ₺'}</Text>
              </Animated.View>

            </View>

            {/* Close Button */}
            <TouchableOpacity
              style={styles.onboardingBtn}
              onPress={handleDismissOnboarding}
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

{/* Swipeable & Clickable Menu Card Component */}
function SwipeableMenuCard({
  item,
  isDark,
  cartQuantity = 0,
  onAddToCart,
  onPressItem,
  onSwipeStart,
  onSwipeEnd,
}: {
  item: MenuItem;
  isDark: boolean;
  cartQuantity?: number;
  onAddToCart: (item: MenuItem) => void;
  onPressItem: (item: MenuItem) => void;
  onSwipeStart?: () => void;
  onSwipeEnd?: () => void;
}) {
  const panX = useRef(new Animated.Value(0)).current;
  const [isAdded, setIsAdded] = useState(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only capture gesture for clear rightward horizontal swipe
        return gestureState.dx > 8 && gestureState.dx > Math.abs(gestureState.dy);
      },
      onPanResponderGrant: () => {
        onSwipeStart?.();
      },
      onPanResponderTerminationRequest: () => true,
      onPanResponderMove: (_, gestureState) => {
        // Smoothly follow finger right and left between 0 and 140px
        const clampedX = Math.max(0, Math.min(gestureState.dx, 140));
        panX.setValue(clampedX);
      },
      onPanResponderRelease: (_, gestureState) => {
        onSwipeEnd?.();
        if (gestureState.dx > 65) {
          onAddToCart(item);
          setIsAdded(true);
          setTimeout(() => setIsAdded(false), 1600);
        }
        Animated.spring(panX, {
          toValue: 0,
          useNativeDriver: true,
          tension: 80,
          friction: 10,
        }).start();
      },
      onPanResponderTerminate: () => {
        onSwipeEnd?.();
        Animated.spring(panX, {
          toValue: 0,
          useNativeDriver: true,
          tension: 80,
          friction: 10,
        }).start();
      },
    })
  ).current;

  const clampedTranslateX = panX.interpolate({
    inputRange: [0, 200],
    outputRange: [0, 200],
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <View style={styles.swipeContainer}>
      {/* Background action revealed on right-swipe */}
      <View style={[styles.swipeBackground, { paddingLeft: 18 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <IconSymbol name="cart.badge.plus" size={20} color="#FFFFFF" />
          <Text style={styles.swipeText}>Sepete Ekle</Text>
        </View>
      </View>

      {/* Main Foreground Card that slides right */}
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.menuCard,
          isDark && styles.menuCardDark,
          cartQuantity > 0 && (isDark ? styles.menuCardInCartDark : styles.menuCardInCart),
          { transform: [{ translateX: clampedTranslateX }] },
        ]}
      >
        <Pressable
          style={{ flex: 1, paddingRight: 12 }}
          onPress={() => onPressItem(item)}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
            <Text style={[styles.itemName, isDark && styles.textLight]}>{item.name}</Text>
            {cartQuantity > 0 && (
              <View style={styles.itemInCartBadge}>
                <IconSymbol name="bag.fill" size={10} color="#FFFFFF" />
                <Text style={styles.itemInCartBadgeText}>{cartQuantity} Adet</Text>
              </View>
            )}
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
          {item.description ? (
            <Text style={[styles.itemDesc, isDark && styles.textMutedDark]}>{item.description}</Text>
          ) : null}
        </Pressable>

        <Pressable onPress={() => onPressItem(item)} style={{ alignSelf: 'center', paddingLeft: 8 }}>
          <Text style={[styles.itemPrice, cartQuantity > 0 && styles.itemPriceInCart]}>{item.price}</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
  headerCartButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  headerCartButtonDark: {
    backgroundColor: '#334155',
  },
  headerCartBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  headerCartBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
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
    marginTop: 12,
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
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    zIndex: 10,
  },
  categoryBarDark: {
    backgroundColor: '#0F172A',
    borderBottomColor: '#1E293B',
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
  menuCardInCart: {
    borderColor: '#10B981',
    borderWidth: 1.5,
    backgroundColor: '#FAFCFA',
  },
  menuCardInCartDark: {
    borderColor: '#10B981',
    borderWidth: 1.5,
    backgroundColor: '#064E3B15',
  },
  itemInCartBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  itemInCartBadgeText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '800',
  },
  itemPriceInCart: {
    color: '#059669',
    fontWeight: '800',
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
  itemCategoryBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  itemCategoryBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
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
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  detailSheetContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: 32,
    minHeight: '62%',
    maxHeight: '90%',
  },
  modalContentDark: {
    backgroundColor: '#1E293B',
  },
  detailSheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  detailTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalCloseBtn: {
    padding: 8,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
  },
  detailDesc: {
    fontSize: 15,
    color: '#64748B',
    lineHeight: 22,
    marginVertical: 10,
  },
  detailPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
    marginVertical: 8,
  },
  detailPriceLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
  detailPriceValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#059669',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
    marginBottom: 6,
  },
  quantityLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  quantityBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  quantityBtnText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  quantityText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    minWidth: 24,
    textAlign: 'center',
  },
  noteLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  noteInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0F172A',
  },
  noteInputDark: {
    backgroundColor: '#0F172A',
    borderColor: '#334155',
    color: '#F8FAFC',
  },
  detailAddToCartBtn: {
    backgroundColor: '#059669',
    paddingVertical: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 14,
  },
  detailAddToCartBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
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
  floatingCartBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 99,
  },
  floatingCartBtn: {
    backgroundColor: '#059669',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  floatingCartLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  floatingCartIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  floatingCartBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#059669',
    paddingHorizontal: 3,
  },
  floatingCartBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  floatingCartLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 11,
    fontWeight: '600',
  },
  floatingCartPrice: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  floatingCartRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  floatingCartBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  cartSheetContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 22,
    paddingBottom: 36,
    maxHeight: '90%',
  },
  cartSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  cartSheetTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  cartSheetSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  cartClearBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#FEE2E2',
  },
  cartClearBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444',
  },
  cartItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  cartItemRowDark: {
    borderBottomColor: '#334155',
  },
  cartItemName: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  cartItemPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
    marginTop: 2,
  },
  cartItemNote: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 3,
    fontStyle: 'italic',
  },
  cartQuantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  cartQtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  cartQtyBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  cartQtyText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    minWidth: 18,
    textAlign: 'center',
  },
  inputHeading: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  cartInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#0F172A',
  },
  cartInputDark: {
    backgroundColor: '#0F172A',
    borderColor: '#334155',
    color: '#F8FAFC',
  },
  cartSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
    marginVertical: 4,
  },
  cartSummaryLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  cartSummaryValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#059669',
  },
  callOrderBtn: {
    backgroundColor: '#3B82F6',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  callOrderBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  whatsappOrderBtn: {
    flex: 1,
    backgroundColor: '#25D366',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#25D366',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  whatsappOrderBtnText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '800',
  },
  inputFieldLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13.5,
    color: '#0F172A',
  },
  modalInputDark: {
    backgroundColor: '#0F172A',
    borderColor: '#334155',
    color: '#F8FAFC',
  },
  detailSheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  detailSheetPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: '#059669',
    marginTop: 2,
  },
});
