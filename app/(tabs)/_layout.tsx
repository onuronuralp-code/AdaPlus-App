import { Tabs, usePathname, useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { StyleSheet, Platform, View, Animated, Easing, useWindowDimensions, DeviceEventEmitter } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

function AnimatedTabIcon({ focused, isDeepRoute, isTarifelerRoute = false, iconName, color }: { focused: boolean; isDeepRoute: boolean; isTarifelerRoute?: boolean; iconName: string; color: string }) {
  const iconScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const isActive = focused && (!isDeepRoute || isTarifelerRoute);
    Animated.spring(iconScale, {
      toValue: isActive ? 1.1 : 1,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, [focused, isDeepRoute, isTarifelerRoute, iconScale]);

  return (
    <View style={styles.tabIconWrapper}>
      <Animated.View style={{ transform: [{ scale: iconScale }] }}>
        <IconSymbol size={24} name={iconName as any} color={color} />
      </Animated.View>
    </View>
  );
}

export default function TabLayout() {
  const { t, i18n } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const tabWidth = width / 4;
  const tabBarHeight = 56 + Math.max(insets.bottom, Platform.OS === 'android' ? 12 : 8);

  const isDeepRoute = pathname.includes('/island/') || pathname.includes('/guide');
  const isTarifelerRoute = pathname.includes('/island/tarifeler');
  const isCommunityRoute = pathname.includes('/island/forum');
  const [isCommunityTabBarHidden, setIsCommunityTabBarHidden] = React.useState(false);

  const [unseenListingsCount, setUnseenListingsCount] = React.useState(0);

  // The second visible tab is the schedules screen even though its file name
  // remains `servisler`. Derive the indicator position directly from the
  // route so it cannot remain stuck on Keşfet after navigating back.
  const activeIndex = pathname.includes('/servisler') || pathname === '/servisler' || isTarifelerRoute
    ? 1
    : pathname.includes('/contact') || pathname === '/contact'
      ? 2
      : pathname.includes('/profile') || pathname === '/profile'
        ? 3
        : 0;

  const indicatorX = useRef(new Animated.Value(activeIndex * tabWidth + tabWidth / 2 - 21)).current;

  useEffect(() => {
    const animation = Animated.timing(indicatorX, {
      toValue: activeIndex * tabWidth + tabWidth / 2 - 21,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [activeIndex, tabWidth, indicatorX]);

  useEffect(() => {
    if (!isCommunityRoute) {
      setIsCommunityTabBarHidden(false);
      return;
    }

    const subscription = DeviceEventEmitter.addListener('communityScrollVisibility', (hidden: boolean) => {
      setIsCommunityTabBarHidden(Boolean(hidden));
    });
    return () => subscription.remove();
  }, [isCommunityRoute]);

  useEffect(() => {
    AsyncStorage.getItem('cached_unseen_listings').then(val => {
      if (val) setUnseenListingsCount(parseInt(val, 10) || 0);
    });

    const subListingsSeen = DeviceEventEmitter.addListener('listingsSeen', () => {
      setUnseenListingsCount(0);
    });
    const subUpdated = DeviceEventEmitter.addListener('contentUpdated', async () => {
      const val = await AsyncStorage.getItem('cached_unseen_listings');
      if (val) setUnseenListingsCount(parseInt(val, 10) || 0);
    });

    return () => {
      subListingsSeen.remove();
      subUpdated.remove();
    };
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? '#000000' : '#FFFFFF' }}>
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: (props) => <HapticTab {...props} />,
        tabBarStyle: isCommunityRoute && isCommunityTabBarHidden
          ? {
              position: 'absolute',
              height: 0,
              opacity: 0,
              borderTopWidth: 0,
              paddingTop: 0,
              paddingBottom: 0,
              overflow: 'hidden',
            }
          : [isDark ? styles.tabBarDark : styles.tabBarLight, {
              height: tabBarHeight,
              paddingBottom: Math.max(insets.bottom, Platform.OS === 'android' ? 12 : 8),
            }],
        tabBarActiveTintColor: isDeepRoute && !isTarifelerRoute ? '#AAAAAA' : (isDark ? '#FFFFFF' : '#000000'),
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
        listeners={() => ({
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
        name="servisler"
        options={{
          title: t('common.tabSchedule', { defaultValue: i18n.language.startsWith('en') ? 'Schedule' : 'Tarifeler' }),
          tabBarButton: (props) => <HapticTab {...props} />,
          tabBarLabelStyle: [styles.tabLabel, isTarifelerRoute && { color: isDark ? '#FFFFFF' : '#000000' }],
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon focused={focused || isTarifelerRoute} isDeepRoute={isDeepRoute} isTarifelerRoute={isTarifelerRoute} iconName="ferry.fill" color={isTarifelerRoute ? (isDark ? '#FFFFFF' : '#000000') : color} />
          ),
        }}
        listeners={() => ({
          tabPress: (e) => {
            if (pathname === '/servisler' || isTarifelerRoute) {
              e.preventDefault();
            }
          },
        })}
      />
      <Tabs.Screen
        name="ilanlar"
        options={{
          href: null,
        }}
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
      {(!isDeepRoute || isTarifelerRoute) && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            bottom: tabBarHeight - 2.5,
            left: 0,
            width: 42,
            height: 2.5,
            borderRadius: 2,
            backgroundColor: isDark ? '#FFFFFF' : '#000000',
            transform: [{ translateX: indicatorX }],
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
    paddingTop: 8,
  },
  tabBarDark: {
    backgroundColor: '#000000',
    borderTopWidth: 1,
    borderTopColor: '#1A1A1A',
    paddingTop: 8,
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
