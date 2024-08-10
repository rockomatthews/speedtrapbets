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
        this.getSeriesData = this.getSeriesData.bind(this);
        this.getSeasonData = this.getSeasonData.bind(this);
        this.getTrackData = this.getTrackData.bind(this);
        this.getCarData = this.getCarData.bind(this);
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

    async getSeriesData() {
        try {
            const seriesData = await this.getData('series/get');
            if (seriesData.link) {
                const response = await axios.get(seriesData.link);
                return response.data;
            }
            return seriesData;
        } catch (error) {
            console.error('Error fetching series data:', error);
            throw error;
        }
    }

    async getSeasonData() {
        try {
            const seasonData = await this.getData('series/seasons');
            if (seasonData.link) {
                const response = await axios.get(seasonData.link);
                return response.data;
            }
            return seasonData;
        } catch (error) {
            console.error('Error fetching season data:', error);
            throw error;
        }
    }

    async getTrackData(trackId) {
        try {
            const trackData = await this.getData('track/get', { track_id: trackId });
            if (trackData.link) {
                const response = await axios.get(trackData.link);
                return response.data;
            }
            return trackData;
        } catch (error) {
            console.error('Error fetching track data:', error);
            throw error;
        }
    }

    async getCarData(carId) {
        try {
            const carData = await this.getData('car/get', { car_id: carId });
            if (carData.link) {
                const response = await axios.get(carData.link);
                return response.data;
            }
            return carData;
        } catch (error) {
            console.error('Error fetching car data:', error);
            throw error;
        }
    }

    async getOfficialRaces(page = 1, pageSize = 10) {
        try {
            console.log(`Fetching official races (Page: ${page}, PageSize: ${pageSize})`);
            
            const currentTime = new Date().toISOString();
    
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
    
            const seriesData = await this.getSeriesData();
            const seasonData = await this.getSeasonData();
    
            const transformedRaces = await Promise.all(raceGuideData.sessions.map(async race => {
                const series = seriesData.find(s => s.series_id === race.series_id);
                const season = seasonData.find(s => s.season_id === race.season_id);
                
                let trackDetails = {};
                if (race.track && race.track.track_id) {
                    trackDetails = await this.getTrackData(race.track.track_id);
                }
    
                let carNames = 'Unknown';
                if (series && series.car_class_id) {
                    const carClassDetails = await this.getCarClassData(series.car_class_id);
                    if (carClassDetails && carClassDetails.cars) {
                        carNames = carClassDetails.cars.map(car => car.name).join(', ');
                    }
                }
    
                return {
                    name: series ? series.series_name : race.series_name || 'Unknown Series',
                    description: series ? series.series_short_name : 'Unknown',
                    kind: this.getKindFromCategory(race.category_id),
                    class: this.mapLicenseLevelToClass(season ? season.license_group : null),
                    startTime: race.start_time,
                    state: this.getRaceState(race),
                    sessionMinutes: race.duration,
                    trackName: trackDetails.track_name || race.track?.track_name || 'Unknown Track',
                    trackConfig: trackDetails.config_name || race.track?.config_name,
                    carNames: carNames,
                    seriesId: race.series_id,
                    seasonId: race.season_id,
                    registeredDrivers: race.entry_count,
                    maxDrivers: race.max_entry_count || 0,
                    licenseGroup: season ? season.license_group : 'Unknown',
                    categoryId: season ? season.category_id : 'Unknown'
                };
            }));
    
            console.log(`Transformed races: ${transformedRaces.length}`);
    
            const qualifyingRaces = transformedRaces.filter(race => 
                race.state === 'qualifying'
            );
    
            console.log(`Qualifying races: ${qualifyingRaces.length}`);
    
            qualifyingRaces.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
    
            const startIndex = (page - 1) * pageSize;
            const paginatedRaces = qualifyingRaces.slice(startIndex, startIndex + pageSize);
    
            console.log(`Returning ${paginatedRaces.length} races for page ${page}`);
    
            return {
                races: paginatedRaces,
                totalCount: qualifyingRaces.length,
                page: page,
                pageSize: pageSize
            };
        } catch (error) {
            console.error('Error fetching official races:', error);
            console.error('Stack trace:', error.stack);
            throw error;
        }
    }
    
    // New method to get car class data
    async getCarClassData(carClassId) {
        try {
            const carClassData = await this.getData('carclass/get', { car_class_id: carClassId });
            if (carClassData.link) {
                const response = await axios.get(carClassData.link);
                return response.data;
            }
            return carClassData;
        } catch (error) {
            console.error('Error fetching car class data:', error);
            throw error;
        }
    }
    
    // Updated getRaceState method
    getRaceState(race) {
        const currentTime = new Date();
        const startTime = new Date(race.start_time);
        const endTime = new Date(race.end_time);
        
        if (currentTime < startTime) {
            return 'upcoming';
        } else if (currentTime >= startTime && currentTime < endTime) {
            // Assuming the first 10 minutes of the session is for qualifying
            const qualifyingEndTime = new Date(startTime.getTime() + 10 * 60000);
            if (currentTime < qualifyingEndTime) {
                return 'qualifying';
            } else {
                return 'racing';
            }
        } else {
            return 'completed';
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