import { Tabs, usePathname, useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { StyleSheet, Platform, View, Animated } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context/ThemeContext';

import { CopilotStep, walkthroughable } from 'react-native-copilot';
const WalkthroughableView = walkthroughable(View);
const WalkthroughableHapticTab = walkthroughable(HapticTab);

function AnimatedTabIcon({ focused, isDeepRoute, iconName, color }: { focused: boolean; isDeepRoute: boolean; iconName: string; color: string }) {
  const indicatorOpacity = useRef(new Animated.Value(0)).current;
  const iconScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const isActive = focused && !isDeepRoute;
    Animated.spring(iconScale, {
      toValue: isActive ? 1.1 : 1,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, [focused, isDeepRoute]);

  return (
    <View style={styles.tabIconWrapper}>
      <Animated.View style={{ transform: [{ scale: iconScale }] }}>
        <IconSymbol size={24} name={iconName as any} color={color} />
      </Animated.View>
    </View>
  );
}

import { Dimensions } from 'react-native';
const { width } = Dimensions.get('window');
const TAB_WIDTH = width / 4;

export default function TabLayout() {
  const { t, i18n } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const isDeepRoute = pathname.includes('/island/') || pathname.includes('/guide');

  const slideAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let activeIndex = 0;
    if (pathname.includes('/home') || pathname === '/home') activeIndex = 1;
    else if (pathname.includes('/contact') || pathname === '/contact') activeIndex = 2;
    else if (pathname.includes('/profile') || pathname === '/profile') activeIndex = 3;

    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: activeIndex * TAB_WIDTH + (TAB_WIDTH / 2) - 21,
        useNativeDriver: true,
        friction: 8,
        tension: 50,
      }),
      Animated.timing(opacityAnim, {
        toValue: isDeepRoute ? 0 : 1,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start();
  }, [pathname, isDeepRoute]);

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? '#000000' : '#FFFFFF' }}>
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: (props) => <HapticTab {...props} />,
        tabBarStyle: isDark ? styles.tabBarDark : styles.tabBarLight,
        tabBarActiveTintColor: isDeepRoute ? '#AAAAAA' : (isDark ? '#FFFFFF' : '#000000'),
        tabBarInactiveTintColor: isDark ? '#64748B' : '#AAAAAA',
        tabBarLabelStyle: styles.tabLabel,
        animation: 'none',
      }}>
      <Tabs.Screen
        name="explore"
        options={{
          title: t('common.tabDiscover', { defaultValue: 'Keşfet' }),
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon focused={focused} isDeepRoute={isDeepRoute} iconName="safari" color={color} />
          ),
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            const isAlreadyOnMainExplore = pathname === '/explore' || pathname === '/(tabs)/explore' || pathname === '/';
            if (!isAlreadyOnMainExplore) {
              router.replace('/explore');
            }
          },
        })}
      />
      <Tabs.Screen
        name="home"
        options={{
          title: t('common.tabSchedule', { defaultValue: 'Seferler' }),
          tabBarButton: (props) => <HapticTab {...props} />,
          tabBarIcon: ({ color, focused }) => (
            <CopilotStep text={t('explore.tour.tarifeler', { defaultValue: i18n.language.startsWith('en') ? 'You can check all ferry and boat schedules here.' : 'Tüm vapur ve motor sefer saatlerini buradan öğrenebilirsin.' })} order={9} name="tarifeler">
              <WalkthroughableView style={{ paddingHorizontal: 10, marginHorizontal: -10, paddingTop: 2, marginTop: -2, paddingBottom: 18, marginBottom: -18 }}>
                <AnimatedTabIcon focused={focused} isDeepRoute={isDeepRoute} iconName="ferry.fill" color={color} />
              </WalkthroughableView>
            </CopilotStep>
          ),
        }}
        listeners={() => ({
          tabPress: (e) => {
            if (pathname === '/home' || pathname === '/(tabs)/home') {
              e.preventDefault();
            }
          },
        })}
      />
      <Tabs.Screen
        name="contact"
        options={{
          title: t('common.tabContact', { defaultValue: i18n.language.startsWith('en') ? 'Contact' : 'İletişim' }),
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon focused={focused} isDeepRoute={isDeepRoute} iconName="envelope.fill" color={color} />
          ),
        }}
        listeners={() => ({
          tabPress: (e) => {
            if (pathname === '/contact' || pathname === '/(tabs)/contact') {
              e.preventDefault();
            }
          },
        })}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('common.tabProfile', { defaultValue: 'Profil' }),
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon focused={focused} isDeepRoute={isDeepRoute} iconName="person.fill" color={color} />
          ),
        }}
        listeners={() => ({
          tabPress: (e) => {
            if (pathname === '/profile' || pathname === '/(tabs)/profile') {
              e.preventDefault();
            }
          },
        })}
      />
    </Tabs>
      {!isDeepRoute && (
        <Animated.View
          style={{
            position: 'absolute',
            bottom: Platform.OS === 'ios' ? 85.5 : 81.5,
            left: 0,
            width: 42,
            height: 2.5,
            borderRadius: 2,
            backgroundColor: isDark ? '#FFFFFF' : '#000000',
            opacity: opacityAnim,
            transform: [{ translateX: slideAnim }],
            zIndex: 100,
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBarLight: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    height: Platform.OS === 'ios' ? 88 : 84,
    paddingBottom: Platform.OS === 'ios' ? 28 : 28,
    paddingTop: 12,
  },
  tabBarDark: {
    backgroundColor: '#000000',
    borderTopWidth: 1,
    borderTopColor: '#1A1A1A',
    height: Platform.OS === 'ios' ? 88 : 84,
    paddingBottom: Platform.OS === 'ios' ? 28 : 28,
    paddingTop: 12,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
  },
  tabIconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingTop: 6,
  },
  activeIndicator: {
    position: 'absolute',
    top: -12,
    width: 42,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: '#000000',
  },
});
