import React from 'react';
import { StyleSheet, View } from 'react-native';
import { FerrySchedule } from '@/components/FerrySchedule';
import { useTheme } from '@/context/ThemeContext';
import { useRouter } from 'expo-router';

export default function TarifelerScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#000000' : '#FFF' }]}>
      <FerrySchedule
        showBackButton={true}
        onBack={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/(tabs)/explore');
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
