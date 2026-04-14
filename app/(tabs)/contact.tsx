import React from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function ContactScreen() {
  const insets = useSafeAreaInsets();
  
  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <Text style={styles.headerTitle}>Reach to Us</Text>
        <Text style={styles.headerSubtitle}>We'd love to hear from you!</Text>
      </View>
      <ScrollView style={styles.formContainer} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <Text style={styles.label}>Full Name</Text>
        <TextInput style={styles.input} placeholder="John Doe" placeholderTextColor="#94A3B8" />
        
        <Text style={styles.label}>Email Address</Text>
        <TextInput style={styles.input} placeholder="hello@example.com" keyboardType="email-address" placeholderTextColor="#94A3B8" />
        
        <Text style={styles.label}>Message</Text>
        <TextInput 
          style={[styles.input, styles.textArea]} 
          placeholder="How can we help you?" 
          placeholderTextColor="#94A3B8"
          multiline 
          numberOfLines={6} 
          textAlignVertical="top"
        />
        
        <TouchableOpacity style={styles.submitButton} activeOpacity={0.8}>
          <IconSymbol name={"envelope.fill" as any} size={20} color="#fff" />
          <Text style={styles.submitButtonText}>Send Message</Text>
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
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginLeft: 8 }
});
