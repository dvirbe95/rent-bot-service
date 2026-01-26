// src/modules/external-data/gov-data.service.ts
import axios from 'axios';

export class GovDataService {
    private readonly BASE_URL = 'https://data.gov.il/api/3/action/datastore_search';
    
    // Verified Resource IDs for 2026
    private readonly BUS_STOPS_RES_ID = 'e873e6a2-66c1-494f-a677-f5e77348edb0'; 
    private readonly SCHOOLS_RES_ID = '99b92311-9675-4351-85cd-9ed5ee69a787';
    private readonly URBAN_RENEWAL_RES_ID = 'f65a0daf-f737-49c5-9424-d378d52104f5';
    private readonly HEALTH_CLINICS_RES_ID = '6267885b-a78b-49c0-ac3b-0105391c4d44'; // מוסדות בריאות
    private readonly REAL_ESTATE_SALES_RES_ID = 'adbc318d-950c-4822-9f6f-6c174f179b09'; // עסקאות נדל"ן

    /**
     * Fetches nearby health clinics (Kupot Cholim)
     */
    getNearbyHealthClinics = async (city: string) => {
        try {
            const response = await axios.get(this.BASE_URL, {
                params: {
                    resource_id: this.HEALTH_CLINICS_RES_ID,
                    filters: JSON.stringify({ "City": city }),
                    limit: 5
                }
            });

            const records = response.data?.result?.records || [];
            return records.map((r: any) => ({
                name: r.InstituteName || "מרפאה",
                type: r.InstituteType || "בריאות",
                address: r.Address || city
            }));
        } catch (error: any) {
            console.warn(`GovDataService: Health clinics failed for ${city}`);
            return [];
        }
    };

    /**
     * Fetches recent real estate sales in the area
     */
    getRecentSales = async (city: string) => {
        try {
            const response = await axios.get(this.BASE_URL, {
                params: {
                    resource_id: this.REAL_ESTATE_SALES_RES_ID,
                    filters: JSON.stringify({ "CITY_NAME": city }),
                    limit: 3
                }
            });

            const records = response.data?.result?.records || [];
            return records.map((r: any) => ({
                address: r.FULLADRESS || "כתובת לא ידועה",
                price: r.DEAL_AMOUNT ? `${Number(r.DEAL_AMOUNT).toLocaleString()} ₪` : "לא צוין",
                date: r.DEAL_DATE || "לאחרונה"
            }));
        } catch (error: any) {
            console.warn(`GovDataService: Recent sales failed for ${city}`);
            return [];
        }
    };

    /**
     * Fetches nearby bus stops
     */
    getNearbyBusStops = async (lat: number, lng: number, city: string) => {
        try {
            const response = await axios.get(this.BASE_URL, {
                params: {
                    resource_id: this.BUS_STOPS_RES_ID,
                    q: city, // שימוש בחיפוש חופשי במקום פילטר קשיח
                    limit: 10
                }
            });

            const records = response.data?.result?.records || [];
            // סינון נוסף לפי שם העיר בתוצאות
            const cityRecords = records.filter((r: any) => 
                (r.CityName || "").includes(city) || city.includes(r.CityName || "")
            );

            return cityRecords.slice(0, 5).map((r: any) => ({
                name: r.StationTypeName || r.StreetName || "תחנת אוטובוס",
                lines: r.LineNumber || "קווים עירוניים",
            }));
        } catch (error: any) {
            console.warn(`GovDataService: Bus stops failed for ${city}`);
            return [];
        }
    };

    /**
     * Fetches nearby schools
     */
    getNearbySchools = async (city: string) => {
        try {
            const response = await axios.get(this.BASE_URL, {
                params: {
                    resource_id: this.SCHOOLS_RES_ID,
                    q: city, // שימוש בחיפוש חופשי
                    limit: 10
                }
            });

            const records = response.data?.result?.records || [];
            const cityRecords = records.filter((r: any) => 
                (r.SETL_NAME || "").includes(city) || city.includes(r.SETL_NAME || "")
            );

            return cityRecords.slice(0, 5).map((r: any) => ({
                name: r.NAME || "מוסד חינוך",
                type: r.USG_GROUP || "חינוך",
                address: r.STREET_NAME ? `${r.STREET_NAME} ${r.HOUSE_NUM || ''}` : city
            }));
        } catch (error: any) {
            console.warn(`GovDataService: Schools failed for ${city}`);
            return [];
        }
    };

    /**
     * Fetches urban renewal status
     */
    getUrbanRenewalStatus = async (city: string, address?: string) => {
        try {
            const response = await axios.get(this.BASE_URL, {
                params: {
                    resource_id: this.URBAN_RENEWAL_RES_ID,
                    filters: JSON.stringify({ "Yeshuv": city }),
                    limit: 20
                }
            });

            const records = response.data?.result?.records || [];
            
            if (address && records.length > 0) {
                const match = records.find((r: any) => {
                    const recName = (r.ShemMitcham || "").toLowerCase();
                    const addr = (address || "").toLowerCase();
                    return recName.includes(addr) || addr.includes(recName);
                });

                if (match) {
                    return {
                        isInProject: true,
                        projectName: match.ShemMitcham,
                        status: match.Status || "בתהליך",
                        type: "התחדשות עירונית"
                    };
                }
            }

            return { isInProject: false, message: "לא נמצאו פרויקטים פעילים" };
        } catch (error: any) {
            console.warn(`GovDataService: Urban renewal failed for ${city}`);
            return { isInProject: false, error: "מידע לא זמין" };
        }
    };

    /**
     * Aggregates all neighborhood data
     */
    getEnrichedNeighborhoodData = async (lat: number, lng: number, city: string, address?: string) => {
        // Clean city name (remove " - יפו" etc if exists for better matching)
        const cleanCity = city.split('-')[0].trim();
        
        const [busStops, schools, urbanRenewal, healthClinics, recentSales] = await Promise.all([
            this.getNearbyBusStops(lat, lng, cleanCity),
            this.getNearbySchools(cleanCity),
            this.getUrbanRenewalStatus(cleanCity, address),
            this.getNearbyHealthClinics(cleanCity),
            this.getRecentSales(cleanCity)
        ]);

        return {
            busStops,
            schools,
            urbanRenewal,
            healthClinics,
            recentSales,
            lastUpdated: new Date().toISOString()
        };
    };
}
