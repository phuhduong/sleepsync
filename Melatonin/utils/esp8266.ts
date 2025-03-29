import axios from 'axios';

const ESP8266_BASE_URL = 'http://192.168.1.1'; // Replace with your ESP8266's IP address

/**
 * Sends the calculated melatonin dose to the ESP8266
 * @param dose - The calculated melatonin dose to send
 * @returns Promise that resolves when the dose is successfully sent
 */
export const sendDoseToESP8266 = async (dose: number): Promise<void> => {
    try {
        await axios.get(`${ESP8266_BASE_URL}/dose`, {
            params: {
                value: dose
            }
        });
        console.log('Successfully sent dose to ESP8266:', dose);
    } catch (error) {
        console.error('Error sending dose to ESP8266:', error);
        throw error;
    }
}; 