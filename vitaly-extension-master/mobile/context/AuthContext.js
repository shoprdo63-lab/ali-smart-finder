import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const storedUser = await AsyncStorage.getItem('@user');
      const token = await AsyncStorage.getItem('@auth_token');
      
      if (storedUser && token) {
        setUser(JSON.parse(storedUser));
        
        // Validate token by fetching profile
        try {
          const response = await api.get('/auth/profile');
          setUser(response.data);
          await AsyncStorage.setItem('@user', JSON.stringify(response.data));
        } catch (error) {
          // Token invalid, logout
          await logout();
        }
      }
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    const { user, accessToken, refreshToken } = response.data;
    
    await AsyncStorage.setItem('@user', JSON.stringify(user));
    await AsyncStorage.setItem('@auth_token', accessToken);
    await AsyncStorage.setItem('@refresh_token', refreshToken);
    
    setUser(user);
    return user;
  };

  const register = async (email, password, metadata = {}) => {
    const response = await api.post('/auth/register', { 
      email, 
      password, 
      metadata 
    });
    const { user, accessToken, refreshToken } = response.data;
    
    await AsyncStorage.setItem('@user', JSON.stringify(user));
    await AsyncStorage.setItem('@auth_token', accessToken);
    await AsyncStorage.setItem('@refresh_token', refreshToken);
    
    setUser(user);
    return user;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      // Ignore error
    }
    
    await AsyncStorage.multiRemove(['@user', '@auth_token', '@refresh_token']);
    setUser(null);
  };

  const updateProfile = async (updates) => {
    const response = await api.patch('/auth/profile', updates);
    const updatedUser = response.data;
    
    setUser(updatedUser);
    await AsyncStorage.setItem('@user', JSON.stringify(updatedUser));
    
    return updatedUser;
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateProfile,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
