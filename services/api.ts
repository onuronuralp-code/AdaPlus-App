
export interface DepartureDto {
    from: string;
    to: string;
    provider: string; // "Vapur", "Motor", etc.
    via?: string[];
    time: string; // "HH:mm"
    minutesUntil: number;
}

const API_BASE_URL = 'http://192.168.1.102:8080/api/v1/travel';

export const fetchDepartures = async (from: string, to: string, date?: string): Promise<DepartureDto[]> => {
    try {
        const queryParams = new URLSearchParams({ from, to });
        if (date) {
            queryParams.append('date', date);
        }

        // Include next day until 3 AM by default
        queryParams.append('includeNextDayUntil', '03:00');

        console.log(`Fetching: ${API_BASE_URL}/departures?${queryParams.toString()}`);
        const response = await fetch(`${API_BASE_URL}/departures?${queryParams.toString()}`);

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Failed to fetch departures:", error);
        return [];
    }
};
