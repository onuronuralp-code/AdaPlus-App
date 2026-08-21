import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  useColorScheme,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { Island } from '@/services/forumApi';
import { ServiceCategory, submitProviderApplication } from '@/services/providerApplicationApi';

const SERVICE_CATEGORIES = [
  { id: 'repair', labelTr: 'Tadilat & Tamirat', labelEn: 'Renovation & Repair', icon: 'wrench.and.screwdriver.fill' },
  { id: 'painting', labelTr: 'Boya & Badana', labelEn: 'Painting & Decorating', icon: 'paintbrush.fill' },
  { id: 'locksmith', labelTr: 'Çilingir & Kilit', labelEn: 'Locksmith Services', icon: 'key.fill' },
  { id: 'cleaning', labelTr: 'Ev & Ofis Temizliği', labelEn: 'Cleaning', icon: 'sparkles' },
  { id: 'garden', labelTr: 'Bahçe & Peyzaj', labelEn: 'Gardening & Landscape', icon: 'leaf.fill' },
  { id: 'transport', labelTr: 'Nakliye & Taşıma', labelEn: 'Transport & Freight', icon: 'shippingbox.fill' },
  { id: 'tutoring', labelTr: 'Özel Ders & Eğitim', labelEn: 'Tutoring & Lessons', icon: 'book.fill' },
  { id: 'pet', labelTr: 'Evcil Hayvan Bakımı', labelEn: 'Pet Care', icon: 'pawprint.fill' },
  { id: 'other', labelTr: 'Diğer Yerel Hizmetler', labelEn: 'Other Local Services', icon: 'star.fill' },
];

// Only the 4 islands the backend's Island enum actually supports — unlike the listings
// screen, which also offers "Sedef Adası" and "Tüm Adalar" despite neither having a
// valid backend Island value (a pre-existing gap, out of scope here).
const ISLANDS = [
  { id: 'kinaliada', nameTr: 'Kınalıada', nameEn: 'Kınalıada' },
  { id: 'burgazada', nameTr: 'Burgazada', nameEn: 'Burgazada' },
  { id: 'heybeliada', nameTr: 'Heybeliada', nameEn: 'Heybeliada' },
  { id: 'buyukada', nameTr: 'Büyükada', nameEn: 'Büyükada' },
];

const ISLAND_ENUM_MAP: Record<string, Island> = {
  kinaliada: Island.KINALIADA,
  burgazada: Island.BURGAZADA,
  heybeliada: Island.HEYBELIADA,
  buyukada: Island.BUYUKADA,
};

const CATEGORY_ENUM_MAP: Record<string, ServiceCategory> = {
  repair: ServiceCategory.REPAIR,
  painting: ServiceCategory.PAINTING,
  locksmith: ServiceCategory.LOCKSMITH,
  cleaning: ServiceCategory.CLEANING,
  garden: ServiceCategory.GARDEN,
  transport: ServiceCategory.TRANSPORT,
  tutoring: ServiceCategory.TUTORING,
  pet: ServiceCategory.PET,
  other: ServiceCategory.OTHER,
};

export default function HizmetSaglayiciScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const isEn = i18n.language?.startsWith('en');

  const formatPhoneNumber = (input: string) => {
    let cleaned = input.replace(/\D/g, '');
    if (cleaned.startsWith('90')) {
      cleaned = cleaned.slice(2);
    }
    if (cleaned.length > 0 && cleaned.startsWith('5')) {
      cleaned = '0' + cleaned;
    }
    cleaned = cleaned.slice(0, 11);

    if (cleaned.length <= 4) {
      return cleaned;
    } else if (cleaned.length <= 7) {
      return `${cleaned.slice(0, 4)} ${cleaned.slice(4)}`;
    } else if (cleaned.length <= 9) {
      return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
    } else {
      return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7, 9)} ${cleaned.slice(9, 11)}`;
    }
  };

  // Form State
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(formatPhoneNumber(user?.phone || ''));
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['repair']);
  const [selectedIsland, setSelectedIsland] = useState<string>('kinaliada');
  const [offeredServices, setOfferedServices] = useState<string>('');
  const [experienceDetails, setExperienceDetails] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);

  const toggleCategory = (catId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (selectedCategories.includes(catId)) {
      if (selectedCategories.length === 1) return;
      setSelectedCategories(prev => prev.filter(c => c !== catId));
    } else {
      setSelectedCategories(prev => [...prev, catId]);
    }
  };

  const handleSubmit = async () => {
    if (!fullName.trim()) {
      Alert.alert(
        isEn ? 'Required Field' : 'Gerekli Alan',
        isEn ? 'Please enter your Full Name.' : 'Lütfen Ad Soyad alanını doldurunuz.'
      );
      return;
    }

    const cleanedPhone = phone.replace(/\D/g, '');
    if (!cleanedPhone.startsWith('05') || cleanedPhone.length !== 11) {
      Alert.alert(
        isEn ? 'Invalid Phone Number' : 'Geçersiz Telefon Numarası',
        isEn 
          ? 'Please enter a valid 11-digit mobile phone number starting with 05 (e.g. 0532 123 45 67).' 
          : 'Lütfen 05 ile başlayan 11 haneli geçerli bir cep telefonu numarası giriniz (Örn: 0532 123 45 67).'
      );
      return;
    }

    if (selectedCategories.length === 0) {
      Alert.alert(
        isEn ? 'Required Field' : 'Gerekli Alan',
        isEn ? 'Please select at least one service category.' : 'Lütfen en az bir hizmet kategorisi seçiniz.'
      );
      return;
    }

    if (!offeredServices.trim()) {
      Alert.alert(
        isEn ? 'Required Field' : 'Gerekli Alan',
        isEn ? 'Please describe the services you provide.' : 'Lütfen sunduğunuz hizmetleri kısaca açıklayınız.'
      );
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSubmitting(true);

    const primaryCatEnum = CATEGORY_ENUM_MAP[selectedCategories[0]] ?? ServiceCategory.OTHER;
    const catLabels = selectedCategories
      .map(cId => {
        const item = SERVICE_CATEGORIES.find(sc => sc.id === cId);
        return isEn ? item?.labelEn : item?.labelTr;
      })
      .filter(Boolean)
      .join(', ');

    const fullOfferedServices = `[${isEn ? 'Categories' : 'Kategoriler'}: ${catLabels}] ${offeredServices.trim()}`;

    try {
      await submitProviderApplication({
        fullName: fullName.trim(),
        phone: phone.trim(),
        island: ISLAND_ENUM_MAP[selectedIsland] ?? Island.BUYUKADA,
        category: primaryCatEnum,
        offeredServices: fullOfferedServices,
        experienceNotes: experienceDetails.trim() || undefined,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowSuccessModal(true);
    } catch (error) {
      console.log('Failed to submit provider application:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        isEn ? 'Submission Failed' : 'Gönderim Başarısız',
        isEn
          ? 'Something went wrong while submitting your application. Please try again.'
          : 'Başvurunuz gönderilirken bir sorun oluştu. Lütfen tekrar deneyin.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? '#000000' : '#F8FAFC' }}>
      <Stack.Screen options={{ headerShown: false }} />
      {/* Top Header */}
      <View style={{
        paddingTop: insets.top + 8,
        paddingBottom: 14,
        paddingHorizontal: 16,
        backgroundColor: isDark ? '#000000' : '#FFFFFF',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
        borderBottomColor: isDark ? '#1C1C1E' : '#E2E8F0',
        zIndex: 10
      }}>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            backgroundColor: isDark ? '#1C1C1E' : '#F1F5F9',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <IconSymbol name="chevron.left" size={24} color={isDark ? '#FFFFFF' : '#0F172A'} />
        </TouchableOpacity>

        <Text style={{ fontSize: 17, fontWeight: '800', color: isDark ? '#FFFFFF' : '#0F172A', textAlign: 'center' }}>
          {isEn ? 'Join Service Network' : 'Hizmet Ağına Katıl'}
        </Text>

        <View style={{ width: 44 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets={true}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 120 }}
        >
          {/* Form Card */}
          <View style={{
            backgroundColor: isDark ? '#121212' : '#FFFFFF',
            borderRadius: 20,
            padding: 18,
            borderWidth: 1,
            borderColor: isDark ? '#2C2C2E' : '#E2E8F0',
            gap: 16
          }}>
            {/* 1. Ad Soyad */}
            <View>
              <Text style={{ fontSize: 13, fontWeight: '700', color: isDark ? '#E2E8F0' : '#334155', marginBottom: 6 }}>
                {isEn ? 'Full Name' : 'Ad Soyad'} <Text style={{ color: '#EF4444' }}>*</Text>
              </Text>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: isDark ? '#1C1C1E' : '#F8FAFC',
                borderWidth: 1,
                borderColor: isDark ? '#2C2C2E' : '#CBD5E1',
                borderRadius: 12,
                paddingHorizontal: 12,
                height: 48
              }}>
                <IconSymbol name="person.fill" size={18} color={isDark ? '#71717A' : '#64748B'} />
                <TextInput
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder={isEn ? 'e.g. Ahmet Yılmaz' : 'Örn: Ahmet Yılmaz'}
                  placeholderTextColor={isDark ? '#71717A' : '#94A3B8'}
                  style={{ flex: 1, marginLeft: 10, fontSize: 14, color: isDark ? '#FFFFFF' : '#0F172A' }}
                />
              </View>
            </View>

            {/* 2. İletişim Numarası */}
            <View>
              <Text style={{ fontSize: 13, fontWeight: '700', color: isDark ? '#E2E8F0' : '#334155', marginBottom: 6 }}>
                {isEn ? 'Contact Phone Number' : 'İletişim Numarası'} <Text style={{ color: '#EF4444' }}>*</Text>
              </Text>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: isDark ? '#1C1C1E' : '#F8FAFC',
                borderWidth: 1,
                borderColor: isDark ? '#2C2C2E' : '#CBD5E1',
                borderRadius: 12,
                paddingHorizontal: 12,
                height: 48
              }}>
                <IconSymbol name="phone.fill" size={18} color={isDark ? '#71717A' : '#64748B'} />
                <TextInput
                  value={phone}
                  onChangeText={(val) => setPhone(formatPhoneNumber(val))}
                  keyboardType="phone-pad"
                  maxLength={14}
                  placeholder="05XX XXX XX XX"
                  placeholderTextColor={isDark ? '#71717A' : '#94A3B8'}
                  style={{ flex: 1, marginLeft: 10, fontSize: 14, color: isDark ? '#FFFFFF' : '#0F172A' }}
                />
              </View>
            </View>

            {/* 3. Lokasyon / Ada Seçimi */}
            <View>
              <Text style={{ fontSize: 13, fontWeight: '700', color: isDark ? '#E2E8F0' : '#334155', marginBottom: 8 }}>
                {isEn ? 'Service Location / Island' : 'Hizmet Verilen Lokasyon (Ada)'} <Text style={{ color: '#EF4444' }}>*</Text>
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {ISLANDS.map(island => {
                  const isSelected = selectedIsland === island.id;
                  return (
                    <TouchableOpacity
                      key={island.id}
                      activeOpacity={0.8}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setSelectedIsland(island.id);
                      }}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 20,
                        backgroundColor: isSelected ? '#2563EB' : (isDark ? '#1C1C1E' : '#F1F5F9'),
                        borderWidth: 1,
                        borderColor: isSelected ? '#2563EB' : (isDark ? '#2C2C2E' : '#E2E8F0')
                      }}
                    >
                      <Text style={{ fontSize: 12.5, fontWeight: '700', color: isSelected ? '#FFF' : (isDark ? '#E2E8F0' : '#475569') }}>
                        {isEn ? island.nameEn : island.nameTr}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* 4. Hizmet Kategorisi */}
            <View>
              <Text style={{ fontSize: 13, fontWeight: '700', color: isDark ? '#E2E8F0' : '#334155', marginBottom: 8 }}>
                {isEn ? 'Service Categories (Multi-select)' : 'Hizmet Kategorisi (Birden fazla seçebilirsiniz)'} <Text style={{ color: '#EF4444' }}>*</Text>
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {SERVICE_CATEGORIES.map(cat => {
                  const isSelected = selectedCategories.includes(cat.id);
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      activeOpacity={0.8}
                      onPress={() => toggleCategory(cat.id)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 14,
                        backgroundColor: isSelected ? (isDark ? '#1E3A8A' : '#EEF2FF') : (isDark ? '#1C1C1E' : '#F8FAFC'),
                        borderWidth: 1.5,
                        borderColor: isSelected ? '#3B82F6' : (isDark ? '#2C2C2E' : '#E2E8F0')
                      }}
                    >
                      <IconSymbol name={cat.icon as any} size={15} color={isSelected ? (isDark ? '#60A5FA' : '#4F46E5') : (isDark ? '#71717A' : '#64748B')} />
                      <Text style={{ fontSize: 12.5, fontWeight: '700', color: isSelected ? (isDark ? '#60A5FA' : '#4F46E5') : (isDark ? '#E2E8F0' : '#475569') }}>
                        {isEn ? cat.labelEn : cat.labelTr}
                      </Text>
                      {isSelected && (
                        <IconSymbol name="checkmark.circle.fill" size={14} color={isDark ? '#60A5FA' : '#4F46E5'} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 5. Sunduğu Hizmetler (Açıklama) */}
            <View>
              <Text style={{ fontSize: 13, fontWeight: '700', color: isDark ? '#E2E8F0' : '#334155', marginBottom: 6 }}>
                {isEn ? 'Offered Services & Details' : 'Sunduğun Hizmetler ve Detaylar'} <Text style={{ color: '#EF4444' }}>*</Text>
              </Text>
              <View style={{
                backgroundColor: isDark ? '#1C1C1E' : '#F8FAFC',
                borderWidth: 1,
                borderColor: isDark ? '#2C2C2E' : '#CBD5E1',
                borderRadius: 12,
                padding: 12,
                minHeight: 80
              }}>
                <TextInput
                  value={offeredServices}
                  onChangeText={setOfferedServices}
                  multiline
                  numberOfLines={3}
                  placeholder={isEn
                    ? 'Describe what services you offer (e.g. Electrician, Plumbing, House painting, Math tutoring...)'
                    : 'Sunduğun hizmetleri açıklayın (Örn: Elektrik tesisatı, Boya-Badana, Musluk tamiri, Ev temizliği...)'}
                  placeholderTextColor={isDark ? '#71717A' : '#94A3B8'}
                  style={{ fontSize: 14, color: isDark ? '#FFFFFF' : '#0F172A', textAlignVertical: 'top' }}
                />
              </View>
            </View>

            {/* 6. Deneyim & Ek Notlar */}
            <View>
              <Text style={{ fontSize: 13, fontWeight: '700', color: isDark ? '#E2E8F0' : '#334155', marginBottom: 6 }}>
                {isEn ? 'Experience & Additional Notes (Optional)' : 'Deneyim ve Ek Notlar (İsteğe Bağlı)'}
              </Text>
              <View style={{
                backgroundColor: isDark ? '#1C1C1E' : '#F8FAFC',
                borderWidth: 1,
                borderColor: isDark ? '#2C2C2E' : '#CBD5E1',
                borderRadius: 12,
                padding: 12,
                minHeight: 65
              }}>
                <TextInput
                  value={experienceDetails}
                  onChangeText={setExperienceDetails}
                  multiline
                  numberOfLines={2}
                  placeholder={isEn
                    ? 'e.g. 10 years experience on Burgazada, reachable 24/7'
                    : 'Örn: 10 yıllık Büyükada esnafıyım, haftanın 7 günü ulaşılabilirim.'}
                  placeholderTextColor={isDark ? '#71717A' : '#94A3B8'}
                  style={{ fontSize: 14, color: isDark ? '#FFFFFF' : '#0F172A', textAlignVertical: 'top' }}
                />
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleSubmit}
              disabled={isSubmitting}
              style={{
                backgroundColor: '#2563EB',
                height: 52,
                borderRadius: 16,
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 8,
                shadowColor: '#2563EB',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 5
              }}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#FFFFFF' }}>
                  {isEn ? 'Submit Application' : 'Başvurumu Gönder'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <View style={{
            width: '100%',
            maxWidth: 340,
            backgroundColor: isDark ? '#18181B' : '#FFFFFF',
            borderRadius: 24,
            padding: 24,
            alignItems: 'center',
            elevation: 10,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.25,
            shadowRadius: 15,
          }}>
            <View style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: '#DCFCE7',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16
            }}>
              <IconSymbol name="checkmark.circle.fill" size={40} color="#16A34A" />
            </View>

            <Text style={{ fontSize: 19, fontWeight: '800', color: isDark ? '#F8FAFC' : '#0F172A', textAlign: 'center', marginBottom: 8 }}>
              {isEn ? 'Application Under Review' : 'Başvurunuz İncelemededir'}
            </Text>

            <Text style={{ fontSize: 13.5, color: isDark ? '#CBD5E1' : '#64748B', textAlign: 'center', lineHeight: 20, marginBottom: 20 }}>
              {isEn
                ? 'Thank you for your application. Our team is currently reviewing your details and will contact you shortly.'
                : 'AdaPlus Yerel Hizmet Ağı başvurunuz alınmıştır ve şu an inceleme aşamasındadır. Ekibimiz en kısa sürede sizinle iletişime geçecektir.'}
            </Text>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                setShowSuccessModal(false);
                router.back();
              }}
              style={{
                width: '100%',
                backgroundColor: '#2563EB',
                paddingVertical: 14,
                borderRadius: 14,
                alignItems: 'center'
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: '800', color: '#FFF' }}>
                {isEn ? 'Done' : 'Tamam'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
