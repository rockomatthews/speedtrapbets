import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
    Snackbar,
    Tab,
    Tabs
} from '@mui/material';

const RankRaces = () => {
    const [races, setRaces] = useState([]);
    const [raceKindFilter, setRaceKindFilter] = useState('all');
    const [classFilter, setClassFilter] = useState('all');
    const [stateFilter, setStateFilter] = useState('all');
    const [isLoadingRaces, setIsLoadingRaces] = useState(false);
    const [error, setError] = useState('');
    const [lastUpdated, setLastUpdated] = useState(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [totalCount, setTotalCount] = useState(0);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [activeTab, setActiveTab] = useState('official');
    const [leagueId, setLeagueId] = useState('');

    const fetchRaces = useCallback(async (pageNum) => {
        setIsLoadingRaces(true);
        setError('');
        try {
            let url = `https://speedtrapbets.onrender.com/api/${activeTab}-races`;
            if (activeTab === 'league' && !leagueId) {
                throw new Error('League ID is required for fetching league races');
            }
            url += `?page=${pageNum}&pageSize=10`;
            if (activeTab === 'league') {
                url += `&leagueId=${leagueId}`;
            }

            const response = await fetch(url, {
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.races && Array.isArray(data.races)) {
                if (pageNum === 1) {
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
    }, [activeTab, leagueId, races.length]);

    useEffect(() => {
        fetchRaces(1);
        const interval = setInterval(() => {
            fetchRaces(1);
        }, 30000);
        return () => clearInterval(interval);
    }, [fetchRaces, activeTab, leagueId]);

    const loadMore = useCallback(() => {
        if (!isLoadingRaces && hasMore) {
            setPage(prevPage => prevPage + 1);
            fetchRaces(page + 1);
        }
    }, [isLoadingRaces, hasMore, page, fetchRaces]);

    const handleRaceKindFilterChange = useCallback((event) => {
        setRaceKindFilter(event.target.value);
    }, []);

    const handleClassFilterChange = useCallback((event) => {
        setClassFilter(event.target.value);
    }, []);

    const handleStateFilterChange = useCallback((event) => {
        setStateFilter(event.target.value);
    }, []);

    const handleTabChange = useCallback((event, newValue) => {
        setActiveTab(newValue);
        setPage(1);
        setRaces([]);
        setHasMore(true);
    }, []);

    const handleLeagueIdChange = useCallback((event) => {
        setLeagueId(event.target.value);
    }, []);

    const filteredRaces = useMemo(() => {
        return races.filter(race => 
            (raceKindFilter === 'all' || race.kind === raceKindFilter) &&
            (classFilter === 'all' || race.licenseLevel === classFilter) &&
            (stateFilter === 'all' || race.state === stateFilter)
        );
    }, [races, raceKindFilter, classFilter, stateFilter]);

    const handleSnackbarClose = useCallback((event, reason) => {
        if (reason === 'clickaway') {
            return;
        }
        setSnackbarOpen(false);
    }, []);

    const handleRetry = useCallback(() => {
        fetchRaces(1);
    }, [fetchRaces]);

    return (
        <Box>
            <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 2 }}>
                <Tab label="Official Races" value="official" />
                <Tab label="League Races" value="league" />
            </Tabs>

            {activeTab === 'league' && (
                <FormControl sx={{ minWidth: 120, mb: 2 }}>
                    <InputLabel>League ID</InputLabel>
                    <Select value={leagueId} onChange={handleLeagueIdChange}>
                        <MenuItem value="">
                            <em>None</em>
                        </MenuItem>
                        <MenuItem value="1">League 1</MenuItem>
                        <MenuItem value="2">League 2</MenuItem>
                        <MenuItem value="3">League 3</MenuItem>
                    </Select>
                </FormControl>
            )}

            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <FormControl sx={{ minWidth: 120 }}>
                    <InputLabel>Race Kind</InputLabel>
                    <Select value={raceKindFilter} onChange={handleRaceKindFilterChange}>
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
                    <Select value={classFilter} onChange={handleClassFilterChange}>
                        <MenuItem value="all">All</MenuItem>
                        <MenuItem value="Rookie">Rookie</MenuItem>
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
                        {filteredRaces.map((race, index) => (
                            <Grid item xs={12} key={index}>
                                <Card sx={{ border: '2px solid #ccc', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
                                    <CardContent>
                                        <Typography variant="h6" gutterBottom>{race.name}</Typography>
                                        <Divider sx={{ my: 1 }} />
                                        <Typography><strong>License Level:</strong> {race.licenseLevel}</Typography>
                                        <Typography><strong>Track:</strong> {race.trackName} {race.trackConfig && `(${race.trackConfig})`}</Typography>
                                        <Typography><strong>Cars:</strong> {race.carNames}</Typography>
                                        <Typography><strong>Start Time:</strong> {new Date(race.startTime).toLocaleString()}</Typography>
                                        <Typography><strong>Duration:</strong> {race.sessionMinutes} minutes</Typography>
                                        <Typography><strong>State:</strong> {race.state}</Typography>
                                        <Typography><strong>Drivers:</strong> {race.registeredDrivers} / {race.maxDrivers}</Typography>
                                        {race.kind && <Typography><strong>Race Kind:</strong> {race.kind}</Typography>}
                                        {activeTab === 'official' && (
                                            <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                                                Series ID: {race.seriesId} | Season ID: {race.seasonId}
                                            </Typography>
                                        )}
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                    {hasMore && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                            <Button 
                                onClick={loadMore} 
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
                <Typography variant="caption" sx={{ mt: 2, display: 'block' }}>
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