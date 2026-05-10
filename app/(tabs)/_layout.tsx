import { Tabs, usePathname, useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Platform } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTranslation } from 'react-i18next';

export default function TabLayout() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();

  const isDeepRoute = pathname.includes('/island/') || pathname.includes('/guide');

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: styles.tabBarLight,
        tabBarActiveTintColor: isDeepRoute ? '#AAAAAA' : '#000000',
        tabBarInactiveTintColor: '#AAAAAA',
        tabBarLabelStyle: styles.tabLabel,
      }}>
      <Tabs.Screen
        name="explore"
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            router.navigate('/(tabs)/explore');
          },
        }}
        options={{
          title: t('common.tabDiscover', { defaultValue: 'Keşfet' }),
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name={"safari" as any} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="home"
        options={{
          title: t('common.tabSchedule', { defaultValue: 'Seferler' }),
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name={"ferry.fill" as any} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="contact"
        options={{
          title: t('common.tabRequests', { defaultValue: 'İletişim' }),
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name={"envelope.fill" as any} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('common.tabProfile', { defaultValue: 'Profil' }),
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name={"person.fill" as any} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarLight: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    height: Platform.OS === 'ios' ? 88 : 68,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    paddingTop: 12,
  },
  tabBarDark: {
    backgroundColor: '#050A18', // Match Forum deep blue
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    height: Platform.OS === 'ios' ? 88 : 68,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    paddingTop: 12,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
  },
});
