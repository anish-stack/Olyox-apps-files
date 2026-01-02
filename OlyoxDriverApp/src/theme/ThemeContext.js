import React, { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';
import { AppTheme } from '../../constant/ui';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const colorScheme = useColorScheme(); 
  const isDark = colorScheme === 'dark';
  const theme = isDark ?  AppTheme:AppTheme;

  return (
    <ThemeContext.Provider value={{ theme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook to use theme
export const useTheme = () => useContext(ThemeContext);
