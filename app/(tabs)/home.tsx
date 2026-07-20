import { StyleSheet, View } from 'react-native';
import { FerrySchedule } from '../../components/FerrySchedule';
import { useTheme } from '../../context/ThemeContext';
import { SwipeNavigation } from '@/components/SwipeNavigation';

export default function HomeScreen() {
  const { theme } = useTheme();

  return (
    <SwipeNavigation leftRoute="/(tabs)/explore" rightRoute="/(tabs)/contact">
      <View style={[styles.container, { backgroundColor: theme === 'light' ? '#fff' : '#333' }]}>
        <FerrySchedule />
      </View>
    </SwipeNavigation>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
