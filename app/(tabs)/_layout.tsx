import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet, Platform } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTranslation } from 'react-i18next';

export default function TabLayout() {
  const { t } = useTranslation();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#000000',
        tabBarInactiveTintColor: '#AAAAAA',
        tabBarLabelStyle: styles.tabLabel,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="explore"
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
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    height: Platform.OS === 'ios' ? 88 : 68,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 10,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
  },
});
