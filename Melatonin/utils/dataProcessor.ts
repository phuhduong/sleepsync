export interface BiometricDataPoint {
  value: number;
  timestamp: string;
  quality: string;
}

export interface ProcessedData {
  hour: number;
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
  targetTime: string,
  totalTime: number,
  remainingTime: number
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
    const currentHRV = hrvPoint.value;
    const currentRHR = recentRHR[index].value;
    const currentRespRate = recentRespRate[index].value;

    console.log('Current values:', {
      currentHRV,
      currentRHR,
      currentRespRate,
      remainingTime,
      totalTime,
      baseDose
    });

    // Calculate differences from mean
    const hrvDiff = hrvMean - currentHRV;
    const rhrDiff = rhrMean - currentRHR;
    const respRateDiff = respRateMean - currentRespRate;

    console.log('Differences:', {
      hrvDiff,
      rhrDiff,
      respRateDiff,
      hrvMean,
      rhrMean,
      respRateMean
    });

    // Calculate dose using the formula with custom R and T values
    const dose = calculateDose(
      baseDose,
      remainingTime,
      totalTime,
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

    console.log('Calculated dose:', dose);

    // Calculate hour
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

import { calculateDose } from './doseCalculator'; 