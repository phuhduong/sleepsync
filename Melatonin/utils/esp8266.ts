const ESP8266_BASE_URL = 'http://192.168.4.1'; // ESP8266 Access Point IP address

/**
 * Sends the calculated melatonin dose to the ESP8266
 * @param dose - The calculated melatonin dose to send
 * @returns Promise that resolves when the dose is successfully sent
 */
export const sendDoseToESP8266 = async (dose: number): Promise<void> => {
    try {
        console.log('--- Sending Dose to ESP8266 ---');
        console.log('URL:', ESP8266_BASE_URL);
        console.log('Dose value:', dose);
        
        const url = new URL(`${ESP8266_BASE_URL}/dose`);
        url.searchParams.append('value', dose.toString());
        
        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'Accept': 'text/plain',
                'Content-Type': 'text/plain'
            },
            mode: 'cors'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.text();
        console.log('ESP8266 Response Status:', response.status);
        console.log('ESP8266 Response Data:', data);
        console.log('--- End ESP8266 Communication ---\n');
    } catch (error) {
        console.error('--- ESP8266 Communication Error ---');
        console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
        console.error('--- End Error Details ---\n');
        throw error;
    }
}; 