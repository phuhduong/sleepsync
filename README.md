# SleepSync

A personalized sleep optimization solution that utilizes real-time biometric data for adaptive melatonin dosing.

- Pulls HRV, resting heart rate, and respiratory rate from Fitbit API
- Calculates melatonin dosage based on live biometric data  
- Delivers dose via Arduino and ESP8266-controlled micro-pump  
- Analyzes written user feedback with Google Gemini NLP to adjust algorithm for future doses

## Contributors

- Charles Muehlberger - [@charlespers](https://github.com/charlespers)
- Phu Duong - [@phuhduong](https://github.com/phuhduong)
- Jaime Nunez - [@Jaimenunez10](https://github.com/Jaimenunez10)
- Tom Wang - [@tom05919](https://github.com/tom05919)

HackPrinceton Spring 2025

## Tech Stack

- **Frontend**: React Native (Expo), TypeScript, Chart.js  
- **Backend**: Node.js, Express, Fitbit API, Google Gemini API  
- **Hardware**: ESP8266, Arduino, DC pump
