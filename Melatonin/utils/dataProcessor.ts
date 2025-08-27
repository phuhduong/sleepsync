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
  const hrvMean = calculateMean(hrvData.map(d => d.value));
  const rhrMean = calculateMean(rhrData.map(d => d.value));
  const respRateMean = calculateMean(respRateData.map(d => d.value));

  const recentHRV = hrvData.slice(-24);
  const recentRHR = rhrData.slice(-24);
  const recentRespRate = respRateData.slice(-24);

  const processedData = recentHRV.map((hrvPoint, index) => {
    const currentHRV = hrvPoint.value;
    const currentRHR = recentRHR[index].value;
    const currentRespRate = recentRespRate[index].value;

    const hrvDiff = hrvMean - currentHRV;
    const rhrDiff = rhrMean - currentRHR;
    const respRateDiff = respRateMean - currentRespRate;

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

  return processedData;
}

function calculateMean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

import { calculateDose } from './doseCalculator'; 