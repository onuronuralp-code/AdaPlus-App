import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'ada_auth_token';
let memoryToken: string | null = null;

export const setToken = async (token: string | null) => {
  memoryToken = token;
  try {
    if (token) {
      if (Platform.OS !== 'web') {
        await SecureStore.setItemAsync(TOKEN_KEY, token);
      } else {
        localStorage.setItem(TOKEN_KEY, token);
      }
    } else {
      if (Platform.OS !== 'web') {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
      } else {
        localStorage.removeItem(TOKEN_KEY);
      }
    }
  } catch (error) {
    console.error('Error saving token:', error);
  }
};

export const getToken = () => {
  return memoryToken;
};

export const loadToken = async () => {
  try {
    if (Platform.OS !== 'web') {
      memoryToken = await SecureStore.getItemAsync(TOKEN_KEY);
    } else {
      memoryToken = localStorage.getItem(TOKEN_KEY);
    }
    return memoryToken;
  } catch (error) {
    console.error('Error loading token:', error);
    return null;
  }
};
