import React, { useRef, useState, useEffect } from 'react';
import { View, Text, Animated, PanResponder, StyleSheet, Dimensions } from 'react-native';
import { IconSymbol } from './ui/icon-symbol';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';

interface SwipeButtonProps {
  onSwipeComplete: () => void;
}

const THUMB_SIZE = 60;
const PADDING = 8;
const SCREEN_WIDTH = Dimensions.get('window').width;
const MAX_TRANSLATE = SCREEN_WIDTH - 40 - (PADDING * 2) - THUMB_SIZE;

export function SwipeButton({ onSwipeComplete }: SwipeButtonProps) {
  const { t, i18n } = useTranslation();
  const pan = useRef(new Animated.ValueXY()).current;
  const [completed, setCompleted] = useState(false);
  const completedRef = useRef(false);

  useEffect(() => {
    completedRef.current = completed;
  }, [completed]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderMove: (e, gesture) => {
        if (completedRef.current) return;
        let newX = gesture.dx;
        if (newX < 0) newX = 0;
        if (newX > MAX_TRANSLATE) newX = MAX_TRANSLATE;
        pan.setValue({ x: newX, y: 0 });
      },
      onPanResponderRelease: (e, gesture) => {
        if (completedRef.current) return;
        if (gesture.dx > MAX_TRANSLATE * 0.6) {
          completedRef.current = true;
          setCompleted(true);
          Animated.spring(pan, {
            toValue: { x: MAX_TRANSLATE, y: 0 },
            useNativeDriver: false,
          }).start(() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onSwipeComplete();
            setTimeout(() => {
              Animated.spring(pan, {
                toValue: { x: 0, y: 0 },
                useNativeDriver: false,
              }).start(() => {
                setCompleted(false);
                completedRef.current = false;
              });
            }, 1000);
          });
        } else {
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
            friction: 5,
          }).start();
        }
      },
    })
  ).current;

  return (
    <View style={styles.container}>
      <Animated.View 
        style={[
          styles.fillTrack, 
          { width: Animated.add(pan.x, THUMB_SIZE) }
        ]} 
      />
      <View style={styles.textContainer}>
        <Text style={styles.subtext}>
          {completed 
            ? t('common.unlocked', { defaultValue: i18n.language.startsWith('en') ? 'Going to Community...' : 'Topluluğa gidiliyor...' })
            : t('common.swipeToJoin', { defaultValue: i18n.language.startsWith('en') ? 'Swipe to go to Community' : 'Topluluğa gitmek için kaydır' })}
        </Text>
      </View>

      <Animated.View
        style={[styles.thumb, { transform: [{ translateX: pan.x }], backgroundColor: completed ? '#10B981' : '#059669' }]}
        {...panResponder.panHandlers}
      >
        <IconSymbol name={completed ? "checkmark" : "arrow.right"} size={24} color="#FFFFFF" />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 76,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    padding: PADDING,
    justifyContent: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    overflow: 'hidden',
  },
  textContainer: {
    position: 'absolute',
    left: 40,
    right: PADDING,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtext: {
    color: '#059669',
    fontWeight: '700',
    fontSize: 15,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    backgroundColor: '#059669',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    left: PADDING,
    zIndex: 10,
  },
  fillTrack: {
    position: 'absolute',
    left: PADDING,
    top: PADDING,
    bottom: PADDING,
    backgroundColor: '#D1FAE5',
    borderRadius: 18,
    zIndex: 1,
  },
});
