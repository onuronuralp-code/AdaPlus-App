import React from 'react';
import { View, Text, StyleSheet, Pressable, Vibration, useWindowDimensions } from 'react-native';
import { IconSymbol } from './ui/icon-symbol';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useRef } from 'react';

interface SwipeButtonProps {
  onSwipeComplete: () => void;
  isLoggedIn?: boolean;
}

export function SwipeButton({ onSwipeComplete, isLoggedIn = true }: SwipeButtonProps) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { height } = useWindowDimensions();
  const isLargeScreen = height > 900;
  const isIphone16 = height === 852;
  const isNavigating = useRef(false);

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
        isLargeScreen && { height: 72 },
        isIphone16 && { height: 52 },
        pressed && { backgroundColor: '#F0FDF4', borderColor: '#34D399' }
      ]}
      onPress={handlePress}
    >
      <View style={styles.content}>
        <View style={[
          styles.iconContainer, 
          isLargeScreen && { width: 48, height: 48, borderRadius: 12 },
          isIphone16 && { width: 40, height: 40, borderRadius: 10 }
        ]}>
          <IconSymbol name="bubble.left.and.bubble.right.fill" size={isLargeScreen ? 26 : (isIphone16 ? 20 : 24)} color="#059669" />
        </View>
        <Text style={[
          styles.text, 
          isLargeScreen && { fontSize: 16, marginLeft: 16 },
          isIphone16 && { fontSize: 18, marginLeft: 12 }
        ]}>
          {t('common.goToCommunity', { defaultValue: i18n.language.startsWith('en') ? 'Go to Community' : 'Topluluğa Git' })}
        </Text>
        <IconSymbol name="arrow.right" size={isLargeScreen ? 18 : (isIphone16 ? 14 : 16)} color="#059669" />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 60,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    padding: 8,
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
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    fontWeight: '700',
    fontSize: 17,
    color: '#059669',
    marginLeft: 16,
    marginRight: 16,
    textAlign: 'center',
  },
});
