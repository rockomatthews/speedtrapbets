import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, Typography, Button, Grid } from '@mui/material';
import CircularProgress from '@mui/material/CircularProgress';

const RankRaces = () => {
    const [races, setRaces] = useState([]);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [totalCount, setTotalCount] = useState(0);

    useEffect(() => {
        fetchRaces(page);
    }, [page]);

    const fetchRaces = async (page) => {
        setLoading(true);
        try {
            const response = await axios.get(`/api/official-races?page=${page}&pageSize=10`);
            const { races, totalCount } = response.data;
            setRaces(prevRaces => [...prevRaces, ...races]);
            setTotalCount(totalCount);
        } catch (error) {
            console.error('Error fetching races:', error);
        } finally {
            setLoading(false);
        }
    };

    const refreshRaces = () => {
        setPage(1);
        setRaces([]);
    };

    return (
        <div style={{ padding: '20px' }}>
            <Grid container spacing={2}>
                {races.map((race, index) => (
                    <Grid item xs={12} sm={6} md={4} key={index}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" component="div">
                                    Title: {race.name}
                                </Typography>
                                <Typography color="textSecondary">
                                    License Level: {race.licenseLevel}
                                </Typography>
                                <Typography color="textSecondary">
                                    Track: {race.trackName} {race.trackConfig}
                                </Typography>
                                <Typography color="textSecondary">
                                    Cars: {race.carNames}
                                </Typography>
                                <Typography color="textSecondary">
                                    Start Time: {new Date(race.startTime).toLocaleString()}
                                </Typography>
                                <Typography color="textSecondary">
                                    Duration: {race.sessionMinutes} minutes
                                </Typography>
                                <Typography color="textSecondary">
                                    State: {race.state}
                                </Typography>
                                <Typography color="textSecondary">
                                    Drivers: {race.registeredDrivers}
                                </Typography>
                                <Typography color="textSecondary">
                                    Category: {race.kind}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {loading ? (
                <CircularProgress />
            ) : (
                <div style={{ marginTop: '20px' }}>
                    {races.length < totalCount && (
                        <Button variant="contained" color="primary" onClick={() => setPage(page + 1)}>
                            Load More
                        </Button>
                    )}
                    <Button variant="outlined" color="secondary" onClick={refreshRaces} style={{ marginLeft: '10px' }}>
                        Refresh
                    </Button>
                </div>
            )}
        </div>
    );
};

export default RankRaces;
