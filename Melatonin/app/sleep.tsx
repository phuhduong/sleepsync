import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity } from 'react-native';
import { Link } from 'expo-router';
import { useState, useEffect } from 'react';
import { processBiometricData } from '../utils/dataProcessor';
import { sendDoseToESP8266 } from '../utils/esp8266';
import DosePlot from '../components/DosePlot';
import biometricData from '../data/sample_biometrics.json';

export default function Sleep() {
  const [sleepMinutes, setSleepMinutes] = useState('');
  const [sleepDescription, setSleepDescription] = useState('');
  const [processedData, setProcessedData] = useState<any[]>([]);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [totalTime, setTotalTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && timeRemaining !== null && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(prev => prev !== null ? prev - 1 : null);
        setElapsedTime(prev => prev + 1);
      }, 1000);
    } else if (timeRemaining === 0) {
      setIsTimerRunning(false);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timeRemaining]);

  const handleSubmit = async () => {
    if (!sleepMinutes) return;

    const minutes = parseInt(sleepMinutes);
    if (isNaN(minutes) || minutes <= 0) return;

    // Set the timer and total time
    const totalSeconds = minutes * 60;
    setTimeRemaining(totalSeconds);
    setTotalTime(totalSeconds);
    setElapsedTime(0);
    setIsTimerRunning(true);

    // Calculate target time (current time + minutes)
    const targetTime = new Date();
    targetTime.setMinutes(targetTime.getMinutes() + minutes);

    // Process the data with R and T values
    const data = processBiometricData(
      biometricData.historical_data.hrv,
      biometricData.historical_data.rhr,
      biometricData.historical_data.respiratory_rate,
      biometricData.recommended_base_dose,
      targetTime.toISOString(),
      totalSeconds, // T: total time in seconds
      totalSeconds  // R: remaining time in seconds (initially equal to T)
    );

    setProcessedData(data);

    // Get the latest calculated dose
    const latestDose = data[data.length - 1].calculatedDose;

    try {
      // Send the dose to ESP8266
      await sendDoseToESP8266(latestDose);
      console.log('Dose sent successfully to ESP8266');
    } catch (error) {
      console.error('Failed to send dose to ESP8266:', error);
      // You might want to show an error message to the user here
    }
  };

  const handleCancel = () => {
    // Reset all state
    setSleepMinutes('');
    setSleepDescription('');
    setProcessedData([]);
    setTimeRemaining(null);
    setTotalTime(null);
    setElapsedTime(0);
    setIsTimerRunning(false);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate current R value based on elapsed time
  const getCurrentR = () => {
    if (totalTime === null) return 0;
    return Math.max(0, totalTime - elapsedTime);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Plan Your Sleep</Text>
        <Text style={styles.subtitle}>Set your sleep duration</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.inputSection}>
          <Text style={styles.label}>How many minutes until you want to sleep?</Text>
          <TextInput
            style={styles.timeInput}
            placeholder="Enter minutes (e.g., 30)"
            value={sleepMinutes}
            onChangeText={setSleepMinutes}
            keyboardType="numeric"
          />
        </View>

        {timeRemaining !== null && (
          <View style={styles.timerContainer}>
            <Text style={styles.timerLabel}>Time Remaining:</Text>
            <Text style={styles.timerValue}>{formatTime(timeRemaining)}</Text>
            <Text style={styles.timerSubtext}>
              R: {formatTime(getCurrentR())} | T: {formatTime(totalTime || 0)}
            </Text>
          </View>
        )}

        <View style={styles.inputSection}>
          <Text style={styles.label}>How would you describe your sleep?</Text>
          <TextInput
            style={styles.descriptionInput}
            placeholder="Describe your sleep patterns, quality, or any concerns..."
            value={sleepDescription}
            onChangeText={setSleepDescription}
            multiline
            numberOfLines={4}
          />
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.submitButton, isTimerRunning && styles.submitButtonDisabled]} 
            onPress={handleSubmit}
            disabled={isTimerRunning}
          >
            <Text style={styles.submitButtonText}>
              {isTimerRunning ? 'Timer Running...' : 'Calculate Optimal Dose'}
            </Text>
          </TouchableOpacity>

          {isTimerRunning && (
            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={handleCancel}
            >
              <Text style={styles.cancelButtonText}>Cancel Sleep</Text>
            </TouchableOpacity>
          )}
        </View>

        {processedData.length > 0 && (
          <DosePlot data={processedData} />
        )}

        <View style={styles.navigation}>
          <Link href="/" style={styles.link}>
            Back to Home
          </Link>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#4A90E2',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  content: {
    padding: 20,
  },
  inputSection: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 10,
  },
  timeInput: {
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  descriptionInput: {
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    height: 100,
    textAlignVertical: 'top',
  },
  timerContainer: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  timerLabel: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 8,
  },
  timerValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  timerSubtext: {
    fontSize: 14,
    color: '#666666',
    marginTop: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#4A90E2',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 10,
  },
  submitButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#FF4444',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginLeft: 10,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  navigation: {
    marginTop: 20,
    alignItems: 'center',
  },
  link: {
    backgroundColor: '#4A90E2',
    padding: 15,
    borderRadius: 8,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    minWidth: 150,
    textAlign: 'center',
  },
}); 