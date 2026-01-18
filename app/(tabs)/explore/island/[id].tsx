import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ImageBackground, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '../../../../components/ui/icon-symbol';

export default function IslandDetailScreen() {
    const { id, name, image, description, sunset } = useLocalSearchParams();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    // Fallback if no image passed, though discover page should pass it
    const heroImage = typeof image === 'string' ? { uri: image } : { uri: 'https://images.unsplash.com/photo-1549488497-66a9d5926c48?q=80&w=600&auto=format&fit=crop' };
    const islandName = typeof name === 'string' ? name : 'Discover Island';

    // Description from params or fallback
    const islandDescription = typeof description === 'string' ? description : "A tropical paradise known for its stunning turquoise lagoon and luxury overwater bungalows.";

    // Sunset time or fallback
    const sunsetTime = typeof sunset === 'string' ? sunset : "19:40";

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle="light-content" />

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Hero Header */}
                <ImageBackground source={heroImage} style={styles.heroImage}>
                    <View style={styles.heroOverlay}>
                        {/* Back Button */}
                        <TouchableOpacity
                            style={[styles.backButton, { top: insets.top + 10 }]}
                            onPress={() => router.back()}
                        >
                            <IconSymbol name="chevron.left" size={24} color="#000" />
                        </TouchableOpacity>

                        <View style={styles.heroTextContainer}>
                            <Text style={styles.heroTitle}>{islandName}</Text>
                            <View style={{ marginBottom: 8, flexDirection: 'row', alignItems: 'center' }}>
                                <IconSymbol name={"sunny" as any} size={16} color="#FFD700" style={{ marginRight: 6 }} />
                                <Text style={{ color: '#FFD700', fontWeight: '600', fontSize: 14 }}>Sunset {sunsetTime}</Text>
                            </View>
                            <Text style={styles.heroDescription}>{islandDescription}</Text>
                        </View>
                    </View>
                </ImageBackground>

                {/* Content Body */}
                <View style={styles.body}>
                    <View style={styles.sectionHeader}>
                        <IconSymbol name={"safari" as any} size={24} color="#EA580C" style={{ marginRight: 8 }} />
                        <Text style={styles.sectionTitle}>Services & Activities</Text>
                    </View>

                    {/* Cards */}
                    <ActivityCard
                        icon="restaurant"
                        color="#F97316"
                        title="Fine Dining"
                        subtitle="World-class restaurants with ocean views"
                    />
                    <ActivityCard
                        icon="directions-bus"
                        color="#3B82F6"
                        title="Transportation"
                        subtitle="Island shuttles and taxi services"
                    />
                    <ActivityCard
                        icon="camera-alt"
                        color="#EC4899"
                        title="Island Tours"
                        subtitle="Guided tours of volcanic peaks"
                    />
                    <ActivityCard
                        icon="chat"
                        color="#10B981"
                        title="Agora Forum"
                        subtitle="Share experiences with other travelers"
                    />
                </View>
            </ScrollView>
        </View>
    );
}

function ActivityCard({ icon, color, title, subtitle }: { icon: string, color: string, title: string, subtitle: string }) {
    return (
        <View style={styles.card}>
            <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
                {/* 20 opacity hex */}
                <IconSymbol name={icon as any} size={24} color={color} />
            </View>
            <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{title}</Text>
                <Text style={styles.cardSubtitle}>{subtitle}</Text>
            </View>
        </View>
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
    heroImage: {
        width: '100%',
        height: 300,
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
});
