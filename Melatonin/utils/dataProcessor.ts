interface BiometricDataPoint {
  value: number;
  timestamp: string;
  quality: string;
}

interface ProcessedData {
  hour: number;  // 0-23
  timestamp: string;
  hrvDiff: number;
  rhrDiff: number;
  respRateDiff: number;
  currentHRV: number;
  currentRHR: number;
  currentRespRate: number;
  calculatedDose: number;
}

export function processBiometricData(
  hrvData: BiometricDataPoint[],
  rhrData: BiometricDataPoint[],
  respRateData: BiometricDataPoint[],
  baseDose: number,
  targetTime: string
): ProcessedData[] {
  console.log('Input data lengths:', {
    hrv: hrvData.length,
    rhr: rhrData.length,
    respRate: respRateData.length
  });

  // Calculate means from all historical data
  const hrvMean = calculateMean(hrvData.map(d => d.value));
  const rhrMean = calculateMean(rhrData.map(d => d.value));
  const respRateMean = calculateMean(respRateData.map(d => d.value));

  // Get the 24 most recent data points
  const recentHRV = hrvData.slice(-24);
  const recentRHR = rhrData.slice(-24);
  const recentRespRate = respRateData.slice(-24);

  console.log('Recent data lengths:', {
    hrv: recentHRV.length,
    rhr: recentRHR.length,
    respRate: recentRespRate.length
  });

  // Calculate differences and doses for each point
  const processedData = recentHRV.map((hrvPoint, index) => {
    // Get current values
    const currentHRV = hrvPoint.value;
    const currentRHR = recentRHR[index].value;
    const currentRespRate = recentRespRate[index].value;

    // Calculate differences from mean
    const hrvDiff = hrvMean - currentHRV;
    const rhrDiff = rhrMean - currentRHR;
    const respRateDiff = respRateMean - currentRespRate;

    // Calculate R and T based on the algorithm requirements
    // T is fixed at 24 hours
    const T = 24;
    // R starts at 24 and decreases by 1 for each hour
    const R = 24 - index;

    // Calculate dose using the formula
    const dose = calculateDose(
      baseDose,
      R,
      T,
      {
        hrv: hrvData.map(d => d.value),
        rhr: rhrData.map(d => d.value),
        respRate: respRateData.map(d => d.value)
      },
      {
        hrv: currentHRV,
        rhr: currentRHR,
        respRate: currentRespRate
      }
    );

    // Calculate hour (23 to 0)
    const hour = 23 - index;

    return {
      hour,
      timestamp: hrvPoint.timestamp,
      hrvDiff,
      rhrDiff,
      respRateDiff,
      currentHRV,
      currentRHR,
      currentRespRate,
      calculatedDose: dose
    };
  });

  console.log('Processed data:', processedData);
  return processedData;
}

function calculateMean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

// Import the calculateDose function from doseCalculator.ts
import { calculateDose } from './doseCalculator'; 