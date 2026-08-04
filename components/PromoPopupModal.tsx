import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Image, ActivityIndicator, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/context/ThemeContext';
import { fetchActivePopup, PopupDto } from '@/services/popupApi';
import { resolveImageUrl, safeOpenUrl } from '@/services/config';

const LAST_SEEN_KEY = 'lastSeenPopupId';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Business/campaign popup shown once per popup (not on every launch) — checked once
// on app start. Distinct from the version-gate popup (GlobalAlert-driven) and from
// the scrollable home-screen banner carousel.
export function PromoPopupModal() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [popup, setPopup] = useState<PopupDto | null>(null);
  const [visible, setVisible] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  useEffect(() => {
    console.log('[PromoPopupModal] mounted, fetching active popup');
    (async () => {
      const active = await fetchActivePopup();
      console.log('[PromoPopupModal] fetchActivePopup result', active);
      if (!active) return;
      const lastSeenId = await AsyncStorage.getItem(LAST_SEEN_KEY);
      console.log('[PromoPopupModal] lastSeenId', lastSeenId, 'active.id', active.id);
      if (active.id !== lastSeenId) {
        console.log('[PromoPopupModal] showing popup');
        setPopup(active);
        setVisible(true);
      } else {
        console.log('[PromoPopupModal] already seen this popup, skipping');
      }
    })();
  }, []);

  const dismiss = async () => {
    setVisible(false);
    if (popup) {
      await AsyncStorage.setItem(LAST_SEEN_KEY, popup.id);
    }
  };

  if (!popup) return null;

  const imageUri = resolveImageUrl(popup.imageUrl);

  return (
    <Modal transparent visible={visible} animationType="fade" statusBarTranslucent onRequestClose={dismiss}>
      <View style={styles.overlay}>
        <View style={[styles.card, isDark && { backgroundColor: '#121212', borderWidth: 1, borderColor: '#2C2C2E' }]}>
          <TouchableOpacity style={styles.closeButton} onPress={dismiss} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <IconSymbol name="xmark.circle.fill" size={28} color={isDark ? '#94A3B8' : '#64748B'} />
          </TouchableOpacity>

          {imageUri && (
            <View style={styles.imageWrapper}>
              {imageLoading && (
                <ActivityIndicator style={StyleSheet.absoluteFill} size="small" color="#3B82F6" />
              )}
              <Image
                source={{ uri: imageUri }}
                style={styles.image}
                resizeMode="cover"
                onLoadEnd={() => setImageLoading(false)}
              />
            </View>
          )}

          <View style={styles.content}>
            <Text style={[styles.title, isDark && { color: '#FFFFFF' }]}>{popup.title}</Text>
            {!!popup.body && (
              <Text style={[styles.body, isDark && { color: '#CBD5E1' }]}>{popup.body}</Text>
            )}

            {!!popup.actionUrl && !!popup.actionLabel && (
              <TouchableOpacity
                style={styles.actionButton}
                activeOpacity={0.85}
                onPress={() => safeOpenUrl(popup.actionUrl)}
              >
                <Text style={styles.actionButtonText}>{popup.actionLabel}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={{ marginTop: 12 }} onPress={dismiss}>
              <Text style={[styles.dismissText, isDark && { color: '#94A3B8' }]}>Kapat</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#fff',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 14,
  },
  imageWrapper: {
    width: '100%',
    height: Math.min(SCREEN_WIDTH * 0.6, 240),
    backgroundColor: '#F1F5F9',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  content: {
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
  },
  body: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  actionButton: {
    width: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  dismissText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
});
