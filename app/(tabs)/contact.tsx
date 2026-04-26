import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
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
      {/* Header — matches Profile page style */}
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <Text style={styles.headerTitle}>{t('common.tabRequests')}</Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Info banner */}
          <View style={styles.infoBanner}>
            <View style={styles.infoBannerIcon}>
              <IconSymbol name={"info.circle.fill" as any} size={20} color="#3B82F6" />
            </View>
            <Text style={styles.infoBannerText}>
              {t('common.contactSubtitle', { defaultValue: 'Görüş ve önerileriniz bizim için değerli.' })}
            </Text>
          </View>

          {/* Form Card */}
          <View style={styles.formCard}>
            <View style={styles.formHeader}>
              <View style={styles.formIconContainer}>
                <IconSymbol name={"envelope.fill" as any} size={22} color="#3B82F6" />
              </View>
              <View>
                <Text style={styles.formTitle}>{t('common.sendUsMessage', { defaultValue: 'Bize Mesaj Gönder' })}</Text>
                <Text style={styles.formSubtitle}>{t('common.formHelp', { defaultValue: 'Tüm alanları doldurunuz' })}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('common.fullName', { defaultValue: 'AD SOYAD' })}</Text>
              <View style={[styles.inputWrapper, errors.fullName ? styles.inputWrapperError : null]}>
                <IconSymbol name="person.fill" size={18} color={errors.fullName ? '#EF4444' : '#94A3B8'} />
                <TextInput
                  style={styles.input}
                  placeholder="Melis Yılmaz"
                  placeholderTextColor="#CBD5E1"
                  value={fullName}
                  onChangeText={handleNameChange}
                  onBlur={handleNameBlur}
                />
              </View>
              {errors.fullName && (
                <View style={styles.errorRow}>
                  <IconSymbol name={"exclamationmark.circle.fill" as any} size={14} color="#EF4444" />
                  <Text style={styles.errorText}>{errors.fullName}</Text>
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('common.email', { defaultValue: 'E-POSTA ADRESİ' })}</Text>
              <View style={[styles.inputWrapper, errors.email ? styles.inputWrapperError : null]}>
                <IconSymbol name="envelope.fill" size={18} color={errors.email ? '#EF4444' : '#94A3B8'} />
                <TextInput
                  style={styles.input}
                  placeholder="melis@example.com"
                  placeholderTextColor="#CBD5E1"
                  value={email}
                  onChangeText={handleEmailChange}
                  onBlur={handleEmailBlur}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              {errors.email && (
                <View style={styles.errorRow}>
                  <IconSymbol name={"exclamationmark.circle.fill" as any} size={14} color="#EF4444" />
                  <Text style={styles.errorText}>{errors.email}</Text>
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('common.message', { defaultValue: 'MESAJINIZ' })}</Text>
              <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder={t('common.messagePlaceholder', { defaultValue: 'Nasıl yardımcı olabiliriz?' })}
                  placeholderTextColor="#CBD5E1"
                  value={message}
                  onChangeText={setMessage}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </View>

            <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} activeOpacity={0.8}>
              <IconSymbol name={"paperplane.fill" as any} size={18} color="#fff" />
              <Text style={styles.submitButtonText}>{t('common.send', { defaultValue: 'Gönder' })}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 20,
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  infoBannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 13,
    color: '#1E40AF',
    fontWeight: '500',
    lineHeight: 18,
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 5,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  formIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  formSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 8,
    letterSpacing: 1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  inputWrapperError: {
    borderColor: '#FECACA',
    backgroundColor: '#FFF1F2',
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    fontSize: 15,
    color: '#1E293B',
    fontWeight: '500',
  },
  textAreaWrapper: {
    alignItems: 'flex-start',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 14,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    marginLeft: 4,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '500',
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: '#3B82F6',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    gap: 8,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
