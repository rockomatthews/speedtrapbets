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
    Snackbar
} from '@mui/material';

const RankRaces = () => {
    // State variables
    const [officialRaces, setOfficialRaces] = useState([]);
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

    // Function to fetch official races
    const fetchOfficialRaces = useCallback(async (pageNum) => {
        setIsLoadingRaces(true);
        setError('');
        try {
            const response = await fetch(`https://speedtrapbets.onrender.com/api/official-races?page=${pageNum}&pageSize=10`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.races && Array.isArray(data.races)) {
                const formattedRaces = data.races;

                if (pageNum === 1) {
                    setOfficialRaces(formattedRaces);
                } else {
                    setOfficialRaces(prevRaces => [...prevRaces, ...formattedRaces]);
                }
                setTotalCount(data.totalCount);
                setHasMore(formattedRaces.length === 10 && officialRaces.length + formattedRaces.length < data.totalCount);
                setLastUpdated(new Date());
                setError('');
                setSnackbarMessage('Races updated successfully');
                setSnackbarOpen(true);
            } else {
                throw new Error('Received unexpected data structure from the server');
            }
        } catch (error) {
            setError(`Failed to fetch official races: ${error.message}`);
            setSnackbarMessage(`Error: ${error.message}`);
            setSnackbarOpen(true);
        } finally {
            setIsLoadingRaces(false);
        }
    }, [officialRaces.length]);

    // Effect to fetch races on component mount and periodically
    useEffect(() => {
        fetchOfficialRaces(1);
        const interval = setInterval(() => {
            fetchOfficialRaces(1);
        }, 30000); // Refresh every 30 seconds
        return () => clearInterval(interval);
    }, [fetchOfficialRaces]);

    // Function to load more races
    const loadMore = useCallback(() => {
        if (!isLoadingRaces && hasMore) {
            setPage(prevPage => prevPage + 1);
            fetchOfficialRaces(page + 1);
        }
    }, [isLoadingRaces, hasMore, page, fetchOfficialRaces]);

    // Filter change handlers
    const handleRaceKindFilterChange = useCallback((event) => {
        setRaceKindFilter(event.target.value);
    }, []);

    const handleClassFilterChange = useCallback((event) => {
        setClassFilter(event.target.value);
    }, []);

    const handleStateFilterChange = useCallback((event) => {
        setStateFilter(event.target.value);
    }, []);

    // Memoized filtered races
    const filteredRaces = useMemo(() => {
        return officialRaces.filter(race => 
            (raceKindFilter === 'all' || race.kind === raceKindFilter) &&
            (classFilter === 'all' || race.class === classFilter) &&
            (stateFilter === 'all' || race.state === stateFilter)
        );
    }, [officialRaces, raceKindFilter, classFilter, stateFilter]);

    // Snackbar close handler
    const handleSnackbarClose = useCallback((event, reason) => {
        if (reason === 'clickaway') {
            return;
        }
        setSnackbarOpen(false);
    }, []);

    // Render function
    return (
        <Box>
            <Typography variant="h5" component="h2" gutterBottom>Official Races</Typography>

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
                <Alert severity="error" sx={{ mb: 2 }}>
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
                                        <Typography><strong>License Level:</strong> {race.class}</Typography>
                                        <Typography><strong>Track:</strong> {race.trackName} {race.trackConfig && `(${race.trackConfig})`}</Typography>
                                        <Typography><strong>Cars:</strong> {race.carNames}</Typography>
                                        <Typography><strong>Start Time:</strong> {new Date(race.startTime).toLocaleString()}</Typography>
                                        <Typography><strong>Duration:</strong> {race.sessionMinutes} minutes</Typography>
                                        <Typography><strong>State:</strong> {race.state}</Typography>
                                        <Typography><strong>Drivers:</strong> {race.registeredDrivers}</Typography>
                                        <Typography><strong>Race Kind:</strong> {race.kind}</Typography>
                                        <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                                            Series ID: {race.seriesId} | Season ID: {race.seasonId}
                                        </Typography>
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