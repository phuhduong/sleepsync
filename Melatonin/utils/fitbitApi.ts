import { Alert } from 'react-native';
import { BiometricDataPoint } from './dataProcessor';
import * as WebBrowser from 'expo-web-browser';

// Fitbit API configuration
const FITBIT_CLIENT_ID = process.env.EXPO_PUBLIC_FITBIT_CLIENT_ID;
const FITBIT_CLIENT_SECRET = process.env.EXPO_PUBLIC_FITBIT_CLIENT_SECRET;
const FITBIT_REDIRECT_URI = 'melatonin://oauth/callback';
const FITBIT_API_BASE = 'https://api.fitbit.com/1/user/-';
const FITBIT_AUTH_BASE = 'https://www.fitbit.com/oauth2/authorize';
const FITBIT_TOKEN_BASE = 'https://api.fitbit.com/oauth2/token';

interface FitbitCredentials {
  clientId: string;
  clientSecret: string;
  accessToken?: string | null;
  refreshToken?: string | null;
  expiresAt?: number;
}

interface FitbitData {
  hrv: BiometricDataPoint[];
  rhr: BiometricDataPoint[];
  respiratoryRate: BiometricDataPoint[];
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  user_id: string;
}

// Store tokens securely (in a real app, use secure storage)
let tokenStorage: {
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt?: number;
} = {
  accessToken: null,
  refreshToken: null
};

export async function getFitbitAccessToken(): Promise<string | null> {
  try {
    // Check if we have a valid token
    if (tokenStorage.accessToken && tokenStorage.expiresAt && Date.now() < tokenStorage.expiresAt) {
      return tokenStorage.accessToken;
    }

    // If we have a refresh token, try to refresh
    if (tokenStorage.refreshToken) {
      const newToken = await refreshAccessToken(tokenStorage.refreshToken);
      if (newToken) return newToken;
    }

    // If no valid token or refresh failed, initiate OAuth flow
    return await initiateOAuthFlow();
  } catch (error) {
    console.error('Error getting Fitbit access token:', error);
    return null;
  }
}

async function initiateOAuthFlow(): Promise<string | null> {
  try {
    // Generate random state for security
    const state = Math.random().toString(36).substring(7);
    
    // Construct authorization URL
    const authUrl = `${FITBIT_AUTH_BASE}?response_type=code&client_id=${FITBIT_CLIENT_ID}&redirect_uri=${encodeURIComponent(FITBIT_REDIRECT_URI)}&scope=heartrate%20respiratory_rate%20hrv&state=${state}`;

    // Open browser for authentication
    const result = await WebBrowser.openAuthSessionAsync(
      authUrl,
      FITBIT_REDIRECT_URI
    );

    if (result.type === 'success') {
      const url = new URL(result.url);
      const code = url.searchParams.get('code');
      const returnedState = url.searchParams.get('state');

      if (code && returnedState === state) {
        // Exchange code for tokens
        const tokenResponse = await exchangeCodeForTokens(code);
        if (tokenResponse) {
          tokenStorage = {
            accessToken: tokenResponse.access_token,
            refreshToken: tokenResponse.refresh_token,
            expiresAt: Date.now() + (tokenResponse.expires_in * 1000)
          };
          return tokenStorage.accessToken || null;
        }
      }
    }
    return null;
  } catch (error) {
    console.error('Error in OAuth flow:', error);
    return null;
  }
}

async function exchangeCodeForTokens(code: string): Promise<TokenResponse | null> {
  try {
    const response = await fetch(FITBIT_TOKEN_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${FITBIT_CLIENT_ID}:${FITBIT_CLIENT_SECRET}`).toString('base64')}`
      },
      body: new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        redirect_uri: FITBIT_REDIRECT_URI
      })
    });

    if (response.ok) {
      return await response.json();
    }
    return null;
  } catch (error) {
    console.error('Error exchanging code for tokens:', error);
    return null;
  }
}

async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  try {
    const response = await fetch(FITBIT_TOKEN_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${FITBIT_CLIENT_ID}:${FITBIT_CLIENT_SECRET}`).toString('base64')}`
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      })
    });

    if (response.ok) {
      const tokenResponse = await response.json();
      tokenStorage = {
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        expiresAt: Date.now() + (tokenResponse.expires_in * 1000)
      };
      return tokenStorage.accessToken;
    }
    return null;
  } catch (error) {
    console.error('Error refreshing access token:', error);
    return null;
  }
}

export async function fetchFitbitData(credentials: FitbitCredentials): Promise<FitbitData | null> {
  try {
    const accessToken = await getFitbitAccessToken();
    if (!accessToken) {
      console.log('No Fitbit access token available, falling back to JSON data');
      return null;
    }

    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    };

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];

    // Fetch HRV data
    const hrvResponse = await fetch(`${FITBIT_API_BASE}/hrv/date/${today}/1d.json`, { headers });
    if (!hrvResponse.ok) throw new Error('Failed to fetch HRV data');
    const hrvData = await hrvResponse.json();

    // Fetch RHR data
    const rhrResponse = await fetch(`${FITBIT_API_BASE}/activities/heart/date/${today}/1d.json`, { headers });
    if (!rhrResponse.ok) throw new Error('Failed to fetch RHR data');
    const rhrData = await rhrResponse.json();

    // Fetch respiratory rate data
    const respResponse = await fetch(`${FITBIT_API_BASE}/respiratory-rate/date/${today}/1d.json`, { headers });
    if (!respResponse.ok) throw new Error('Failed to fetch respiratory rate data');
    const respData = await respResponse.json();

    // Transform Fitbit data to match our BiometricDataPoint interface
    const transformedData: FitbitData = {
      hrv: hrvData.hrv.map((point: any) => ({
        value: point.value,
        timestamp: point.dateTime,
        quality: point.quality || 'good'
      })),
      rhr: rhrData.activitiesHeart.map((point: any) => ({
        value: point.value.heartRateZones[0].min,
        timestamp: point.dateTime,
        quality: 'good'
      })),
      respiratoryRate: respData.respiratoryRate.map((point: any) => ({
        value: point.value,
        timestamp: point.dateTime,
        quality: point.quality || 'good'
      }))
    };

    return transformedData;
  } catch (error) {
    console.error('Error fetching Fitbit data:', error);
    return null;
  }
}

export async function getBiometricData(): Promise<FitbitData> {
  // Try to get Fitbit credentials from environment
  const credentials: FitbitCredentials = {
    clientId: FITBIT_CLIENT_ID || '',
    clientSecret: FITBIT_CLIENT_SECRET || '',
    accessToken: await getFitbitAccessToken() || undefined
  };

  // Try to fetch data from Fitbit
  const fitbitData = await fetchFitbitData(credentials);
  
  if (fitbitData) {
    console.log('Successfully fetched data from Fitbit');
    return fitbitData;
  }

  // Fallback to JSON data
  console.log('Falling back to JSON data');
  const jsonData = require('../data/sample_biometrics.json');
  return {
    hrv: jsonData.historical_data.hrv,
    rhr: jsonData.historical_data.rhr,
    respiratoryRate: jsonData.historical_data.respiratory_rate
  };
}

const fetchFitbitHRV = async (accessToken: string): Promise<BiometricDataPoint[]> => {
  // TODO: Implement actual Fitbit API call
  // This should fetch HRV data for the last 24 hours
  return [];
};

const fetchFitbitRHR = async (accessToken: string): Promise<BiometricDataPoint[]> => {
  // TODO: Implement actual Fitbit API call
  // This should fetch resting heart rate data for the last 24 hours
  return [];
};

const fetchFitbitRespiratoryRate = async (accessToken: string): Promise<BiometricDataPoint[]> => {
  // TODO: Implement actual Fitbit API call
  // This should fetch respiratory rate data for the last 24 hours
  return [];
}; 