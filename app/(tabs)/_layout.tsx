import { Tabs, usePathname, useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { StyleSheet, Platform, View, Animated, useWindowDimensions, DeviceEventEmitter } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

function AnimatedTabIcon({ focused, isDeepRoute, iconName, color }: { focused: boolean; isDeepRoute: boolean; iconName: string; color: string }) {
  const iconScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const isActive = focused && !isDeepRoute;
    Animated.spring(iconScale, {
      toValue: isActive ? 1.1 : 1,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, [focused, isDeepRoute, iconScale]);

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

  const slideAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const [unseenListingsCount, setUnseenListingsCount] = React.useState(0);

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

  useEffect(() => {
    let activeIndex = 0;
    if (pathname.includes('/ilanlar') || pathname === '/ilanlar') activeIndex = 1;
    else if (pathname.includes('/contact') || pathname === '/contact') activeIndex = 2;
    else if (pathname.includes('/profile') || pathname === '/profile') activeIndex = 3;

    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: activeIndex * tabWidth + (tabWidth / 2) - 21,
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
  }, [pathname, isDeepRoute, tabWidth, opacityAnim, slideAnim]);

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? '#000000' : '#FFFFFF' }}>
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: (props) => <HapticTab {...props} />,
        tabBarStyle: [isDark ? styles.tabBarDark : styles.tabBarLight, {
          height: tabBarHeight,
          paddingBottom: Math.max(insets.bottom, Platform.OS === 'android' ? 12 : 8),
        }],
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
        name="ilanlar"
        options={{
          title: t('common.tabListings', { defaultValue: 'İlanlar' }),
          tabBarBadge: unseenListingsCount > 0 ? (unseenListingsCount > 9 ? '9+' : unseenListingsCount) : undefined,
          tabBarBadgeStyle: { backgroundColor: '#EF4444', fontSize: 10, fontWeight: '700', color: '#FFF' },
          tabBarButton: (props) => <HapticTab {...props} />,
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon focused={focused} isDeepRoute={isDeepRoute} iconName="tag.fill" color={color} />
          ),
        }}
        listeners={() => ({
          tabPress: (e) => {
            setUnseenListingsCount(0);
            AsyncStorage.setItem('lastViewedListings', Date.now().toString());
            AsyncStorage.setItem('cached_unseen_listings', '0');
            DeviceEventEmitter.emit('listingsSeen');
            if (pathname === '/ilanlar' || pathname === '/(tabs)/ilanlar') {
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
            bottom: tabBarHeight - 2.5,
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
