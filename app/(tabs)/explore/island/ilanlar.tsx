import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Dimensions,
  Image,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { Modal, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as listingApi from '@/services/listingApi';
import { ListingDto, ListingCategory } from '@/services/listingApi';
import { Island } from '@/services/forumApi';
import { formatDistanceToNow } from 'date-fns';
import { tr, enUS } from 'date-fns/locale';
import i18n from '@/utils/i18n';
import * as ImagePicker from 'expo-image-picker';
import * as mediaApi from '@/services/mediaApi';
import LoginPromptModal from '@/components/LoginPromptModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// İlan türleri
type IlanCategory = 'all' | 'emlak' | 'service' | 'lost' | 'job';

const CATEGORY_CONFIG: Record<IlanCategory, { label: string; icon: string; color: string; bg: string; backend?: ListingCategory }> = {
  all:     { label: 'Tümü',      icon: 'square.grid.2x2.fill', color: '#3B82F6', bg: '#EFF6FF' },
  emlak:   { label: 'Emlak',     icon: 'house.fill',           color: '#10B981', bg: '#ECFDF5' },
  service: { label: 'Hizmet',    icon: 'wrench.and.screwdriver.fill', color: '#8B5CF6', bg: '#F5F3FF', backend: ListingCategory.HIZMET },
  job:     { label: 'İş İlanı',  icon: 'briefcase.fill',       color: '#6366F1', bg: '#EEF2FF', backend: ListingCategory.IS_ILANI },
  lost:    { label: 'Kayıp',     icon: 'exclamationmark.triangle.fill', color: '#EF4444', bg: '#FEF2F2', backend: ListingCategory.KAYIP },
};

const ISLAND_ENUM_MAP: Record<string, Island> = {
  'Büyükada':   Island.BUYUKADA,
  'Heybeliada': Island.HEYBELIADA,
  'Burgazada':  Island.BURGAZADA,
  'Kınalıada':  Island.KINALIADA,
  'Sedef Adası': Island.SEDEF_ADASI,
};
const getIslandEnum = (name: string): Island =>
  ISLAND_ENUM_MAP[name] ?? Island.BUYUKADA;

const SAMPLE_ILANLAR: ListingDto[] = []; // Replaced by real data

export default function IlanlarScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isLoggedIn } = useAuth();
  
  const [listings, setListings] = useState<ListingDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<IlanCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdModalVisible, setIsAdModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  // Ad Fields State
  const [adTitle, setAdTitle] = useState('');
  const [adPrice, setAdPrice] = useState('');
  const [adDesc, setAdDesc] = useState('');
  const [adCat, setAdCat] = useState<IlanCategory>('emlak');
  const [adSubCat, setAdSubCat] = useState<'sell' | 'rent'>('sell');
  const [adIsland, setAdIsland] = useState('Büyükada');

  const islands = ['Büyükada', 'Heybeliada', 'Burgazada', 'Kınalıada', 'Sedef Adası'];

  const loadListings = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    if (selectedCategory === 'emlak') {
      // Fetch all and filter for SATILIK + KIRALIK
      const data = await listingApi.fetchListings();
      setListings(data.filter(l => l.category === ListingCategory.SATILIK || l.category === ListingCategory.KIRALIK));
    } else {
      const backendCat = CATEGORY_CONFIG[selectedCategory].backend;
      const data = await listingApi.fetchListings(backendCat);
      setListings(data);
    }
    setIsLoading(false);
    setIsRefreshing(false);
  };

  React.useEffect(() => {
    loadListings();
  }, [selectedCategory]);

  const onRefresh = () => {
    setIsRefreshing(true);
    loadListings(false);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const handlePublish = async () => {
    if (!adTitle.trim() || !adPrice.trim()) return;

    setIsUploading(true);
    let imageUrl = undefined;
    if (selectedImage) {
      imageUrl = await mediaApi.uploadImage(selectedImage) || undefined;
    }

    const request: listingApi.SaveListingRequest = {
      title: adTitle.trim(),
      description: adDesc.trim(),
      category: adCat === 'emlak' ? (adSubCat === 'rent' ? ListingCategory.KIRALIK : ListingCategory.SATILIK) : (CATEGORY_CONFIG[adCat].backend || ListingCategory.SATILIK),
      island: getIslandEnum(adIsland),
      price: parseFloat(adPrice),
      active: true,
      contactInfo: 'Shared via Ada+ app',
      imageUrl: imageUrl
    };

    const createdListing = await listingApi.createListing(request);
    setIsUploading(false);

    if (createdListing) {
      setListings([createdListing, ...listings]);
      setIsAdModalVisible(false);
      // Reset form
      setAdTitle('');
      setAdPrice('');
      setAdDesc('');
      setSelectedImage(null);
      
      Alert.alert(
        t('common.success', { defaultValue: 'Başarılı' }), 
        t('common.listingReceived', { defaultValue: 'İlan isteğiniz alınmıştır' })
      );
    }
  };

  const adCategories = [
    { id: 'emlak', label: 'Emlak', icon: 'home-outline' },
    { id: 'service', label: 'Hizmet', icon: 'hammer-wrench' },
    { id: 'job', label: 'İş İlanı', icon: 'briefcase-outline' },
    { id: 'lost', label: 'Kayıp', icon: 'alert-circle-outline' },
  ];

  const filteredListings = listings.filter(l => {
    if (!searchQuery) return true;
    return l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
           l.description.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.navigate('/(tabs)/explore')}>
          <IconSymbol name="chevron.left" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>İlanlar</Text>
      </View>

      {/* Category Pills */}
      <View style={styles.tabsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContainer} bounces={true}>
          {(Object.keys(CATEGORY_CONFIG) as IlanCategory[]).map(key => {
            const cfg = CATEGORY_CONFIG[key];
            const isActive = selectedCategory === key;
            return (
              <TouchableOpacity
                key={key}
                style={[
                  styles.tabItem,
                  isActive && styles.activeTabItem
                ]}
                onPress={() => setSelectedCategory(key)}
                activeOpacity={0.7}
              >
                <IconSymbol 
                  name={cfg.icon as any} 
                  size={14} 
                  color={isActive ? '#FFFFFF' : '#475569'} 
                />
                <Text style={[styles.tabLabel, isActive && styles.activeTabLabel]}>
                  {cfg.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* İlan List */}
      <ScrollView 
        style={styles.listContainer} 
        contentContainerStyle={[styles.listContent, ((isLoading && !isRefreshing) || filteredListings.length === 0) && { flex: 1 }]} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#3B82F6" />
        }
      >
        {isLoading && !isRefreshing ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color="#3B82F6" />
          </View>
        ) : filteredListings.length === 0 ? (
          <View style={styles.emptyState}>
            <IconSymbol name="doc.text.magnifyingglass" size={48} color="#CBD5E1" />
            <Text style={styles.emptyText}>İlan bulunamadı</Text>
            <Text style={styles.emptySubtext}>Farklı bir kategori veya arama deneyin</Text>
          </View>
        ) : (
          filteredListings.map(l => (
            <ListingCard key={l.id} listing={l} router={router} />
          ))
        )}
      </ScrollView>

      {/* FAB — New Listing */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 20 }]}
        activeOpacity={0.85}
        onPress={() => {
            setIsAdModalVisible(true);
        }}
      >
        <LinearGradient
          colors={['#10B981', '#059669']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fabGradient}
        >
          <IconSymbol name="plus" size={24} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Place Ad Modal */}
      <Modal
        visible={isAdModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsAdModalVisible(false)}
      >
        <KeyboardAvoidingView 
          style={styles.modalContainer} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalHeader}>
            <View style={{ flex: 1.2, alignItems: 'flex-start', justifyContent: 'center' }}>
              <TouchableOpacity onPress={() => setIsAdModalVisible(false)} style={styles.modalHeaderButton}>
                <Text style={styles.cancelText}>İPTAL</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flex: 2, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={styles.modalTitle} numberOfLines={1}>YENİ İLAN VER</Text>
            </View>
            <View style={{ flex: 1.2, alignItems: 'flex-end', justifyContent: 'center' }}>
              <TouchableOpacity 
                onPress={handlePublish} 
                style={[styles.publishButton, (!adTitle.trim() || !adPrice.trim() || isUploading) && styles.publishButtonDisabled]}
                disabled={!adTitle.trim() || !adPrice.trim() || isUploading}
              >
                {isUploading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.publishText}>YAYINLA</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>ADA SEÇİMİ</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.adCategoryRow}>
                {islands.map(island => (
                  <TouchableOpacity 
                    key={island} 
                    style={[styles.adCatItem, adIsland === island && styles.activeAdCat]}
                    onPress={() => setAdIsland(island)}
                  >
                    <Text style={[styles.adCatText, adIsland === island && styles.activeAdCatText]}>{island}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>İLAN BAŞLIĞI</Text>
              <TextInput
                style={styles.adTitleInput}
                placeholder="Ne satıyorsun veya arıyorsun?"
                placeholderTextColor="#94A3B8"
                value={adTitle}
                onChangeText={setAdTitle}
              />
            </View>

            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>KATEGORİ</Text>
              <View style={styles.adCategoryRow}>
                {adCategories.map(cat => (
                  <TouchableOpacity 
                    key={cat.id} 
                    style={[styles.adCatItem, adCat === cat.id && styles.activeAdCat]}
                    onPress={() => setAdCat(cat.id as IlanCategory)}
                  >
                    <MaterialCommunityIcons 
                      name={cat.icon as any} 
                      size={20} 
                      color={adCat === cat.id ? '#fff' : '#64748B'} 
                    />
                    <Text style={[styles.adCatText, adCat === cat.id && styles.activeAdCatText]}>{cat.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>FİYAT (₺)</Text>
              <TextInput
                style={styles.adTitleInput}
                placeholder="0.00"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                value={adPrice}
                onChangeText={setAdPrice}
              />
            </View>

            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>AÇIKLAMA</Text>
              <TextInput
                style={[styles.adTitleInput, { height: 120, textAlignVertical: 'top' }]}
                placeholder="Ürün veya hizmet detaylarını yaz..."
                placeholderTextColor="#94A3B8"
                multiline
                value={adDesc}
                onChangeText={setAdDesc}
              />
            </View>

            {selectedImage ? (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
                <TouchableOpacity 
                  style={styles.removeImageBtn} 
                  onPress={() => setSelectedImage(null)}
                >
                  <IconSymbol name="xmark.circle.fill" size={24} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.addPhotoBtn} onPress={pickImage}>
                <IconSymbol name="camera.fill" size={24} color="#64748B" />
                <Text style={styles.addPhotoText}>Fotoğraf Ekle</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
      <LoginPromptModal 
        visible={showLoginPrompt} 
        onClose={() => setShowLoginPrompt(false)} 
        onLogin={() => {
          setShowLoginPrompt(false);
          router.push('/login');
        }}
        message={t('auth.loginToPost', { defaultValue: 'İlan vermek için giriş yapmalısınız.' })}
      />
    </View>
  );
}

function ListingCard({ listing, router }: { listing: ListingDto, router: any }) {
  const { isLoggedIn } = useAuth();
  const backendToFrontend: Record<ListingCategory, IlanCategory> = {
    [ListingCategory.SATILIK]: 'emlak',
    [ListingCategory.KIRALIK]: 'emlak',
    [ListingCategory.HIZMET]: 'service',
    [ListingCategory.IS_ILANI]: 'job',
    [ListingCategory.KAYIP]: 'lost',
  };
  
  const frontendCat = backendToFrontend[listing.category] || 'all';
  const cfg = CATEGORY_CONFIG[frontendCat] || CATEGORY_CONFIG.all;

  const timeAgo = formatDistanceToNow(new Date(listing.createdAt), { 
    addSuffix: true, 
    locale: i18n.language.startsWith('tr') ? tr : enUS 
  });

  return (
    <TouchableOpacity 
      style={[
        styles.card, 
        { borderColor: `${cfg.color}33` },
      ]} 
      activeOpacity={0.7}
      onPress={() => {
          router.push({
            pathname: '/explore/island/ilan/[id]',
            params: { id: listing.id }
          });
      }}
    >
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <View style={[styles.categoryBadge, { backgroundColor: cfg.bg }]}>
            <IconSymbol name={cfg.icon as any} size={12} color={cfg.color} />
            <Text style={[styles.categoryBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>
        <Text style={styles.timeAgo}>{timeAgo}</Text>
      </View>

      <Text style={styles.cardTitle}>{listing.title}</Text>
      <Text style={styles.cardDescription} numberOfLines={2}>{listing.description}</Text>

      <View style={styles.cardFooter}>
        <View style={styles.cardMeta}>
          <View style={styles.metaItem}>
            <IconSymbol name="mappin.circle.fill" size={14} color="#94A3B8" />
            <Text style={styles.metaText}>{listing.island}</Text>
          </View>
          {listing.contactInfo && (
            <View style={styles.metaItem}>
              <IconSymbol name="phone.circle.fill" size={14} color="#94A3B8" />
              <Text style={styles.metaText}>{listing.contactInfo.substring(0, 15)}...</Text>
            </View>
          )}
        </View>
        {listing.price > 0 && (
          <View style={styles.priceTag}>
            <Text style={styles.priceText}>{listing.price} ₺</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1E293B',
    marginLeft: 10,
    paddingVertical: 0,
  },
  tabsWrapper: {
    paddingVertical: 16,
    backgroundColor: 'transparent',
  },
  tabsContainer: {
    paddingHorizontal: 20,
    gap: 10,
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  activeTabItem: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
    shadowOpacity: 0.1,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  activeTabLabel: {
    color: '#FFFFFF',
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  urgentCard: {
    borderColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1.5,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  urgentBadgeInline: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  urgentTextInline: {
    fontSize: 9,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.5,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  timeAgo: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  cardDescription: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 19,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  priceTag: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priceText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10B981',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 220,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 12,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 13,
    color: '#CBD5E1',
    marginTop: 4,
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalHeaderButton: {
    paddingVertical: 8,
  },
  cancelText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '800',
    letterSpacing: 1,
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1E293B',
    letterSpacing: 1,
  },
  publishButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  publishButtonDisabled: {
    backgroundColor: '#E2E8F0',
  },
  publishText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 1,
  },
  modalBody: {
    flex: 1,
    padding: 20,
  },
  inputSection: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: '#94A3B8',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  adTitleInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: '#1E293B',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    fontWeight: '600',
  },
  adCategoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  adCatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  activeAdCat: {
    backgroundColor: '#F59E0B',
    borderColor: '#F59E0B',
  },
  adCatText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  activeAdCatText: {
    color: '#fff',
  },
  addPhotoBtn: {
    marginTop: 10,
    marginBottom: 40,
    height: 120,
    borderRadius: 20,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addPhotoText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  imagePreviewContainer: {
    width: '100%',
    height: 200,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removeImageBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
});
