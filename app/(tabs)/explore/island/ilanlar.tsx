import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
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
  ImageBackground,
  RefreshControl,
  Keyboard,
  Platform,
  ActionSheetIOS,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { Modal, KeyboardAvoidingView, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as listingApi from '@/services/listingApi';
import { ListingDto, ListingCategory } from '@/services/listingApi';
import { Island } from '@/services/forumApi';
import { formatDistanceToNow } from 'date-fns';
import { tr, enUS } from 'date-fns/locale';
import i18n from '@/utils/i18n';
import * as ImagePicker from 'expo-image-picker';
import { EmptyState } from '@/components/EmptyState';
import * as mediaApi from '@/services/mediaApi';
import LoginPromptModal from '@/components/LoginPromptModal';
import { resolveImageUrl } from '@/services/config';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// İlan türleri
type IlanCategory = 'all' | 'emlak' | 'esya' | 'tasit' | 'service' | 'lost' | 'job';

const CATEGORY_CONFIG: Record<IlanCategory, { label: string; icon: string; color: string; bg: string; backend?: ListingCategory }> = {
  all:     { label: 'Tümü',      icon: 'square.grid.2x2.fill', color: '#3B82F6', bg: '#EFF6FF' },
  emlak:   { label: 'Emlak',     icon: 'house.fill',           color: '#10B981', bg: '#ECFDF5' },
  esya:    { label: 'Eşya',      icon: 'archivebox.fill',      color: '#F59E0B', bg: '#FEF3C7', backend: ListingCategory.ESYA },
  tasit:   { label: 'Taşıt',     icon: 'car.fill',             color: '#EC4899', bg: '#FCE7F3', backend: ListingCategory.TASIT },
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


export default function IlanlarScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isLoggedIn, user } = useAuth();
  const params = useLocalSearchParams();
  
  const [listings, setListings] = useState<ListingDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isGridView, setIsGridView] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<IlanCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdModalVisible, setIsAdModalVisible] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [editingListingId, setEditingListingId] = useState<string | null>(null);

  // Ad Fields State
  const [adTitle, setAdTitle] = useState('');
  const [adPrice, setAdPrice] = useState('');
  const [adDesc, setAdDesc] = useState('');
  const [adContact, setAdContact] = useState('');
  const [adCat, setAdCat] = useState<IlanCategory>('emlak');
  const [adSubCat, setAdSubCat] = useState<'sell' | 'rent'>('sell');
  const [adIsland, setAdIsland] = useState('Kınalıada');

  React.useEffect(() => {
    if (params.editListingId && typeof params.editListingId === 'string') {
      const id = params.editListingId;
      setEditingListingId(id);
      listingApi.getListing(id).then(listing => {
        if (listing) {
          setAdTitle(listing.title);
          setAdDesc(listing.description);
          setAdPrice(listing.price.toLocaleString('tr-TR'));
          setAdContact(listing.contactInfo || '');
          if (listing.island) {
             const islandName = Object.keys(ISLAND_ENUM_MAP).find(key => ISLAND_ENUM_MAP[key] === listing.island);
             if (islandName) setAdIsland(islandName);
          }
          if (listing.imageUrls && listing.imageUrls.length > 0) setSelectedImages(listing.imageUrls); else if (listing.imageUrl) setSelectedImages([listing.imageUrl]);
          
          let frontendCat: IlanCategory = 'emlak';
          if (listing.category === ListingCategory.SATILIK || listing.category === ListingCategory.KIRALIK) {
            frontendCat = 'emlak';
            setAdSubCat(listing.category === ListingCategory.KIRALIK ? 'rent' : 'sell');
          } else if (listing.category === ListingCategory.HIZMET) {
            frontendCat = 'service';
          } else if (listing.category === ListingCategory.IS_ILANI) {
            frontendCat = 'job';
          } else if (listing.category === ListingCategory.KAYIP) {
            frontendCat = 'lost';
          } else if (listing.category === ListingCategory.ESYA) {
            frontendCat = 'esya';
          } else if (listing.category === ListingCategory.TASIT) {
            frontendCat = 'tasit';
          }
          setAdCat(frontendCat);
          setIsAdModalVisible(true);
        }
      });
    }
  }, [params.editListingId]);

  // Format number with dots for thousands: 1000 → 1.000
  const rawPrice = adPrice.replace(/\./g, ''); // strip dots for parsing
  const parsedPrice = adPrice.trim() === '' ? 0 : parseFloat(rawPrice);
  const isPriceValid = !isNaN(parsedPrice) && parsedPrice >= 0;
  // removed cleanedContact
  const isFormDirty = adTitle.trim().length > 0 || adDesc.trim().length > 0 || adContact.length > 0 || adPrice.length > 0 || selectedImages.length > 0;

  const resetAndCloseModal = () => {
    setIsAdModalVisible(false);
    setAdTitle(''); setAdPrice(''); setAdDesc(''); setAdContact(user?.email || ''); setSelectedImages([]);
    setAdSubCat('sell');
    setAdIsland('Büyükada');
    setEditingListingId(null);
  };

  const handleCloseModal = () => {
    Keyboard.dismiss();
    resetAndCloseModal();
  };

  const isPublishDisabled =
    adTitle.trim().length < 2 ||
    adDesc.trim().length < 1 ||
    adContact.trim().length === 0 ||
    isUploading;

  const islands = ['Kınalıada', 'Burgazada', 'Heybeliada', 'Büyükada'];

  const loadListings = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      if (selectedCategory === 'emlak') {
        const data = await listingApi.fetchListings();
        setListings(data.filter(l => l.category === ListingCategory.SATILIK || l.category === ListingCategory.KIRALIK));
      } else {
        const backendCat = CATEGORY_CONFIG[selectedCategory].backend;
        const data = await listingApi.fetchListings(backendCat);
        setListings(data);
      }
    } catch {
      if (showLoading) Alert.alert(t('errors.connectionError', { defaultValue: 'Bağlantı Hatası' }), t('errors.listingsLoadFailed', { defaultValue: 'İlanlar yüklenemedi. Lütfen tekrar deneyin.' }));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  React.useEffect(() => {
    loadListings();
    const id = setInterval(() => loadListings(false), 60_000);
    return () => clearInterval(id);
  }, [selectedCategory]);

  const onRefresh = () => {
    setIsRefreshing(true);
    loadListings(false);
  };

  const pickImage = () => {
    if (selectedImages.length >= 5) {
      Alert.alert('Sınır Aşıldı', 'En fazla 5 fotoğraf ekleyebilirsiniz.');
      return;
    }

    const takePhoto = async () => {
      try {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert(t('common.error', { defaultValue: 'Hata' }), t('common.cameraPermissionDenied', { defaultValue: 'Kamera izni verilmedi.' }));
          return;
        }
        const result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
        });
        if (!result.canceled) {
          setSelectedImages(prev => [...prev, result.assets[0].uri].slice(0, 5));
        }
      } catch (e: any) {
        Alert.alert(
          t('common.error', { defaultValue: 'Hata' }),
          t('common.cameraNotAvailable', { defaultValue: 'Kamera bu cihazda kullanılamıyor. Lütfen galeriden seçin.' })
        );
      }
    };

    const chooseFromGallery = async () => {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        allowsMultipleSelection: true,
        selectionLimit: 5 - selectedImages.length,
        quality: 0.8,
      });
      if (!result.canceled) {
        const newUris = result.assets.map(a => a.uri);
        setSelectedImages(prev => [...prev, ...newUris].slice(0, 5));
      }
    };

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [
            t('common.cancel', { defaultValue: 'İptal' }),
            t('common.takePhoto', { defaultValue: '📷 Fotoğraf Çek' }),
            t('common.chooseFromGallery', { defaultValue: '🖼️ Galeriden Seç' })
          ],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            setTimeout(takePhoto, 500);
          } else if (buttonIndex === 2) {
            setTimeout(chooseFromGallery, 500);
          }
        }
      );
    } else {
      Alert.alert(
        t('common.selectPhoto', { defaultValue: 'Fotoğraf Seç' }),
        t('common.selectPhotoDesc', { defaultValue: 'Fotoğrafı nereden eklemek istersiniz?' }),
        [
          { text: t('common.takePhoto', { defaultValue: '📷 Fotoğraf Çek' }), onPress: () => setTimeout(takePhoto, 500) },
          { text: t('common.chooseFromGallery', { defaultValue: '🖼️ Galeriden Seç' }), onPress: () => setTimeout(chooseFromGallery, 500) },
          { text: t('common.cancel', { defaultValue: 'İptal' }), style: 'cancel' }
        ]
      );
    }
  };

  const handlePublish = async () => {
    if (!adTitle.trim()) return;

    setIsUploading(true);
    try {
      let uploadedUrls: string[] = [];
      for (const uri of selectedImages) {
        if (!uri.startsWith('http') && !uri.startsWith('/')) {
          const uploaded = await mediaApi.uploadImage(uri);
          if (uploaded) {
            uploadedUrls.push(uploaded);
          }
        } else {
          uploadedUrls.push(uri);
        }
      }
      await submitListing(uploadedUrls);
    } catch (e: any) {
      if (e?.message !== 'invalid contact' && e?.message !== 'invalid price') {
        Alert.alert(
          t('common.error', { defaultValue: 'Hata' }),
          editingListingId
            ? t('errors.listingUpdateFailed', { defaultValue: 'İlan güncellenemedi. Lütfen tekrar deneyin.' })
            : t('errors.listingCreateFailed', { defaultValue: 'İlan oluşturulamadı. Lütfen tekrar deneyin.' })
        );
      }
    } finally {
      setIsUploading(false);
    }
  };

  const submitListing = async (imageUrls: string[]) => {
    const finalPrice = adPrice.trim() ? parseFloat(adPrice.replace(/\./g, '')) : 0;
    const finalContact = adContact.replace(/\D/g, '');
    if (isNaN(finalPrice) || finalPrice < 0) throw new Error('invalid price');
    if (finalContact.length !== 11) {
      Alert.alert('Hata', 'Lütfen geçerli bir 11 haneli telefon numarası girin.');
      throw new Error('invalid contact');
    }

    const request: listingApi.SaveListingRequest = {
      title: adTitle.trim(),
      description: adDesc.trim(),
      category: adCat === 'emlak' ? (adSubCat === 'rent' ? ListingCategory.KIRALIK : ListingCategory.SATILIK) : (CATEGORY_CONFIG[adCat].backend || ListingCategory.SATILIK),
      island: getIslandEnum(adIsland),
      price: finalPrice,
      active: true,
      contactInfo: finalContact,
      imageUrl: imageUrls.length > 0 ? imageUrls[0] : undefined,
      imageUrls: imageUrls
    };

    const resultListing = editingListingId 
      ? await listingApi.updateListing(editingListingId, request)
      : await listingApi.createListing(request);
      
    if (!resultListing) throw new Error('operation failed');

    resetAndCloseModal();
    Alert.alert(
      t('common.success', { defaultValue: 'Başarılı' }),
      editingListingId
        ? t('common.listingUpdated', { defaultValue: 'İlan başarıyla güncellendi.' })
        : t('common.listingReceived', { defaultValue: 'İlan isteğiniz alınmıştır ve incelemeye alınmıştır.' })
    );
    loadListings(true);
  };

  const adCategories = [
    { id: 'emlak',   label: 'Emlak',    icon: 'home-outline' },
    { id: 'esya',    label: 'Eşya',     icon: 'archive-outline' },
    { id: 'tasit',   label: 'Taşıt',    icon: 'car-outline' },
    { id: 'service', label: 'Hizmet',   icon: 'hammer-wrench' },
    { id: 'job',     label: 'İş İlanı', icon: 'briefcase-outline' },
    { id: 'lost',    label: 'Kayıp',    icon: 'alert-circle-outline' },
  ];

  const filteredListings = listings.filter(l => {
    if (!searchQuery) return true;
    return l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
           l.description.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <IconSymbol name="chevron.left" size={24} color="#1E293B" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { marginLeft: 10 }]}>{t('common.classifieds', { defaultValue: 'İlanlar' })}</Text>
        </View>
        <TouchableOpacity
          style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}
          onPress={() => setIsGridView(!isGridView)}
          activeOpacity={0.7}
        >
          <IconSymbol name={isGridView ? "list.bullet" : "square.grid.2x2.fill"} size={20} color="#1E293B" />
        </TouchableOpacity>
      </View>

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
                  {t(`ilanlar.category.${key}`)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView 
        style={styles.listContainer} 
        contentContainerStyle={[styles.listContent, { paddingBottom: 20 }, ((isLoading && !isRefreshing) || filteredListings.length === 0) && { flex: 1 }]}
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
          <EmptyState 
            icon="doc.text.magnifyingglass" 
            title={t('ilanlar.emptyTitle')}
            subtitle={t('ilanlar.emptySubtitle')}
            color="#EAB308"
          />
        ) : (
          <View style={isGridView ? { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' } : {}}>
            {filteredListings.map(l => (
              <ListingCard key={l.id} listing={l} router={router} isGridView={isGridView} />
            ))}
          </View>
        )}
      </ScrollView>

      <TouchableOpacity
        style={[styles.fab, { bottom: 20 }]}
        activeOpacity={0.85}
        onPress={() => {
            if (!isLoggedIn) {
                setShowLoginPrompt(true);
            } else {
                setIsAdModalVisible(true);
            }
        }}
      >
        <LinearGradient
          colors={['#ffffff', '#ffffff']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fabGradient}
        >
          <IconSymbol name="plus" size={32} color="#3B82F6" />
        </LinearGradient>
      </TouchableOpacity>

      <Modal
        visible={isAdModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        transparent={true}
        statusBarTranslucent={true}
        navigationBarTranslucent={true}
        onRequestClose={handleCloseModal}
      >
        <View 
          style={[styles.modalContainer, { paddingTop: insets.top, paddingBottom: insets.bottom }]} 
          
        >
          <View style={styles.modalHeader}>
            <View style={{ flex: 1.5, alignItems: 'flex-start', justifyContent: 'center' }}>
              <TouchableOpacity onPress={handleCloseModal} style={styles.modalHeaderButton}>
                <Text style={styles.cancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flex: 2, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={styles.modalTitle} numberOfLines={1}>{editingListingId ? t('common.editListing') : t('ilanlar.newAd')}</Text>
            </View>
            <View style={{ flex: 1.5, alignItems: 'flex-end', justifyContent: 'center' }}>
              <TouchableOpacity 
                style={[styles.publishButton, isPublishDisabled && styles.publishButtonDisabled]} 
                onPress={handlePublish}
                disabled={isPublishDisabled}
              >
                {isUploading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={[styles.publishText, isPublishDisabled && { color: '#94A3B8' }]} numberOfLines={1}>{editingListingId ? t('common.save') : t('common.publish')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          <KeyboardAwareScrollView style={styles.modalBody} showsVerticalScrollIndicator={false} enableOnAndroid={true} extraScrollHeight={80} keyboardShouldPersistTaps="handled">
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>{t('ilanlar.islandSelection')}</Text>
              <View style={styles.adCategoryRow}>
                {islands.map(island => (
                  <TouchableOpacity 
                    key={island} 
                    style={[styles.adCatItem, adIsland === island && styles.activeAdCat]}
                    onPress={() => setAdIsland(island)}
                  >
                    <Text style={[styles.adCatText, adIsland === island && styles.activeAdCatText]}>{island}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>{t('ilanlar.adTitle')}</Text>
              <TextInput
                style={[styles.adTitleInput, { textAlign: 'center' }]}
                placeholder={t('ilanlar.titlePlaceholder')}
                placeholderTextColor="#94A3B8"
                value={adTitle}
                onChangeText={setAdTitle}
              />
            </View>

            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>{t('forum.category')}</Text>
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
                      color={adCat === cat.id ? '#3B82F6' : '#64748B'} 
                    />
                    <Text style={[styles.adCatText, adCat === cat.id && styles.activeAdCatText]}>
                      {t(`ilanlar.category.${cat.id}`)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>{t('ilanlar.price')}</Text>
              <TextInput
                style={styles.adTitleInput}
                placeholder="0"
                placeholderTextColor="#94A3B8"
                keyboardType="number-pad"
                value={adPrice}
                onChangeText={t => {
                  // Strip everything except digits, then format with dots
                  const digits = t.replace(/\D/g, '');
                  if (digits === '') { setAdPrice(''); return; }
                  const formatted = Number(digits).toLocaleString('tr-TR');
                  setAdPrice(formatted);
                }}
              />
              {adPrice.length > 0 && !isPriceValid && (
                <Text style={{ color: '#EF4444', fontSize: 11, marginTop: 4 }}>{t('ilanlar.invalidPrice')}</Text>
              )}
            </View>

            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>{t('ilanlar.description')}</Text>
              <TextInput
                style={[styles.adTitleInput, { height: 120, textAlignVertical: 'top' }]}
                placeholder={t('ilanlar.descPlaceholder')}
                placeholderTextColor="#94A3B8"
                multiline
                scrollEnabled={false}
                value={adDesc}
                onChangeText={setAdDesc}
                maxLength={500}
              />
              <Text style={{ color: '#94A3B8', fontSize: 11, textAlign: 'right', marginTop: 4 }}>{adDesc.length}/500</Text>
            </View>

            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>İLETİŞİM BİLGİSİ (TEL/E-POSTA) *</Text>
              <TextInput
                style={styles.adTitleInput}
                placeholder="Örn: 05xx xxx xx xx veya ornek@email.com"
                placeholderTextColor="#94A3B8"
                keyboardType="default"
                value={adContact}
                onChangeText={setAdContact}
              />
            </View>

            {selectedImages.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                {selectedImages.map((uri, idx) => (
                  <View key={idx} style={[styles.imagePreviewContainer, { marginRight: 12, marginBottom: 0 }]}>
                    <Image source={{ uri }} style={styles.imagePreview} />
                    <TouchableOpacity 
                      style={styles.removeImageBtn} 
                      onPress={() => setSelectedImages(prev => prev.filter((_, i) => i !== idx))}
                    >
                      <IconSymbol name="xmark.circle.fill" size={24} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
            {selectedImages.length < 5 && (
              <TouchableOpacity style={styles.addPhotoBtn} onPress={pickImage}>
                <IconSymbol name="camera.fill" size={24} color="#64748B" />
                <Text style={styles.addPhotoText}>{t('listings.addPhoto')}</Text>
              </TouchableOpacity>
            )}
          </KeyboardAwareScrollView>
          </View>
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

function ListingCard({ listing, router, isGridView }: { listing: ListingDto, router: any, isGridView?: boolean }) {
  const { isLoggedIn } = useAuth();
  const backendToFrontend: Record<ListingCategory, IlanCategory> = {
    [ListingCategory.SATILIK]: 'emlak',
    [ListingCategory.KIRALIK]: 'emlak',
    [ListingCategory.HIZMET]: 'service',
    [ListingCategory.IS_ILANI]: 'job',
    [ListingCategory.ESYA]: 'esya',
    [ListingCategory.TASIT]: 'tasit',
    [ListingCategory.KAYIP]: 'lost',
  };
  
  const frontendCat = backendToFrontend[listing.category] || 'all';
  const cfg = CATEGORY_CONFIG[frontendCat] || CATEGORY_CONFIG.all;

  const timeAgo = formatDistanceToNow(new Date(listing.createdAt), { 
    addSuffix: true, 
    locale: i18n.language.startsWith('tr') ? tr : enUS 
  });
  const resolvedUrl = resolveImageUrl(listing.imageUrl);
  const hasUserImage = listing.imageUrl && resolvedUrl && resolvedUrl.startsWith('http');

  return (
    <TouchableOpacity
      style={[
        styles.card,
        { borderColor: `${cfg.color}33` },
        isGridView && { width: '48%', marginHorizontal: 0 }
      ]}
      activeOpacity={0.7}
      onPress={() => {
          router.push({
            pathname: '/explore/island/ilan/[id]',
            params: { id: listing.id }
          });
      }}
    >
      {hasUserImage && (
        <View style={{ width: '100%', height: isGridView ? 180 : 300, backgroundColor: '#F1F5F9' }}>
          <Image 
             source={{ uri: resolvedUrl }} 
             style={{ width: '100%', height: '100%' }} 
             resizeMode="cover" 
          />
        </View>
      )}
      <View style={{ padding: isGridView ? 12 : 18 }}>
        <View style={[styles.cardHeader, isGridView && { marginBottom: 6 }]}>
          <View style={styles.headerLeft}>
            <View style={[styles.categoryBadge, { backgroundColor: cfg.bg }]}>
              <IconSymbol name={cfg.icon as any} size={12} color={cfg.color} />
              <Text style={[styles.categoryBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
          </View>
          <Text style={[styles.timeAgo, isGridView && { fontSize: 10 }]}>{timeAgo}</Text>
        </View>

        <Text style={[styles.cardTitle, isGridView && { fontSize: 14 }]} numberOfLines={1}>{listing.title}</Text>
        {!isGridView && <Text style={styles.cardDescription} numberOfLines={2}>{listing.description}</Text>}

        <View style={[styles.cardFooter, isGridView && { marginTop: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }]}>
          <View style={[styles.cardMeta, isGridView && { flexDirection: 'column', gap: 4 }]}>
            <View style={styles.metaItem}>
              <IconSymbol name="mappin.circle.fill" size={12} color="#94A3B8" />
              <Text style={[styles.metaText, isGridView && { fontSize: 11 }]}>{listing.island}</Text>
            </View>
            {listing.contactInfo && (
              <View style={styles.metaItem}>
                <IconSymbol name="phone.circle.fill" size={14} color="#94A3B8" />
                <Text style={styles.metaText}>{listing.contactInfo.substring(0, 15)}...</Text>
              </View>
            )}
          </View>
          {listing.price > 0 && (
            <View style={{ backgroundColor: '#10B981', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }}>{listing.price.toLocaleString('tr-TR')} ₺</Text>
            </View>
          )}
        </View>
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
    paddingBottom: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
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
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
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
    paddingTop: 20,
    paddingBottom: 16,
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
    borderRadius: 10,
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
    backgroundColor: '#1E293B',
    borderColor: '#1E293B',
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
    paddingBottom: 0, // overridden inline with tabBarHeight
  },
  cardImage: {
    width: '100%',
    height: 300,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    marginBottom: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    overflow: 'hidden',
    padding: 0,
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
    bottom: 20,
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateButton: {
    marginHorizontal: 60,
    marginTop: -20,
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  emptyStateButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    height: 64,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    alignItems: 'center',
    backgroundColor: '#fff',
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
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
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
    borderRadius: 12,
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
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  activeAdCat: {
    backgroundColor: '#F0F9FF',
    borderColor: '#3B82F6',
  },
  adCatText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  activeAdCatText: {
    color: '#3B82F6',
  },
  addPhotoBtn: {
    marginTop: 10,
    marginBottom: 40,
    height: 120,
    borderRadius: 14,
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
    width: 100,
    height: 100,
    borderRadius: 14,
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
    borderRadius: 8,
  },
});
