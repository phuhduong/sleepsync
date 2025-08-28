export let latestDosage: number = 0;

export const updateLatestDosage = (dose: number) => {
    latestDosage = dose;
    console.log('Updated latest dosage:', latestDosage);
};

export const getLatestDosage = (): number => {
    return latestDosage;
}; 