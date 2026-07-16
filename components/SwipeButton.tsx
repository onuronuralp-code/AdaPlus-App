import React from 'react';
import { View, Text, StyleSheet, Pressable, Vibration, useWindowDimensions } from 'react-native';
import { IconSymbol } from './ui/icon-symbol';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';

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

  const handlePress = () => {
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
        isLargeScreen && { height: 90 },
        isIphone16 && { height: 58 },
        pressed && { backgroundColor: '#F0FDF4', borderColor: '#34D399' }
      ]}
      onPress={handlePress}
    >
      <View style={styles.content}>
        <View style={[
          styles.iconContainer, 
          isLargeScreen && { width: 72, height: 72, borderRadius: 22 },
          isIphone16 && { width: 44, height: 44, borderRadius: 14 }
        ]}>
          <IconSymbol name="bubble.left.and.bubble.right.fill" size={isLargeScreen ? 28 : (isIphone16 ? 18 : 24)} color="#059669" />
        </View>
        <Text style={[
          styles.text, 
          isLargeScreen && { fontSize: 19, marginLeft: 44 },
          isIphone16 && { fontSize: 14, marginLeft: 24 }
        ]}>
          {t('common.goToCommunity', { defaultValue: i18n.language.startsWith('en') ? 'Go to Community' : 'Topluluğa Git' })}
        </Text>
        <IconSymbol name="arrow.right" size={isLargeScreen ? 24 : (isIphone16 ? 16 : 20)} color="#059669" />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 76,
    backgroundColor: '#ffffff',
    borderRadius: 24,
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
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    fontWeight: '700',
    fontSize: 16,
    color: '#059669',
    marginLeft: 54,
  },
});
