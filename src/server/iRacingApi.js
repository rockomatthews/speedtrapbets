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
        this.getRaceState = this.getRaceState.bind(this);
        this.getKindFromCategory = this.getKindFromCategory.bind(this);
        this.mapLicenseLevelToClass = this.mapLicenseLevelToClass.bind(this);
        this.paginateRaces = this.paginateRaces.bind(this);
        this.getCarClasses = this.getCarClasses.bind(this);
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
    
                // Check if the API response contains a link
                if (response.data && response.data.link) {
                    console.log(`Following link for ${endpoint}:`, response.data.link);
                    try {
                        const linkResponse = await axios.get(response.data.link);
                        console.log(`Data fetched from link for ${endpoint}`);
                        this.cache.set(cacheKey, linkResponse.data);
                        return linkResponse.data;
                    } catch (linkError) {
                        console.error(`Error fetching data from link for ${endpoint}:`, linkError.message);
                        throw linkError;
                    }
                }
    
                // If no link, return the original response data
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
                } else {
                    console.log(`Error occurred while fetching ${endpoint}. Retrying... (Attempt ${i + 1}/${retries})`);
                }
            }
        }
        throw new Error(`Failed to fetch data from ${endpoint} after ${retries} retries`);
    }

    async searchDrivers(searchTerm) {
        console.log(`Searching for driver with term: ${searchTerm}`);
        const params = { search_term: searchTerm };
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
    
            console.log('Fetching race guide data...');
            let raceGuideData = await this.retryApiCall(() => this.getData('season/race_guide', {
                from: currentTime,
                include_end_after_from: true
            }));
    
            if (raceGuideData.link) {
                console.log('Fetching detailed race guide data from provided link');
                raceGuideData = await this.retryApiCall(() => axios.get(raceGuideData.link));
                raceGuideData = raceGuideData.data;
            }
    
            if (!Array.isArray(raceGuideData.sessions)) {
                console.error('Invalid race guide data structure:', raceGuideData);
                throw new Error('Invalid race guide data structure');
            }
    
            console.log(`Total sessions: ${raceGuideData.sessions.length}`);
    
            console.log('Fetching series data...');
            let seriesData = await this.retryApiCall(() => this.getData('series/get'));
            if (seriesData.link) {
                console.log('Fetching detailed series data from provided link');
                seriesData = await this.retryApiCall(() => axios.get(seriesData.link));
                seriesData = seriesData.data;
            }
    
            console.log('Fetching car class data...');
            const carClassData = await this.getCarClasses();
    
            console.log('Fetching track data...');
            let trackData = await this.retryApiCall(() => this.getData('track/get'));
            if (trackData.link) {
                console.log('Fetching detailed track data from provided link');
                const trackResponse = await this.retryApiCall(() => axios.get(trackData.link));
                trackData = trackResponse.data;
            }
    
            if (!Array.isArray(trackData)) {
                console.error('Invalid track data structure:', trackData);
                throw new Error('Invalid track data structure');
            }
    
            console.log('Processing race data...');
            const relevantRaces = await Promise.all(raceGuideData.sessions.map(async (race) => {
                const state = this.getRaceState(race);
                if (state !== 'practice' && state !== 'qualifying') {
                    return null;
                }
    
                const series = seriesData.find(s => s.series_id === race.series_id) || {};
                console.log(`Fetching season data for series ID: ${race.series_id}`);
                const seasonData = await this.retryApiCall(() => this.getData('series/seasons', { series_id: race.series_id }));
                let season;
                if (seasonData.link) {
                    const seasonResponse = await this.retryApiCall(() => axios.get(seasonData.link));
                    season = seasonResponse.data.find(s => s.season_id === race.season_id);
                } else {
                    season = seasonData.find(s => s.season_id === race.season_id);
                }
                const carClass = carClassData.find(cc => cc.car_class_id === race.car_class_id) || {};
    
                const track = trackData.find(t => t.track_id === season.track.track_id) || {};
    
                console.log(`Processed race: ${series.series_name || race.series_name || 'Unknown Series'}`);
                return {
                    name: series.series_name || race.series_name || 'Unknown Series',
                    description: series.series_short_name || 'Unknown',
                    licenseLevel: this.mapLicenseLevelToClass(season.license_group),
                    startTime: race.start_time,
                    state: state,
                    sessionMinutes: race.duration,
                    registeredDrivers: race.entry_count,
                    maxDrivers: race.max_entry_count || 0,
                    seriesId: race.series_id,
                    seasonId: race.season_id,
                    categoryId: race.category_id,
                    kind: this.getKindFromCategory(race.category_id),
                    trackName: track.track_name || 'Unknown Track',
                    trackConfig: track.config_name || '',
                    carNames: carClass.cars ? carClass.cars.map(car => car.car_name).join(', ') : 'Unknown Car'
                };
            }));
    
            const filteredRaces = relevantRaces.filter(race => race !== null);
            console.log(`Relevant races: ${filteredRaces.length}`);
    
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

    async retryApiCall(apiCall, retries = 3, initialDelay = 1000) {
        let delay = initialDelay;
        for (let i = 0; i < retries; i++) {
            try {
                return await apiCall();
            } catch (error) {
                if (i === retries - 1) throw error;
                console.log(`API call failed, retrying in ${delay}ms...`);
                await this.delay(delay);
                delay *= 2; // Exponential backoff
            }
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async getCarClasses() {
        try {
            const cacheKey = 'car-classes';
            const cachedData = this.cache.get(cacheKey);
            
            if (cachedData) {
                return cachedData;
            }

            let carClassData = await this.getData('carclass/get');
            if (carClassData.link) {
                console.log('Fetching detailed car class data from provided link');
                const response = await axios.get(carClassData.link);
                carClassData = response.data;
            }
            this.cache.set(cacheKey, carClassData);
            return carClassData;
        } catch (error) {
            console.error('Error fetching car classes:', error);
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
            5: 'R',   // Rookie
            4: 'D',
            3: 'C',
            2: 'B',
            1: 'A'
        };
        return licenseMap[licenseGroup] || 'unknown';
    }
}

module.exports = IracingApi;