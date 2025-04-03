# SleepSync

A personalized sleep optimization solution that combines real-time biometric data with adaptive melatonin dosing.

## Features

- **Real-time Biometric Monitoring**: Integrates with Fitbit and other wearable devices to track:

  - Heart Rate Variability (HRV)
  - Resting Heart Rate (RHR)
  - Respiratory Rate
  - Temperature

- **Smart Melatonin Dosing**:

  - Personalized dosage based on biometric data
  - Adaptive algorithm that learns from sleep patterns
  - Transdermal patch delivery system
  - Real-time adjustments based on sleep stages

- **AI-Powered Sleep Analysis**:

  - Natural Language Processing using Google Gemini
  - Sleep quality feedback analysis
  - Personalized recommendations

- **Interactive Dashboard**:
  - Real-time biometric data visualization
  - Sleep quality tracking
  - Historical data analysis
  - Dark/Light mode support

## Tech Stack

### Frontend

- React Native with Expo
- TypeScript
- Linear Gradient for UI
- Chart.js for data visualization
- Material Community Icons

### Backend

- Node.js
- Express
- Fitbit API integration
- Google Gemini API for NLP

### Hardware

- ESP8266 WiFi module
- Arduino microcontroller
- DC pump

## Getting Started

### Prerequisites

- Node.js
- Expo CLI
- Arduino IDE
- ESP8266 development board
- Fitbit device (optional)

### Installation

1. Clone the repository:

```bash
git clone https://github.com/phuhduong/SleepSync.git
cd SleepSync
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cp .env.example .env
# Edit .env with your API keys and configuration
```

4. Start the development server:

```bash
npx expo start
```

### Hardware Setup

1. Connect the ESP8266 to your Arduino
2. Upload the Arduino sketch
3. Configure the WiFi settings in the Arduino code
4. Connect the DC pump

## How It Works

1. **Data Collection**:

   - App collects biometric data from Fitbit
   - Processes data through optimization algorithm
   - Calculates personalized melatonin dosage

2. **Dose Delivery**:

   - Sends dosage to ESP8266
   - Arduino controls pump for transdermal delivery
   - Real-time monitoring of delivery status

3. **Feedback Loop**:
   - User provides sleep quality feedback
   - Gemini analyzes feedback through NLP
   - Algorithm adjusts for future doses

## Team

- Charles Muehlberger - [@charlespers](https://github.com/charlespers)
- Phu Duong - [@phuhduong](https://github.com/phuhduong)
- Jaime Nunez - [@Jaimenunez10](https://github.com/Jaimenunez10)
- Tom Wang - [@tom05919](https://github.com/tom05919)

## Contact

- Email: cm6268@princeton.edu | phu.duong@princeton.edu

## Acknowledgments

- Fitbit API for biometric data
- Google Gemini for NLP capabilities
- Arduino community for hardware support
- Sleep research for scientific insights
