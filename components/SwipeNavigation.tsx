import React from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, runOnJS } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props {
  children: React.ReactNode;
  leftRoute?: string;
  rightRoute?: string;
}

export function SwipeNavigation({ children, leftRoute, rightRoute }: Props) {
  const router = useRouter();
  const translateX = useSharedValue(0);
  const isEdgeSwipe = useSharedValue(false);

  const navigateTo = (route: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.navigate(route as any);
    // Kısa bir süre sonra ekranı tekrar yerine al ki geri dönüldüğünde ekran kaymış kalmasın
    setTimeout(() => {
      translateX.value = 0;
    }, 150);
  };

  const pan = Gesture.Pan()
    .activeOffsetX([-30, 30])
    .onBegin((e) => {
       if (e.x < 50 || e.x > SCREEN_WIDTH - 50) {
           isEdgeSwipe.value = true;
       } else {
           isEdgeSwipe.value = false;
       }
    })
    .onUpdate((e) => {
      if (!isEdgeSwipe.value) return;
      if ((e.translationX < 0 && rightRoute) || (e.translationX > 0 && leftRoute)) {
        translateX.value = e.translationX;
      }
    })
    .onEnd((e) => {
      if (!isEdgeSwipe.value) return;
      if (e.translationX < -70 && rightRoute) {
        translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
        runOnJS(navigateTo)(rightRoute);
      } else if (e.translationX > 70 && leftRoute) {
        translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
        runOnJS(navigateTo)(leftRoute);
      } else {
        translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.container, animatedStyle]}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff', // Arka planın saydam görünmemesi için
  },
});
