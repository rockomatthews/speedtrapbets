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
            const seasonsData = await this.getData('series/seasons', { include_series: true });
            
            // Filter for official series
            const officialSeries = seasonsData.series.filter(series => series.official);
            
            // Fetch race guide data
            const raceGuideData = await this.getData('season/race_guide');
            
            // Filter race guide data for only the official series
            const officialRaces = raceGuideData.sessions.filter(session => 
                officialSeries.some(series => series.series_id === session.series_id)
            );
            
            // Transform the data into the format expected by the frontend
            return officialRaces.map(race => ({
                name: race.series_name,
                type: this.mapCategoryToType(race.category),
                class: this.mapLicenseLevelToClass(race.license_level),
                startTime: race.start_time
            }));
        } catch (error) {
            console.error('Error fetching official races:', error);
            throw error;
        }
    }

    mapCategoryToType(category) {
        const categoryMap = {
            1: 'oval',
            2: 'road',
            3: 'dirt_oval',
            4: 'formula'
        };
        return categoryMap[category] || 'unknown';
    }

    mapLicenseLevelToClass(licenseLevel) {
        const licenseMap = {
            1: 'Rookie',
            2: 'D',
            3: 'C',
            4: 'B',
            5: 'A'
        };
        return licenseMap[licenseLevel] || 'unknown';
    }
}

module.exports = IracingApi;