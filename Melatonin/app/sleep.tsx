import { View, Text, StyleSheet, TextInput, ScrollView, Pressable, Alert, Platform } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { processBiometricData } from '../utils/dataProcessor';
import { sendDoseToESP8266 } from '../utils/esp8266';
import { updateLatestDosage, getLatestDosage } from '../utils/globalState';
import { getFitbitData } from '../utils/fitbitApi';
import { analyzeSleepDescription, getGlobalFeedback } from '../utils/geminiApi';
import DosePlot from '../components/DosePlot';
import biometricData from '../data/sample_biometrics.json';

// ESP8266 configuration
const ESP8266_IP = process.env.EXPO_PUBLIC_ESP8266_IP || "192.168.4.1";
const ESP8266_PORT = process.env.EXPO_PUBLIC_ESP8266_PORT || "80";

const checkESP8266Connection = async () => {
  try {
    console.log("Checking ESP8266 connection at:", ESP8266_IP);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(`http://${ESP8266_IP}:${ESP8266_PORT}`, {
      signal: controller.signal,
      mode: 'no-cors', // Changed to no-cors to bypass CORS restrictions
      headers: {
        'Accept': 'text/plain',
      }
    });
    clearTimeout(timeoutId);
    console.log("ESP8266 connection check response:", response.status);
    return true; // In no-cors mode, we can't check response.ok
  } catch (error) {
    console.log("ESP8266 not reachable:", error);
    return false;
  }
};

const sendNumberToESP8266 = async (calculatedNumber: number) => {
  try {
    console.log("Attempting to send to ESP8266 at:", ESP8266_IP);
    console.log("Value being sent:", calculatedNumber);
    
    // First check if ESP8266 is reachable
    const isReachable = await checkESP8266Connection();
    if (!isReachable) {
      Alert.alert(
        "Connection Error",
        "ESP8266 is not reachable. Please check:\n1. ESP8266 is powered on\n2. You're connected to the correct WiFi network\n3. ESP8266 IP address is correct\n4. Try accessing http://" + ESP8266_IP + " in your browser",
        [{ text: "OK" }]
      );
      return false;
    }
    
    const url = `http://${ESP8266_IP}:${ESP8266_PORT}/?value=${calculatedNumber}`;
    console.log("Full URL:", url);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(url, {
      signal: controller.signal,
      mode: 'no-cors', // Changed to no-cors to bypass CORS restrictions
      headers: {
        'Accept': 'text/plain',
      }
    });
    clearTimeout(timeoutId);
    
    console.log("Response status:", response.status);
    console.log("Response type:", response.type);
    
    // In no-cors mode, we can't read the response, but we can check if the request was sent
    if (response.type === 'opaque') {
      console.log("Request was sent successfully (opaque response)");
      return true;
    }
    
    return false;
  } catch (error) {
    console.error("Detailed error sending data:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      Alert.alert(
        "Connection Error",
        "Could not connect to ESP8266. Please check:\n1. ESP8266 is powered on\n2. You're connected to the correct WiFi network\n3. ESP8266 IP address is correct\n4. Try accessing http://" + ESP8266_IP + " in your browser",
        [{ text: "OK" }]
      );
    }
    return false;
  }
};

const extractValues = (data: { timestamp: string; value: number }[]): number[] => {
  return data.map(point => point.value);
};

export default function Sleep() {
  const [sleepMinutes, setSleepMinutes] = useState('');
  const [sleepDescription, setSleepDescription] = useState('');
  const [processedData, setProcessedData] = useState<any[]>([]);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [totalTime, setTotalTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [feedbackScore, setFeedbackScore] = useState<number>(0);
  const router = useRouter();

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

  const handleAnalyzeDescription = async () => {
    if (!sleepDescription.trim()) {
      Alert.alert("Error", "Please enter a sleep description to analyze");
      return;
    }

    setIsLoading(true);
    try {
      console.log("Analyzing sleep description...");
      const score = await analyzeSleepDescription(sleepDescription);
      setFeedbackScore(score);
      console.log("Sleep feedback score:", score);
      Alert.alert(
        "Analysis Complete",
        `Sleep quality adjustment: ${(score * 100).toFixed(1)}%`
      );
    } catch (error) {
      console.error("Error analyzing sleep description:", error);
      Alert.alert("Error", "Failed to analyze sleep description. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    console.log("Submit button pressed");
    if (!sleepMinutes) {
      Alert.alert("Error", "Please enter the number of minutes");
      return;
    }

    const minutes = parseInt(sleepMinutes);
    if (isNaN(minutes) || minutes <= 0) {
      Alert.alert("Error", "Please enter a valid number of minutes");
      return;
    }

    console.log("Processing with minutes:", minutes);
    setSuccessMessage(null);
    setIsLoading(true);

    // Set the timer and total time
    const totalSeconds = minutes * 60;
    setTimeRemaining(totalSeconds);
    setTotalTime(totalSeconds);
    setElapsedTime(0);
    setIsTimerRunning(true);

    // Calculate target time (current time + minutes)
    const targetTime = new Date();
    targetTime.setMinutes(targetTime.getMinutes() + minutes);

    try {
      // Try to get data from Fitbit API first
      const fitbitData = await getFitbitData();
      let data;
      
      if (fitbitData) {
        console.log("Using Fitbit data");
        data = processBiometricData(
          fitbitData.hrv,
          fitbitData.rhr,
          fitbitData.respiratory_rate,
          biometricData.recommended_base_dose,
          targetTime.toISOString(),
          totalSeconds,
          totalSeconds
        );
      } else {
        console.log("Using fallback JSON data");
        data = processBiometricData(
          biometricData.historical_data.hrv,
          biometricData.historical_data.rhr,
          biometricData.historical_data.respiratory_rate,
          biometricData.recommended_base_dose,
          targetTime.toISOString(),
          totalSeconds,
          totalSeconds
        );
      }

      // Apply feedback to the calculated doses
      data = data.map(item => ({
        ...item,
        calculatedDose: item.calculatedDose * (1 + getGlobalFeedback())
      }));

      console.log("Processed data length:", data.length);
      setProcessedData(data);

    // Get the latest calculated dose and update global state
    const latestDose = data[data.length - 1].calculatedDose;
    updateLatestDosage(latestDose);

    try {
      // Send the dose to ESP8266
      await sendDoseToESP8266(latestDose);
      console.log('Dose sent successfully to ESP8266');
      // Send the most recent hour's dose to ESP8266 (hour 23)
      if (data.length > 0) {
        const mostRecentDose = data[0].calculatedDose;
        console.log("Most recent dose:", mostRecentDose);
        const success = await sendNumberToESP8266(mostRecentDose);
        console.log("Send success:", success);
        if (success) {
          setSuccessMessage(`Sent ${mostRecentDose.toFixed(2)} mg/hour to ESP8266 (Feedback: ${(getGlobalFeedback() * 100).toFixed(1)}%)`);
        } else {
          setSuccessMessage("Failed to send to ESP8266. Please check your connection.");
        }
      } else {
        console.log("No data to send");
        setSuccessMessage("No data available to send");
      }
    } catch (error) {
      console.error('Failed to send dose to ESP8266:', error);
      console.error("Error in handleSubmit:", error);
      setSuccessMessage("Error processing data. Please try again.");
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
    setSuccessMessage(null);
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
            editable={!isTimerRunning}
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
            editable={!isTimerRunning}
          />
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
          <View style={styles.descriptionContainer}>
            <TextInput
              style={styles.descriptionInput}
              placeholder="Describe your sleep patterns, quality, or any concerns..."
              value={sleepDescription}
              onChangeText={setSleepDescription}
              multiline
              numberOfLines={4}
            />
            <Pressable 
              style={({ pressed }) => [
                styles.analyzeButton,
                pressed && styles.buttonPressed
              ]}
              onPress={handleAnalyzeDescription}
              disabled={isLoading}
            >
              <Text style={styles.analyzeButtonText}>
                {isLoading ? 'Analyzing...' : 'Analyze'}
              </Text>
            </Pressable>
          </View>
          {feedbackScore !== 0 && (
            <View style={styles.feedbackContainer}>
              <Text style={[
                styles.feedbackText,
                feedbackScore > 0 ? styles.positiveFeedback : styles.negativeFeedback
              ]}>
                Sleep Analysis: {(feedbackScore * 100).toFixed(1)}% adjustment
              </Text>
            </View>
          )}
        </View>

        {isTimerRunning && (
          <View style={styles.timerContainer}>
            <Text style={styles.timerLabel}>Time Remaining:</Text>
            <Text style={styles.timer}>{formatTime(timeRemaining || 0)}</Text>
          </View>
        )}

        <View style={styles.buttonContainer}>
          <Pressable 
            style={({ pressed }) => [
              styles.submitButton,
              (isTimerRunning || isLoading) && styles.submitButtonDisabled,
              pressed && styles.buttonPressed
            ]}
            onPress={handleSubmit}
            disabled={isTimerRunning || isLoading}
          >
            <Text style={styles.submitButtonText}>
              {isLoading ? 'Loading...' : isTimerRunning ? 'Timer Running...' : 'Calculate Optimal Dose'}
            </Text>
          </Pressable>

          {isTimerRunning && (
            <Pressable 
              style={({ pressed }) => [
                styles.cancelButton,
                pressed && styles.buttonPressed
              ]}
              onPress={handleCancel}
            >
              <Text style={styles.cancelButtonText}>Cancel Sleep</Text>
            </Pressable>
          )}
        </View>

        {successMessage && (
          <View style={styles.successMessage}>
            <Text style={styles.successText}>{successMessage}</Text>
          </View>
        )}

        {processedData.length > 0 && (
          <DosePlot data={processedData} />
        )}

        <View style={styles.navigation}>
          <Pressable 
            style={({ pressed }) => [
              styles.link,
              pressed && styles.buttonPressed
            ]}
            onPress={() => router.push('/')}
          >
            <Text style={styles.linkText}>Back to Home</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingBottom: 60,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      },
    }),
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
    padding: 12,
    fontSize: 16,
  },
  descriptionContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  descriptionInput: {
    flex: 1,
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
  successMessage: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
    alignItems: 'center',
  },
  successText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonPressed: {
    opacity: 0.7,
  },
  linkText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  feedbackContainer: {
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
  },
  feedbackText: {
    fontSize: 14,
    fontWeight: '500',
  },
  positiveFeedback: {
    color: '#4CAF50',
  },
  negativeFeedback: {
    color: '#F44336',
  },
  analyzeButton: {
    backgroundColor: '#4A90E2',
    padding: 12,
    borderRadius: 8,
    justifyContent: 'center',
    minWidth: 80,
    height: 40,
    marginTop: 8,
  },
  analyzeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
}); 