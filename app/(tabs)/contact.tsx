import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTranslation } from 'react-i18next';

export default function ContactScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<{ fullName?: string; email?: string }>({});
  const [touched, setTouched] = useState<{ fullName?: boolean; email?: boolean }>({});

  const validateName = (name: string): string | undefined => {
    const trimmed = name.trim();
    if (!trimmed) return 'Ad Soyad alanı boş bırakılamaz.';
    if (!/^[a-zA-ZğüşöçıİĞÜŞÖÇ\s]+$/.test(trimmed)) return 'Ad Soyad yalnızca harf içermelidir.';
    if (trimmed.split(/\s+/).length < 2) return 'Lütfen ad ve soyadınızı giriniz.';
    return undefined;
  };

  const validateEmail = (mail: string): string | undefined => {
    const trimmed = mail.trim();
    if (!trimmed) return 'E-posta adresi boş bırakılamaz.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return 'Geçerli bir e-posta adresi giriniz.';
    return undefined;
  };

  const handleNameChange = (value: string) => {
    setFullName(value);
    if (touched.fullName) {
      setErrors(prev => ({ ...prev, fullName: validateName(value) }));
    }
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (touched.email) {
      setErrors(prev => ({ ...prev, email: validateEmail(value) }));
    }
  };

  const handleNameBlur = () => {
    setTouched(prev => ({ ...prev, fullName: true }));
    setErrors(prev => ({ ...prev, fullName: validateName(fullName) }));
  };

  const handleEmailBlur = () => {
    setTouched(prev => ({ ...prev, email: true }));
    setErrors(prev => ({ ...prev, email: validateEmail(email) }));
  };

  const handleSubmit = () => {
    const nameError = validateName(fullName);
    const emailError = validateEmail(email);
    setTouched({ fullName: true, email: true });
    setErrors({ fullName: nameError, email: emailError });

    if (nameError || emailError) return;

    Alert.alert('Başarılı ✓', 'Mesajınız başarıyla gönderildi!');
    setFullName('');
    setEmail('');
    setMessage('');
    setTouched({});
    setErrors({});
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <Text style={styles.headerTitle}>{t('common.tabRequests')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>{t('common.sendUsMessage', { defaultValue: 'Bize Mesaj Gönder' })}</Text>
          <Text style={styles.formSubtitle}>{t('common.contactSubtitle', { defaultValue: 'Görüş ve önerileriniz bizim için değerli.' })}</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('common.fullName', { defaultValue: 'AD SOYAD' })}</Text>
            <View style={[styles.inputWrapper, errors.fullName ? styles.inputWrapperError : null]}>
              <IconSymbol name="person.fill" size={18} color="#94A3B8" />
              <TextInput
                style={styles.input}
                placeholder="Melis Yılmaz"
                value={fullName}
                onChangeText={handleNameChange}
                onBlur={handleNameBlur}
              />
            </View>
            {errors.fullName && <Text style={styles.errorText}>{errors.fullName}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('common.email', { defaultValue: 'E-POSTA ADRESİ' })}</Text>
            <View style={[styles.inputWrapper, errors.email ? styles.inputWrapperError : null]}>
              <IconSymbol name="envelope.fill" size={18} color="#94A3B8" />
              <TextInput
                style={styles.input}
                placeholder="melis@example.com"
                value={email}
                onChangeText={handleEmailChange}
                onBlur={handleEmailBlur}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('common.message', { defaultValue: 'MESAJINIZ' })}</Text>
            <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder={t('common.messagePlaceholder', { defaultValue: 'Nasıl yardımcı olabiliriz?' })}
                value={message}
                onChangeText={setMessage}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>

          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
            <Text style={styles.submitButtonText}>{t('common.send', { defaultValue: 'Gönder' })}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { paddingHorizontal: 24, paddingBottom: 24, backgroundColor: '#3B82F6', borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff', textAlign: 'center' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  formCard: { backgroundColor: '#fff', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5 },
  formTitle: { fontSize: 20, fontWeight: 'bold', color: '#1E293B', marginBottom: 8 },
  formSubtitle: { fontSize: 14, color: '#64748B', marginBottom: 24 },
  inputGroup: { marginBottom: 20 },
  inputLabel: { fontSize: 12, fontWeight: '700', color: '#94A3B8', marginBottom: 8, letterSpacing: 0.5 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 16, paddingHorizontal: 16, borderWidth: 1, borderColor: 'transparent' },
  inputWrapperError: { borderColor: '#EF4444', backgroundColor: '#FFF1F2' },
  input: { flex: 1, paddingVertical: 14, paddingHorizontal: 12, fontSize: 16, color: '#1E293B' },
  textAreaWrapper: { alignItems: 'flex-start' },
  textArea: { minHeight: 100, paddingTop: 12 },
  submitButton: { backgroundColor: '#3B82F6', borderRadius: 16, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', marginTop: 8, shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  errorText: { color: '#EF4444', fontSize: 12, marginTop: 4, marginLeft: 4 },
});
