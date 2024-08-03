import React, { useContext } from 'react';
import { Box, Typography, List, ListItem, ListItemText, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { UserContext } from '../contexts/UserContext';

const FollowedDrivers = () => {
  const { followedDrivers, setFollowedDrivers } = useContext(UserContext);

  const removeDriver = (custId) => {
    setFollowedDrivers(prev => prev.filter(driver => driver.cust_id !== custId));
  };

  return (
    <Box sx={{ marginTop: 4 }}>
      <Typography variant="h6">Followed Drivers</Typography>
      {followedDrivers.length === 0 ? (
        <Typography>No drivers followed yet.</Typography>
      ) : (
        <List>
          {followedDrivers.map((driver) => (
            <ListItem
              key={driver.cust_id}
              secondaryAction={
                <IconButton edge="end" aria-label="delete" onClick={() => removeDriver(driver.cust_id)}>
                  <DeleteIcon />
                </IconButton>
              }
            >
              <ListItemText primary={`${driver.display_name} (ID: ${driver.cust_id})`} />
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
};

export default FollowedDrivers;