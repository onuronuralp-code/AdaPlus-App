import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/context/AuthContext';
import { contactApi } from '@/services/contactApi';

export default function ContactScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const { user } = useAuth();
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ fullName?: string; email?: string; message?: string }>({});
  const [touched, setTouched] = useState<{ fullName?: boolean; email?: boolean }>({});

  const validateName = (name: string): string | undefined => {
    const trimmed = name.trim();
    if (!trimmed) return t('contact.errNameEmpty');
    return undefined;
  };

  const validateEmail = (mail: string): string | undefined => {
    const trimmed = mail.trim();
    if (!trimmed) return t('contact.errEmailEmpty');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return t('contact.errEmailInvalid');
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

  const handleSubmit = async () => {
    const nameError = validateName(fullName);
    const emailError = validateEmail(email);
    const messageError = message.trim().length < 10 ? t('contact.errMessageShort') : undefined;
    
    setTouched({ fullName: true, email: true });
    setErrors({ fullName: nameError, email: emailError, message: messageError });

    if (nameError || emailError || messageError) return;

    setIsSubmitting(true);
    try {
      await contactApi.send({ fullName: fullName.trim(), email: email.trim(), message: message.trim() });
      Alert.alert(t('common.success'), t('contact.successMsg'));
      setMessage('');
      setTouched({});
      setErrors({});
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message || t('contact.errMsg'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Text style={styles.headerTitle}>{t('common.tabRequests')}</Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          bounces={true}
        >
          {/* Separate Info Banner Component */}
          <View style={styles.infoBanner}>
            <View style={styles.infoIconContainer}>
              <IconSymbol name="info.circle.fill" size={18} color="#10B981" />
            </View>
            <Text style={styles.infoBannerText}>
              {t('common.contactSubtitle')}
            </Text>
          </View>

          {/* Main Contact Card */}
          <View style={styles.formCard}>


            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('common.fullName')}</Text>
              <View style={[styles.inputWrapper, errors.fullName ? styles.inputWrapperError : null]}>
                <IconSymbol name="person.fill" size={18} color={errors.fullName ? '#EF4444' : '#94A3B8'} />
                <TextInput
                  style={styles.input}
                  placeholder={t('common.fullNamePlaceholder')}
                  placeholderTextColor="#CBD5E1"
                  value={fullName}
                  onChangeText={handleNameChange}
                  onBlur={handleNameBlur}
                />
              </View>
              {errors.fullName && (
                <View style={styles.errorRow}>
                  <IconSymbol name="exclamationmark.circle.fill" size={12} color="#EF4444" />
                  <Text style={styles.errorText}>{errors.fullName}</Text>
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('common.email')}</Text>
              <View style={[styles.inputWrapper, errors.email ? styles.inputWrapperError : null]}>
                <IconSymbol name="envelope.fill" size={18} color={errors.email ? '#EF4444' : '#94A3B8'} />
                <TextInput
                  style={styles.input}
                  placeholder={t('common.emailPlaceholder')}
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
                  <IconSymbol name="exclamationmark.circle.fill" size={12} color="#EF4444" />
                  <Text style={styles.errorText}>{errors.email}</Text>
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('common.message')}</Text>
              <View style={[styles.inputWrapper, styles.textAreaWrapper, errors.message ? styles.inputWrapperError : null]}>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder={t('common.messagePlaceholder')}
                  placeholderTextColor="#CBD5E1"
                  value={message}
                  onChangeText={setMessage}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
              {errors.message && (
                <View style={styles.errorRow}>
                  <IconSymbol name="exclamationmark.circle.fill" size={12} color="#EF4444" />
                  <Text style={styles.errorText}>{errors.message}</Text>
                </View>
              )}
            </View>

          </View>

        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity onPress={handleSubmit} activeOpacity={0.9} style={styles.submitButtonWrapper} disabled={isSubmitting}>
            <LinearGradient
              colors={['#10B981', '#059669']} 
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.submitButton}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <IconSymbol name="paperplane.fill" size={20} color="#fff" />
                  <Text style={styles.submitButtonText}>{t('contact.send')}</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF', 
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC', 
    borderRadius: 24,
    padding: 18,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 14,
    color: '#475569', 
    fontWeight: '700',
    lineHeight: 20,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 100, // Extra space for fixed footer
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 32,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
    marginBottom: 24,
  },
  formHeader: {
    marginBottom: 24,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
    letterSpacing: -0.4,
  },
  formSubtitle: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B', // Slate 500
    marginBottom: 10,
    letterSpacing: 0.8,
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC', 
    borderRadius: 20,
    paddingHorizontal: 18,
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
  },
  inputWrapperError: {
    borderColor: '#FDA4AF',
    backgroundColor: '#FFF1F2',
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#0F172A',
    fontWeight: '600',
  },
  textAreaWrapper: {
    alignItems: 'flex-start',
  },
  textArea: {
    minHeight: 120,
    paddingTop: 14,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    marginLeft: 6,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    backgroundColor: '#F8FAFC',
  },
  submitButtonWrapper: {
    // marginBottom removed to use footer padding
  },
  submitButton: {
    flexDirection: 'row',
    borderRadius: 24,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
