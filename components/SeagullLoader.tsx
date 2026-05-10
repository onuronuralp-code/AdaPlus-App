import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Ellipse, G, Path } from 'react-native-svg';

// Animated.createAnimatedComponent from react-native works reliably
// with react-native-svg G elements and string transform interpolation.
const AnimatedG = Animated.createAnimatedComponent(G);

const CORAL = '#E8614A';

interface Props {
  size?: number;
}

export default function SeagullLoader({ size = 100 }: Props) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 550,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false, // required for SVG prop animation
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 550,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, []);

  // Interpolate to SVG rotate(angle, pivotX, pivotY) string
  const leftTransform  = anim.interpolate({ inputRange: [0, 1], outputRange: ['rotate(0, 0, 8)', 'rotate(32, 0, 8)']  });
  const rightTransform = anim.interpolate({ inputRange: [0, 1], outputRange: ['rotate(0, 0, 8)', 'rotate(-32, 0, 8)'] });

  return (
    <View style={styles.container}>
      <Svg
        width={size}
        height={size * 0.65}
        viewBox="-110 -55 220 90"
        accessibilityElementsHidden
      >
        <AnimatedG transform={leftTransform}>
          <Path d="M 0,8 C -22,0 -58,-12 -96,-22 C -76,-6 -30,6 0,8 Z" fill={CORAL} />
        </AnimatedG>
        <AnimatedG transform={rightTransform}>
          <Path d="M 0,8 C 22,0 58,-12 96,-22 C 76,-6 30,6 0,8 Z" fill={CORAL} />
        </AnimatedG>
        <Ellipse cx={0} cy={6} rx={9} ry={8} fill={CORAL} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
