import React, { useState, useEffect, useCallback, useMemo } from 'react';
import _ from 'lodash';
import { 
    Typography, 
    Box, 
    FormControl, 
    InputLabel, 
    Select, 
    MenuItem, 
    CircularProgress, 
    Card, 
    CardContent, 
    Grid, 
    Button,
    Divider,
    Alert,
    Snackbar
} from '@mui/material';

const RankRaces = () => {
    const [races, setRaces] = useState([]);
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [licenseLevelFilter, setLicenseLevelFilter] = useState('all');
    const [stateFilter, setStateFilter] = useState('all');
    const [isLoadingRaces, setIsLoadingRaces] = useState(false);
    const [error, setError] = useState('');
    const [lastUpdated, setLastUpdated] = useState(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [totalCount, setTotalCount] = useState(0);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');

    const fetchRaces = useCallback(async (pageNum, refresh = false) => {
        setIsLoadingRaces(true);
        setError('');
        try {
            const url = refresh 
                ? `https://speedtrapbets.onrender.com/api/refresh-races`
                : `https://speedtrapbets.onrender.com/api/official-races?page=${pageNum}&pageSize=10`;

            console.log(`Fetching races from URL: ${url}`);

            const response = await fetch(url, {
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error(`HTTP error! status: ${response.status}, message: ${errorData.error || 'Unknown error'}`);
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.error || 'Unknown error'}`);
            }
            
            const data = await response.json();
            console.log('Fetched race data:', data);

            if (data.races && Array.isArray(data.races)) {
                console.log('Fetched races array:', data.races);
                if (pageNum === 1 || refresh) {
                    setRaces(data.races);
                } else {
                    setRaces(prevRaces => [...prevRaces, ...data.races]);
                }
                setTotalCount(data.totalCount);
                setHasMore(data.races.length === 10 && races.length + data.races.length < data.totalCount);
                setLastUpdated(new Date());
                setError('');
                setSnackbarMessage('Races updated successfully');
                setSnackbarOpen(true);
            } else {
                console.error('Received unexpected data structure from the server:', data);
                throw new Error('Received unexpected data structure from the server');
            }
        } catch (error) {
            setError(`Failed to fetch races: ${error.message}`);
            setSnackbarMessage(`Error: ${error.message}`);
            setSnackbarOpen(true);
            console.error('Error fetching races:', error);
        } finally {
            setIsLoadingRaces(false);
        }
    }, [races.length]);

    useEffect(() => {
        fetchRaces(1);
    }, [fetchRaces]);

    const loadMore = useCallback(() => {
        if (!isLoadingRaces && hasMore) {
            setPage(prevPage => prevPage + 1);
            fetchRaces(page + 1);
        }
    }, [isLoadingRaces, hasMore, page, fetchRaces]);

    const throttledLoadMore = useMemo(() => {
        return _.throttle(loadMore, 1000);
    }, [loadMore]);

    const handleCategoryFilterChange = useCallback((event) => {
        console.log(`Category filter changed to: ${event.target.value}`);
        setCategoryFilter(event.target.value);
    }, []);

    const handleLicenseLevelFilterChange = useCallback((event) => {
        console.log(`License level filter changed to: ${event.target.value}`);
        setLicenseLevelFilter(event.target.value);
    }, []);

    const handleStateFilterChange = useCallback((event) => {
        console.log(`State filter changed to: ${event.target.value}`);
        setStateFilter(event.target.value);
    }, []);

    const filteredRaces = useMemo(() => {
        const filtered = races.filter(raceData => 
            (categoryFilter === 'all' || raceData.kind === categoryFilter) &&
            (licenseLevelFilter === 'all' || raceData.licenseLevel === licenseLevelFilter) &&
            (stateFilter === 'all' || raceData.state === stateFilter)
        );
        console.log('Filtered races:', filtered);
        return filtered;
    }, [races, categoryFilter, licenseLevelFilter, stateFilter]);

    const handleSnackbarClose = useCallback((event, reason) => {
        if (reason === 'clickaway') {
            return;
        }
        setSnackbarOpen(false);
    }, []);

    const handleRetry = useCallback(() => {
        console.log('Retrying fetch races...');
        fetchRaces(1);
    }, [fetchRaces]);

    const handleRefresh = useCallback(() => {
        console.log('Manually refreshing races...');
        setPage(1);
        fetchRaces(1, true);
    }, [fetchRaces]);

    const renderRace = (raceData, index) => {
        console.log(`Rendering race at index ${index}:`, raceData);

        const name = raceData.name || 'Unknown Series';
        const description = raceData.description || 'Unknown';
        const licenseLevel = raceData.licenseLevel || 'Unknown';
        const startTime = raceData.startTime ? new Date(raceData.startTime).toLocaleString() : 'Unknown';
        const state = raceData.state || 'Unknown';
        const sessionMinutes = raceData.sessionMinutes || 'Unknown';
        const registeredDrivers = raceData.registeredDrivers || 'Unknown';
        const maxDrivers = raceData.maxDrivers || 0;
        const seriesId = raceData.seriesId || 'Unknown';
        const seasonId = raceData.seasonId || 'Unknown';
        const categoryId = raceData.categoryId || 'Unknown';
        const kind = raceData.kind || 'Unknown';
        const trackName = raceData.trackName || 'Unknown Track';
        const trackConfig = raceData.trackConfig || '';
        const carNames = raceData.carNames || 'Unknown Car';

        console.log('Name:', name);
        console.log('Description:', description);
        console.log('License Level:', licenseLevel);
        console.log('Track Name:', trackName);
        console.log('Track Config:', trackConfig);
        console.log('Cars:', carNames);
        console.log('Start Time:', startTime);
        console.log('Session Minutes:', sessionMinutes);
        console.log('State:', state);
        console.log('Registered Drivers:', registeredDrivers);
        console.log('Max Drivers:', maxDrivers);
        console.log('Category:', kind);
        console.log('Category ID:', categoryId);
        console.log('Series ID:', seriesId);
        console.log('Season ID:', seasonId);

        return (
            <Grid item xs={12} key={index}>
                <Card sx={{ border: '2px solid #ccc', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>{name}</Typography>
                        <Typography variant="subtitle2" gutterBottom>{description}</Typography>
                        <Divider sx={{ my: 1 }} />
                        <Typography><strong>License Level:</strong> {licenseLevel}</Typography>
                        <Typography><strong>Track:</strong> {trackName} {trackConfig}</Typography>
                        <Typography><strong>Cars:</strong> {carNames}</Typography>
                        <Typography><strong>Start Time:</strong> {startTime}</Typography>
                        <Typography><strong>Duration:</strong> {sessionMinutes} minutes</Typography>
                        <Typography><strong>State:</strong> {state}</Typography>
                        <Typography><strong>Drivers:</strong> {registeredDrivers} / {maxDrivers}</Typography>
                        <Typography><strong>Category:</strong> {kind} (ID: {categoryId})</Typography>
                        <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                            Series ID: {seriesId} | Season ID: {seasonId}
                        </Typography>
                    </CardContent>
                </Card>
            </Grid>
        );
    };

    return (
        <Box>
            <Typography variant="h5" component="h2" gutterBottom>Official Races</Typography>

            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <FormControl sx={{ minWidth: 120 }}>
                    <InputLabel>Category</InputLabel>
                    <Select value={categoryFilter} onChange={handleCategoryFilterChange}>
                        <MenuItem value="all">All</MenuItem>
                        <MenuItem value="oval">Oval</MenuItem>
                        <MenuItem value="road">Road</MenuItem>
                        <MenuItem value="dirt_oval">Dirt Oval</MenuItem>
                        <MenuItem value="dirt_road">Dirt Road</MenuItem>
                        <MenuItem value="sports_car">Sports Car</MenuItem>
                    </Select>
                </FormControl>

                <FormControl sx={{ minWidth: 120 }}>
                    <InputLabel>License Level</InputLabel>
                    <Select value={licenseLevelFilter} onChange={handleLicenseLevelFilterChange}>
                        <MenuItem value="all">All</MenuItem>
                        <MenuItem value="R">R</MenuItem>
                        <MenuItem value="D">D</MenuItem>
                        <MenuItem value="C">C</MenuItem>
                        <MenuItem value="B">B</MenuItem>
                        <MenuItem value="A">A</MenuItem>
                    </Select>
                </FormControl>

                <FormControl sx={{ minWidth: 120 }}>
                    <InputLabel>State</InputLabel>
                    <Select value={stateFilter} onChange={handleStateFilterChange}>
                        <MenuItem value="all">All</MenuItem>
                        <MenuItem value="practice">Practice</MenuItem>
                        <MenuItem value="qualifying">Qualifying</MenuItem>
                    </Select>
                </FormControl>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                <Button
                    onClick={handleRefresh}
                    variant="contained"
                    color="primary"
                    disabled={isLoadingRaces}
                >
                    {isLoadingRaces ? 'Refreshing...' : 'Refresh Races'}
                </Button>
            </Box>

            {error && (
                <Alert 
                    severity="error" 
                    sx={{ mb: 2 }}
                    action={
                        <Button color="inherit" size="small" onClick={handleRetry}>
                            Retry
                        </Button>
                    }
                >
                    {error}
                </Alert>
            )}

            {isLoadingRaces && page === 1 ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                    <CircularProgress />
                </Box>
            ) : filteredRaces.length > 0 ? (
                <>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                        Showing {filteredRaces.length} of {totalCount} total races
                    </Typography>
                    <Grid container spacing={2}>
                        {filteredRaces.map((raceData, index) => renderRace(raceData, index))}
                    </Grid>
                    {hasMore && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                            <Button 
                                onClick={throttledLoadMore} 
                                disabled={isLoadingRaces}
                                variant="contained"
                                color="primary"
                            >
                                {isLoadingRaces ? 'Loading...' : 'Load More'}
                            </Button>
                        </Box>
                    )}
                </>
            ) : (
                <Typography>No races found matching the current filters.</Typography>
            )}

            {lastUpdated && (
                <Typography variant="caption" sx={{ mt: 2, display: "block" }}>
                    Last updated: {lastUpdated.toLocaleString()}
                </Typography>
            )}

            <Snackbar
                open={snackbarOpen}
                autoHideDuration={6000}
                onClose={handleSnackbarClose}
                message={snackbarMessage}
            />
        </Box>
    );
};

export default React.memo(RankRaces);