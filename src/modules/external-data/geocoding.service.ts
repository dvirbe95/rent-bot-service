// src/modules/external-data/geocoding.service.ts
import axios from 'axios';

export interface Coordinates {
    lat: number;
    lng: number;
}

export class GeocodingService {
    /**
     * Converts an address to GPS coordinates using Nominatim (OpenStreetMap)
     */
    async getCoordinates(address: string, city: string): Promise<Coordinates | null> {
        try {
            const fullAddress = `${address}, ${city}, Israel`;
            const response = await axios.get('https://nominatim.openstreetmap.org/search', {
                params: {
                    q: fullAddress,
                    format: 'json',
                    limit: 1,
                    addressdetails: 1
                },
                headers: {
                    'User-Agent': 'RentBotApp/1.0'
                }
            });

            if (response.data && response.data.length > 0) {
                const result = response.data[0];
                return {
                    lat: parseFloat(result.lat),
                    lng: parseFloat(result.lon)
                };
            }

            // If full address fails, try just the city
            const cityResponse = await axios.get('https://nominatim.openstreetmap.org/search', {
                params: {
                    q: `${city}, Israel`,
                    format: 'json',
                    limit: 1
                },
                headers: {
                    'User-Agent': 'RentBotApp/1.0'
                }
            });

            if (cityResponse.data && cityResponse.data.length > 0) {
                const result = cityResponse.data[0];
                return {
                    lat: parseFloat(result.lat),
                    lng: parseFloat(result.lon)
                };
            }

            return null;
        } catch (error) {
            console.error('Geocoding error:', error);
            return null;
        }
    }
}
