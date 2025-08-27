import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, Alert, Switch, Animated, Dimensions, Platform, AppState, AppStateStatus } from 'react-native';
import { Link } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { processBiometricData } from '../utils/dataProcessor';
import { sendDoseToESP8266 } from '../utils/esp8266';
import { updateLatestDosage, getLatestDosage } from '../utils/globalState';
import { analyzeSleepDescription } from '../utils/geminiApi';
import { getBiometricData } from '../utils/fitbitApi';
import DosePlot from '../components/DosePlot'; 
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

export default function Sleep() {
  const [sleepMinutes, setSleepMinutes] = useState('');
  const [sleepDescription, setSleepDescription] = useState('');
  const [processedData, setProcessedData] = useState<any[]>([]);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [totalTime, setTotalTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [useFitbit, setUseFitbit] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const [appState, setAppState] = useState(AppState.currentState);

  useEffect(() => {
    AsyncStorage.getItem('isDarkMode').then(value => {
      if (value !== null) {
        setIsDarkMode(value === 'true');
      }
    });

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && timeRemaining !== null && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(prev => prev !== null ? prev - 1 : null);
        setElapsedTime(prev => prev + 1);
        
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ]).start();
      }, 1000);
    } else if (timeRemaining === 0) {
      setIsTimerRunning(false);
      Animated.sequence([
        Animated.spring(scaleAnim, {
          toValue: 1.2,
          friction: 3,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 3,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timeRemaining]);

  useEffect(() => {
    loadTimerState();
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (isTimerRunning) {
      saveTimerState();
    }
  }, [isTimerRunning, timeRemaining, totalTime, elapsedTime]);

  const loadTimerState = async () => {
    try {
      const savedState = await AsyncStorage.getItem('timerState');
      if (savedState) {
        const { timeRemaining, totalTime, elapsedTime, isTimerRunning, startTime } = JSON.parse(savedState);
        if (isTimerRunning) {
          const now = Date.now();
          const elapsedSinceStart = Math.floor((now - startTime) / 1000);
          const newTimeRemaining = Math.max(0, timeRemaining - elapsedSinceStart);
          
          if (newTimeRemaining > 0) {
            setTimeRemaining(newTimeRemaining);
            setTotalTime(totalTime);
            setElapsedTime(elapsedTime + elapsedSinceStart);
            setIsTimerRunning(true);
          } else {
            handleTimerComplete();
          }
        }
      }
    } catch (error) {
      console.error('Error loading timer state:', error);
    }
  };

  const saveTimerState = async () => {
    try {
      const timerState = {
        timeRemaining,
        totalTime,
        elapsedTime,
        isTimerRunning,
        startTime: Date.now(),
      };
      await AsyncStorage.setItem('timerState', JSON.stringify(timerState));
    } catch (error) {
      console.error('Error saving timer state:', error);
    }
  };

  const handleTimerComplete = () => {
    setIsTimerRunning(false);
    setTimeRemaining(0);
    Alert.alert(
      'Timer Complete',
      'Your sleep session has ended. How did you sleep?',
      [
        {
          text: 'OK',
          onPress: () => {
          }
        }
      ]
    );
  };

  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    if (appState === 'active' && nextAppState.match(/inactive|background/)) {
      if (isTimerRunning) {
        await saveTimerState();
      }
    }
    setAppState(nextAppState);
  };

  const handleSubmit = async () => {
    if (!sleepMinutes) return;

    const minutes = parseInt(sleepMinutes);
    if (isNaN(minutes) || minutes <= 0) return;

    setIsLoading(true);
    try {
      const totalSeconds = minutes * 60;
      setTimeRemaining(totalSeconds);
      setTotalTime(totalSeconds);
      setElapsedTime(0);
      setIsTimerRunning(true);

      const targetTime = new Date();
      targetTime.setMinutes(targetTime.getMinutes() + minutes);

      const biometricData = useFitbit ? await getBiometricData() : null;
      const jsonData = require('../data/sample_biometrics.json').historical_data;

      const data = processBiometricData(
        biometricData?.hrv || jsonData.hrv,
        biometricData?.rhr || jsonData.rhr,
        biometricData?.respiratoryRate || jsonData.respiratory_rate,
        1.0,
        targetTime.toISOString(),
        totalSeconds,
        totalSeconds
      );

      setProcessedData(data);

      const latestDose = data[data.length - 1].calculatedDose;
      updateLatestDosage(latestDose);

      try {
        await sendDoseToESP8266(latestDose);
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

  const handleCancel = async () => {
    setSleepMinutes('');
    setSleepDescription('');
    setProcessedData([]);
    setTimeRemaining(null);
    setTotalTime(null);
    setElapsedTime(0);
    setIsTimerRunning(false);
    try {
      await AsyncStorage.removeItem('timerState');
    } catch (error) {
      console.error('Error clearing timer state:', error);
    }
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

  const getCurrentR = () => {
    if (totalTime === null) return 0;
    return Math.max(0, totalTime - elapsedTime);
  };

  return (
    <LinearGradient
      colors={isDarkMode ? ['#1a1a2e', '#16213e', '#0f3460'] : ['#1a2a6c', '#b21f1f', '#fdbb2d']}
      style={styles.container}
    >
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.card}>
            <Text style={styles.title}>Sleep Timer</Text>
            
            <View style={styles.descriptionContainer}>
              <MaterialCommunityIcons name="text-box-outline" size={24} color="#fff" style={styles.inputIcon} />
              <View style={styles.descriptionInputContainer}>
                <TextInput
                  style={[styles.input, styles.descriptionInput]}
                  placeholder="Describe your sleep quality..."
                  placeholderTextColor="rgba(255,255,255,0.7)"
                  value={sleepDescription}
                  onChangeText={setSleepDescription}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
                <TouchableOpacity
                  style={styles.analyzeButton}
                  onPress={handleAnalyze}
                >
                  <MaterialCommunityIcons name="brain" size={20} color="#fff" />
                  <Text style={styles.analyzeButtonText}>Analyze</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <MaterialCommunityIcons name="timer-outline" size={24} color="#fff" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter sleep duration (minutes)"
                placeholderTextColor="rgba(255,255,255,0.7)"
                value={sleepMinutes}
                onChangeText={setSleepMinutes}
                keyboardType="numeric"
              />
            </View>
            
            <View style={styles.switchContainer}>
              <Text style={styles.switchLabel}>Use Fitbit Data</Text>
              <Switch
                value={useFitbit}
                onValueChange={setUseFitbit}
                trackColor={{ false: '#767577', true: '#81b0ff' }}
                thumbColor={useFitbit ? '#f5dd4b' : '#f4f3f4'}
              />
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={handleSubmit}
                disabled={isLoading}
              >
                <MaterialCommunityIcons name="play" size={24} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.buttonText}>
                  {isLoading ? 'Processing...' : 'Start Timer'}
                </Text>
              </TouchableOpacity>

              {timeRemaining !== null && (
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={handleCancel}
                >
                  <MaterialCommunityIcons name="close" size={24} color="#fff" style={styles.buttonIcon} />
                  <Text style={styles.buttonText}>Cancel</Text>
                </TouchableOpacity>
              )}
            </View>

            {timeRemaining !== null && (
              <Animated.View style={[styles.timerContainer, { transform: [{ scale: pulseAnim }] }]}>
                <Text style={styles.timerText}>{formatTime(timeRemaining)}</Text>
                <Text style={styles.timerLabel}>Time Remaining</Text>
              </Animated.View>
            )}

            {processedData.length > 0 && (
              <View style={styles.dataCard}>
                <Text style={styles.dataTitle}>Sleep Analysis</Text>
                <View style={styles.chartContainer}>
                  <DosePlot data={processedData} />
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 60,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 25,
    padding: 25,
    margin: 20,
    width: '95%',
    alignSelf: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  title: {
    fontSize: 38,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 25,
    letterSpacing: 0.8,
    textAlign: 'center',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-black',
    }),
  },
  descriptionContainer: {
    marginBottom: 25,
    width: '100%',
  },
  descriptionInputContainer: {
    marginTop: 12,
    width: '100%',
  },
  descriptionInput: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    padding: 20,
    color: '#fff',
    fontSize: 17,
    minHeight: 120,
    textAlignVertical: 'top',
    width: '100%',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif',
    }),
  },
  analyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4A148C',
    borderRadius: 20,
    padding: 18,
    marginTop: 12,
    width: '100%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  analyzeButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    marginLeft: 10,
    letterSpacing: 0.4,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
    }),
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    padding: 18,
    marginBottom: 25,
    width: '100%',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 17,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif',
    }),
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
    width: '100%',
  },
  switchLabel: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.4,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
    }),
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
    marginBottom: 25,
    width: '100%',
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4A148C',
    borderRadius: 20,
    padding: 18,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  cancelButton: {
    backgroundColor: '#D32F2F',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonIcon: {
    marginRight: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    marginLeft: 10,
    letterSpacing: 0.4,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
    }),
  },
  timerContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 25,
    width: '100%',
  },
  timerText: {
    fontSize: 52,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 1.2,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-black',
    }),
  },
  timerLabel: {
    fontSize: 17,
    color: '#fff',
    opacity: 0.9,
    marginTop: 5,
    letterSpacing: 0.4,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
    }),
  },
  dataCard: {
    width: '100%',
    marginTop: 20,
  },
  dataTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 20,
    letterSpacing: 0.5,
    textAlign: 'center',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-black',
    }),
  },
  chartContainer: {
    width: '100%',
    height: 300,
    marginTop: 20,
    paddingBottom: 30,
  },
}); 