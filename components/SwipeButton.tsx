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
        style={[styles.container, isLargeScreen && { height: 88, borderRadius: 20 }]}
        onPress={handlePress}
      >
        {/* Base gradient */}
        <LinearGradient
          colors={['#064E3B', '#059669', '#047857']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />

        {/* Shimmer sweep */}
        <Animated.View
          pointerEvents="none"
          style={[styles.shimmer, { transform: [{ translateX: shimmerTranslate }] }]}
        >
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.14)', 'rgba(255,255,255,0.08)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ flex: 1 }}
          />
        </Animated.View>

        <View style={styles.content}>
          {/* Icon + live dot */}
          <View style={[styles.iconContainer, isLargeScreen && { width: 60, height: 60, borderRadius: 16 }]}>
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
              <Text style={styles.subtext}>
                {userCount}+ {i18n.language.startsWith('en') ? 'members joined' : 'üye katıldı'}
              </Text>
            )}
          </View>

          {/* Cascading arrows */}
          <View style={styles.arrows}>
            <IconSymbol name="chevron.right" size={12} color="rgba(255,255,255,0.3)" />
            <IconSymbol name="chevron.right" size={14} color="rgba(255,255,255,0.6)" />
            <IconSymbol name="chevron.right" size={isLargeScreen ? 20 : 17} color="#FFFFFF" />
          </View>
        </View>
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
    borderColor: '#047857',
    paddingHorizontal: 12,
    justifyContent: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 90,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveDot: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#6EE7B7',
    borderWidth: 1.5,
    borderColor: '#064E3B',
  },
  textBlock: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  text: {
    fontWeight: '800',
    fontSize: 15,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  subtext: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
    marginTop: 2,
  },
  arrows: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
});
