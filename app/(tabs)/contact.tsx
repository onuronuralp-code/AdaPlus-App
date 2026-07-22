import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ActivityIndicator, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/context/AuthContext';
import { contactApi } from '@/services/contactApi';
import { s, vs, ms } from '@/utils/scale';
import { SwipeNavigation } from '@/components/SwipeNavigation';

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
    <SwipeNavigation leftRoute="/(tabs)/home" rightRoute="/(tabs)/profile">
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + vs(10) }]}>
        <Text style={styles.headerTitle}>{t('common.tabRequests')}</Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: vs(16) }]} keyboardShouldPersistTaps="handled" bounces={false}>
          {/* Separate Info Banner Component */}
          <View style={styles.infoBanner}>
            <View style={styles.infoIconContainer}>
              <IconSymbol name="info.circle.fill" size={ms(18)} color="#10B981" />
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
                <IconSymbol name="person.fill" size={ms(18)} color={errors.fullName ? '#EF4444' : '#94A3B8'} />
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
                  <IconSymbol name="exclamationmark.circle.fill" size={ms(12)} color="#EF4444" />
                  <Text style={styles.errorText}>{errors.fullName}</Text>
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('common.email')}</Text>
              <View style={[styles.inputWrapper, errors.email ? styles.inputWrapperError : null]}>
                <IconSymbol name="envelope.fill" size={ms(18)} color={errors.email ? '#EF4444' : '#94A3B8'} />
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

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>{t('common.message')}</Text>
              <View style={[styles.inputWrapper, styles.textAreaWrapper, errors.message ? styles.inputWrapperError : null, { flex: 1 }]}>
                <TextInput
                  style={[styles.input, styles.textArea, { flex: 1 }]}
                  placeholder={t('common.messagePlaceholder')}
                  placeholderTextColor="#CBD5E1"
                  value={message}
                  onChangeText={setMessage}
                  multiline
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

          <TouchableOpacity onPress={handleSubmit} activeOpacity={0.9} style={[styles.submitButtonWrapper, { marginTop: 0, marginBottom: vs(12) }]} disabled={isSubmitting}>
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
                  <IconSymbol name="paperplane.fill" size={ms(20)} color="#fff" />
                  <Text style={styles.submitButtonText}>{t('contact.send')}</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
    </SwipeNavigation>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF', 
  },
  header: {
    paddingHorizontal: s(20),
    paddingBottom: vs(16),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: ms(26),
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC', 
    borderRadius: s(16),
    padding: s(18),
    marginBottom: vs(24),
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  infoIconContainer: {
    width: s(40),
    height: s(40),
    borderRadius: s(10),
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: s(14),
  },
  infoBannerText: {
    flex: 1,
    fontSize: ms(14),
    color: '#475569', 
    fontWeight: '700',
    lineHeight: ms(20),
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: s(20),
    paddingTop: vs(24),
    paddingBottom: vs(24),
  },
  formCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: s(20),
    padding: s(24),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: vs(8) },
    shadowOpacity: 0.08,
    shadowRadius: s(24),
    elevation: 8,
    marginBottom: vs(12),
  },
  formHeader: {
    marginBottom: vs(24),
  },
  formTitle: {
    fontSize: ms(22),
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: vs(6),
    letterSpacing: -0.4,
  },
  formSubtitle: {
    fontSize: ms(14),
    color: '#64748B',
    lineHeight: ms(20),
  },
  inputGroup: {
    marginBottom: vs(20),
  },
  inputLabel: {
    fontSize: ms(12),
    fontWeight: '800',
    color: '#64748B',
    marginBottom: vs(10),
    letterSpacing: 0.8,
    marginLeft: s(4),
    textTransform: 'uppercase',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC', 
    borderRadius: s(14),
    paddingHorizontal: s(18),
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
  },
  inputWrapperError: {
    borderColor: '#FDA4AF',
    backgroundColor: '#FFF1F2',
  },
  input: {
    flex: 1,
    paddingVertical: vs(16),
    paddingHorizontal: s(12),
    fontSize: ms(16),
    color: '#0F172A',
    fontWeight: '600',
  },
  textAreaWrapper: {
    alignItems: 'flex-start',
  },
  textArea: {
    flex: 1,
    paddingTop: vs(14),
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(6),
    marginTop: vs(8),
    marginLeft: s(6),
  },
  errorText: {
    color: '#EF4444',
    fontSize: ms(12),
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: s(20),
    paddingTop: vs(12),
    paddingBottom: vs(24),
    backgroundColor: '#F8FAFC',
  },
  submitButtonWrapper: {
    // marginBottom removed to use footer padding
  },
  submitButton: {
    flexDirection: 'row',
    borderRadius: s(14),
    paddingVertical: vs(17),
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(12),
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: vs(8) },
    shadowOpacity: 0.2,
    shadowRadius: s(20),
    elevation: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: ms(17),
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
