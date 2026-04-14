import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter } from 'expo-router';

export default function ProfileScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
                <Text style={styles.headerTitle}>Profil</Text>
                <TouchableOpacity style={styles.settingsButton}>
                    <IconSymbol name="plus" size={24} color="#000" />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.profileCard}>
                    <View style={styles.avatarContainer}>
                        <Image 
                            source={{ uri: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop' }} 
                            style={styles.avatar} 
                        />
                        <TouchableOpacity style={styles.editBadge}>
                            <IconSymbol name="plus" size={14} color="#fff" />
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.userName}>Melis Yılmaz</Text>
                    <Text style={styles.userBio}>Ada tutkunu | Gezgin | Fotoğrafçı</Text>

                    <View style={styles.statsRow}>
                        <View style={styles.statBox}>
                            <Text style={styles.statValue}>12</Text>
                            <Text style={styles.statLabel}>Paylaşım</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statBox}>
                            <Text style={styles.statValue}>248</Text>
                            <Text style={styles.statLabel}>Takipçi</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statBox}>
                            <Text style={styles.statValue}>156</Text>
                            <Text style={styles.statLabel}>Takip</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.menuSection}>
                    <ProfileMenuItem icon="heart.fill" label="Favorilerim" color="#EC4899" />
                    <ProfileMenuItem icon="calendar" label="Etkinliklerim" color="#F59E0B" />
                    <ProfileMenuItem icon="map.fill" label="Gezi Geçmişi" color="#3B82F6" />
                    <ProfileMenuItem icon="envelope.fill" label="Mesajlar" color="#10B981" />
                </View>

                <TouchableOpacity 
                    style={styles.logoutButton} 
                    onPress={() => router.replace('/login')}
                >
                    <Text style={styles.logoutText}>Çıkış Yap</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

function ProfileMenuItem({ icon, label, color }: { icon: string, label: string, color: string }) {
    return (
        <TouchableOpacity style={styles.menuItem}>
            <View style={[styles.menuIconContainer, { backgroundColor: `${color}15` }]}>
                <IconSymbol name={icon as any} size={20} color={color} />
            </View>
            <Text style={styles.menuLabel}>{label}</Text>
            <IconSymbol name="chevron.right" size={16} color="#CBD5E1" />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingBottom: 20, backgroundColor: '#fff' },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#0F172A' },
    settingsButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
    scrollContent: { padding: 20, paddingBottom: 100 },
    profileCard: { backgroundColor: '#fff', borderRadius: 30, padding: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 15, elevation: 5, marginBottom: 24 },
    avatarContainer: { position: 'relative', marginBottom: 16 },
    avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 4, borderColor: '#F1F5F9' },
    editBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#3B82F6', width: 30, height: 30, borderRadius: 15, borderWidth: 3, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
    userName: { fontSize: 22, fontWeight: 'bold', color: '#0F172A', marginBottom: 4 },
    userBio: { fontSize: 14, color: '#64748B', marginBottom: 24 },
    statsRow: { flexDirection: 'row', alignItems: 'center', width: '100%', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 20 },
    statBox: { flex: 1, alignItems: 'center' },
    statValue: { fontSize: 18, fontWeight: 'bold', color: '#0F172A' },
    statLabel: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
    statDivider: { width: 1, height: 30, backgroundColor: '#E2E8F0' },
    menuSection: { backgroundColor: '#fff', borderRadius: 24, paddingVertical: 8, paddingHorizontal: 16, marginBottom: 24 },
    menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
    menuIconContainer: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
    menuLabel: { flex: 1, fontSize: 16, fontWeight: '600', color: '#334155' },
    logoutButton: { paddingVertical: 18, alignItems: 'center', justifyContent: 'center' },
    logoutText: { color: '#EF4444', fontSize: 16, fontWeight: 'bold' }
});
