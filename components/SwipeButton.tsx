import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Vibration, useWindowDimensions, Dimensions } from 'react-native';
import { IconSymbol } from './ui/icon-symbol';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useRef } from 'react';
import { AbstractPattern } from './AbstractPattern';
import { API_BASE_URL } from '../services/config';

interface SwipeButtonProps {
  onSwipeComplete: () => void;
  isLoggedIn?: boolean;
}

export function SwipeButton({ onSwipeComplete, isLoggedIn = true }: SwipeButtonProps) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { height } = useWindowDimensions();
  const isLargeScreen = height > 900;
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
        isLargeScreen && { height: 80 },
        pressed && { backgroundColor: '#F0FDF4', borderColor: '#34D399' }
      ]}
      onPress={handlePress}
    >
      <View style={styles.content}>
        <View style={[styles.iconContainer, isLargeScreen && { width: 56, height: 56, borderRadius: 14 }]}>
          <IconSymbol name="bubble.left.and.bubble.right.fill" size={isLargeScreen ? 28 : 24} color="#059669" />
        </View>
        <Text style={[styles.text, isLargeScreen && { fontSize: 17 }]}>
          {t('common.goToCommunity', { defaultValue: i18n.language.startsWith('en') ? 'Go to Community' : 'Topluluğa Git' })}
        </Text>
        
        {userCount !== null ? (
          <View style={{ backgroundColor: '#D1FAE5', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, flexDirection: 'row', alignItems: 'center' }}>
            <IconSymbol name="person.3.fill" size={12} color="#059669" />
            <Text style={{ color: '#059669', fontSize: 12, fontWeight: '800', marginLeft: 4 }}>
              {userCount}+ {i18n.language.startsWith('en') ? 'Islanders' : 'Adalı'}
            </Text>
          </View>
        ) : (
          <IconSymbol name="arrow.right" size={isLargeScreen ? 24 : 20} color="#059669" />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 72,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    padding: 12,
    justifyContent: 'center',
    shadowColor: "#000",
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
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    fontWeight: 'bold',
    fontSize: 15,
    color: '#059669',
    marginLeft: 12,
    marginRight: 12,
    textAlign: 'center',
  },
});
