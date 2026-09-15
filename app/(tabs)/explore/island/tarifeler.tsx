import React from 'react';
import { StyleSheet, View } from 'react-native';
import { FerrySchedule } from '@/components/FerrySchedule';
import { useTheme } from '@/context/ThemeContext';

export default function TarifelerScreen() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#000000' : '#FFF' }]}>
      <FerrySchedule showBackButton={true} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
