import React, { useState, useEffect, useCallback } from 'react';
import { Typography, Box, FormControl, InputLabel, Select, MenuItem, CircularProgress, Card, CardContent, Grid, Chip, Button } from '@mui/material';

const RankRaces = () => {
    const [officialRaces, setOfficialRaces] = useState([]);
    const [raceTypeFilter, setRaceTypeFilter] = useState('all');
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
          const response = await fetch(`https://speedtrapbets.onrender.com/api/official-races?page=${pageNum}&pageSize=10`);
          console.log('Full API Response:', response);
          
          if (!response.ok) {
            throw new Error('Failed to fetch official races');
          }
          
          const data = await response.json();
          console.log('Parsed API data:', data);
          
          if (pageNum === 1) {
            setOfficialRaces(data.races);
          } else {
            setOfficialRaces(prev => [...prev, ...data.races]);
          }
          setTotalCount(data.totalCount);
          setHasMore(data.races.length === 10 && officialRaces.length + data.races.length < data.totalCount);
          setLastUpdated(new Date());
          setError('');
        } catch (error) {
          console.error('Error fetching official races:', error);
          setError('Failed to fetch official races. Please try again later.');
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

    const handleRaceTypeFilterChange = (event) => {
        setRaceTypeFilter(event.target.value);
    };

    const handleClassFilterChange = (event) => {
        setClassFilter(event.target.value);
    };

    const filteredRaces = officialRaces.filter(race => {
        console.log('Filtering race:', race);  // Add this line
        return (raceTypeFilter === 'all' || race.type === raceTypeFilter) &&
               (classFilter === 'all' || race.class === classFilter);
    });
    console.log('Filtered races:', filteredRaces);  // Add this line

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
    
            {console.log('Rendering with:', { 
                isLoadingRaces, 
                page, 
                filteredRacesLength: filteredRaces.length, 
                totalCount,
                raceTypeFilter,
                classFilter,
                officialRacesLength: officialRaces.length
            })}
    
            {isLoadingRaces && page === 1 ? (
                <CircularProgress />
            ) : filteredRaces.length > 0 ? (
                <>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                        Showing {filteredRaces.length} of {totalCount} total races
                    </Typography>
                    <Grid container spacing={2}>
                        {filteredRaces.map((race, index) => (
                            <Grid item xs={12} sm={6} md={4} key={index}>
                                <Card>
                                    <CardContent>
                                        <Typography variant="h6">{race.name}</Typography>
                                        <Typography>Type: {race.type}</Typography>
                                        <Typography>Class: {race.class}</Typography>
                                        <Typography>Track: {race.trackName} {race.trackConfig && `(${race.trackConfig})`}</Typography>
                                        <Typography>Start Time: {new Date(race.startTime).toLocaleString()}</Typography>
                                        <Typography>Duration: {race.sessionMinutes} minutes</Typography>
                                        <Typography>Cars: {race.carNames}</Typography>
                                        <Box sx={{ mt: 1 }}>
                                            <Chip label={`Series ID: ${race.seriesId}`} size="small" sx={{ mr: 1 }} />
                                            <Chip label={`Season ID: ${race.seasonId}`} size="small" />
                                        </Box>
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