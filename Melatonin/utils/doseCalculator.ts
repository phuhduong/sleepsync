import { getGlobalFeedback } from './geminiApi';

interface BiometricData {
    hrv: number[];
    rhr: number[];
    respRate: number[];
}

const ALPHA = 0.2;
const BETA = 0.5;
const RHO = 0.3;
const FEEDBACK_WEIGHT = 0.3;

export const calculateMean = (data: number[]): number => {
    if (data.length === 0) return 0;
    return data.reduce((sum, value) => sum + value, 0) / data.length;
};

export const calculateDifference = (mean: number, current: number): number => {
    return mean - current;
};

export const calculateHRVDifference = (hrvData: number[], currentHRV: number): number => {
    const meanHRV = calculateMean(hrvData);
    return calculateDifference(meanHRV, currentHRV);
};

export const calculateRHRDifference = (rhrData: number[], currentRHR: number): number => {
    const meanRHR = calculateMean(rhrData);
    return calculateDifference(meanRHR, currentRHR);
};

export const calculateRespRateDifference = (respRateData: number[], currentRespRate: number): number => {
    const meanRespRate = calculateMean(respRateData);
    return calculateDifference(meanRespRate, currentRespRate);
};

export const calculateDose = (
    base: number,
    R: number,
    T: number,
    biometricData: BiometricData,
    currentBiometrics: {
        hrv: number;
        rhr: number;
        respRate: number;
    }
): number => {
    const hrvDiff = calculateHRVDifference(biometricData.hrv, currentBiometrics.hrv);
    const rhrDiff = calculateRHRDifference(biometricData.rhr, currentBiometrics.rhr);
    const respRateDiff = calculateRespRateDifference(biometricData.respRate, currentBiometrics.respRate);

    const feedback = getGlobalFeedback();

    const dose = base + (R / T) * (
        (ALPHA * hrvDiff) +
        (BETA * rhrDiff) +
        (RHO * respRateDiff)
    ) + (FEEDBACK_WEIGHT * feedback);

    return dose;
};
