import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Vibration, useWindowDimensions, Animated, Easing } from 'react-native';
import { IconSymbol } from './ui/icon-symbol';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
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
  const isLargeScreen = height >= 890;
  const isNavigating = useRef(false);
  const [userCount, setUserCount] = useState<number | null>(null);

  const shimmerAnim = useRef(new Animated.Value(-1)).current;
  const pulseAnim  = useRef(new Animated.Value(0)).current;
  const scaleAnim  = useRef(new Animated.Value(1)).current;

  // Shimmer sweeps left→right every ~3.5 s
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 2,
          duration: 1600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.delay(2200),
        Animated.timing(shimmerAnim, { toValue: -1, duration: 0, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  // Live dot breathes
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 700, easing: Easing.in(Easing.ease), useNativeDriver: true }),
        Animated.delay(400),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/v1/users/count`)
      .then(res => res.json())
      .then(data => { if (data && typeof data.count === 'number') setUserCount(data.count); })
      .catch(() => {});
  }, []);

  const handlePress = () => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    setTimeout(() => { isNavigating.current = false; }, 1000);

    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.95, duration: 90, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 4, tension: 200, useNativeDriver: true }),
    ]).start();

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Vibration.vibrate(40);

    if (!isLoggedIn) { router.push('/login'); return; }
    onSwipeComplete();
  };

  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [-1, 2],
    outputRange: [-360, 720],
  });
  const dotScale   = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1.35] });
  const dotOpacity = pulseAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.5, 1, 0.5] });

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        style={({ pressed }) => [
          styles.container, 
          isLargeScreen && { height: 88, borderRadius: 20 },
          { backgroundColor: pressed ? '#059669' : '#10B981', borderColor: pressed ? '#047857' : '#059669' }
        ]}
        onPress={handlePress}
      >
        {({ pressed }) => (
          <>
            {/* Base gradient matching the Etkinlikler/İlanlar cards */}
            <LinearGradient
              colors={['#34D399', '#10B981']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              locations={[0, 0.8]}
              style={[StyleSheet.absoluteFillObject, pressed && { opacity: 0 }]}
            />

            <View style={styles.content}>
              {/* Icon + live dot */}
              <View style={[
                  styles.iconContainer, 
                  isLargeScreen && { width: 60, height: 60, borderRadius: 16 },
                  { backgroundColor: pressed ? '#047857' : '#059669' }
              ]}>
                <IconSymbol
                  name="bubble.left.and.bubble.right.fill"
                  size={isLargeScreen ? 30 : 24}
                  color="#FFFFFF"
                />
                <Animated.View style={[styles.liveDot, { transform: [{ scale: dotScale }], opacity: dotOpacity }]} />
              </View>

              {/* Text block */}
              <View style={styles.textBlock}>
                <Text style={[styles.text, isLargeScreen && { fontSize: 18 }]}>
                  {t('common.goToCommunity', { defaultValue: i18n.language.startsWith('en') ? 'Go to Community' : 'Topluluğa Git' })}
                </Text>
                {userCount !== null && (
                  <Text style={[styles.subtext, { color: pressed ? '#ECFDF5' : '#D1FAE5' }]}>
                    {userCount}+ {i18n.language.startsWith('en') ? 'members joined' : 'üye katıldı'}
                  </Text>
                )}
              </View>

              {/* Cascading arrows */}
              <View style={styles.arrows}>
                <IconSymbol name="chevron.right" size={12} color="rgba(255, 255, 255, 0.4)" />
                <IconSymbol name="chevron.right" size={14} color="rgba(255, 255, 255, 0.7)" />
                <IconSymbol name="chevron.right" size={isLargeScreen ? 20 : 17} color="#FFFFFF" />
              </View>
            </View>
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 72,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1.5,
    paddingHorizontal: 12,
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveDot: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4ADE80',
    borderWidth: 1.5,
    borderColor: '#ECFDF5',
  },
  textBlock: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
    paddingBottom: 4,
  },
  text: {
    fontWeight: '800',
    fontSize: 15,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  subtext: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  arrows: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
});
