import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Image, ImageBackground, StatusBar, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import Animated, { scrollTo, useAnimatedRef, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '../../../../components/ui/icon-symbol';
import { ISLANDS } from '../../../../constants/Islands';
import { useWeather } from '@/hooks/useWeather';

export default function IslandDetailScreen() {
    const { t } = useTranslation();
    const { id, name, image, description, sunset } = useLocalSearchParams();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { width: windowWidth, height: windowHeight } = useWindowDimensions();
    const scrollY = useSharedValue(0);
    const scrollRef = useAnimatedRef<Animated.ScrollView>();
    const { weather } = useWeather();

    const onScroll = useAnimatedScrollHandler((event) => {
        scrollY.value = event.contentOffset.y;
        // Prevent scrolling upward — only allow pull-down (overscroll bounce)
        if (event.contentOffset.y > 0) {
            scrollTo(scrollRef, 0, 0, false);
        }
    });

    const HEADER_HEIGHT = 300;

    const headerAnimatedStyle = useAnimatedStyle(() => {
        // Only trigger when pulled down past the top edge
        const isPullingDown = scrollY.value < 0;

        return {
            height: isPullingDown ? HEADER_HEIGHT + Math.abs(scrollY.value) : HEADER_HEIGHT,
            // When pulling down we don't translate, the height naturally expands from top (default origin)
            // When scrolling up, we want the image to stay behind the content, so we just stick it to top.
            transform: [
                { translateY: isPullingDown ? scrollY.value : 0 }
            ]
        };
    });

    const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1549488497-66a9d5926c48?q=80&w=600&auto=format&fit=crop';
    const isValidImageUrl = (url: string) => /^https?:\/\/.+/.test(url);
    const heroImage = typeof image === 'string' && isValidImageUrl(image) ? { uri: image } : { uri: FALLBACK_IMAGE };

    const islandSlug = typeof name === 'string' ? name.toLowerCase() : '';
    const islandName = typeof name === 'string' ? name : 'Discover Island';

    // Description from params or translated
    const islandDescription = islandSlug ? t(`islands.${islandSlug}.description`) : (typeof description === 'string' ? description : "");

    // Sunset time from API or fallback
    const sunsetTime = weather?.sunset ?? (typeof sunset === 'string' ? sunset : '19:40');

    const island = ISLANDS.find(i => i.id === id);
    const activities = island?.activities || [];

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle="dark-content" />

            {/* Fixed Back Button */}
            <TouchableOpacity
                style={[styles.backButton, { top: insets.top + 10 }]}
                onPress={() => router.back()}
            >
                <IconSymbol name="chevron.left" size={24} color="#000" />
            </TouchableOpacity>

            {/* Weather Info Box */}
            <View style={[styles.weatherBox, { top: insets.top + 10 }]}>
                <View style={styles.weatherRow}>
                    <IconSymbol name={"sunset.fill" as any} size={14} color="#FFD700" />
                    <Text style={styles.weatherText}>{sunsetTime}</Text>
                </View>
                <View style={[styles.weatherRow, { marginTop: 4 }]}>
                    <IconSymbol name={"thermometer.medium" as any} size={14} color="#fff" />
                    <Text style={styles.weatherText}>{weather ? `${weather.temperature}°C` : '18°C'}</Text>
                </View>
            </View>

            <Animated.ScrollView
                ref={scrollRef}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                onScroll={onScroll}
                scrollEventThrottle={16}
            >
                {/* Parallax Hero Header container */}
                <View style={styles.heroContainer}>
                    <Animated.View style={[styles.heroImageWrapper, headerAnimatedStyle]}>
                        <ImageBackground source={heroImage} style={styles.heroImage}>
                            <View style={styles.heroOverlay}>
                                <View style={styles.heroTextContainer}>
                                    <Text style={styles.heroTitle}>{islandName}</Text>
                                    <Text style={styles.heroDescription}>{islandDescription}</Text>
                                </View>
                            </View>
                        </ImageBackground>
                    </Animated.View>
                </View>

                {/* Content Body */}
                <View style={styles.body}>
                    <Image 
                        source={require('@/assets/images/island_doodle.png')} 
                        style={[StyleSheet.absoluteFill, { opacity: 0.15, borderRadius: 16 }]} 
                        resizeMode="cover"
                    />


                    {/* Cards */}
                    <ActivityCard
                        icon="fork.knife"
                        color="#F97316"
                        title={t(`islands.${islandSlug}.activities.seafood`, { defaultValue: 'Restaurants and Cafe' })}
                        subtitle={t(`islands.${islandSlug}.activities.seafoodSub`, { defaultValue: 'World-class dining with ocean views' })}
                        onPress={() => router.push('/(tabs)/explore/island/restaurant')}
                    />
                    <ActivityCard
                        icon="bus.fill"
                        color="#3B82F6"
                        title={t('common.transportation')}
                        subtitle={t('common.islandShuttles')}
                        onPress={() => router.push({ pathname: '/(tabs)/explore/island/transportation', params: { islandId: id } })}
                    />
                    <ActivityCard
                        icon="map.fill"
                        color="#EC4899"
                        title={t('common.adaAI', { defaultValue: 'Tur Rehberi' })}
                        subtitle={t('common.yourSmartGuide', { defaultValue: 'Adalar için akıllı seyahat asistanın' })}
                        onPress={() => router.push('/guide')}
                    />
                    <ActivityCard
                        icon="bubble.left.and.bubble.right.fill"
                        color="#10B981"
                        title={t('common.agoraForum', { defaultValue: 'Topluluk' })}
                        subtitle={t('common.shareExperiences', { defaultValue: 'Diğer gezginlerle deneyimlerini paylaş' })}
                        onPress={() => router.push('/signup')}
                    />
                </View>
            </Animated.ScrollView>
        </View>
    );
}

function ActivityCard({ icon, color, title, subtitle, onPress }: { icon: string, color: string, title: string, subtitle: string, onPress?: () => void }) {
    const Component = onPress ? TouchableOpacity : View;

    return (
        <Component style={styles.card} onPress={onPress}>
            <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
                {/* 20 opacity hex */}
                <IconSymbol name={icon as any} size={24} color={color} />
            </View>
            <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{title}</Text>
                <Text style={styles.cardSubtitle}>{subtitle}</Text>
            </View>
        </Component>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    scrollContent: {
        paddingBottom: 40,
    },
    heroContainer: {
        height: 300,
        overflow: 'visible',
    },
    heroImageWrapper: {
        width: '100%',
        height: 300,
        position: 'absolute',
        top: 0,
        left: 0,
    },
    heroImage: {
        width: '100%',
        height: '100%',
    },
    heroOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.3)', // Darken image slightly for text readability
        justifyContent: 'flex-end',
    },
    backButton: {
        position: 'absolute',
        left: 20,
        backgroundColor: '#fff',
        width: 44,
        height: 44,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 3,
    },
    heroTextContainer: {
        padding: 20,
        paddingBottom: 30,
    },
    heroTitle: {
        color: '#fff',
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    heroDescription: {
        color: '#eee',
        fontSize: 14,
        lineHeight: 20,
    },
    body: {
        padding: 20,
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        marginTop: -20, // Overlap the image slightly
        overflow: 'hidden', // Keep background clipped
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#0D1B2A',
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderColor: '#eee',
        borderWidth: 1,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    cardContent: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#0D1B2A',
        marginBottom: 4,
    },
    cardSubtitle: {
        fontSize: 13,
        color: '#778DA9',
    },
    weatherBox: {
        position: 'absolute',
        right: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 12,
        zIndex: 10,
    },
    weatherRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    weatherText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '600',
        marginLeft: 6,
    },
});
