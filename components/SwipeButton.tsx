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
    if (!isLoggedIn) {
      pulseAnim.setValue(0);
      return;
    }

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
  }, [isLoggedIn]);

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
    if (!isLoggedIn) {
      setUserCount(null);
      return;
    }

    let cancelled = false;
    fetchWithTimeout(`${API_BASE_URL}/api/v1/users/count`)
      .then(res => res.json())
      .then(data => {
        if (!cancelled && typeof data?.count === 'number') {
          setUserCount(data.count);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isLoggedIn]);

  const handlePress = () => {
    if (isDeactivated) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        i18n.language.startsWith('en') ? 'No Access' : 'Erişim Yok',
        i18n.language.startsWith('en') ? 'Our community servers are currently under maintenance.' : 'Topluluk serverlarımız şu anda bakımda'
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
          isSmallScreen && { height: 58, borderRadius: 10, paddingLeft: 6, paddingRight: 10 },
          isLargeScreen && { height: 76, borderRadius: 14, paddingLeft: 8, paddingRight: 14 },
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
                  isSmallScreen && { width: 40, height: 40, borderRadius: 8 },
                  isLargeScreen && { width: 56, height: 56, borderRadius: 11 },
                  { backgroundColor: isDeactivated ? '#9A0007' : (pressed ? '#047857' : '#059669') }
              ]}>
                <IconSymbol
                  name="bubble.left.and.bubble.right.fill"
                  size={isSmallScreen ? 20 : (isLargeScreen ? 28 : 24)}
                  color="#FFFFFF"
                />
                {isLoggedIn && (
                  <Animated.View style={[
                    styles.liveDot,
                    { transform: [{ scale: dotScale }], opacity: dotOpacity },
                    isDeactivated && { backgroundColor: '#FF0000', borderColor: '#FFFFFF' }
                  ]} />
                )}
              </View>

              {/* Text block */}
              <View style={styles.textBlock}>
                <Text style={[styles.text, isSmallScreen && { fontSize: 14 }, isLargeScreen && { fontSize: 17.5 }]}>
                  {t('common.goToCommunity', { defaultValue: i18n.language.startsWith('en') ? 'Go to Community' : 'Topluluğa Git' })}
                </Text>
                {isLoggedIn && (isDeactivated ? (
                  <Text style={[styles.subtext, { color: '#FEE2E2', fontWeight: '600' }]}>
                    {i18n.language.startsWith('en') ? 'Unavailable' : 'Erişime Kapalı'}
                  </Text>
                ) : (
                  <Text style={[styles.subtext, { color: pressed ? '#ECFDF5' : '#D1FAE5' }]}>
                    {userCount !== null ? `${userCount} ` : ''}{i18n.language.startsWith('en') ? 'members joined' : 'üye katıldı'}
                  </Text>
                ))}
              </View>

              {/* Cascading arrows or warning indicator */}
              <View style={styles.arrows}>
                {isDeactivated ? (
                  <IconSymbol name="exclamationmark.triangle.fill" size={18} color="#FEE2E2" />
                ) : (
                  <>
                    <IconSymbol name="chevron.right" size={11} color="rgba(255, 255, 255, 0.4)" />
                    <IconSymbol name="chevron.right" size={13} color="rgba(255, 255, 255, 0.7)" />
                    <IconSymbol name="chevron.right" size={isLargeScreen ? 19 : 16} color="#FFFFFF" />
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
    height: 68,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1.5,
    paddingLeft: 7,
    paddingRight: 12,
    marginHorizontal: 10,
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
    width: 46,
    height: 46,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#4ADE80',
    borderWidth: 1.5,
    borderColor: '#ECFDF5',
  },
  textBlock: {
    flex: 1,
    marginLeft: 12,
    marginRight: 6,
    paddingBottom: 2,
  },
  text: {
    fontWeight: '800',
    fontSize: 15.5,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  subtext: {
    fontSize: 12.5,
    fontWeight: '600',
    marginTop: 1,
  },
  arrows: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
});
