import React, { forwardRef } from 'react';
import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import * as Haptics from 'expo-haptics';

export const HapticTab = forwardRef<any, BottomTabBarButtonProps>((props, ref) => {
  return (
    <PlatformPressable
      ref={ref}
      {...props}
      onPressIn={(ev) => {
        if (process.env.EXPO_OS === 'ios') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        props.onPressIn?.(ev);
      }}
    >
      {props.children as any}
    </PlatformPressable>
  );
});

HapticTab.displayName = 'HapticTab';
