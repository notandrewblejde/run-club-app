import axios, { AxiosError } from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080/api';

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Host': 'api.runclub.app',
  },
});

client.interceptors.request.use(async (config) => {
  try {
    const jwt = await SecureStore.getItemAsync('jwt');
    if (jwt) {
      config.headers.Authorization = `Bearer ${jwt}`;
    }
  } catch (error) {
    console.error('Error reading JWT:', error);
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      SecureStore.deleteItemAsync('jwt');
    }
    return Promise.reject(error);
  }
);

export default client;
