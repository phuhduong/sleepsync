const ESP8266_BASE_URL = 'http://192.168.4.1';

export const sendDoseToESP8266 = async (dose: number): Promise<void> => {
    try {
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
    } catch (error) {
        console.error('ESP8266 Communication Error:', error instanceof Error ? error.message : 'Unknown error');
        throw error;
    }
}; 