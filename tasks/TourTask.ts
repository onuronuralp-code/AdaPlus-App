import * as Location from 'expo-location';
import * as Speech from 'expo-speech';
import * as TaskManager from 'expo-task-manager';

export const GEOFENCING_TASK_NAME = ' ISLAND_TOUR_GEOFENCING';

// Note: This is a simplified version. For a real production app, 
// we would probably want to emit an event that the UI can listen to,
// or use a more robust state management if the app is killed.
TaskManager.defineTask(GEOFENCING_TASK_NAME, ({ data: { eventType, region }, error }: any) => {
    if (error) {
        console.error('Geofencing tool error:', error);
        return;
    }

    if (eventType === Location.GeofencingEventType.Enter) {
        // Find the matching point and speak its description
        // Point data would ideally be passed or stored in a persistent way
        console.log('Entered region:', region.identifier);

        // Simple mapping for background narration
        const descriptions: Record<string, string> = {
            '1': 'You are now at the Surp Krikor Lusavoriç Armenian Church. Look at the intricate stonework!',
            '2': 'Notice the modern triangular design of the Kınalıada Mosque built in 1964.',
            '3': 'Approaching the Panagia Greek Orthodox Church, a peaceful spot with rich Greek heritage.',
            '5': 'To your right is the path to Ayazma Beach, the most famous swimming spot on the island.',
            '6': 'Walking past the Sıraevler, historic wooden mansions representing the classic island lifestyle.'
        };

        const text = descriptions[region.identifier];
        if (text) {
            Speech.speak(text);
        }
    }
});
