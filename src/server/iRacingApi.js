const axios = require('axios');
const crypto = require('crypto');

class IracingApi {
    constructor() {
        this.baseUrl = 'https://members-ng.iracing.com/';
        this.session = axios.create({
            baseURL: this.baseUrl,
            withCredentials: true,
        });

        this.login = this.login.bind(this);
        this.encodePassword = this.encodePassword.bind(this);
        this.getData = this.getData.bind(this);
        this.searchDrivers = this.searchDrivers.bind(this);
        this.getOfficialRaces = this.getOfficialRaces.bind(this);
        this.getRaceState = this.getRaceState.bind(this);
        this.getKindFromCategory = this.getKindFromCategory.bind(this);
        this.mapLicenseLevelToClass = this.mapLicenseLevelToClass.bind(this);
    }

    async login(username, password) {
        try {
            const encodedPassword = this.encodePassword(username, password);
            const response = await this.session.post('auth', {
                email: username,
                password: encodedPassword,
            });
            
            const cookies = response.headers['set-cookie'];
            if (cookies) {
                this.authCookie = cookies.find(cookie => cookie.startsWith('authtoken_members'));
                if (!this.authCookie) {
                    throw new Error('Authentication cookie not found in response');
                }
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
        
        if (data && data.link) {
            const response = await axios.get(data.link);
            console.log('Driver search results:', response.data);
            return response.data;
        }
        
        return data;
    }

    async getOfficialRaces(page = 1, pageSize = 10) {
        try {
            console.log(`Fetching official races (Page: ${page}, PageSize: ${pageSize})`);
            let raceGuideData = await this.getData('season/race_guide');
    
            console.log('Initial API response:', JSON.stringify(raceGuideData, null, 2));
    
            if (raceGuideData.link) {
                console.log('Fetching data from link:', raceGuideData.link);
                const response = await axios.get(raceGuideData.link);
                raceGuideData = response.data;
                console.log('Data fetched from link:', JSON.stringify(raceGuideData, null, 2));
            }
    
            if (!Array.isArray(raceGuideData.sessions)) {
                console.error('Race guide data is not an array:', raceGuideData);
                return { races: [], totalCount: 0, page: page, pageSize: pageSize };
            }
    
            console.log(`Total sessions: ${raceGuideData.sessions.length}`);
    
            const currentTime = new Date();
            const upcomingRaces = raceGuideData.sessions.filter(session => {
                const startTime = new Date(session.start_time);
                return startTime > currentTime;
            });
    
            console.log(`Upcoming races: ${upcomingRaces.length}`);
    
            const transformedRaces = upcomingRaces.map(race => ({
                name: race.series_name || 'Unknown Series',
                startTime: race.start_time,
                endTime: race.end_time,
                trackName: race.track?.track_name || 'Unknown Track',
                carClass: race.car_classes?.[0]?.name || 'Unknown Class',
                sessionId: race.session_id,
                seriesId: race.series_id,
                seasonId: race.season_id,
                registeredDrivers: race.entry_count,
                maxDrivers: race.max_entry_count || 0,
                licenseLevel: this.mapLicenseLevelToClass(race.license_group || 0),
                raceWeekNum: race.race_week_num
            }));
    
            transformedRaces.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
    
            const startIndex = (page - 1) * pageSize;
            const paginatedRaces = transformedRaces.slice(startIndex, startIndex + pageSize);
    
            console.log(`Returning ${paginatedRaces.length} races for page ${page}`);
    
            return {
                races: paginatedRaces,
                totalCount: transformedRaces.length,
                page: page,
                pageSize: pageSize
            };
        } catch (error) {
            console.error('Error fetching official races:', error);
            console.error('Stack trace:', error.stack);
            throw error;
        }
    }
    
    mapLicenseLevelToClass(licenseGroup) {
        const licenseMap = {
            1: 'Rookie',
            2: 'D',
            3: 'C',
            4: 'B',
            5: 'A'
        };
        return licenseMap[licenseGroup] || 'Unknown';
    }
}

module.exports = IracingApi;