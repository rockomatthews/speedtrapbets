import React, { useState, useEffect } from 'react';
import { Typography, Box, FormControl, InputLabel, Select, MenuItem, CircularProgress, Card, CardContent, Grid, Chip } from '@mui/material';

const RankRaces = () => {
    const [officialRaces, setOfficialRaces] = useState([]);
    const [raceTypeFilter, setRaceTypeFilter] = useState('all');
    const [classFilter, setClassFilter] = useState('all');
    const [isLoadingRaces, setIsLoadingRaces] = useState(false);
    const [error, setError] = useState('');
    const [lastUpdated, setLastUpdated] = useState(null);

    useEffect(() => {
        const fetchOfficialRaces = async () => {
            setIsLoadingRaces(true);
            try {
                const response = await fetch('https://speedtrapbets.onrender.com/api/official-races');
                if (!response.ok) {
                    throw new Error('Failed to fetch official races');
                }
                const data = await response.json();
                setOfficialRaces(data);
                setLastUpdated(new Date());
                setError('');
            } catch (error) {
                console.error('Error fetching official races:', error);
                setError('Failed to fetch official races. Please try again later.');
            } finally {
                setIsLoadingRaces(false);
            }
        };

        fetchOfficialRaces();
        const interval = setInterval(fetchOfficialRaces, 60000);
        return () => clearInterval(interval);
    }, []);

    const handleRaceTypeFilterChange = (event) => {
        setRaceTypeFilter(event.target.value);
    };

    const handleClassFilterChange = (event) => {
        setClassFilter(event.target.value);
    };

    const filteredRaces = officialRaces.filter(race => 
        (raceTypeFilter === 'all' || race.type === raceTypeFilter) &&
        (classFilter === 'all' || race.class === classFilter)
    );

    return (
        <Box>
            <Typography variant="h5" component="h2" gutterBottom>Qualifying Official Races</Typography>

            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <FormControl sx={{ minWidth: 120 }}>
                    <InputLabel>Race Type</InputLabel>
                    <Select value={raceTypeFilter} onChange={handleRaceTypeFilterChange}>
                        <MenuItem value="all">All</MenuItem>
                        <MenuItem value="oval">Oval</MenuItem>
                        <MenuItem value="road">Road</MenuItem>
                        <MenuItem value="dirt_oval">Dirt Oval</MenuItem>
                        <MenuItem value="dirt_road">Dirt Road</MenuItem>
                        <MenuItem value="sports_car">Sports Car</MenuItem>
                    </Select>
                </FormControl>

                <FormControl sx={{ minWidth: 120 }}>
                    <InputLabel>Class</InputLabel>
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

            {isLoadingRaces ? (
                <CircularProgress />
            ) : filteredRaces.length > 0 ? (
                <Grid container spacing={2}>
                    {filteredRaces.map((race, index) => (
                        <Grid item xs={12} sm={6} md={4} key={index}>
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>{race.name}</Typography>
                                    <Typography><strong>Type:</strong> {race.type}</Typography>
                                    <Typography><strong>Class:</strong> {race.class}</Typography>
                                    <Typography><strong>Track:</strong> {race.trackName} {race.trackConfig && `(${race.trackConfig})`}</Typography>
                                    <Typography><strong>Cars:</strong> {race.carNames}</Typography>
                                    <Typography><strong>Start Time:</strong> {new Date(race.startTime).toLocaleString()}</Typography>
                                    <Typography><strong>Duration:</strong> {race.sessionMinutes} minutes</Typography>
                                    <Typography><strong>Season Progress:</strong> Week {race.currentWeek + 1} of {race.maxWeeks}</Typography>
                                    <Typography><strong>Schedule:</strong> {race.scheduleDescription}</Typography>
                                    <Box sx={{ mt: 1 }}>
                                        <Chip label={`Series ID: ${race.seriesId}`} size="small" sx={{ mr: 1 }} />
                                        <Chip label={`Season ID: ${race.seasonId}`} size="small" />
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            ) : (
                <Typography>No qualifying races found matching the current filters.</Typography>
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