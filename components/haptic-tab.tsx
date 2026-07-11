import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import { View } from 'react-native';
import * as Haptics from 'expo-haptics';

export function HapticTab(props: BottomTabBarButtonProps) {
  const isSelected = props.accessibilityState?.selected;
  return (
    <PlatformPressable
      {...props}
      onPressIn={(ev) => {
        if (process.env.EXPO_OS === 'ios') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        props.onPressIn?.(ev);
      }}
    >
      {isSelected && (
        <View 
          style={{
            position: 'absolute',
            top: -12,
            left: '20%',
            right: '20%',
            height: 3,
            backgroundColor: '#0F172A',
            borderBottomLeftRadius: 4,
            borderBottomRightRadius: 4,
            zIndex: 10,
          }} 
        />
      )}
      {props.children as any}
    </PlatformPressable>
  );
}
