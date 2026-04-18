import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function ContactScreen() {
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
        <Text style={styles.headerTitle}>Bize Ulaşın</Text>
        <Text style={styles.headerSubtitle}>Sizden haber almak isteriz!</Text>
      </View>
      <ScrollView style={styles.formContainer} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <Text style={styles.label}>Ad Soyad</Text>
        <TextInput
          style={[styles.input, errors.fullName ? styles.inputError : null]}
          placeholder="Adınız Soyadınız"
          placeholderTextColor="#94A3B8"
          value={fullName}
          onChangeText={handleNameChange}
          onBlur={handleNameBlur}
          autoCapitalize="words"
        />
        {errors.fullName && <Text style={styles.errorText}>{errors.fullName}</Text>}

        <Text style={styles.label}>E-posta Adresi</Text>
        <TextInput
          style={[styles.input, errors.email ? styles.inputError : null]}
          placeholder="ornek@mail.com"
          keyboardType="email-address"
          placeholderTextColor="#94A3B8"
          value={email}
          onChangeText={handleEmailChange}
          onBlur={handleEmailBlur}
          autoCapitalize="none"
        />
        {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

        <Text style={styles.label}>Mesajınız</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Size nasıl yardımcı olabiliriz?"
          placeholderTextColor="#94A3B8"
          multiline
          numberOfLines={6}
          textAlignVertical="top"
          value={message}
          onChangeText={setMessage}
        />

        <TouchableOpacity style={styles.submitButton} activeOpacity={0.8} onPress={handleSubmit}>
          <IconSymbol name={"envelope.fill" as any} size={20} color="#fff" />
          <Text style={styles.submitButtonText}>Mesaj Gönder</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { paddingHorizontal: 24, paddingBottom: 24, backgroundColor: '#3B82F6', borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  headerSubtitle: { fontSize: 15, color: '#DBEAFE' },
  formContainer: { flex: 1, padding: 24, marginTop: 10 },
  label: { fontSize: 14, fontWeight: '600', color: '#334155', marginBottom: 8, marginLeft: 4 },
  input: { backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: '#0F172A', marginBottom: 20, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 5, elevation: 2 },
  textArea: { minHeight: 120, paddingTop: 16 },
  submitButton: { flexDirection: 'row', backgroundColor: '#3B82F6', borderRadius: 16, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', marginTop: 10, shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
  inputError: { borderColor: '#EF4444', borderWidth: 1.5 },
  errorText: { color: '#EF4444', fontSize: 12, fontWeight: '600', marginTop: -14, marginBottom: 16, marginLeft: 6 },
});
