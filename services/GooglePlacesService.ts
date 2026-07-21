import axios from 'axios';

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

export interface Place {
    id: string;
    title: string;
    description: string;
    coordinate: {
        latitude: number;
        longitude: number;
    };
}

// Pinpoint accurate fallback data for Kınalıada (Walkable sequence)
const FALLBACK_POINTS: Place[] = [
    {
        id: 'f1',
        title: 'Pier Arrival',
        description: 'Welcome to Kınalıada! The starting point of your journey. Known as Proti in history, it was the closest island to the city.',
        coordinate: { latitude: 40.9108, longitude: 29.0547 }
    },
    {
        id: 'f2',
        title: 'Kınalıada Mosque',
        description: 'A modern architectural gem built in 1964. Notice its unique triangular minaret and angular roof design.',
        coordinate: { latitude: 40.9104, longitude: 29.0541 }
    },
    {
        id: 'f3',
        title: 'Sıraevler (The Row Houses)',
        description: 'Historic wooden mansions lined along the coast, showcasing the elegant island architecture of the late Ottoman era.',
        coordinate: { latitude: 40.9099, longitude: 29.0547 }
    },
    {
        id: 'f4',
        title: 'Surp Krikor Lusavoriç Armenian Church',
        description: 'Founded in 1857, this historic church is famous for its beautiful courtyard and traditional Armenian stonework.',
        coordinate: { latitude: 40.9091, longitude: 29.0527 }
    },
    {
        id: 'f5',
        title: 'Panagia Greek Orthodox Church',
        description: 'A peaceful sanctuary dedicated to the Virgin Mary, representing the deep Greek roots of Kınalıada heritage.',
        coordinate: { latitude: 40.9082, longitude: 29.0520 }
    },
    {
        id: 'f6',
        title: 'Ayazma Beach',
        description: 'The most popular beach on the island. The name "Ayazma" refers to a holy water spring located nearby.',
        coordinate: { latitude: 40.9054, longitude: 29.0464 }
    },
    {
        id: 'f7',
        title: 'Teos Beach',
        description: 'Located at the southern end, this beach offers a more premium club experience with excellent dining and clear waters.',
        coordinate: { latitude: 40.9028, longitude: 29.0493 }
    }
];

export const fetchIslandLandmarks = async (): Promise<Place[]> => {
    if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === 'REPLACE_WITH_YOUR_KEY') {
        console.warn('Google Maps API Key missing. Using fallback data.');
        return FALLBACK_POINTS;
    }

    try {
        // Using Google Places API (New) - Search Nearby
        // Centered on Kinaliada center
        const response = await axios.post(
            'https://places.googleapis.com/v1/places:searchNearby',
            {
                includedTypes: ['tourist_attraction', 'landmark', 'museum', 'place_of_worship'],
                locationRestriction: {
                    circle: {
                        center: { latitude: 40.9090, longitude: 29.0510 },
                        radius: 1000.0
                    }
                }
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
                    'X-Goog-FieldMask': 'places.id,places.displayName,places.location,places.editorialSummary'
                }
            }
        );

        if (response.data && response.data.places) {
            return response.data.places.map((p: any) => ({
                id: p.id,
                title: p.displayName?.text || 'Point of Interest',
                description: p.editorialSummary?.text || `Discover this historical spot: ${p.displayName?.text}`,
                coordinate: {
                    latitude: p.location.latitude,
                    longitude: p.location.longitude
                }
            }));
        }

        return FALLBACK_POINTS;
    } catch (error) {
        console.log('Error fetching Google Places:', error);
        return FALLBACK_POINTS;
    }
};
