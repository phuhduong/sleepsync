import { Alert } from 'react-native';
import { BiometricDataPoint } from './dataProcessor';

// Fitbit API configuration
const FITBIT_API_KEY = process.env.EXPO_PUBLIC_FITBIT_API_KEY;
const FITBIT_API_SECRET = process.env.EXPO_PUBLIC_FITBIT_API_SECRET;
const FITBIT_REDIRECT_URI = 'your-app-scheme://oauth/callback'; // Replace with your app's redirect URI

interface FitbitCredentials {
  clientId: string;
  clientSecret: string;
  accessToken?: string;
}

interface FitbitData {
  hrv: BiometricDataPoint[];
  rhr: BiometricDataPoint[];
  respiratoryRate: BiometricDataPoint[];
}

const FITBIT_API_BASE = 'https://api.fitbit.com/1/user/-';

export async function fetchFitbitData(credentials: FitbitCredentials): Promise<FitbitData | null> {
  try {
    if (!credentials.accessToken) {
      console.log('No Fitbit access token available, falling back to JSON data');
      return null;
    }

    const headers = {
      'Authorization': `Bearer ${credentials.accessToken}`,
      'Content-Type': 'application/json'
    };

    // Fetch HRV data
    const hrvResponse = await fetch(`${FITBIT_API_BASE}/hrv/date/today/1d.json`, { headers });
    const hrvData = await hrvResponse.json();

    // Fetch RHR data
    const rhrResponse = await fetch(`${FITBIT_API_BASE}/activities/heart/date/today/1d.json`, { headers });
    const rhrData = await rhrResponse.json();

    // Fetch respiratory rate data
    const respResponse = await fetch(`${FITBIT_API_BASE}/respiratory-rate/date/today/1d.json`, { headers });
    const respData = await respResponse.json();

    // Transform Fitbit data to match our BiometricDataPoint interface
    const transformedData: FitbitData = {
      hrv: hrvData.hrv.map((point: any) => ({
        value: point.value,
        timestamp: point.dateTime,
        quality: point.quality
      })),
      rhr: rhrData.activitiesHeart.map((point: any) => ({
        value: point.value.heartRateZones[0].min,
        timestamp: point.dateTime,
        quality: 'good'
      })),
      respiratoryRate: respData.respiratoryRate.map((point: any) => ({
        value: point.value,
        timestamp: point.dateTime,
        quality: point.quality
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
    clientId: process.env.FITBIT_CLIENT_ID || '',
    clientSecret: process.env.FITBIT_CLIENT_SECRET || '',
    accessToken: process.env.FITBIT_ACCESS_TOKEN
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

const getFitbitAccessToken = async (): Promise<string | null> => {
  // TODO: Implement OAuth flow
  // This should:
  // 1. Check for existing valid token
  // 2. If no token or expired, initiate OAuth flow
  // 3. Handle token refresh
  return null;
};

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