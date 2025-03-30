// Global state variables
export let latestDosage: number = 0;

// Function to update the latest dosage
export const updateLatestDosage = (dose: number) => {
    latestDosage = dose;
    console.log('Updated latest dosage:', latestDosage);
};

// Function to get the latest dosage
export const getLatestDosage = (): number => {
    return latestDosage;
}; 