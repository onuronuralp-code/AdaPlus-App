import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Vibration, useWindowDimensions, Dimensions, Image } from 'react-native';
import { IconSymbol } from './ui/icon-symbol';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { AbstractPattern } from './AbstractPattern';
import { API_BASE_URL } from '../services/config';
import { LinearGradient } from 'expo-linear-gradient';

interface SwipeButtonProps {
  onSwipeComplete: () => void;
  isLoggedIn?: boolean;
}

export function SwipeButton({ onSwipeComplete, isLoggedIn = true }: SwipeButtonProps) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { height } = useWindowDimensions();
  const isLargeScreen = height >= 890; // iPhone 11 (896) ve daha büyük ekranlar için büyük buton
  const isNavigating = useRef(false);
  const [userCount, setUserCount] = useState<number | null>(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/v1/users/count`)
      .then(res => res.json())
      .then(data => {
        if (data && typeof data.count === 'number') {
          setUserCount(data.count);
        }
      })
      .catch(e => console.log('Failed to fetch user count', e));
  }, []);

  const handlePress = () => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    setTimeout(() => { isNavigating.current = false; }, 1000);

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Vibration.vibrate(50);
    
    if (!isLoggedIn) {
      router.push('/login');
      return;
    }
    
    onSwipeComplete();
  };

  return (
    <Pressable 
      style={({ pressed }) => [
        styles.container,
        isLargeScreen && { height: 88, borderRadius: 20 },
        pressed && { borderColor: '#10B981', opacity: 0.9 }
      ]}
      onPress={handlePress}
    >
      <LinearGradient 
        colors={['#059669', '#10B981', '#059669']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.content}>
        <View style={[styles.iconContainer, isLargeScreen && { width: 60, height: 60, borderRadius: 16 }]}>
          <IconSymbol name="bubble.left.and.bubble.right.fill" size={isLargeScreen ? 30 : 24} color="#FFFFFF" />
        </View>
        <Text style={[styles.text, isLargeScreen && { fontSize: 18 }]}>
          {t('common.goToCommunity', { defaultValue: i18n.language.startsWith('en') ? 'Go to Community' : 'Topluluğa Git' })}
        </Text>
        
        {userCount !== null ? (
          <View style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800', marginRight: 4 }}>
              {userCount}+
            </Text>
            <IconSymbol name="person.fill" size={12} color="#FFFFFF" />
          </View>
        ) : (
          <IconSymbol name="arrow.right" size={isLargeScreen ? 24 : 20} color="#FFFFFF" />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 72,
    backgroundColor: '#059669',
    borderRadius: 16,
    overflow: 'hidden', // iOS'te köşelerin temiz durması için geri eklendi
    borderWidth: 1.5,
    borderColor: '#047857',
    padding: 12,
    justifyContent: 'center',
    shadowColor: "#000", // Standart siyah hafif gölge geri getirildi
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    fontWeight: 'bold',
    fontSize: 15,
    color: '#FFFFFF',
    marginLeft: 12,
    marginRight: 12,
    textAlign: 'center',
  },
});
