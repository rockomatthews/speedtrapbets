// components/RankRaces.js

import React, { useState, useEffect } from 'react';
import { Typography, Box, FormControl, InputLabel, Select, MenuItem, CircularProgress } from '@mui/material';

const RankRaces = () => {
    const [officialRaces, setOfficialRaces] = useState([]);
    const [raceTypeFilter, setRaceTypeFilter] = useState('all');
    const [classFilter, setClassFilter] = useState('all');
    const [isLoadingRaces, setIsLoadingRaces] = useState(false);
    const [error, setError] = useState('');

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
            <Typography variant="h5" component="h2" gutterBottom>Official Races</Typography>

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
                <Box sx={{ mt: 2 }}>
                    {filteredRaces.map((race, index) => (
                        <Box key={index} sx={{ mb: 2, p: 2, border: '1px solid #ccc', borderRadius: 2 }}>
                            <Typography variant="h6">{race.name}</Typography>
                            <Typography>Type: {race.type}</Typography>
                            <Typography>Class: {race.class}</Typography>
                            <Typography>Start Time: {new Date(race.startTime).toLocaleString()}</Typography>
                        </Box>
                    ))}
                </Box>
            ) : (
                <Typography>No races found matching the current filters.</Typography>
            )}
        </Box>
    );
};

export default RankRaces;