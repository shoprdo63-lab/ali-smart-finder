import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext();

export const themes = {
  dark: {
    colors: {
      background: '#0f1419',
      card: '#1a1f2e',
      text: '#f8fafc',
      textSecondary: '#94a3b8',
      primary: '#00d4ff',
      secondary: '#0ea5e9',
      success: '#10b981',
      warning: '#f59e0b',
      danger: '#ef4444',
      border: 'rgba(148, 163, 184, 0.1)',
    },
    isDark: true,
  },
  light: {
    colors: {
      background: '#ffffff',
      card: '#f8fafc',
      text: '#0f1419',
      textSecondary: '#64748b',
      primary: '#0ea5e9',
      secondary: '#0284c7',
      success: '#059669',
      warning: '#d97706',
      danger: '#dc2626',
      border: 'rgba(0, 0, 0, 0.1)',
    },
    isDark: false,
  },
};

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(themes.dark);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('@theme');
      if (savedTheme && themes[savedTheme]) {
        setTheme(themes[savedTheme]);
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTheme = async () => {
    const newThemeName = theme.isDark ? 'light' : 'dark';
    const newTheme = themes[newThemeName];
    setTheme(newTheme);
    try {
      await AsyncStorage.setItem('@theme', newThemeName);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  if (loading) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
