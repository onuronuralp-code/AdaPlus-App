import React from 'react';
import { View, Text, StyleSheet, Pressable, Vibration } from 'react-native';
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
        pressed && { backgroundColor: '#F0FDF4', borderColor: '#34D399' }
      ]}
      onPress={handlePress}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <IconSymbol name="bubble.left.and.bubble.right.fill" size={24} color="#059669" />
        </View>
        <Text style={styles.text}>
          {t('common.goToCommunity', { defaultValue: i18n.language.startsWith('en') ? 'Go to Community' : 'Topluluğa Git' })}
        </Text>
        <IconSymbol name="arrow.right" size={20} color="#059669" />
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
