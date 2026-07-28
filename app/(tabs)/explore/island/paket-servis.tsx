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
  Modal,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import LoginPromptModal from '@/components/LoginPromptModal';
import { submitDeliveryVote, DeliveryDemandOption } from '@/services/demandApi';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface MenuItem {
  name: string;
  price: string;
  category?: string;
  description?: string;
  badge?: string;
}

interface DeliveryProvider {
  id: string;
  name: string;
  category: 'market' | 'waterGas' | 'cargo' | 'food' | 'courier';
  categoryLabel: string;
  island: string;
  phone: string;
  whatsapp?: string;
  description: string;
  workingHours: string;
  estimatedTime: string;
  minOrder?: string;
  badge?: string;
  isElectricVehicle?: boolean;
  menu?: MenuItem[];
}

const PROVIDERS: DeliveryProvider[] = [
  {
    id: '1',
    name: 'Kınalıada Su & İpragaz Servisi',
    category: 'waterGas',
    categoryLabel: 'Su & Tüp',
    island: 'Kınalıada',
    phone: '+905331112244',
    whatsapp: '+905331112244',
    description: 'Erikli, Pınar su ve İpragaz/Aygaz tüp kapıya teslimat servisi.',
    workingHours: '08:30 - 20:00',
    estimatedTime: '20 - 35 dk',
    minOrder: '80 ₺',
    badge: 'Aynı Gün Teslimat',
  },
  {
    id: '2',
    name: 'Kınalıada Ada Market & Bakkal',
    category: 'market',
    categoryLabel: 'Market & Bakkal',
    island: 'Kınalıada',
    phone: '+905332223355',
    whatsapp: '+905332223355',
    description: 'Günlük taze ekmek, süt, şarküteri ve market ihtiyaçları adrese teslimat.',
    workingHours: '08:00 - 22:30',
    estimatedTime: '15 - 30 dk',
    minOrder: '60 ₺',
    badge: 'Hızlı Servis',
  },
  {
    id: '3',
    name: 'Kınalıada PTT & Kargo Dağıtım Noktası',
    category: 'cargo',
    categoryLabel: 'Kargo & Paket',
    island: 'Kınalıada',
    phone: '+905334445566',
    description: 'Kınalıada kargo ve paket teslim alım/dağıtım bilgilendirme hattı.',
    workingHours: '09:00 - 17:00',
    estimatedTime: 'Gün içi',
    badge: 'Kargo Noktası',
  },
  {
    id: '4',
    name: 'Ada İçi Kurye & Paket',
    category: 'courier',
    categoryLabel: 'Ada İçi Kurye',
    island: 'Tüm Adalar',
    phone: '+905301234567',
    whatsapp: '+905301234567',
    description: 'Adalar içi kapıdan kapıya hızlı paket ve evrak taşıma servisi.',
    workingHours: '08:30 - 21:00',
    estimatedTime: '20 - 35 dk',
    minOrder: '50 ₺',
    badge: 'Hızlı Kurye',
  },
  {
    id: '5',
    name: 'Harbiye Börekçisi',
    category: 'food',
    categoryLabel: 'Restoran & Kafe',
    island: 'Kınalıada',
    phone: '+905336667788',
    whatsapp: '+905336667788',
    description: 'Taze sıcak börek çeşitleri, poğaça, boyoz ve kahvaltı paket servisi.',
    workingHours: '06:30 - 18:00',
    estimatedTime: '15 - 25 dk',
    minOrder: '70 ₺',
    badge: 'Taze & Sıcak',
    menu: [
      { name: 'Kıymalı Su Böreği (Porsiyon)', price: '110 ₺', category: 'Börekler', badge: 'Çok Satan' },
      { name: 'Peynirli Su Böreği (Porsiyon)', price: '95 ₺', category: 'Börekler' },
      { name: 'Kütüt Böreği (Pudra Şekerli)', price: '90 ₺', category: 'Börekler' },
      { name: 'Patatesli Kuru Börek', price: '85 ₺', category: 'Börekler' },
      { name: 'İzmir Boyoz', price: '45 ₺', category: 'Hamur İşleri' },
      { name: 'Sıcak Demleme Çay', price: '30 ₺', category: 'İçecekler' },
    ]
  },
  {
    id: '6',
    name: 'Maestro Cafe Bar Restaurant',
    category: 'food',
    categoryLabel: 'Restoran & Kafe',
    island: 'Kınalıada',
    phone: '+905337778899',
    whatsapp: '+905337778899',
    description: 'Zengin dünya mutfağı, makarna, pizza, burger ve soğuk-sıcak içecek servisi.',
    workingHours: '09:00 - 00:00',
    estimatedTime: '20 - 35 dk',
    minOrder: '120 ₺',
    badge: 'Ada Favorisi',
    menu: [
      { name: 'Maestro Özel Burger', price: '280 ₺', category: 'Burgerler', description: '200g dana köfte, karamelize soğan, cheddar, özel sos, patates kızartması', badge: 'Popüler' },
      { name: 'Pizza Margherita', price: '240 ₺', category: 'Pizzalar', description: 'Taze mozzarella, fesleğen, domates sosu' },
      { name: 'Pizza Quattro Formaggi', price: '290 ₺', category: 'Pizzalar', description: 'Gorgonzola, mozzarella, parmesan, roquefort', badge: 'Şefin Seçimi' },
      { name: 'Penne Arrabbiata', price: '210 ₺', category: 'Makarnalar', description: 'Acılı domates sosu, sarımsak, taze fesleğen, parmesan' },
      { name: 'Sezar Salata', price: '195 ₺', category: 'Salatalar', description: 'Izgara tavuk göğsü, kruton, sezar sos, parmesan' },
      { name: 'Taze Sıkma Portakal Suyu', price: '75 ₺', category: 'İçecekler' },
      { name: 'San Sebastian Cheesecake', price: '140 ₺', category: 'Tatlılar', badge: 'Taze' },
    ]
  },
  {
    id: '7',
    name: 'Hina Cafe',
    category: 'food',
    categoryLabel: 'Restoran & Kafe',
    island: 'Kınalıada',
    phone: '+905338889900',
    whatsapp: '+905338889900',
    description: 'Özel nitelikli kahveler, taze tatlılar, kruvasan ve kahvaltı tabağı paket servisi.',
    workingHours: '08:30 - 22:00',
    estimatedTime: '15 - 30 dk',
    minOrder: '85 ₺',
    badge: '3. Nesil Kahve',
    menu: [
      { name: 'Flat White (Specialty Coffee)', price: '95 ₺', category: 'Kahveler', badge: '3. Nesil' },
      { name: 'Iced Caramel Latte', price: '110 ₺', category: 'Soğuk Kahveler', badge: 'Popüler' },
      { name: 'Tereyağlı Kruvasan', price: '90 ₺', category: 'Fırın & Tatlı' },
      { name: 'Çikolatalı Babka', price: '120 ₺', category: 'Fırın & Tatlı' },
      { name: 'Serpme Ada Kahvaltı Tabağı', price: '320 ₺', category: 'Kahvaltı' },
    ]
  },
  {
    id: '8',
    name: 'Kaiki Cafe',
    category: 'food',
    categoryLabel: 'Restoran & Kafe',
    island: 'Kınalıada',
    phone: '+905339990011',
    whatsapp: '+905339990011',
    description: 'Deniz manzaralı lezzetler, tost, sandviç, soğuk kahve ve atıştırmalık paket servis.',
    workingHours: '09:00 - 23:00',
    estimatedTime: '20 - 30 dk',
    minOrder: '90 ₺',
    badge: 'Hızlı Paket',
    menu: [
      { name: 'Ayvalık Tostu', price: '160 ₺', category: 'Tostlar', badge: 'Popüler' },
      { name: 'Kulüp Sandviç', price: '185 ₺', category: 'Sandviçler' },
      { name: 'Soğuk Americano', price: '90 ₺', category: 'İçecekler' },
      { name: 'Çıtır Patates Tabağı', price: '120 ₺', category: 'Atıştırmalıklar' },
    ]
  },
  {
    id: '9',
    name: 'Juju Kafe',
    category: 'food',
    categoryLabel: 'Restoran & Kafe',
    island: 'Kınalıada',
    phone: '+905330001122',
    whatsapp: '+905330001122',
    description: 'Ev yapımı kekler, kurabiyeler, waffle, pankek ve taze sıkma meyve suları.',
    workingHours: '09:00 - 22:00',
    estimatedTime: '15 - 25 dk',
    minOrder: '75 ₺',
    badge: 'Tatlı & Kahve',
    menu: [
      { name: 'Belçika Çikolatalı Waffle', price: '190 ₺', category: 'Waffle & Pankek', badge: 'Popüler' },
      { name: 'Meyveli Pankek Kulesi', price: '175 ₺', category: 'Waffle & Pankek' },
      { name: 'Ev Yapımı Limonata', price: '75 ₺', category: 'İçecekler', badge: 'Taze' },
      { name: 'Havuçlu Tarçınlı Kek', price: '95 ₺', category: 'Tatlılar' },
    ]
  },
  {
    id: '10',
    name: 'Büyükada Su & İpragaz Servisi',
    category: 'waterGas',
    categoryLabel: 'Su & Tüp',
    island: 'Büyükada',
    phone: '+905321112233',
    whatsapp: '+905321112233',
    description: 'Erikli, Saka su ve Aygaz/İpragaz tüp ev teslimat servisi.',
    workingHours: '09:00 - 19:30',
    estimatedTime: '30 - 45 dk',
    minOrder: '100 ₺',
    badge: 'Aynı Gün Teslimat',
  },
  {
    id: '7',
    name: 'Burgazada Ada Market & Şarküteri',
    category: 'market',
    categoryLabel: 'Market & Bakkal',
    island: 'Burgazada',
    phone: '+905359998877',
    whatsapp: '+905359998877',
    description: 'Taze meyve, sebze, ada ürünleri ve günlük market ihtiyaçları siparişi.',
    workingHours: '08:00 - 22:00',
    estimatedTime: '15 - 30 dk',
    minOrder: '75 ₺',
    badge: 'Hızlı Servis',
  },
  {
    id: '8',
    name: 'Heybeliada Ada Fırın & Restoran Servis',
    category: 'food',
    categoryLabel: 'Restoran & Kafe',
    island: 'Heybeliada',
    phone: '+905367778899',
    whatsapp: '+905367778899',
    description: 'Sıcak börek, meze, pizza ve ev yemekleri paket servisi.',
    workingHours: '10:00 - 23:00',
    estimatedTime: '25 - 40 dk',
    minOrder: '150 ₺',
    badge: 'Sıcak Teslimat',
  },
];

export default function PaketServisScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { isLoggedIn } = useAuth();
  const { islandId } = useLocalSearchParams<{ islandId?: string }>();
  const isEn = i18n.language.startsWith('en');

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedIsland, setSelectedIsland] = useState<string>(
    islandId && islandId !== 'all' ? islandId : 'Kınalıada'
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Demand Survey Modal State
  const [showDemandModal, setShowDemandModal] = useState<boolean>(false);
  const [selectedVoteOption, setSelectedVoteOption] = useState<DeliveryDemandOption | null>(null);
  const [voteOtherText, setVoteOtherText] = useState<string>('');
  const [isSubmittingVote, setIsSubmittingVote] = useState<boolean>(false);
  const [voteSubmittedSuccess, setVoteSubmittedSuccess] = useState<boolean>(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState<boolean>(false);
  
  // Venue Menu Modal State
  const [selectedMenuProvider, setSelectedMenuProvider] = useState<DeliveryProvider | null>(null);

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

  const handleVoteSubmit = async () => {
    if (!selectedVoteOption) return;
    setIsSubmittingVote(true);
    const success = await submitDeliveryVote(selectedVoteOption, voteOtherText);
    setIsSubmittingVote(false);
    if (success) {
      setVoteSubmittedSuccess(true);
      AsyncStorage.setItem('has_completed_delivery_survey', 'true');
    }
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

        {/* Search Bar */}
        <View style={[styles.searchContainer, isDark && styles.searchContainerDark]}>
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
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.islandRow} contentContainerStyle={{ paddingHorizontal: 0, gap: 10 }}>
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

      {/* Category Tabs */}
      <View style={[styles.categorySection, isDark && styles.categorySectionDark]}>
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

      {/* Main Content */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Demand Banner */}
        <View style={[styles.demandBanner, isDark && styles.demandBannerDark]}>
          <View style={styles.demandBannerHeader}>
            <View style={styles.demandIconWrapper}>
              <IconSymbol name="bag.fill" size={24} color="#8B5CF6" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.demandBannerTitle, isDark && styles.textLight]}>
                {t('deliveryService.demandBannerTitle', { defaultValue: isEn ? 'Need a specific delivery service?' : 'Adada Paket Servis İhtiyacınız mı Var?' })}
              </Text>
              <Text style={[styles.demandBannerDesc, isDark && styles.textMutedDark]}>
                {t('deliveryService.demandBannerDesc', { defaultValue: isEn ? 'Which delivery service would you use most on the island? Let us know!' : 'Hangi paket servislerin adaya gelmesini istersiniz? Anketimize katılarak iletin!' })}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.demandBannerBtn}
            onPress={() => {
              if (!isLoggedIn) {
                setShowLoginPrompt(true);
              } else {
                setSelectedVoteOption(null);
                setVoteOtherText('');
                setVoteSubmittedSuccess(false);
                setShowDemandModal(true);
              }
            }}
          >
            <Text style={styles.demandBannerBtnText}>
              {t('deliveryService.voteButton', { defaultValue: isEn ? 'Take Survey' : 'Ankete Katıl' })}
            </Text>
            <IconSymbol name="chevron.right" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Provider List */}
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
            <View key={provider.id} style={[styles.providerCard, isDark && styles.providerCardDark]}>
              {/* Card Top */}
              <View style={styles.cardHeader}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryBadgeText}>{provider.categoryLabel}</Text>
                    </View>
                  </View>
                  <Text style={[styles.providerName, isDark && styles.textLight]}>{provider.name}</Text>
                </View>

                <View style={[styles.islandBadge, isDark && styles.islandBadgeDark, { alignSelf: 'flex-start' }]}>
                  <Text style={[styles.islandBadgeText, isDark && styles.islandBadgeTextDark]}>{provider.island}</Text>
                </View>
              </View>

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

              {/* Action Buttons */}
              <View style={styles.actionRow}>
                {provider.menu && provider.menu.length > 0 && (
                  <TouchableOpacity style={styles.menuButton} onPress={() => setSelectedMenuProvider(provider)}>
                    <IconSymbol name="fork.knife" size={15} color="#FFFFFF" />
                    <Text style={styles.actionBtnText}>{isEn ? 'View Menu' : 'Menüyü Gör'}</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity style={styles.callButton} onPress={() => handleCall(provider.phone)}>
                  <IconSymbol name="phone.fill" size={15} color="#FFFFFF" />
                  <Text style={styles.actionBtnText}>{t('deliveryService.actions.call', { defaultValue: isEn ? 'Call' : 'Ara' })}</Text>
                </TouchableOpacity>

                {provider.whatsapp && (
                  <TouchableOpacity style={styles.whatsappButton} onPress={() => handleWhatsApp(provider.whatsapp!)}>
                    <IconSymbol name="message.fill" size={15} color="#FFFFFF" />
                    <Text style={styles.actionBtnText}>WhatsApp</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Demand Survey Modal */}
      <Modal visible={showDemandModal} transparent animationType="slide" onRequestClose={() => setShowDemandModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDark && styles.modalContentDark]}>
            {voteSubmittedSuccess ? (
              <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                <View style={[styles.successIconCircle, isDark && { backgroundColor: '#064E3B' }]}>
                  <IconSymbol name="checkmark" size={32} color="#10B981" />
                </View>
                <Text style={[styles.modalTitle, isDark && styles.textLight, { marginTop: 16 }]}>
                  {isEn ? 'Thank You!' : 'Teşekkürler!'}
                </Text>
                <Text style={[styles.modalSubtitle, isDark && styles.textMutedDark, { textAlign: 'center', marginBottom: 24 }]}>
                  {isEn ? 'Your feedback has been submitted to our team. We are working hard to bring more delivery services to the islands.' : 'Görüşleriniz alındı. Adalara daha fazla paket servis hizmeti getirmek için çalışıyoruz.'}
                </Text>
                <Pressable style={styles.modalCloseBtn} onPress={() => setShowDemandModal(false)}>
                  <Text style={styles.modalCloseBtnText}>{isEn ? 'Close' : 'Kapat'}</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <Text style={[styles.modalTitle, isDark && styles.textLight]}>
                  {isEn ? 'Delivery Service Demand' : 'Paket Servis Talebi'}
                </Text>
                <Text style={[styles.modalSubtitle, isDark && styles.textMutedDark]}>
                  {isEn ? 'Which service do you need most on the island?' : 'Adada en çok hangi paket servis hizmetine ihtiyaç duyuyorsunuz?'}
                </Text>

                <View style={{ gap: 10, marginVertical: 16 }}>
                  {[
                    { key: 'CARGO' as DeliveryDemandOption, label: isEn ? 'Cargo / Parcel Courier' : 'Kargo & Paket Taşıma' },
                    { key: 'SUPERMARKET' as DeliveryDemandOption, label: isEn ? 'Supermarket & Grocery Delivery' : 'Market & Restoran Servisi' },
                    { key: 'WATER_GAS' as DeliveryDemandOption, label: isEn ? 'Water & Gas Cylinder Delivery' : 'Su & Tüp Servisi' },
                    { key: 'OTHER' as DeliveryDemandOption, label: isEn ? 'Other' : 'Diğer' },
                  ].map((item) => {
                    const isSelected = selectedVoteOption === item.key;
                    return (
                      <Pressable
                        key={item.key}
                        style={[
                          styles.voteOptionCard,
                          isDark && styles.voteOptionCardDark,
                          isSelected && styles.voteOptionCardSelected,
                        ]}
                        onPress={() => setSelectedVoteOption(item.key)}
                      >
                        <Text
                          style={[
                            styles.voteOptionText,
                            isDark && styles.textLight,
                            isSelected && { color: '#8B5CF6', fontWeight: '700' },
                          ]}
                        >
                          {item.label}
                        </Text>
                        {isSelected && <IconSymbol name="checkmark.circle.fill" size={20} color="#8B5CF6" />}
                      </Pressable>
                    );
                  })}

                  {selectedVoteOption === 'OTHER' && (
                    <TextInput
                      style={[styles.voteInput, isDark && styles.voteInputDark]}
                      placeholder={isEn ? 'Please specify service details...' : 'Lütfen detayları belirtin...'}
                      placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                      value={voteOtherText}
                      onChangeText={setVoteOtherText}
                    />
                  )}
                </View>

                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <Pressable style={[styles.modalCancelBtn, isDark && styles.modalCancelBtnDark]} onPress={() => setShowDemandModal(false)}>
                    <Text style={[styles.modalCancelBtnText, isDark && styles.textMutedDark]}>{isEn ? 'Cancel' : 'İptal'}</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.modalSubmitBtn, !selectedVoteOption && { opacity: 0.5 }]}
                    disabled={!selectedVoteOption || isSubmittingVote}
                    onPress={handleVoteSubmit}
                  >
                    {isSubmittingVote ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.modalSubmitBtnText}>{isEn ? 'Submit' : 'Gönder'}</Text>
                    )}
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Venue Menu Modal */}
      <Modal visible={!!selectedMenuProvider} transparent animationType="slide" onRequestClose={() => setSelectedMenuProvider(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.menuModalContent, isDark && styles.modalContentDark]}>
            {selectedMenuProvider && (
              <>
                <View style={styles.menuHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <View style={styles.categoryBadge}>
                        <Text style={styles.categoryBadgeText}>{selectedMenuProvider.categoryLabel}</Text>
                      </View>
                      <View style={[styles.islandBadge, isDark && styles.islandBadgeDark]}>
                        <Text style={[styles.islandBadgeText, isDark && styles.islandBadgeTextDark]}>{selectedMenuProvider.island}</Text>
                      </View>
                    </View>
                    <Text style={[styles.menuTitle, isDark && styles.textLight]}>{selectedMenuProvider.name}</Text>
                    <Text style={[styles.menuSubtitle, isDark && styles.textMutedDark]}>
                      🕒 {selectedMenuProvider.workingHours} • 🛵 {selectedMenuProvider.estimatedTime}
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.modalCloseIconBtn} onPress={() => setSelectedMenuProvider(null)}>
                    <IconSymbol name="xmark" size={18} color={isDark ? '#F8FAFC' : '#0F172A'} />
                  </TouchableOpacity>
                </View>

                {/* Menu Items List */}
                <ScrollView style={{ maxHeight: 380, marginVertical: 14 }} showsVerticalScrollIndicator={false}>
                  {selectedMenuProvider.menu && selectedMenuProvider.menu.map((item, idx) => (
                    <View key={idx} style={[styles.menuItemCard, isDark && styles.menuItemCardDark]}>
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                          <Text style={[styles.menuItemName, isDark && styles.textLight]}>{item.name}</Text>
                          {item.badge && (
                            <View style={styles.itemBadge}>
                              <Text style={styles.itemBadgeText}>{item.badge}</Text>
                            </View>
                          )}
                        </View>
                        {item.description && (
                          <Text style={[styles.menuItemDesc, isDark && styles.textMutedDark]}>{item.description}</Text>
                        )}
                        {item.category && (
                          <Text style={styles.menuItemCategory}>{item.category}</Text>
                        )}
                      </View>
                      <Text style={styles.menuItemPrice}>{item.price}</Text>
                    </View>
                  ))}
                </ScrollView>

                {/* Action Row at Bottom */}
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                  <TouchableOpacity style={styles.callButton} onPress={() => handleCall(selectedMenuProvider.phone)}>
                    <IconSymbol name="phone.fill" size={15} color="#FFFFFF" />
                    <Text style={styles.actionBtnText}>{t('deliveryService.actions.call', { defaultValue: isEn ? 'Call' : 'Ara' })}</Text>
                  </TouchableOpacity>

                  {selectedMenuProvider.whatsapp && (
                    <TouchableOpacity style={styles.whatsappButton} onPress={() => handleWhatsApp(selectedMenuProvider.whatsapp!)}>
                      <IconSymbol name="message.fill" size={15} color="#FFFFFF" />
                      <Text style={styles.actionBtnText}>WhatsApp</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

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
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerDark: {
    backgroundColor: '#1E293B',
    borderBottomColor: '#334155',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
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
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 12,
  },
  searchContainerDark: {
    backgroundColor: '#0F172A',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    marginLeft: 8,
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
    backgroundColor: '#0F172A',
    borderColor: '#334155',
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  categorySectionDark: {
    backgroundColor: '#1E293B',
    borderBottomColor: '#334155',
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
    padding: 16,
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
