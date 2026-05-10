import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'ada_auth_token';
const USER_KEY = 'ada_auth_user';
let memoryToken: string | null = null;
let memoryUser: any = null;

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
      memoryUser = null;
      if (Platform.OS !== 'web') {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        await SecureStore.deleteItemAsync(USER_KEY);
      } else {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      }
    }
  } catch (error) {
    console.error('Error saving token:', error);
  }
};

export const setUserStorage = async (user: any | null) => {
  memoryUser = user;
  try {
    if (user) {
      const userStr = JSON.stringify(user);
      if (Platform.OS !== 'web') {
        await SecureStore.setItemAsync(USER_KEY, userStr);
      } else {
        localStorage.setItem(USER_KEY, userStr);
      }
    } else {
      if (Platform.OS !== 'web') {
        await SecureStore.deleteItemAsync(USER_KEY);
      } else {
        localStorage.removeItem(USER_KEY);
      }
    }
  } catch (error) {
    console.error('Error saving user data:', error);
  }
};

export const loadAuthData = async () => {
  try {
    if (Platform.OS !== 'web') {
      memoryToken = await SecureStore.getItemAsync(TOKEN_KEY);
      const userStr = await SecureStore.getItemAsync(USER_KEY);
      memoryUser = userStr ? JSON.parse(userStr) : null;
    } else {
      memoryToken = localStorage.getItem(TOKEN_KEY);
      const userStr = localStorage.getItem(USER_KEY);
      memoryUser = userStr ? JSON.parse(userStr) : null;
    }
    return { token: memoryToken, user: memoryUser };
  } catch (error) {
    console.error('Error loading auth data:', error);
    return { token: null, user: null };
  }
};

export const getToken = () => memoryToken;
export const getUser = () => memoryUser;

export const loadToken = async () => {
  const { token } = await loadAuthData();
  return token;
};
