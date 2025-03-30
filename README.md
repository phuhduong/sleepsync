# SleepSync

A personalized sleep optimization solution that combines real-time biometric data with adaptive melatonin dosing.

[![Expo](https://img.shields.io/badge/Expo-000?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev/)
[![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactnative.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Arduino](https://img.shields.io/badge/Arduino-00979D?style=for-the-badge&logo=Arduino&logoColor=white)](https://www.arduino.cc/)

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
- ESP8266 for hardware communication

### Hardware

- ESP8266 WiFi module
- Arduino microcontroller
- Mechanical pump system
- Transdermal patch (proof of concept)

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- Expo CLI
- Arduino IDE
- ESP8266 development board
- Fitbit device (optional)

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/SleepSync.git
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
2. Upload the Arduino sketch from the `hardware` directory
3. Configure the WiFi settings in the Arduino code
4. Connect the mechanical pump to the specified pins

## App Structure

```
Melatonin/
├── app/
│   ├── (tabs)/
│   │   ├── index.tsx      # Home screen
│   │   ├── sleep.tsx      # Sleep timer and analysis
│   │   ├── data.tsx       # Biometric data visualization
│   │   └── explore.tsx    # Sleep science guide
│   └── _layout.tsx        # Root layout
├── components/
│   ├── DosePlot.tsx       # Melatonin dose visualization
│   └── ThemedText.tsx     # Styled text components
├── utils/
│   ├── dataProcessor.ts   # Biometric data processing
│   ├── esp8266.ts         # Hardware communication
│   ├── fitbitApi.ts       # Fitbit API integration
│   └── geminiApi.ts       # NLP processing
└── assets/
    └── images/            # App images and icons
```

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

## Contributing

We welcome contributions! Please read our [Contributing Guide](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Team

- Charles Muehlberger - [@charlespers](https://github.com/charlespers)
- Phu Duong - [@phuduong](https://github.com/phuduong)
- Jaime Nunez - [@Jaimenunez10](https://github.com/Jaimenunez10)
- Tom Wang - [@tom05919](https://github.com/tom05919)

## Contact

- Email: cm6268@princeton.edu | phu.duong@princeton.edu
- Project Link: [https://github.com/yourusername/SleepSync](https://github.com/phuduong/SleepSync)

## Acknowledgments

- Fitbit API for biometric data
- Google Gemini for NLP capabilities
- Arduino community for hardware support
- Sleep research community for scientific insights

---

Made with ❤️ at Princeton University
