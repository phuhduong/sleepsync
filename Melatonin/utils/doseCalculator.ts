interface BiometricData {
    hrv: number[];
    rhr: number[];
    respRate: number[];
}

// Constants for the algorithm
const ALPHA = 0.2;
const BETA = 0.5;
const RHO = 0.3;

/**
 * Calculate the mean of an array of numbers
 */
export const calculateMean = (data: number[]): number => {
    if (data.length === 0) return 0;
    return data.reduce((sum, value) => sum + value, 0) / data.length;
};

/**
 * Calculate the difference between mean and current value
 */
export const calculateDifference = (mean: number, current: number): number => {
    return mean - current;
};

/**
 * Calculate HRV difference (mean HRV - current HRV)
 */
export const calculateHRVDifference = (hrvData: number[], currentHRV: number): number => {
    const meanHRV = calculateMean(hrvData);
    return calculateDifference(meanHRV, currentHRV);
};

/**
 * Calculate RHR difference (mean RHR - current RHR)
 */
export const calculateRHRDifference = (rhrData: number[], currentRHR: number): number => {
    const meanRHR = calculateMean(rhrData);
    return calculateDifference(meanRHR, currentRHR);
};

/**
 * Calculate Respiratory Rate difference (mean RespRate - current RespRate)
 */
export const calculateRespRateDifference = (respRateData: number[], currentRespRate: number): number => {
    const meanRespRate = calculateMean(respRateData);
    return calculateDifference(meanRespRate, currentRespRate);
};

/**
 * Main algorithm to calculate the melatonin dose
 * @param base - Initial amount of melatonin (recommended dose based on historical biometrics)
 * @param R - Remaining time (user input time - elapsed time)
 * @param T - User input time
 * @param biometricData - Object containing arrays of historical biometric data
 * @param currentBiometrics - Object containing current biometric values
 * @returns Calculated melatonin dose
 */
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
    // Calculate differences
    const hrvDiff = calculateHRVDifference(biometricData.hrv, currentBiometrics.hrv);
    const rhrDiff = calculateRHRDifference(biometricData.rhr, currentBiometrics.rhr);
    const respRateDiff = calculateRespRateDifference(biometricData.respRate, currentBiometrics.respRate);

    console.log('Dose calculation inputs:', {
        base,
        R,
        T,
        hrvDiff,
        rhrDiff,
        respRateDiff,
        ALPHA,
        BETA,
        RHO
    });

    // Calculate the dose using the formula
    const dose = base + (R / T) * (
        (ALPHA * hrvDiff) +
        (BETA * rhrDiff) +
        (RHO * respRateDiff)
    );

    console.log('Dose calculation result:', dose);
    return dose;
};
