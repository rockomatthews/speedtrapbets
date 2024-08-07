const axios = require('axios');
const crypto = require('crypto');

class IracingApi {
    constructor() {
        this.baseUrl = 'https://members-ng.iracing.com/';
        this.session = axios.create({
            baseURL: this.baseUrl,
            withCredentials: true,
        });
    }

    async login(username, password) {
        try {
            const encodedPassword = this.encodePassword(username, password);
            const response = await this.session.post('auth', {
                email: username,
                password: encodedPassword,
            });
            
            // Store the authentication cookie
            const cookies = response.headers['set-cookie'];
            if (cookies) {
                this.authCookie = cookies.find(cookie => cookie.startsWith('authtoken_members'));
                if (!this.authCookie) {
                    throw new Error('Authentication cookie not found in response');
                }
                // Set the cookie for future requests
                this.session.defaults.headers.Cookie = this.authCookie;
            } else {
                throw new Error('No cookies received in authentication response');
            }

            console.log('Login successful');
            return response.data;
        } catch (error) {
            console.error('Login failed:', error.response ? error.response.data : error.message);
            throw error;
        }
    }

    encodePassword(username, password) {
        const lowerEmail = username.toLowerCase();
        const hash = crypto.createHash('sha256').update(password + lowerEmail).digest();
        return hash.toString('base64');
    }

    async getData(endpoint, params = {}) {
        try {
            if (!this.authCookie) {
                throw new Error('Not authenticated. Please login first.');
            }
            console.log('Sending request with auth cookie:', this.authCookie);
            const response = await this.session.get(`data/${endpoint}`, { 
                params,
                headers: {
                    Cookie: this.authCookie
                }
            });
            console.log('API Response:', response.data);
            return response.data;
        } catch (error) {
            console.error(`Error fetching ${endpoint}:`, error.response ? error.response.data : error.message);
            throw error;
        }
    }

    async searchDrivers(searchTerm, leagueId = null) {
        const params = { search_term: searchTerm };
        if (leagueId) params.league_id = leagueId;
        const data = await this.getData('lookup/drivers', params);
        
        // Check if the response contains a 'link' property
        if (data && data.link) {
            // Fetch the actual data from the provided link
            const response = await axios.get(data.link);
            console.log('Driver search results:', response.data);
            return response.data;
        }
        
        return data;
    }

    async getOfficialRaces() {
        try {
            // Fetch seasons data
            let seasonsData = await this.getData('series/seasons', { include_series: true });
            
            console.log('Seasons data:', JSON.stringify(seasonsData, null, 2));
    
            // Check if we need to fetch the actual data
            if (seasonsData.link) {
                const response = await axios.get(seasonsData.link);
                seasonsData = response.data;
                console.log('Fetched seasons data:', JSON.stringify(seasonsData, null, 2));
            }
            
            // The data is an array of season objects
            if (!Array.isArray(seasonsData)) {
                console.error('Seasons data is not an array');
                return [];
            }
    
            // Filter for official series
            const officialSeries = seasonsData.filter(season => season.official);
            
            // Transform the data into the format expected by the frontend
            const transformedRaces = officialSeries.flatMap(season => 
                season.schedules.map(schedule => ({
                    name: season.season_name,
                    type: this.mapCategoryToType(season.category_id),
                    class: this.mapLicenseLevelToClass(season.license_group),
                    startTime: schedule.start_date,
                    state: this.getRaceState(schedule),
                    sessionMinutes: schedule.race_time_descriptors[0]?.session_minutes,
                    trackName: schedule.track?.track_name,
                    trackConfig: schedule.track?.config_name,
                    carNames: season.car_classes?.map(cc => cc.name).join(', '),
                    seriesId: season.series_id,
                    seasonId: season.season_id,
                    scheduleDescription: season.schedule_description,
                    licenseGroup: season.license_group,
                    carClassIds: season.car_class_ids,
                    maxWeeks: season.max_weeks,
                    currentWeek: season.race_week,
                    seriesLogo: season.series_logo,
                    weather: schedule.weather
                }))
            );
    
            // Filter for only qualifying races
            const qualifyingRaces = transformedRaces.filter(race => race.state === 'qualifying');
    
            console.log('Qualifying races:', JSON.stringify(qualifyingRaces, null, 2));
            return qualifyingRaces;
        } catch (error) {
            console.error('Error fetching official races:', error);
            throw error;
        }
    }
    
    getRaceState(schedule) {
        const currentTime = new Date();
        const startDate = new Date(schedule.start_date);
        const sessionMinutes = schedule.race_time_descriptors[0]?.session_minutes || 0;
    
        // Calculate the end time of the session
        const endDate = new Date(startDate.getTime() + sessionMinutes * 60000);
    
        if (currentTime < startDate) {
            return 'upcoming';
        } else if (currentTime >= startDate && currentTime < endDate) {
            // Assuming the first half of the session is qualifying
            const halfwayPoint = new Date(startDate.getTime() + (sessionMinutes / 2) * 60000);
            return currentTime < halfwayPoint ? 'qualifying' : 'racing';
        } else {
            return 'completed';
        }
    }
}
module.exports = IracingApi;