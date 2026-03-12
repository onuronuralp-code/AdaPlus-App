import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ImageBackground, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { scrollTo, useAnimatedRef, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '../../../../components/ui/icon-symbol';
import { ISLANDS } from '../../../../constants/Islands';

export default function IslandDetailScreen() {
    const { id, name, image, description, sunset } = useLocalSearchParams();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const scrollY = useSharedValue(0);
    const scrollRef = useAnimatedRef<Animated.ScrollView>();

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

    // Fallback if no image passed, though discover page should pass it
    const heroImage = typeof image === 'string' ? { uri: image } : { uri: 'https://images.unsplash.com/photo-1549488497-66a9d5926c48?q=80&w=600&auto=format&fit=crop' };
    const islandName = typeof name === 'string' ? name : 'Discover Island';

    // Description from params or fallback
    const islandDescription = typeof description === 'string' ? description : "A tropical paradise known for its stunning turquoise lagoon and luxury overwater bungalows.";

    // Sunset time or fallback
    const sunsetTime = typeof sunset === 'string' ? sunset : "19:40";

    const island = ISLANDS.find(i => i.id === id);
    const activities = island?.activities || [];

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle="light-content" />

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
                    <Text style={styles.weatherText}>18°C</Text>
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
                    <View style={styles.sectionHeader}>
                        <IconSymbol name={"safari" as any} size={24} color="#EA580C" style={{ marginRight: 8 }} />
                        <Text style={styles.sectionTitle}>Services & Activities</Text>
                    </View>

                    {/* Cards */}
                    <ActivityCard
                        icon="fork.knife"
                        color="#F97316"
                        title="Restaurants and Cafe"
                        subtitle="World-class dining with ocean views"
                        onPress={() => router.push('/(tabs)/explore/island/restaurant')}
                    />
                    <ActivityCard
                        icon="bus.fill"
                        color="#3B82F6"
                        title="Transportation"
                        subtitle="Island shuttles and taxi services"
                        onPress={() => router.push('/(tabs)/explore/island/transportation')}
                    />
                    <ActivityCard
                        icon="map.fill"
                        color="#EC4899"
                        title="Tour Guide"
                        subtitle="Guided tours of the island"
                        onPress={() => router.push('/(tabs)/explore/island/guide')}
                    />
                    <ActivityCard
                        icon="bubble.left.and.bubble.right.fill"
                        color="#10B981"
                        title="Agora Forum"
                        subtitle="Share experiences with other travelers"
                        onPress={() => router.push('/(tabs)/explore/island/forum')}
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
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
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
        borderRadius: 16,
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
        borderRadius: 24,
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
        borderRadius: 12,
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
