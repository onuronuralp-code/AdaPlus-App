import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Vibration, useWindowDimensions, Animated, Easing, Alert } from 'react-native';
import { IconSymbol } from './ui/icon-symbol';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { API_BASE_URL, fetchWithTimeout } from '../services/config';
import { LinearGradient } from 'expo-linear-gradient';

interface SwipeButtonProps {
  onSwipeComplete: () => void;
  isLoggedIn?: boolean;
  isActive?: boolean;
}

export function SwipeButton({ onSwipeComplete, isLoggedIn = true, isActive = true }: SwipeButtonProps) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { height } = useWindowDimensions();
  const isLargeScreen = height >= 890;
  const isSmallScreen = height < 820;
  const isNavigating = useRef(false);
  const [userCount, setUserCount] = useState<number | null>(null);
  const [isDeactivated, setIsDeactivated] = useState<boolean>(!isActive);

  const shimmerAnim = useRef(new Animated.Value(-1)).current;
  const pulseAnim  = useRef(new Animated.Value(0)).current;
  const scaleAnim  = useRef(new Animated.Value(1)).current;

  // Fetch backend community active status
  useEffect(() => {
    fetchWithTimeout(`${API_BASE_URL}/api/v1/community/status`)
      .then(res => res.json())
      .then(data => {
        if (data && (data.active === false || data.enabled === false || data.status === 'DEACTIVE' || data.status === 'DISABLED' || data.deactivated === true)) {
          setIsDeactivated(true);
        } else if (data && (data.active === true || data.enabled === true || data.status === 'ACTIVE')) {
          setIsDeactivated(false);
        }
      })
      .catch(() => {
        setIsDeactivated(!isActive);
      });
  }, [isActive]);

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
    fetchWithTimeout(`${API_BASE_URL}/api/v1/users/count`)
      .then(res => res.json())
      .then(data => {
        if (typeof data?.count === 'number') {
          setUserCount(data.count);
        }
      })
      .catch(() => {});
  }, []);

  const handlePress = () => {
    if (isDeactivated) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        i18n.language.startsWith('en') ? 'Feature Disabled' : 'Özellik Deaktif',
        i18n.language.startsWith('en') ? 'Community feature is currently deactivated and unavailable.' : 'Topluluk özelliği şu anda deaktiftir ve erişime kapalıdır.'
      );
      return;
    }
    if (isNavigating.current) return;
    isNavigating.current = true;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.96, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start(() => {
      if (!isLoggedIn) { router.push('/login'); isNavigating.current = false; return; }
      onSwipeComplete();
      setTimeout(() => { isNavigating.current = false; }, 1000);
    });
  };

  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [-1, 2],
    outputRange: [-360, 720],
  });
  const dotScale   = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1.35] });
  const dotOpacity = pulseAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.5, 1, 0.5] });

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }], opacity: 1 }}>
      <Pressable
        style={({ pressed }) => [
          styles.container, 
          isSmallScreen && { height: 60, borderRadius: 14, paddingHorizontal: 10 },
          isLargeScreen && { height: 74, borderRadius: 18 },
          isDeactivated
            ? { backgroundColor: '#D32F2F', borderColor: '#B71C1C', shadowColor: '#FF0000' }
            : { backgroundColor: pressed ? '#059669' : '#10B981', borderColor: pressed ? '#047857' : '#059669' }
        ]}
        onPress={handlePress}
      >
        {({ pressed }) => (
          <>
            {/* Base gradient matching the Etkinlikler/İlanlar cards */}
            <LinearGradient
              colors={isDeactivated ? ['#FF1E1E', '#C81E1E'] : ['#34D399', '#10B981']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              locations={[0, 0.8]}
              style={[StyleSheet.absoluteFillObject, pressed && !isDeactivated && { opacity: 0 }]}
            />

            <View style={styles.content}>
              {/* Icon + live dot */}
              <View style={[
                  styles.iconContainer, 
                  isSmallScreen && { width: 40, height: 40, borderRadius: 10 },
                  isLargeScreen && { width: 60, height: 60, borderRadius: 16 },
                  { backgroundColor: isDeactivated ? '#9A0007' : (pressed ? '#047857' : '#059669') }
              ]}>
                <IconSymbol
                  name="bubble.left.and.bubble.right.fill"
                  size={isSmallScreen ? 20 : (isLargeScreen ? 30 : 24)}
                  color="#FFFFFF"
                />
                <Animated.View style={[
                  styles.liveDot, 
                  { transform: [{ scale: dotScale }], opacity: dotOpacity },
                  isDeactivated && { backgroundColor: '#FF0000', borderColor: '#FFFFFF' }
                ]} />
              </View>

              {/* Text block */}
              <View style={styles.textBlock}>
                <Text style={[styles.text, isSmallScreen && { fontSize: 14 }, isLargeScreen && { fontSize: 18 }]}>
                  {t('common.goToCommunity', { defaultValue: i18n.language.startsWith('en') ? 'Go to Community' : 'Topluluğa Git' })}
                </Text>
                {isDeactivated ? (
                  <Text style={[styles.subtext, { color: '#FEE2E2', fontWeight: '600' }]}>
                    {i18n.language.startsWith('en') ? 'Unavailable' : 'Erişime Kapalı'}
                  </Text>
                ) : (
                  userCount !== null && (
                    <Text style={[styles.subtext, { color: pressed ? '#ECFDF5' : '#D1FAE5' }]}>
                      {userCount}+ {i18n.language.startsWith('en') ? 'members joined' : 'üye katıldı'}
                    </Text>
                  )
                )}
              </View>

              {/* Cascading arrows or warning indicator */}
              <View style={styles.arrows}>
                {isDeactivated ? (
                  <IconSymbol name="exclamationmark.triangle.fill" size={20} color="#FEE2E2" />
                ) : (
                  <>
                    <IconSymbol name="chevron.right" size={12} color="rgba(255, 255, 255, 0.4)" />
                    <IconSymbol name="chevron.right" size={14} color="rgba(255, 255, 255, 0.7)" />
                    <IconSymbol name="chevron.right" size={isLargeScreen ? 20 : 17} color="#FFFFFF" />
                  </>
                )}
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
