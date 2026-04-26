import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTranslation } from 'react-i18next';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// İlan türleri
type IlanCategory = 'all' | 'sell' | 'rent' | 'service' | 'lost' | 'job';

interface Ilan {
  id: string;
  title: string;
  description: string;
  category: IlanCategory;
  author: string;
  timeAgo: string;
  price?: string;
  location: string;
  isUrgent?: boolean;
}

const CATEGORY_CONFIG: Record<IlanCategory, { label: string; icon: string; color: string; bg: string }> = {
  all:     { label: 'Tümü',      icon: 'square.grid.2x2.fill', color: '#3B82F6', bg: '#EFF6FF' },
  sell:    { label: 'Satılık',   icon: 'tag.fill',             color: '#10B981', bg: '#ECFDF5' },
  rent:    { label: 'Kiralık',   icon: 'key.fill',             color: '#F59E0B', bg: '#FEF3C7' },
  service: { label: 'Hizmet',    icon: 'wrench.and.screwdriver.fill', color: '#8B5CF6', bg: '#F5F3FF' },
  job:     { label: 'İş İlanı',  icon: 'briefcase.fill',       color: '#6366F1', bg: '#EEF2FF' },
  lost:    { label: 'Kayıp',     icon: 'exclamationmark.triangle.fill', color: '#EF4444', bg: '#FEF2F2' },
};

const SAMPLE_ILANLAR: Ilan[] = [
  {
    id: '1',
    title: 'Büyükada\'da Kiralık Bisiklet',
    description: 'Günlük ve haftalık kiralık bisikletler. Elektrikli ve klasik modeller mevcuttur.',
    category: 'rent',
    author: 'Ahmet Y.',
    timeAgo: '2 saat önce',
    price: '150₺/gün',
    location: 'Büyükada',
  },
  {
    id: '2',
    title: 'El Yapımı Takılar',
    description: 'Adada el yapımı boncuk ve doğal taşlardan özel tasarım takılar. Sipariş alınır.',
    category: 'sell',
    author: 'Zeynep K.',
    timeAgo: '5 saat önce',
    price: '200₺',
    location: 'Heybeliada',
  },
  {
    id: '3',
    title: 'Ev Temizliği Hizmeti',
    description: 'Haftalık ve aylık ev temizliği hizmeti. Referanslı ve deneyimli ekip.',
    category: 'service',
    author: 'Murat D.',
    timeAgo: '1 gün önce',
    location: 'Tüm Adalar',
  },
  {
    id: '4',
    title: 'Kayıp Kedi — Turuncu Tekir',
    description: 'Büyükada Nizam Mahallesi civarında kaybolan turuncu tekir kedi. Bulan lütfen iletişime geçsin.',
    category: 'lost',
    author: 'Elif S.',
    timeAgo: '3 saat önce',
    location: 'Büyükada',
    isUrgent: true,
  },
  {
    id: '5',
    title: 'Yazlık Ev Kiralık',
    description: 'Denize sıfır, bahçeli, 3+1 yazlık ev. Haziran-Eylül dönemi için uygun.',
    category: 'rent',
    author: 'Canan B.',
    timeAgo: '6 saat önce',
    price: '25.000₺/ay',
    location: 'Kınalıada',
  },
  {
    id: '6',
    title: 'Antika Mumluk Seti',
    description: 'Osmanlı dönemi pirinç mumluk seti. 4 parça, çok iyi durumda.',
    category: 'sell',
    author: 'Osman T.',
    timeAgo: '1 gün önce',
    price: '3.500₺',
    location: 'Burgazada',
  },
  {
    id: '7',
    title: 'Garson / Servis Elemanı',
    description: 'Büyükada sahil restoranımızda çalışacak deneyimli veya yetiştirilmek üzere servis elemanları aranıyor. Konaklama imkanı mevcuttur.',
    category: 'job',
    author: 'Deniz Restoran',
    timeAgo: '1 saat önce',
    price: '28.000₺ + Tip',
    location: 'Büyükada',
    isUrgent: true,
  },
];

export default function IlanlarScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<IlanCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredIlanlar = SAMPLE_ILANLAR.filter(ilan => {
    const matchesCategory = selectedCategory === 'all' || ilan.category === selectedCategory;
    const matchesSearch = !searchQuery || 
      ilan.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ilan.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <IconSymbol name="chevron.left" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>İlanlar</Text>
      </View>

      {/* Category Pills */}
      <View style={styles.categorySection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
          {(Object.keys(CATEGORY_CONFIG) as IlanCategory[]).map(key => {
            const cfg = CATEGORY_CONFIG[key];
            const isActive = selectedCategory === key;
            return (
              <TouchableOpacity
                key={key}
                style={[
                  styles.categoryPill,
                  isActive && { backgroundColor: cfg.color },
                ]}
                onPress={() => setSelectedCategory(key)}
              >
                <IconSymbol name={cfg.icon as any} size={14} color={isActive ? '#fff' : cfg.color} />
                <Text style={[styles.categoryPillText, isActive && { color: '#fff' }]}>
                  {cfg.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* İlan List */}
      <ScrollView style={styles.listContainer} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {filteredIlanlar.length === 0 ? (
          <View style={styles.emptyState}>
            <IconSymbol name="doc.text.magnifyingglass" size={48} color="#CBD5E1" />
            <Text style={styles.emptyText}>İlan bulunamadı</Text>
            <Text style={styles.emptySubtext}>Farklı bir kategori veya arama deneyin</Text>
          </View>
        ) : (
          filteredIlanlar.map(ilan => (
            <IlanCard key={ilan.id} ilan={ilan} />
          ))
        )}
      </ScrollView>

      {/* FAB — New Listing */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 20 }]}
        activeOpacity={0.85}
        onPress={() => Alert.alert('Yeni İlan', 'İlan oluşturma özelliği yakında aktif olacak!')}
      >
        <IconSymbol name="plus" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

function IlanCard({ ilan }: { ilan: Ilan }) {
  const cfg = CATEGORY_CONFIG[ilan.category];

  return (
    <TouchableOpacity 
      style={[
        styles.card, 
        { borderColor: `${cfg.color}33` }, // Use 20% opacity for the border color
        ilan.isUrgent && styles.urgentCard
      ]} 
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          {ilan.isUrgent && (
            <View style={styles.urgentBadgeInline}>
              <Text style={styles.urgentTextInline}>ACİL</Text>
            </View>
          )}
          <View style={[styles.categoryBadge, { backgroundColor: cfg.bg }]}>
            <IconSymbol name={cfg.icon as any} size={12} color={cfg.color} />
            <Text style={[styles.categoryBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>
        <Text style={styles.timeAgo}>{ilan.timeAgo}</Text>
      </View>

      <Text style={styles.cardTitle}>{ilan.title}</Text>
      <Text style={styles.cardDescription} numberOfLines={2}>{ilan.description}</Text>

      <View style={styles.cardFooter}>
        <View style={styles.cardMeta}>
          <View style={styles.metaItem}>
            <IconSymbol name="mappin.circle.fill" size={14} color="#94A3B8" />
            <Text style={styles.metaText}>{ilan.location}</Text>
          </View>
          <View style={styles.metaItem}>
            <IconSymbol name="person.circle.fill" size={14} color="#94A3B8" />
            <Text style={styles.metaText}>{ilan.author}</Text>
          </View>
        </View>
        {ilan.price && (
          <View style={styles.priceTag}>
            <Text style={styles.priceText}>{ilan.price}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
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
  categorySection: {
    paddingTop: 14,
    paddingBottom: 6,
  },
  categoryScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
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
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priceText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10B981',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#CBD5E1',
    marginTop: 4,
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
});
