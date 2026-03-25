import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import { FlatList, Image, ImageBackground, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { FerrySchedule } from '@/components/FerrySchedule';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ISLANDS } from '@/constants/Islands';
import i18n from '@/utils/i18n';
import Svg, { Circle, Defs, Filter, FeGaussianBlur } from 'react-native-svg';
import { useTranslation } from 'react-i18next';

const SPACING = 16;
const CONTAINER_PADDING = 24;

export default function DiscoveryScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const cardWidth = (width - (CONTAINER_PADDING * 2) - SPACING) / 2;
  const TAB_BAR_HEIGHT = 80;
  const HEADING_HEIGHT = 80;
  const availableHeight = height - insets.top - insets.bottom - (CONTAINER_PADDING * 2) - SPACING - TAB_BAR_HEIGHT - HEADING_HEIGHT;
  const cardHeight = availableHeight / 2;

  const translateY = useSharedValue(height);
  const translateX = useSharedValue(0);
  const isSwiping = useSharedValue(false);

  useFocusEffect(
    useCallback(() => {
      translateY.value = height;
      translateX.value = 0; // reset
      isSwiping.value = false;
    }, [height])
  );

  React.useEffect(() => {
    const onOpenSchedule = () => {
      // Just slide up, no tag hiding
      animateAndNavigate();
    };

    const emitter = require('@/utils/eventEmitter').default;
    emitter.on('openFerrySchedule', onOpenSchedule);

    return () => {
      emitter.off('openFerrySchedule', onOpenSchedule);
    };
  }, []);

  const navigateToSchedule = () => {
    router.push('/(tabs)/home');
  };

  const animateAndNavigate = () => {
    translateY.value = withTiming(0, {
      duration: 600,
      easing: Easing.bezier(0.33, 1, 0.68, 1)
    }, (finished) => {
      if (finished) {
        runOnJS(navigateToSchedule)();
      }
    });
  };

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10]) // Activate very easily for horizontal movement
    .failOffsetY([-20, 20]) // Fail if mostly vertical
    .onUpdate((e) => {
      // Only allow swiping to the left
      if (e.translationX < 0) {
        translateX.value = e.translationX;
        isSwiping.value = true;
      }
    })
    .onEnd((e) => {
      // Swiping to the LEFT (negative translationX) to go to Ferry Schedule tab
      if (e.translationX < -50 || e.velocityX < -500) {
        // animate off screen
        translateX.value = withTiming(-width, { duration: 300 }, (finished) => {
          if (finished) {
            runOnJS(navigateToSchedule)();
          }
        });
      } else {
        // snap back to 0
        translateX.value = withSpring(0);
      }
    });

  const curtainStyle = useAnimatedStyle(() => {
    // If the slide-up animation is active (and we aren't dragging horizontally)
    if (translateY.value < height && !isSwiping.value) {
      return {
        transform: [
          { translateX: 0 },
          { translateY: translateY.value }
        ]
      };
    } else {
      // Otherwise, we are either resting or swiping left.
      // Make sure the translateY is locked at 0 while swiping left,
      // so it doesn't move upwards.
      return {
        transform: [
          { translateX: width },
          { translateY: 0 }
        ]
      };
    }
  });

  const mainStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  const renderItem = ({ item }: { item: typeof ISLANDS[0] }) => (
    <TouchableOpacity
      style={[
        styles.cardContainer,
        { width: cardWidth, height: cardHeight, marginBottom: SPACING }
      ]}
      onPress={() => router.push({
        pathname: '/explore/island/[id]',
        params: {
          id: item.id,
          name: item.name,
          image: item.image,
          description: item.description,
          sunset: item.sunset,
        }
      })}
      activeOpacity={0.9}
    >
      <ImageBackground
        source={{ uri: item.image }}
        style={styles.cardImage}
        imageStyle={{ borderRadius: 28 }}
      >
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          style={styles.cardOverlay}
        >
          <Text style={styles.cardTitle} numberOfLines={1} adjustsFontSizeToFit>{item.name}</Text>
          <Text style={styles.cardSubtitle} numberOfLines={2}>
            {t('common.tapToDiscover')}
          </Text>
        </LinearGradient>
      </ImageBackground>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Dynamic Bubble Background */}
      <View style={StyleSheet.absoluteFill}>
        <Svg width={width} height={height}>
          <Defs>
            <Filter id="softBlur" x="-50%" y="-50%" width="200%" height="200%">
              <FeGaussianBlur stdDeviation="25" />
            </Filter>
          </Defs>
          
          {/* Red Bubble */}
          <Circle cx={width * 0.15} cy={height * 0.2} r={70} fill="#EF4444" fillOpacity={0.35} filter="url(#softBlur)" />
          
          {/* Purple Bubble */}
          <Circle cx={width * 0.85} cy={height * 0.15} r={90} fill="#8B5CF6" fillOpacity={0.3} filter="url(#softBlur)" />
          
          {/* Orange Bubble */}
          <Circle cx={width * 0.5} cy={height * 0.45} r={110} fill="#F97316" fillOpacity={0.38} filter="url(#softBlur)" />
          
          {/* Green Bubble */}
          <Circle cx={width * 0.1} cy={height * 0.7} r={85} fill="#22C55E" fillOpacity={0.32} filter="url(#softBlur)" />
          
          {/* Blue Bubble */}
          <Circle cx={width * 0.8} cy={height * 0.8} r={100} fill="#3B82F6" fillOpacity={0.35} filter="url(#softBlur)" />

          {/* Extra smaller ones for depth */}
          <Circle cx={width * 0.6} cy={height * 0.9} r={50} fill="#EF4444" fillOpacity={0.25} filter="url(#softBlur)" />
          <Circle cx={width * 0.3} cy={height * 0.1} r={40} fill="#22C55E" fillOpacity={0.2} filter="url(#softBlur)" />
          <Circle cx={width * 0.9} cy={height * 0.55} r={60} fill="#8B5CF6" fillOpacity={0.25} filter="url(#softBlur)" />
        </Svg>
      </View>

      <GestureDetector gesture={panGesture}>
        <Animated.View style={[{ flex: 1, backgroundColor: '#fff' }, mainStyle]}>
          <View style={[styles.headerContainer, { paddingTop: insets.top }]}>
            <View style={styles.heading}>
              <View style={styles.headingTextContainer}>
                <Text style={styles.headingTitle} numberOfLines={1} adjustsFontSizeToFit>{t('common.readyForAdventure')}</Text>
                <Text style={styles.headingSubtitle}>{t('common.chooseYourIsland')}</Text>
              </View>
              <View style={styles.headerButtons}>
                <TouchableOpacity
                  style={styles.headerButton}
                  onPress={() => {
                    const newLang = i18n.language === 'en' ? 'tr' : 'en';
                    i18n.changeLanguage(newLang);
                  }}
                >
                  <IconSymbol name="globe" size={22} color="#000" />
                  <View style={styles.langBadge}>
                    <Text style={styles.langBadgeText}>{i18n.language.toUpperCase()}</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity style={styles.headerButton}>
                  <IconSymbol name="bell.fill" size={22} color="#000" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <Image 
            source={require('@/assets/images/island_doodle.png')} 
            style={[StyleSheet.absoluteFill, { opacity: 0.12, top: insets.top + 60, bottom: 80 }]} 
            resizeMode="repeat"
          />

          <SafeAreaView style={{ flex: 1 }} edges={['left', 'right']}>
            <View style={{ flex: 1 }}>


              <FlatList
                data={ISLANDS}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                numColumns={2}
                columnWrapperStyle={styles.columnWrapper}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
                scrollEnabled={false}
              />
            </View>
          </SafeAreaView>

          {/* Curtain (Ferry Schedule Preview) */}
          <Animated.View style={[
            styles.curtainContainer,
            { top: 0, height: height - TAB_BAR_HEIGHT, zIndex: 1000 },
            curtainStyle
          ]}>
            <View style={{ flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
              <FerrySchedule />
            </View>
          </Animated.View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    zIndex: 10,
  },
  heading: {
    paddingHorizontal: CONTAINER_PADDING,
    paddingTop: 8,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headingTextContainer: {
    flex: 1,
    paddingRight: 16,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  langBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#000',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  langBadgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '800',
  },
  headingTitle: {
    fontSize: 36,
    fontWeight: '900',
    color: '#000',
    letterSpacing: -1,
  },
  headingSubtitle: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
    fontWeight: '500',
  },
  columnWrapper: {
    gap: SPACING,
    marginBottom: SPACING,
  },
  listContent: {
    padding: CONTAINER_PADDING,
    paddingBottom: 120,
  },
  cardContainer: {
    borderRadius: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    backgroundColor: '#fff',
  },
  cardImage: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  cardOverlay: {
    padding: 16,
    paddingTop: 32,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
    marginBottom: 2,
  },
  cardSubtitle: {
    color: '#E0E0E0',
    fontSize: 12,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  curtainContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },

});
