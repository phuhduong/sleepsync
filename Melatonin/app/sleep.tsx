import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Link } from 'expo-router';
import { useState, useEffect } from 'react';
import { processBiometricData } from '../utils/dataProcessor';
import { sendDoseToESP8266 } from '../utils/esp8266';
import { updateLatestDosage, getLatestDosage } from '../utils/globalState';
import { analyzeSleepDescription } from '../utils/geminiApi';
import { getBiometricData } from '../utils/fitbitApi';
import DosePlot from '../components/DosePlot';

export default function Sleep() {
  const [sleepMinutes, setSleepMinutes] = useState('');
  const [sleepDescription, setSleepDescription] = useState('');
  const [processedData, setProcessedData] = useState<any[]>([]);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [totalTime, setTotalTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);

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

    setIsLoading(true);
    try {
      // Set the timer and total time
      const totalSeconds = minutes * 60;
      setTimeRemaining(totalSeconds);
      setTotalTime(totalSeconds);
      setElapsedTime(0);
      setIsTimerRunning(true);

      // Calculate target time (current time + minutes)
      const targetTime = new Date();
      targetTime.setMinutes(targetTime.getMinutes() + minutes);

      // Fetch biometric data (will automatically fall back to JSON if Fitbit fails)
      const biometricData = await getBiometricData();

      // Process the data with R and T values
      const data = processBiometricData(
        biometricData.hrv,
        biometricData.rhr,
        biometricData.respiratoryRate,
        1.0, // base dose - you might want to make this configurable
        targetTime.toISOString(),
        totalSeconds,
        totalSeconds
      );

      setProcessedData(data);

      // Get the latest calculated dose and update global state
      const latestDose = data[data.length - 1].calculatedDose;
      updateLatestDosage(latestDose);

      try {
        // Send the dose to ESP8266
        await sendDoseToESP8266(latestDose);
        console.log('Dose sent successfully to ESP8266');
      } catch (error) {
        console.error('Failed to send dose to ESP8266:', error);
      }
    } catch (error) {
      console.error('Error processing biometric data:', error);
      Alert.alert(
        'Error',
        'Failed to process biometric data. Please try again.'
      );
    } finally {
      setIsLoading(false);
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

  const handleAnalyze = async () => {
    if (!sleepDescription.trim()) {
      Alert.alert('Error', 'Please enter a sleep description first.');
      return;
    }

    try {
      const feedback = await analyzeSleepDescription(sleepDescription);
      Alert.alert(
        'Analysis Complete',
        `Sleep quality score: ${feedback.toFixed(2)}\nThis will be factored into your next dose calculation.`
      );
    } catch (error) {
      console.error('Error analyzing sleep description:', error);
      Alert.alert(
        'Analysis Error',
        'Failed to analyze sleep description. Please try again.'
      );
    }
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
        <Text style={styles.subtitle}>Calculate optimal melatonin dose</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Minutes until sleep:</Text>
          <TextInput
            style={styles.input}
            value={sleepMinutes}
            onChangeText={setSleepMinutes}
            keyboardType="numeric"
            placeholder="Enter minutes"
            editable={!isTimerRunning && !isLoading}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Sleep description (optional):</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={sleepDescription}
            onChangeText={setSleepDescription}
            placeholder="How are you feeling?"
            multiline
            numberOfLines={3}
            editable={!isTimerRunning && !isLoading}
          />
          <TouchableOpacity 
            style={[styles.analyzeButton, (isTimerRunning || isLoading) && styles.analyzeButtonDisabled]} 
            onPress={handleAnalyze}
            disabled={isTimerRunning || isLoading}
          >
            <Text style={styles.analyzeButtonText}>Analyze</Text>
          </TouchableOpacity>
        </View>

        {isTimerRunning && (
          <View style={styles.timerContainer}>
            <Text style={styles.timerLabel}>Time Remaining:</Text>
            <Text style={styles.timer}>{formatTime(timeRemaining || 0)}</Text>
          </View>
        )}

        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.submitButton, (isTimerRunning || isLoading) && styles.submitButtonDisabled]} 
            onPress={handleSubmit}
            disabled={isTimerRunning || isLoading}
          >
            <Text style={styles.submitButtonText}>
              {isLoading ? 'Loading...' : isTimerRunning ? 'Timer Running...' : 'Calculate Optimal Dose'}
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
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    color: '#333333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CCCCCC',
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  timerContainer: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  timerLabel: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 8,
  },
  timer: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  buttonContainer: {
    marginBottom: 20,
  },
  submitButton: {
    backgroundColor: '#4A90E2',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#FF4444',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
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
  analyzeButton: {
    backgroundColor: '#4A90E2',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  analyzeButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  analyzeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
}); 