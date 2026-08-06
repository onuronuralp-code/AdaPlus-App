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
import { useTranslation } from 'react-i18next';

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

const ISLANDS = [
  { id: 'buyukada', nameTr: 'Büyükada', nameEn: 'Büyükada' },
  { id: 'heybeliada', nameTr: 'Heybeliada', nameEn: 'Heybeliada' },
  { id: 'burgazada', nameTr: 'Burgazada', nameEn: 'Burgazada' },
  { id: 'kinaliada', nameTr: 'Kınalıada', nameEn: 'Kınalıada' },
  { id: 'sedefadası', nameTr: 'Sedef Adası', nameEn: 'Sedef Island' },
  { id: 'all', nameTr: 'Tüm Adalar', nameEn: 'All Islands' },
];

export default function HizmetSaglayiciScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const isEn = i18n.language?.startsWith('en');

  // Form State
  const [fullName, setFullName] = useState(user?.name || user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [selectedCategory, setSelectedCategory] = useState<string>('repair');
  const [selectedIsland, setSelectedIsland] = useState<string>('buyukada');
  const [offeredServices, setOfferedServices] = useState<string>('');
  const [experienceDetails, setExperienceDetails] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);

  const handleSubmit = async () => {
    if (!fullName.trim()) {
      Alert.alert(
        isEn ? 'Required Field' : 'Gerekli Alan',
        isEn ? 'Please enter your Full Name.' : 'Lütfen Ad Soyad alanını doldurunuz.'
      );
      return;
    }

    if (!phone.trim() || phone.trim().length < 7) {
      Alert.alert(
        isEn ? 'Required Field' : 'Gerekli Alan',
        isEn ? 'Please enter a valid contact phone number.' : 'Lütfen geçerli bir iletişim telefon numarası giriniz.'
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

    // Simulate API request
    setTimeout(() => {
      setIsSubmitting(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowSuccessModal(true);
    }, 1200);
  };

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }}>
      <Stack.Screen options={{ headerShown: false }} />
      {/* Top Header */}
      <View style={{
        paddingTop: insets.top + 8,
        paddingBottom: 14,
        paddingHorizontal: 16,
        backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
        borderBottomColor: isDark ? '#334155' : '#E2E8F0',
        zIndex: 10
      }}>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          style={{
            width: 52,
            height: 52,
            borderRadius: 16,
            backgroundColor: isDark ? '#334155' : '#F1F5F9',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <IconSymbol name="chevron.left" size={25} color={isDark ? '#F8FAFC' : '#0F172A'} />
        </TouchableOpacity>

        <Text style={{ fontSize: 17, fontWeight: '800', color: isDark ? '#F8FAFC' : '#0F172A', textAlign: 'center' }}>
          {isEn ? 'Service Provider Application' : 'Yerel Hizmet Sağlayıcı Ol'}
        </Text>

        <View style={{ width: 52 }} />
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
          {/* Top Hero Banner */}
          <View style={{
            backgroundColor: '#2563EB',
            borderRadius: 20,
            padding: 20,
            marginBottom: 20,
            overflow: 'hidden'
          }}>
            <View style={{ position: 'absolute', right: -25, top: -25, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.12)' }} />
            <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginBottom: 8 }}>
              <IconSymbol name="briefcase.fill" size={12} color="#FFF" />
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFF' }}>
                {isEn ? 'LOCAL PROVIDER NETWORK' : 'YEREL HİZMET AĞI'}
              </Text>
            </View>
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#FFF', marginBottom: 4 }}>
              {isEn ? 'Share Your Expertise in Islands' : 'Uzmanlığını Adalı Komşularınla Paylaş'}
            </Text>
            <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)', lineHeight: 18 }}>
              {isEn
                ? 'Join our verified network of island service providers and get discovered directly by local residents.'
                : 'AdaPlus hizmet ağına katılarak adadaki komşularına doğrudan ulaşabilir, hizmetini öne çıkarabilirsin.'}
            </Text>
          </View>

          {/* Form Card */}
          <View style={{
            backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
            borderRadius: 20,
            padding: 18,
            borderWidth: 1,
            borderColor: isDark ? '#334155' : '#E2E8F0',
            gap: 16
          }}>
            {/* 1. Ad Soyad */}
            <View>
              <Text style={{ fontSize: 13, fontWeight: '700', color: isDark ? '#CBD5E1' : '#334155', marginBottom: 6 }}>
                {isEn ? 'Full Name' : 'Ad Soyad'} <Text style={{ color: '#EF4444' }}>*</Text>
              </Text>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                borderWidth: 1,
                borderColor: isDark ? '#334155' : '#CBD5E1',
                borderRadius: 12,
                paddingHorizontal: 12,
                height: 48
              }}>
                <IconSymbol name="person.fill" size={18} color={isDark ? '#94A3B8' : '#64748B'} />
                <TextInput
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder={isEn ? 'e.g. Ahmet Yılmaz' : 'Örn: Ahmet Yılmaz'}
                  placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                  style={{ flex: 1, marginLeft: 10, fontSize: 14, color: isDark ? '#F8FAFC' : '#0F172A' }}
                />
              </View>
            </View>

            {/* 2. İletişim Numarası */}
            <View>
              <Text style={{ fontSize: 13, fontWeight: '700', color: isDark ? '#CBD5E1' : '#334155', marginBottom: 6 }}>
                {isEn ? 'Contact Phone Number' : 'İletişim Numarası'} <Text style={{ color: '#EF4444' }}>*</Text>
              </Text>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                borderWidth: 1,
                borderColor: isDark ? '#334155' : '#CBD5E1',
                borderRadius: 12,
                paddingHorizontal: 12,
                height: 48
              }}>
                <IconSymbol name="phone.fill" size={18} color={isDark ? '#94A3B8' : '#64748B'} />
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  placeholder={isEn ? '05XX XXX XX XX' : '05XX XXX XX XX'}
                  placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                  style={{ flex: 1, marginLeft: 10, fontSize: 14, color: isDark ? '#F8FAFC' : '#0F172A' }}
                />
              </View>
            </View>

            {/* 3. Lokasyon / Ada Seçimi */}
            <View>
              <Text style={{ fontSize: 13, fontWeight: '700', color: isDark ? '#CBD5E1' : '#334155', marginBottom: 8 }}>
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
                        backgroundColor: isSelected ? '#2563EB' : (isDark ? '#0F172A' : '#F1F5F9'),
                        borderWidth: 1,
                        borderColor: isSelected ? '#2563EB' : (isDark ? '#334155' : '#E2E8F0')
                      }}
                    >
                      <Text style={{ fontSize: 12.5, fontWeight: '700', color: isSelected ? '#FFF' : (isDark ? '#CBD5E1' : '#475569') }}>
                        {isEn ? island.nameEn : island.nameTr}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* 4. Hizmet Kategorisi */}
            <View>
              <Text style={{ fontSize: 13, fontWeight: '700', color: isDark ? '#CBD5E1' : '#334155', marginBottom: 8 }}>
                {isEn ? 'Service Category' : 'Hizmet Kategorisi'} <Text style={{ color: '#EF4444' }}>*</Text>
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {SERVICE_CATEGORIES.map(cat => {
                  const isSelected = selectedCategory === cat.id;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      activeOpacity={0.8}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setSelectedCategory(cat.id);
                      }}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 14,
                        backgroundColor: isSelected ? (isDark ? '#312E81' : '#EEF2FF') : (isDark ? '#0F172A' : '#F8FAFC'),
                        borderWidth: 1.5,
                        borderColor: isSelected ? '#4F46E5' : (isDark ? '#334155' : '#E2E8F0')
                      }}
                    >
                      <IconSymbol name={cat.icon as any} size={15} color={isSelected ? '#4F46E5' : (isDark ? '#94A3B8' : '#64748B')} />
                      <Text style={{ fontSize: 12.5, fontWeight: '700', color: isSelected ? '#4F46E5' : (isDark ? '#CBD5E1' : '#475569') }}>
                        {isEn ? cat.labelEn : cat.labelTr}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 5. Sunduğu Hizmetler (Açıklama) */}
            <View>
              <Text style={{ fontSize: 13, fontWeight: '700', color: isDark ? '#CBD5E1' : '#334155', marginBottom: 6 }}>
                {isEn ? 'Offered Services & Details' : 'Sunduğun Hizmetler ve Detaylar'} <Text style={{ color: '#EF4444' }}>*</Text>
              </Text>
              <View style={{
                backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                borderWidth: 1,
                borderColor: isDark ? '#334155' : '#CBD5E1',
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
                  placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                  style={{ fontSize: 14, color: isDark ? '#F8FAFC' : '#0F172A', textAlignVertical: 'top' }}
                />
              </View>
            </View>

            {/* 6. Deneyim & Ek Notlar */}
            <View>
              <Text style={{ fontSize: 13, fontWeight: '700', color: isDark ? '#CBD5E1' : '#334155', marginBottom: 6 }}>
                {isEn ? 'Experience & Additional Notes (Optional)' : 'Deneyim ve Ek Notlar (İsteğe Bağlı)'}
              </Text>
              <View style={{
                backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                borderWidth: 1,
                borderColor: isDark ? '#334155' : '#CBD5E1',
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
                  placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                  style={{ fontSize: 14, color: isDark ? '#F8FAFC' : '#0F172A', textAlignVertical: 'top' }}
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
            backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
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
              {isEn ? 'Application Received!' : 'Başvurunuz Alındı!'}
            </Text>

            <Text style={{ fontSize: 13.5, color: isDark ? '#CBD5E1' : '#64748B', textAlign: 'center', lineHeight: 20, marginBottom: 20 }}>
              {isEn
                ? 'Thank you for joining the AdaPlus Local Provider Network. Our team will review your application and contact you shortly.'
                : 'AdaPlus Yerel Hizmet Ağı başvurunuz tarafımıza ulaşmıştır. Ekibimiz en kısa sürede sizinle iletişime geçecektir.'}
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
