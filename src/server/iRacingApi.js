const axios = require('axios');
const crypto = require('crypto');
const NodeCache = require('node-cache');
const { RateLimiter } = require('limiter');

class IracingApi {
    constructor() {
        this.baseUrl = 'https://members-ng.iracing.com/';
        this.session = axios.create({
            baseURL: this.baseUrl,
            withCredentials: true,
        });
        this.cache = new NodeCache({ stdTTL: 300, checkperiod: 60 }); // 5 minutes cache, check every 60 seconds
        this.rateLimiter = new RateLimiter({ tokensPerInterval: 5, interval: 'second' });

        // Bind all methods to ensure correct 'this' context
        this.login = this.login.bind(this);
        this.encodePassword = this.encodePassword.bind(this);
        this.getData = this.getData.bind(this);
        this.searchDrivers = this.searchDrivers.bind(this);
        this.getOfficialRaces = this.getOfficialRaces.bind(this);
        this.getLeagueRaces = this.getLeagueRaces.bind(this);
        this.getRaceState = this.getRaceState.bind(this);
        this.getKindFromCategory = this.getKindFromCategory.bind(this);
        this.mapLicenseLevelToClass = this.mapLicenseLevelToClass.bind(this);
        this.paginateRaces = this.paginateRaces.bind(this);
        this.getCarClasses = this.getCarClasses.bind(this);
        this.getLeagueInfo = this.getLeagueInfo.bind(this);
        this.getSubsessionResults = this.getSubsessionResults.bind(this);
    }

    async login(username, password) {
        try {
            console.log(`Attempting to log in user: ${username}`);
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
                console.log('Authentication cookie set successfully');
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

    async getData(endpoint, params = {}, retries = 3) {
        const cacheKey = `${endpoint}-${JSON.stringify(params)}`;
        const cachedData = this.cache.get(cacheKey);
        if (cachedData) {
            console.log(`Returning cached data for ${endpoint}`);
            return cachedData;
        }

        for (let i = 0; i < retries; i++) {
            try {
                await this.rateLimiter.removeTokens(1);
                if (!this.authCookie) {
                    throw new Error('Not authenticated. Please login first.');
                }
                console.log(`Sending request to ${endpoint} with auth cookie:`, this.authCookie);
                const response = await this.session.get(`data/${endpoint}`, { 
                    params,
                    headers: {
                        Cookie: this.authCookie
                    }
                });
                console.log(`API Response from ${endpoint}:`, response.data);
                this.cache.set(cacheKey, response.data);
                return response.data;
            } catch (error) {
                if (error.response && error.response.status === 429) {
                    const delay = Math.pow(2, i) * 1000;
                    console.log(`Rate limited. Waiting for ${delay}ms before retry ${i + 1}`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                } else if (i === retries - 1) {
                    console.error(`Error fetching ${endpoint}:`, error.response ? error.response.data : error.message);
                    throw error;
                }
            }
        }
        throw new Error(`Failed to fetch data from ${endpoint} after ${retries} retries`);
    }

    async searchDrivers(searchTerm, leagueId = null) {
        console.log(`Searching for driver with term: ${searchTerm}, leagueId: ${leagueId}`);
        const params = { search_term: searchTerm };
        if (leagueId) params.league_id = leagueId;
        const data = await this.getData('lookup/drivers', params);
        
        if (data && data.link) {
            console.log('Fetching driver data from provided link');
            const response = await axios.get(data.link);
            console.log('Driver search results:', response.data);
            return response.data;
        }
        
        return data;
    }

    async getOfficialRaces(page = 1, pageSize = 10) {
        try {
            console.log(`Fetching official races (Page: ${page}, PageSize: ${pageSize})`);
            
            const currentTime = new Date().toISOString();
            const cacheKey = `official-races-${currentTime.slice(0, 16)}`;
            const cachedData = this.cache.get(cacheKey);
            
            if (cachedData) {
                console.log('Returning cached official races data');
                return this.paginateRaces(cachedData, page, pageSize);
            }
    
            let raceGuideData = await this.getData('season/race_guide', {
                from: currentTime,
                include_end_after_from: true
            });
    
            if (raceGuideData.link) {
                console.log('Fetching detailed race guide data from provided link');
                const response = await axios.get(raceGuideData.link);
                raceGuideData = response.data;
            }
    
            if (!Array.isArray(raceGuideData.sessions)) {
                throw new Error('Invalid race guide data structure');
            }
    
            console.log(`Total sessions: ${raceGuideData.sessions.length}`);
    
            const seriesData = await this.getData('series/get');
            const carClassData = await this.getCarClasses();
            
            const relevantRaces = await Promise.all(raceGuideData.sessions.map(async (race) => {
                const state = this.getRaceState(race);
                if (state !== 'practice' && state !== 'qualifying') {
                    return null;
                }
    
                const series = seriesData.find(s => s.series_id === race.series_id);
                const seasonData = await this.getData('series/seasons', { series_id: race.series_id });
                const season = seasonData.find(s => s.season_id === race.season_id);
                const carClass = carClassData.find(cc => cc.car_class_id === race.car_class_id);

                return {
                    name: series ? series.series_name : (race.series_name || 'Unknown Series'),
                    description: series ? series.series_short_name : 'Unknown',
                    licenseLevel: this.mapLicenseLevelToClass(season ? season.license_group : null),
                    startTime: race.start_time,
                    state: state,
                    sessionMinutes: race.duration,
                    registeredDrivers: race.entry_count,
                    maxDrivers: race.max_entry_count || 0,
                    seriesId: race.series_id,
                    seasonId: race.season_id,
                    categoryId: race.category_id,
                    kind: this.getKindFromCategory(race.category_id),
                    trackName: season && season.track ? season.track.track_name : 'Unknown Track',
                    trackConfig: season && season.track ? season.track.config_name : '',
                    carNames: carClass ? carClass.cars.map(car => car.car_name).join(', ') : 'Unknown Car'
                };
            }));
    
            const filteredRaces = relevantRaces.filter(race => race !== null);
            console.log(`Relevant races: ${filteredRaces.length}`);
    
            // Sort races by state: qualifying first, then practice
            filteredRaces.sort((a, b) => {
                if (a.state === 'qualifying' && b.state !== 'qualifying') return -1;
                if (a.state !== 'qualifying' && b.state === 'qualifying') return 1;
                return new Date(a.startTime) - new Date(b.startTime);
            });
    
            this.cache.set(cacheKey, filteredRaces);
    
            return this.paginateRaces(filteredRaces, page, pageSize);
        } catch (error) {
            console.error('Error fetching official races:', error);
            throw error;
        }
    }

    async getCarClasses() {
        try {
            const cacheKey = 'car-classes';
            const cachedData = this.cache.get(cacheKey);
            
            if (cachedData) {
                return cachedData;
            }

            const carClassData = await this.getData('carclass/get');
            this.cache.set(cacheKey, carClassData);
            return carClassData;
        } catch (error) {
            console.error('Error fetching car classes:', error);
            throw error;
        }
    }

    async getLeagueInfo(leagueId) {
        try {
            const cacheKey = `league-info-${leagueId}`;
            const cachedData = this.cache.get(cacheKey);
            
            if (cachedData) {
                return cachedData;
            }

            const leagueData = await this.getData('league/get', { league_id: leagueId, include_license: false });
            this.cache.set(cacheKey, leagueData);
            return leagueData;
        } catch (error) {
            console.error('Error fetching league info:', error);
            throw error;
        }
    }

    async getSubsessionResults(subsessionId) {
        try {
            const cacheKey = `subsession-results-${subsessionId}`;
            const cachedData = this.cache.get(cacheKey);
            
            if (cachedData) {
                return cachedData;
            }

            const resultsData = await this.getData('results/get', { subsession_id: subsessionId, include_licenses: false });
            this.cache.set(cacheKey, resultsData);
            return resultsData;
        } catch (error) {
            console.error('Error fetching subsession results:', error);
            throw error;
        }
    }

    async getLeagueRaces(leagueId, page = 1, pageSize = 10) {
        try {
            console.log(`Fetching league races for league ID: ${leagueId} (Page: ${page}, PageSize: ${pageSize})`);
            
            const cacheKey = `league-races-${leagueId}-${page}-${pageSize}`;
            const cachedData = this.cache.get(cacheKey);
            
            if (cachedData) {
                console.log('Returning cached league races data');
                return cachedData;
            }
    
            const fetchWithRetry = async (url, retries = 3) => {
                for (let i = 0; i < retries; i++) {
                    try {
                        const response = await axios.get(url);
                        return response.data;
                    } catch (error) {
                        if (error.response && error.response.status === 403 && error.response.data.includes('Request has expired')) {
                            console.log(`S3 request expired, retrying (${i + 1}/${retries})...`);
                            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retrying
                        } else {
                            throw error;
                        }
                    }
                }
                throw new Error('Max retries reached for S3 request');
            };
    
            let leagueData = await this.getData('league/get', { league_id: leagueId });
            
            if (leagueData.link) {
                console.log('Fetching detailed league data from provided link');
                leagueData = await fetchWithRetry(leagueData.link);
            }
            
            if (!leagueData || !leagueData.sessions) {
                throw new Error('Invalid league data structure');
            }
    
            console.log(`Total league sessions: ${leagueData.sessions.length}`);
    
            const relevantRaces = leagueData.sessions.map(race => {
                const state = this.getRaceState(race);
                if (state !== 'practice' && state !== 'qualifying') {
                    return null;
                }
    
                return {
                    name: race.name || 'Unknown League Race',
                    description: race.description || 'No description',
                    startTime: race.start_time,
                    state: state,
                    sessionMinutes: race.duration,
                    registeredDrivers: race.num_registered_drivers,
                    maxDrivers: race.max_drivers || 0,
                    trackName: race.track ? race.track.track_name : 'Unknown Track',
                    trackConfig: race.track ? race.track.config_name : '',
                    carNames: race.cars ? race.cars.map(car => car.car_name).join(', ') : 'Unknown Car'
                };
            }).filter(race => race !== null);
    
            console.log(`Relevant league races: ${relevantRaces.length}`);
    
            relevantRaces.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
    
            const paginatedResult = this.paginateRaces(relevantRaces, page, pageSize);
            this.cache.set(cacheKey, paginatedResult);
    
            return paginatedResult;
        } catch (error) {
            console.error('Error fetching league races:', error);
            throw error;
        }
    }
    
    paginateRaces(races, page, pageSize) {
        const startIndex = (page - 1) * pageSize;
        const paginatedRaces = races.slice(startIndex, startIndex + pageSize);
        console.log(`Returning ${paginatedRaces.length} races for page ${page}`);
        return {
            races: paginatedRaces,
            totalCount: races.length,
            page: page,
            pageSize: pageSize
        };
    }

    getRaceState(race) {
        const currentTime = new Date();
        const startTime = new Date(race.start_time);
        const practiceEndTime = new Date(startTime.getTime() + 30 * 60000); // 30 minutes after start
        const qualifyingEndTime = new Date(practiceEndTime.getTime() + 10 * 60000); // 10 minutes qualifying
        
        if (currentTime < startTime) {
            return 'upcoming';
        } else if (currentTime >= startTime && currentTime < practiceEndTime) {
            return 'practice';
        } else if (currentTime >= practiceEndTime && currentTime < qualifyingEndTime) {
            return 'qualifying';
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