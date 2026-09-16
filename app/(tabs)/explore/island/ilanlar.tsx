import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import React, { useState, useRef, useEffect } from 'react';
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
  DeviceEventEmitter,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SwipeNavigation } from '@/components/SwipeNavigation';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Modal, KeyboardAvoidingView, ActivityIndicator, InputAccessoryView, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as listingApi from '@/services/listingApi';
import { ListingDto, ListingCategory } from '@/services/listingApi';
import { Island } from '@/services/forumApi';
import { formatDistanceToNowStrict } from 'date-fns';
import { tr, enUS } from 'date-fns/locale';
import i18n from '@/utils/i18n';
import * as ImagePicker from 'expo-image-picker';
import { EmptyState } from '@/components/EmptyState';
import * as mediaApi from '@/services/mediaApi';
import LoginPromptModal from '@/components/LoginPromptModal';
import { IslandDropdown } from '@/components/IslandDropdown';
import { resolveImageUrl } from '@/services/config';
import { ms } from '@/utils/scale';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// user.phone is stored E.164-normalized (+905XXXXXXXXX), but the backend's contactInfo
// field expects the local 11-digit dialing format (05XXXXXXXXX) — convert before
// auto-filling so it actually passes validation.
const toLocalPhone = (phone?: string | null): string => {
  if (phone && phone.startsWith('+90') && phone.length === 13) {
    return '0' + phone.slice(3);
  }
  return phone || '';
};

// İlan türleri
// 'service' is intentionally not offered when creating a listing (removed in 57066bc) but is
// kept here so pre-existing HIZMET listings still render with the correct icon/color instead of
// falling back to the "all" styling.
type IlanCategory = 'all' | 'emlak' | 'esya' | 'tasit' | 'lost' | 'job' | 'pet' | 'service';

const CATEGORY_CONFIG: Record<IlanCategory, { label: string; icon: string; color: string; bg: string; backend?: ListingCategory }> = {
  all:     { label: 'Tümü',      icon: 'square.grid.2x2.fill', color: '#3B82F6', bg: '#EFF6FF' },
  emlak:   { label: 'Emlak',     icon: 'house.fill',           color: '#10B981', bg: '#ECFDF5' },
  esya:    { label: 'Eşya',      icon: 'archivebox.fill',      color: '#F59E0B', bg: '#FEF3C7', backend: ListingCategory.ESYA },
  tasit:   { label: 'Taşıt',     icon: 'car.fill',             color: '#EC4899', bg: '#FCE7F3', backend: ListingCategory.TASIT },
  job:     { label: 'İş İlanı',  icon: 'briefcase.fill',       color: '#6366F1', bg: '#EEF2FF', backend: ListingCategory.IS_ILANI },
  lost:    { label: 'Kayıp',     icon: 'exclamationmark.triangle.fill', color: '#EF4444', bg: '#FEF2F2', backend: ListingCategory.KAYIP },
  pet:     { label: 'Evcil Hayvan', icon: 'cat.fill',          color: '#F43F5E', bg: '#FFE4E6', backend: ListingCategory.EVCIL_HAYVAN },
  service: { label: 'Hizmet',    icon: 'wrench.and.screwdriver.fill', color: '#8B5CF6', bg: '#F5F3FF', backend: ListingCategory.HIZMET },
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


interface IlanlarScreenProps {
  showBackButton?: boolean;
  leftRoute?: string;
  rightRoute?: string;
}

export default function IlanlarScreen({
  showBackButton = true,
  leftRoute = "/(tabs)/explore/island/events",
  rightRoute = "/(tabs)/explore/island/forum",
}: IlanlarScreenProps = {}) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isLoggedIn, user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const params = useLocalSearchParams();
  
  const [listings, setListings] = useState<ListingDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isGridView = true;
  const [selectedCategory, setSelectedCategory] = useState<IlanCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdModalVisible, setIsAdModalVisible] = useState(false);
  const titleInputRef = React.useRef<TextInput>(null);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [showQuotaModal, setShowQuotaModal] = useState(false);
  const [editingListingId, setEditingListingId] = useState<string | null>(null);
  const modalSlideAnim = useRef(new Animated.Value(Dimensions.get('window').height)).current;

  useEffect(() => {
    if (isAdModalVisible) {
      modalSlideAnim.setValue(Dimensions.get('window').height);
      Animated.spring(modalSlideAnim, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 0,
      }).start();
    }
  }, [isAdModalVisible]);

  // Ad Fields State
  const [adTitle, setAdTitle] = useState('');
  const [adPrice, setAdPrice] = useState('');
  const [adDesc, setAdDesc] = useState('');
  const [adContact, setAdContact] = useState('');
  const [adCat, setAdCat] = useState<IlanCategory>('emlak');
  const [adSubCat, setAdSubCat] = useState<'sell' | 'rent'>('sell');
  const [adIsland, setAdIsland] = useState('Kınalıada');
  const [adSeller, setAdSeller] = useState('');

  useEffect(() => {
    if (typeof params.category === 'string' && params.category in CATEGORY_CONFIG) {
      setSelectedCategory(params.category as IlanCategory);
    }
  }, [params.category]);

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
          setAdSeller(listing.sellerName || '');
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
          } else if (listing.category === ListingCategory.EVCIL_HAYVAN) {
            frontendCat = 'pet';
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
    Animated.timing(modalSlideAnim, {
      toValue: Dimensions.get('window').height,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setIsAdModalVisible(false);
      setAdTitle(''); setAdPrice(''); setAdDesc(''); setAdContact(user?.email || ''); setAdSeller(user?.fullName || user?.email || ''); setSelectedImages([]);
      setAdSubCat('sell');
      setAdIsland(islands[0]);
      setEditingListingId(null);
    });
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
      AsyncStorage.setItem('lastViewedListings', Date.now().toString());
      AsyncStorage.setItem('cached_unseen_listings', '0');
      DeviceEventEmitter.emit('listingsSeen');
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
          aspect: [4, 5],
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

  const isPublishingRef = useRef(false);

  const handlePublish = async () => {
    Keyboard.dismiss();
    // Previously this silently did nothing when isPublishingRef was stuck true (e.g. a
    // prior attempt that hung) — the button looked tappable but every tap was a silent
    // no-op with zero feedback, and closing the modal doesn't reset this ref since the
    // screen itself stays mounted. Always alert now, with a real way out.
    if (isPublishingRef.current) {
      Alert.alert(
        i18n.language.startsWith('en') ? 'Please Wait' : 'Lütfen Bekleyin',
        i18n.language.startsWith('en')
          ? 'Your previous request is still processing.'
          : 'Önceki isteğiniz hâlâ işleniyor.',
        [
          { text: i18n.language.startsWith('en') ? 'OK' : 'Tamam', style: 'cancel' },
          {
            text: i18n.language.startsWith('en') ? 'Reset & Retry' : 'Sıfırla ve Tekrar Dene',
            onPress: () => {
              isPublishingRef.current = false;
              setIsUploading(false);
            },
          },
        ]
      );
      return;
    }
    if (isPublishDisabled) {
      Alert.alert('Eksik Bilgi', 'Lütfen ilan içeriğini düzeltiniz.');
      return;
    }

    isPublishingRef.current = true;
    setIsUploading(true);
    try {
      let uploadedUrls: string[] = [];
      for (const uri of selectedImages) {
        if (!uri.startsWith('http') && !uri.startsWith('/')) {
          const uploaded = await mediaApi.uploadImage(uri);
          if (uploaded) {
            uploadedUrls.push(uploaded);
          } else {
            throw new Error(i18n.language.startsWith('en')
              ? 'The photo could not be uploaded. Please try again.'
              : 'Fotoğraf yüklenemedi. Lütfen tekrar deneyin.');
          }
        } else {
          uploadedUrls.push(uri);
        }
      }
      await submitListing(uploadedUrls);
    } catch (e: any) {
      const msg: string | undefined = e?.message;
      // 'invalid contact'/'invalid price' already showed their own alert inline;
      // 'network_error_shown' means listingApi already showed the connection-error toast.
      const alreadyHandled = msg === 'invalid contact' || msg === 'invalid price' || msg === 'network_error_shown';
      if (!alreadyHandled) {
        if (msg && (msg.toLowerCase().includes('limit') || msg.toLowerCase().includes('kota') || msg.toLowerCase().includes('ulaştı'))) {
          resetAndCloseModal();
          setTimeout(() => {
            setShowQuotaModal(true);
          }, 300);
        } else {
          setTimeout(() => {
            Alert.alert(
              t('common.error', { defaultValue: 'Hata' }),
              msg && msg.trim().length > 0
                ? msg
                : editingListingId
                  ? t('errors.listingUpdateFailed', { defaultValue: 'İlan güncellenemedi. Lütfen tekrar deneyin.' })
                  : t('errors.listingCreateFailed', { defaultValue: 'İlan oluşturulamadı. Lütfen tekrar deneyin.' })
            );
          }, 100);
        }
      }
    } finally {
      isPublishingRef.current = false;
      setIsUploading(false);
    }
  };

  const submitListing = async (imageUrls: string[]) => {
    const finalPrice = adPrice.trim() ? parseFloat(adPrice.replace(/\./g, '')) : 0;
    const finalContact = adContact.trim();
    if (isNaN(finalPrice) || finalPrice < 0) throw new Error('invalid price');
    if (finalContact.length === 0) {
      setTimeout(() => {
        Alert.alert('Hata', 'Lütfen iletişim bilginizi girin.');
      }, 300);
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
      sellerName: adSeller.trim(),
      imageUrl: imageUrls[0],
      imageUrls: imageUrls,
    };

    const resultListing = editingListingId
      ? await listingApi.updateListing(editingListingId, request)
      : await listingApi.createListing(request);

    // A validation/limit rejection throws with a real message from listingApi and is
    // handled by the catch above. A null result here means a network-level failure,
    // for which listingApi already showed the connection-error toast — don't duplicate it.
    if (!resultListing) throw new Error('network_error_shown');

    resetAndCloseModal();
    setTimeout(() => {
      Alert.alert(
        t('common.success', { defaultValue: 'Başarılı' }),
        editingListingId
          ? t('common.listingUpdated', { defaultValue: 'İlan başarıyla güncellendi.' })
          : t('common.listingReceived', { defaultValue: 'İlanınız incelemeye gönderildi.' })
      );
    }, 400);
    loadListings(true);
    DeviceEventEmitter.emit('contentUpdated');
  };

  const adCategories = [
    { id: 'emlak',   label: 'Emlak',        icon: 'home-outline' },
    { id: 'esya',    label: 'Eşya',         icon: 'archive-outline' },
    { id: 'tasit',   label: 'Taşıt',        icon: 'car-outline' },
    { id: 'job',     label: 'İş İlanı',     icon: 'briefcase-outline' },
    { id: 'pet',     label: 'Evcil Hayvan', icon: 'paw-outline' },
    { id: 'lost',    label: 'Kayıp',        icon: 'alert-circle-outline' },
  ];

  const [selectedFilterIsland, setSelectedFilterIsland] = useState<string>('ALL');

  const ISLAND_FILTERS = [
    { id: 'ALL', label: t('common.allIslands', { defaultValue: 'Tüm Adalar' }) },
    { id: 'KINALIADA', label: 'Kınalıada' },
    { id: 'BURGAZADA', label: 'Burgazada' },
    { id: 'HEYBELIADA', label: 'Heybeliada' },
    { id: 'BUYUKADA', label: 'Büyükada' },
  ];

  const matchIsland = (itemIsland?: string | null, targetFilter?: string) => {
    if (!targetFilter || targetFilter === 'ALL') return true;
    if (!itemIsland) return false;
    const upperItem = String(itemIsland).toUpperCase();
    const upperTarget = targetFilter.toUpperCase();
    if (upperItem === upperTarget) return true;
    if (upperTarget === 'KINALIADA' && (upperItem.includes('KIN') || upperItem.includes('KINA'))) return true;
    if (upperTarget === 'BURGAZADA' && upperItem.includes('BURG')) return true;
    if (upperTarget === 'HEYBELIADA' && upperItem.includes('HEYB')) return true;
    if (upperTarget === 'BUYUKADA' && (upperItem.includes('BUY') || upperItem.includes('BÜY'))) return true;
    return false;
  };

  const filteredListings = listings.filter(l => {
    if (!matchIsland(l.island, selectedFilterIsland)) return false;
    if (!searchQuery) return true;
    return l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
           l.description.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <SwipeNavigation leftRoute={leftRoute} rightRoute={rightRoute}>
    <View style={[styles.container, isDark && { backgroundColor: '#000000' }]}>
      <View style={[styles.header, { paddingTop: insets.top + 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, isDark && { backgroundColor: '#000000' }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {showBackButton && (
            <TouchableOpacity
              style={[styles.backButton, isDark && { backgroundColor: '#1C1C1E' }]}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <IconSymbol name="chevron.left" size={24} color={isDark ? "#FFFFFF" : "#1E293B"} />
            </TouchableOpacity>
          )}
          <Text style={[styles.headerTitle, showBackButton && { marginLeft: 10 }, isDark && { color: '#FFFFFF' }]}>{t('common.classifieds', { defaultValue: i18n.language.startsWith('en') ? 'Listings' : 'İlanlar' })}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <IslandDropdown
            options={ISLAND_FILTERS.map(item => ({ value: item.id, label: item.label }))}
            value={selectedFilterIsland}
            onChange={setSelectedFilterIsland}
            isDark={isDark}
            menuTop={insets.top + 62}
            compact
            triggerLabel={selectedFilterIsland === 'ALL' ? (i18n.language.startsWith('en') ? 'All' : 'Tümü') : undefined}
          />
        </View>
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
                  isDark && { backgroundColor: '#1C1C1E', borderColor: '#2C2C2E' },
                  isActive && styles.activeTabItem,
                  isActive && isDark && { backgroundColor: '#172554', borderColor: '#1E3A8A' },
                ]}
                onPress={() => setSelectedCategory(key)}
                activeOpacity={0.7}
              >
                <IconSymbol 
                  name={cfg.icon as any} 
                  size={14} 
                  color={isActive ? '#FFFFFF' : (isDark ? '#94A3B8' : '#475569')}
                />
                <Text style={[styles.tabLabel, isDark && { color: '#94A3B8' }, isActive && styles.activeTabLabel]}>
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
          <View style={isGridView ? { flexDirection: 'row', flexWrap: 'wrap', gap: 12 } : {}}>
            {filteredListings.map(l => (
              <ListingCard key={l.id} listing={l} router={router} isGridView={isGridView} />
            ))}
          </View>
        )}
      </ScrollView>

      <TouchableOpacity 
        style={[styles.fab, { bottom: 20, backgroundColor: isDark ? '#121212' : '#FFFFFF' }]} 
        onPress={() => {
            if (!isLoggedIn) {
                setShowLoginPrompt(true);
            } else {
                setAdContact(toLocalPhone(user?.phone) || user?.email || '');
                setAdSeller(user?.fullName || user?.email || '');
                setIsAdModalVisible(true);
            }
        }}
        activeOpacity={0.85}
      >
        <View style={[styles.fabGradient, isDark ? { backgroundColor: '#121212', borderWidth: 1, borderColor: '#2C2C2E' } : { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 6 }]}>
          <IconSymbol name="plus" size={32} color="#3B82F6" />
        </View>
      </TouchableOpacity>

      <Modal
        visible={isAdModalVisible}
        animationType="fade"
        transparent={true}
        statusBarTranslucent={true}
        navigationBarTranslucent={true}
        onRequestClose={handleCloseModal}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <TouchableOpacity style={{ flex: 1 }} onPress={handleCloseModal} activeOpacity={1} />
          <Animated.View 
            style={[styles.modalContainer, isDark && { backgroundColor: '#000000' }, { flex: 0, height: '90%', borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden', paddingBottom: Platform.OS === 'ios' ? 0 : insets.bottom, transform: [{ translateY: modalSlideAnim }] }]} 
          >
          <View style={[styles.modalHeader, isDark && { backgroundColor: '#000000', borderBottomColor: '#1C1C1E' }]}>
            <View style={{ flex: 1.5, alignItems: 'flex-start', justifyContent: 'center' }}>
              <TouchableOpacity onPress={handleCloseModal} style={styles.modalHeaderButton}>
                <Text style={[styles.cancelText, isDark && { color: '#94A3B8' }]}>{t('common.cancel')}</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flex: 2, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={[styles.modalTitle, isDark && { color: '#FFFFFF' }]} numberOfLines={1}>{editingListingId ? t('common.editListing') : t('ilanlar.newAd')}</Text>
            </View>
            <View style={{ flex: 1.5, alignItems: 'flex-end', justifyContent: 'center' }}>
              <TouchableOpacity
                style={[styles.publishButton, isPublishDisabled && (isDark ? { backgroundColor: '#27272A' } : styles.publishButtonDisabled)]}
                onPress={handlePublish}
              >
                {isUploading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={[styles.publishText, isPublishDisabled && { color: isDark ? '#52525B' : '#94A3B8' }]} numberOfLines={1}>{editingListingId ? t('common.save') : t('common.publish')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          <KeyboardAwareScrollView style={[styles.modalBody, isDark && { backgroundColor: '#000000' }]} showsVerticalScrollIndicator={false} enableOnAndroid={true} extraScrollHeight={80} keyboardShouldPersistTaps="handled">
            <View style={styles.inputSection}>
              <Text style={[styles.inputLabel, isDark && { color: '#94A3B8' }]}>{t('ilanlar.islandSelection')}</Text>
              <View style={{ flexDirection: 'row', gap: 4 }}>
                {islands.map(island => (
                  <TouchableOpacity 
                    key={island} 
                    style={[
                      styles.adCatItem, 
                      isDark && { backgroundColor: '#1C1C1E', borderColor: '#2C2C2E' }, 
                      { flex: 1, justifyContent: 'center', paddingHorizontal: 4 }, 
                      adIsland === island && { backgroundColor: '#3B82F6', borderColor: '#3B82F6' }
                    ]}
                    onPress={() => setAdIsland(island)}
                  >
                    <Text 
                      style={[
                        styles.adCatText, 
                        isDark && { color: '#E5E5E5' }, 
                        { fontSize: 12 }, 
                        adIsland === island && { color: '#FFFFFF', fontWeight: '700' }
                      ]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                    >
                      {t('places.' + island, { defaultValue: island })}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputSection}>
              <Text style={[styles.inputLabel, isDark && { color: '#94A3B8' }]}>{i18n.language.startsWith('en') ? 'SELLER NAME * (Required)' : 'SATICI ADI * (Zorunlu)'}</Text>
              <TextInput
                style={[styles.adTitleInput, isDark && { backgroundColor: '#121212', color: '#FFFFFF', borderWidth: 1, borderColor: '#2C2C2E' }]}
                placeholder="Adınız Soyadınız"
                placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                value={adSeller}
                onChangeText={setAdSeller}
              />
            </View>

            <View style={styles.inputSection}>
              <Text style={[styles.inputLabel, isDark && { color: '#94A3B8' }]}>{t('ilanlar.adTitle')}</Text>
              <TextInput
                style={[styles.adTitleInput, isDark && { backgroundColor: '#121212', color: '#FFFFFF', borderWidth: 1, borderColor: '#2C2C2E' }]}
                placeholder={t('ilanlar.titlePlaceholder')}
                placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                value={adTitle}
                onChangeText={setAdTitle}
                ref={titleInputRef}
              />
            </View>

            <View style={styles.inputSection}>
              <Text style={[styles.inputLabel, isDark && { color: '#94A3B8' }]}>{t('forum.category')}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                {adCategories.map(cat => (
                  <TouchableOpacity 
                    key={cat.id} 
                    style={[
                      styles.adCatItem, 
                      isDark && { backgroundColor: '#1C1C1E', borderColor: '#2C2C2E' }, 
                      { justifyContent: 'center', paddingHorizontal: 10, paddingVertical: 8 },
                      adCat === cat.id && { backgroundColor: '#3B82F6', borderColor: '#3B82F6' }
                    ]}
                    onPress={() => setAdCat(cat.id as IlanCategory)}
                  >
                    <MaterialCommunityIcons 
                      name={cat.icon as any} 
                      size={16} 
                      color={adCat === cat.id ? '#FFFFFF' : (isDark ? '#94A3B8' : '#64748B')} 
                    />
                    <Text 
                      style={[
                        styles.adCatText, 
                        { fontSize: 12 },
                        isDark && { color: '#CBD5E1' }, 
                        adCat === cat.id && { color: '#FFFFFF', fontWeight: '700' }
                      ]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                    >
                      {t(`ilanlar.category.${cat.id}`)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputSection}>
              <Text style={[styles.inputLabel, isDark && { color: '#94A3B8' }]}>{t('ilanlar.price')}</Text>
              <TextInput
                style={[styles.adTitleInput, isDark && { backgroundColor: '#121212', color: '#FFFFFF', borderWidth: 1, borderColor: '#2C2C2E' }]}
                placeholder="0"
                placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                keyboardType="number-pad"
                value={adPrice}
                onChangeText={t => {
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
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={[styles.inputLabel, isDark && { color: '#94A3B8' }, { marginBottom: 0 }]}>{t('ilanlar.description')}</Text>
                <Text style={{ fontSize: 12, fontWeight: '700', color: adDesc.length >= 500 ? '#EF4444' : (isDark ? '#94A3B8' : '#64748B') }}>
                  {adDesc.length}/500
                </Text>
              </View>
              <TextInput
                style={[styles.adTitleInput, { height: 120, textAlignVertical: 'top' }, isDark && { backgroundColor: '#121212', color: '#FFFFFF', borderWidth: 1, borderColor: '#2C2C2E' }]}
                placeholder={t('ilanlar.descPlaceholder')}
                placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                multiline
                scrollEnabled={false}
                value={adDesc}
                onChangeText={setAdDesc}
                maxLength={500}
              />
            </View>

            <View style={styles.inputSection}>
              <Text style={[styles.inputLabel, isDark && { color: '#94A3B8' }]}>{i18n.language.startsWith('en') ? 'CONTACT INFO (TEL/EMAIL) * (Required)' : 'İLETİŞİM BİLGİSİ (TEL/E-POSTA) * (Zorunlu)'}</Text>
              <TextInput
                style={[styles.adTitleInput, isDark && { backgroundColor: '#121212', color: '#FFFFFF', borderWidth: 1, borderColor: '#2C2C2E' }]}
                placeholder="Örn: 05xx xxx xx xx veya ornek@email.com"
                placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                keyboardType="default"
                value={adContact}
                onChangeText={setAdContact}
              />
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={[styles.inputLabel, isDark && { color: '#94A3B8' }, { marginBottom: 0 }]}>
                {i18n.language.startsWith('en') ? 'LISTING PHOTOS' : 'İLAN FOTOĞRAFLARI'}
              </Text>
              <Text style={{ fontSize: 12, fontWeight: '700', color: selectedImages.length >= 5 ? '#EF4444' : (isDark ? '#94A3B8' : '#64748B') }}>
                {selectedImages.length}/5 {i18n.language.startsWith('en') ? 'photos' : 'foto'}
              </Text>
            </View>

            {selectedImages.length === 0 ? (
              <TouchableOpacity 
                style={[styles.addPhotoBtn, isDark && { backgroundColor: '#121212', borderColor: '#2C2C2E' }]} 
                onPress={pickImage}
              >
                <IconSymbol name="camera.fill" size={24} color={isDark ? '#94A3B8' : '#64748B'} />
                <Text style={[styles.addPhotoText, isDark && { color: '#94A3B8' }]}>{t('listings.addPhoto')}</Text>
              </TouchableOpacity>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 40, marginTop: 4 }}>
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
                {selectedImages.length < 5 && (
                  <TouchableOpacity 
                    style={[styles.addPhotoBtnSquare, isDark && { backgroundColor: '#121212', borderColor: '#2C2C2E' }]} 
                    onPress={pickImage}
                  >
                    <IconSymbol name="camera.fill" size={22} color={isDark ? '#94A3B8' : '#64748B'} />
                    <Text style={[styles.addPhotoSquareText, isDark && { color: '#94A3B8' }]}>{t('listings.addPhoto')}</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            )}
          </KeyboardAwareScrollView>
        </Animated.View>
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

      {/* Listing Quota Limit Modal */}
      <Modal
        visible={showQuotaModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowQuotaModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ width: '88%', maxWidth: 360, backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', borderRadius: 24, padding: 24, alignItems: 'center', elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: isDark ? '#064E3B' : '#ECFDF5', justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: isDark ? '#047857' : '#A7F3D0' }}>
              <IconSymbol name="tag.fill" size={30} color={isDark ? '#34D399' : '#10B981'} />
            </View>

            <Text style={{ fontSize: 20, fontWeight: '800', color: isDark ? '#FFFFFF' : '#0F172A', textAlign: 'center', marginBottom: 10 }}>
              {i18n.language.startsWith('en') ? 'Listing Quota Reached' : 'Bu Ayki İlan Limitiniz Doldu'}
            </Text>

            <Text style={{ fontSize: 14, color: isDark ? '#94A3B8' : '#64748B', textAlign: 'center', lineHeight: 21, marginBottom: 24 }}>
              {i18n.language.startsWith('en')
                ? 'You have reached your monthly free publishing limit (5/5). You can publish new listings next month.'
                : 'Bu ayki ilan yayınlama limitinize ulaştınız (5/5). Yeni ilan eklemek için gelecek ayı bekleyebilirsiniz.'}
            </Text>

            <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setShowQuotaModal(false)}
                style={{ flex: 1, height: 48, borderRadius: 14, backgroundColor: '#10B981', justifyContent: 'center', alignItems: 'center' }}
              >
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF' }}>
                  {i18n.language.startsWith('en') ? 'Close' : 'Anladım'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  setShowQuotaModal(false);
                  router.push('/(tabs)/profile');
                }}
                style={{ flex: 1, height: 48, borderRadius: 14, backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center' }}
              >
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF' }}>
                  {i18n.language.startsWith('en') ? 'My Quotas' : 'Kotalarım'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
    </SwipeNavigation>
  );
}

function ListingCard({ listing, router, isGridView }: { listing: ListingDto, router: any, isGridView?: boolean }) {
  const { t } = useTranslation();
  const { isLoggedIn } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
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
  
  const frontendCat = backendToFrontend[listing.category] || 'all';
  const cfg = CATEGORY_CONFIG[frontendCat] || CATEGORY_CONFIG.all;

  const timeAgo = formatDistanceToNowStrict(new Date(listing.createdAt), { 
    addSuffix: true, 
    locale: i18n.language.startsWith('tr') ? tr : enUS 
  });
  const resolvedUrl = resolveImageUrl(listing.imageUrl);
  const hasUserImage = listing.imageUrl && resolvedUrl && resolvedUrl.startsWith('http');

  return (
    <TouchableOpacity
      style={[
        styles.card,
        isDark && { backgroundColor: '#121212', borderColor: '#2C2C2E', borderWidth: 1 },
        isGridView && { width: (SCREEN_WIDTH - 44) / 2, marginHorizontal: 0, marginBottom: 14 }
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
        <View style={{ width: '100%', height: isGridView ? 180 : 300, backgroundColor: isDark ? '#1C1C1E' : '#F1F5F9' }}>
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
            <View style={[styles.categoryBadge, { backgroundColor: isDark ? `${cfg.color}22` : cfg.bg }, isGridView && { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, gap: 2 }]}>
              <IconSymbol name={cfg.icon as any} size={isGridView ? 10 : 12} color={cfg.color} />
              <Text style={[styles.categoryBadgeText, { color: cfg.color }, isGridView && { fontSize: 9.5 }]}>{t(`ilanlar.category.${frontendCat}`, { defaultValue: cfg.label })}</Text>
            </View>
          </View>
          <Text style={[styles.timeAgo, isGridView && { fontSize: 10 }, isDark && { color: '#94A3B8' }]}>{timeAgo}</Text>
        </View>

        <Text style={[styles.cardTitle, isGridView && { fontSize: 14 }, isDark && { color: '#F8FAFC' }]} numberOfLines={1}>{listing.title}</Text>
        {!isGridView && <Text style={[styles.cardDescription, isDark && { color: '#CBD5E1' }]} numberOfLines={2}>{listing.description}</Text>}

        <View style={[styles.cardFooter, isGridView && { marginTop: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }]}>
          <View style={[styles.cardMeta, isGridView && { flexDirection: 'column', gap: 4, flexShrink: 1, marginRight: 8 }]}>
            <View style={styles.metaItem}>
              <IconSymbol name="mappin.circle.fill" size={12} color={isDark ? '#94A3B8' : '#94A3B8'} />
              <Text style={[styles.metaText, isGridView && { fontSize: 11 }, isDark && { color: '#CBD5E1' }]}>{t('places.' + listing.island, { defaultValue: listing.island })}</Text>
            </View>
            {listing.contactInfo && (
              <View style={styles.metaItem}>
                <IconSymbol name="phone.circle.fill" size={14} color={isDark ? '#94A3B8' : '#94A3B8'} />
                <Text style={[styles.metaText, { flexShrink: 1 }, isDark && { color: '#CBD5E1' }]} numberOfLines={1}>{listing.contactInfo}</Text>
              </View>
            )}
          </View>
          {listing.price > 0 && (
            <View style={[{ backgroundColor: '#10B981', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }, isGridView && { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 5 }]}>
              <Text style={[{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }, isGridView && { fontSize: 11 }]}>{listing.price.toLocaleString('tr-TR')} ₺</Text>
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
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 6,
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
    fontSize: ms(26),
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
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: 'transparent',
  },
  tabsContainer: {
    paddingHorizontal: 16,
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
    backgroundColor: '#0F2747',
    borderColor: '#0F2747',
    shadowColor: '#0F172A',
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 3,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  activeTabLabel: {
    color: '#FFFFFF',
    fontWeight: '800',
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
    borderWidth: 1,
    borderColor: '#F1F5F9',
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
    backgroundColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  priceText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 17,
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
    textAlign: 'left',
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
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  adCatText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  activeAdCatText: {
    color: '#FFFFFF',
    fontWeight: '700',
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
  addPhotoBtnSquare: {
    width: 100,
    height: 100,
    borderRadius: 14,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 4,
  },
  addPhotoSquareText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textAlign: 'center',
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
