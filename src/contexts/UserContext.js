import React, { createContext, useState } from 'react';

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [followedDrivers, setFollowedDrivers] = useState([]);

  return (
    <UserContext.Provider value={{ followedDrivers, setFollowedDrivers }}>
      {children}
    </UserContext.Provider>
  );
};