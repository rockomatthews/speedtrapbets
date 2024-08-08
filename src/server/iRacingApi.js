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
            
            // Get the current time in ISO format
            const currentTime = new Date().toISOString();
    
            // Fetch race guide data
            let raceGuideData = await this.getData('season/race_guide', {
                from: currentTime,
                include_end_after_from: true
            });
    
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
    
            const officialRaces = raceGuideData.sessions.filter(session => session.official);
            console.log(`Official races: ${officialRaces.length}`);
    
            const transformedRaces = officialRaces.map(race => ({
                name: race.series_name,
                kind: this.getKindFromCategory(race.category_id),
                class: this.mapLicenseLevelToClass(race.license_group),
                startTime: race.start_time,
                state: this.getRaceState(race),
                sessionMinutes: race.duration,
                trackName: race.track.track_name,
                trackConfig: race.track.config_name,
                carNames: race.car_classes.map(cc => cc.name).join(', '),
                seriesId: race.series_id,
                seasonId: race.season_id,
                registeredDrivers: race.registered_drivers,
                maxDrivers: race.max_drivers
            }));
    
            console.log(`Transformed races: ${transformedRaces.length}`);
    
            const upcomingRaces = transformedRaces.filter(race => 
                race.state === 'upcoming' || race.state === 'joinable'
            );
    
            console.log(`Upcoming races: ${upcomingRaces.length}`);
    
            // Sort races by start time
            upcomingRaces.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
    
            const startIndex = (page - 1) * pageSize;
            const paginatedRaces = upcomingRaces.slice(startIndex, startIndex + pageSize);
    
            console.log(`Returning ${paginatedRaces.length} races for page ${page}`);
    
            return {
                races: paginatedRaces,
                totalCount: upcomingRaces.length,
                page: page,
                pageSize: pageSize
            };
        } catch (error) {
            console.error('Error fetching official races:', error);
            console.error('Stack trace:', error.stack);
            throw error;
        }
    }
    
    getRaceState(race) {
        const currentTime = new Date();
        const startTime = new Date(race.start_time);
        const timeDifference = startTime - currentTime;
        const minutesUntilStart = timeDifference / (1000 * 60);
    
        if (minutesUntilStart > 30) {
            return 'upcoming';
        } else if (minutesUntilStart <= 30 && minutesUntilStart > -5) {
            return 'joinable';
        } else {
            return 'in_progress';
        }
    }

    getKindFromCategory(categoryId) {
        const categoryMap = {
            1: 'oval',
            2: 'road',
            3: 'dirt_oval',
            4: 'dirt_road',
            5: 'sports_car'
        };
        return categoryMap[categoryId] || 'unknown';
    }

    mapLicenseLevelToClass(licenseGroup) {
        const licenseMap = {
            1: 'Rookie',
            2: 'D',
            3: 'C',
            4: 'B',
            5: 'A'
        };
        return licenseMap[licenseGroup] || 'unknown';
    }
}

module.exports = IracingApi;