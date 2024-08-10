import React, { useState, useEffect, useCallback } from 'react';
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
    Divider
} from '@mui/material';

const RankRaces = () => {
    const [officialRaces, setOfficialRaces] = useState([]);
    const [raceKindFilter, setRaceKindFilter] = useState('all');
    const [classFilter, setClassFilter] = useState('all');
    const [isLoadingRaces, setIsLoadingRaces] = useState(false);
    const [error, setError] = useState('');
    const [lastUpdated, setLastUpdated] = useState(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [totalCount, setTotalCount] = useState(0);

    const fetchOfficialRaces = useCallback(async (pageNum) => {
        setIsLoadingRaces(true);
        try {
            console.log(`Fetching races for page ${pageNum}`);
            const response = await fetch(`https://speedtrapbets.onrender.com/api/official-races?page=${pageNum}&pageSize=10`);
            console.log('Full API Response:', response);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Parsed API data:', JSON.stringify(data, null, 2));
            
            if (data.races && Array.isArray(data.races)) {
                const formattedRaces = data.races.map(race => ({
                    ...race,
                    licenseLevel: race.class,
                    track: race.trackName + (race.trackConfig ? ` (${race.trackConfig})` : ''),
                    cars: race.carNames || 'Unknown',
                    drivers: race.registeredDrivers.toString()
                }));

                if (pageNum === 1) {
                    console.log('Setting initial races');
                    setOfficialRaces(formattedRaces);
                } else {
                    console.log('Appending new races');
                    setOfficialRaces(prevRaces => [...prevRaces, ...formattedRaces]);
                }
                setTotalCount(data.totalCount);
                setHasMore(formattedRaces.length === 10 && officialRaces.length + formattedRaces.length < data.totalCount);
                setLastUpdated(new Date());
                setError('');
            } else {
                console.error('Received unexpected data structure:', data);
                setError('Received unexpected data structure from the server');
            }
        } catch (error) {
            console.error('Error fetching official races:', error);
            setError(`Failed to fetch official races: ${error.message}`);
        } finally {
            setIsLoadingRaces(false);
        }
    }, [officialRaces.length]);

    useEffect(() => {
        fetchOfficialRaces(1);
    }, [fetchOfficialRaces]);

    const loadMore = () => {
        if (!isLoadingRaces && hasMore) {
            setPage(prevPage => prevPage + 1);
            fetchOfficialRaces(page + 1);
        }
    };

    const handleRaceKindFilterChange = (event) => {
        setRaceKindFilter(event.target.value);
    };

    const handleClassFilterChange = (event) => {
        setClassFilter(event.target.value);
    };

    const filteredRaces = officialRaces.filter(race => 
        (raceKindFilter === 'all' || race.kind === raceKindFilter) &&
        (classFilter === 'all' || race.licenseLevel === classFilter)
    );

    console.log('Filtered races:', filteredRaces);

    return (
        <Box>
            <Typography variant="h5" component="h2" gutterBottom>Upcoming Official Races</Typography>

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
            </Box>

            {error && <Typography color="error">{error}</Typography>}

            {isLoadingRaces && page === 1 ? (
                <CircularProgress />
            ) : filteredRaces.length > 0 ? (
                <>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                        Showing {filteredRaces.length} of {totalCount} total upcoming races
                    </Typography>
                    <Grid container spacing={2}>
                        {filteredRaces.map((race, index) => (
                            <Grid item xs={12} key={index}>
                                <Card sx={{ border: '2px solid #ccc', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
                                    <CardContent>
                                        <Typography variant="h6" gutterBottom>{race.name}</Typography>
                                        <Divider sx={{ my: 1 }} />
                                        <Typography><strong>License Level:</strong> {race.licenseLevel}</Typography>
                                        <Typography><strong>Track:</strong> {race.track}</Typography>
                                        <Typography><strong>Cars:</strong> {race.cars}</Typography>
                                        <Typography><strong>Start Time:</strong> {new Date(race.startTime).toLocaleString()}</Typography>
                                        <Typography><strong>Duration:</strong> {race.sessionMinutes} minutes</Typography>
                                        <Typography><strong>State:</strong> {race.state}</Typography>
                                        <Typography><strong>Drivers:</strong> {race.drivers}</Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                    {hasMore && (
                        <Button 
                            onClick={loadMore} 
                            disabled={isLoadingRaces}
                            sx={{ mt: 2 }}
                        >
                            {isLoadingRaces ? 'Loading...' : 'Load More'}
                        </Button>
                    )}
                </>
            ) : (
                <Typography>No upcoming races found matching the current filters.</Typography>
            )}

            {lastUpdated && (
                <Typography variant="caption" sx={{ mt: 2, display: 'block' }}>
                    Last updated: {lastUpdated.toLocaleString()}
                </Typography>
            )}
        </Box>
    );
};

export default RankRaces;