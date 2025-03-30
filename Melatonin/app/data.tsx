import { View, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { processBiometricData } from '../utils/dataProcessor';
import biometricData from '../data/sample_biometrics.json';
import DosePlot from '../components/DosePlot';
import { ThemedText } from '../components/ThemedText';
import { ThemedView } from '../components/ThemedView';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function Data() {
  // Process the data with current time as target
  const processedData = processBiometricData(
    biometricData.historical_data.hrv,
    biometricData.historical_data.rhr,
    biometricData.historical_data.respiratory_rate,
    biometricData.recommended_base_dose,
    new Date().toISOString(), // Current time as target
    3600, // 1 hour total time
    3600  // 1 hour remaining time
  );

  // Get the latest data point
  const latestData = processedData[processedData.length - 1];

  return (
    <LinearGradient
      colors={['#1a2a6c', '#b21f1f', '#fdbb2d']}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <MaterialCommunityIcons name="chart-line" size={40} color="#fff" />
          <ThemedText type="title">Your Biometric Data</ThemedText>
          <ThemedText>Latest Readings</ThemedText>
        </View>

        <View style={styles.content}>
          {processedData.length > 0 && (
            <DosePlot data={processedData} />
          )}

          <ThemedView type="card">
            <View style={styles.dataRow}>
              <MaterialCommunityIcons name="heart-pulse" size={24} color="#fff" style={styles.icon} />
              <View style={styles.dataContent}>
                <ThemedText type="defaultSemiBold">Heart Rate Variability (HRV)</ThemedText>
                <ThemedText>{latestData.currentHRV.toFixed(1)} ms</ThemedText>
              </View>
            </View>
          </ThemedView>

          <ThemedView type="card">
            <View style={styles.dataRow}>
              <MaterialCommunityIcons name="heart" size={24} color="#fff" style={styles.icon} />
              <View style={styles.dataContent}>
                <ThemedText type="defaultSemiBold">Resting Heart Rate (RHR)</ThemedText>
                <ThemedText>{latestData.currentRHR.toFixed(1)} bpm</ThemedText>
              </View>
            </View>
          </ThemedView>

          <ThemedView type="card">
            <View style={styles.dataRow}>
              <MaterialCommunityIcons name="lungs" size={24} color="#fff" style={styles.icon} />
              <View style={styles.dataContent}>
                <ThemedText type="defaultSemiBold">Respiratory Rate</ThemedText>
                <ThemedText>{latestData.currentRespRate.toFixed(1)} breaths/min</ThemedText>
              </View>
            </View>
          </ThemedView>

          <ThemedView style={styles.timestamp}>
            <MaterialCommunityIcons name="clock-outline" size={16} color="#fff" style={styles.timestampIcon} />
            <ThemedText>
              Last updated: {new Date(latestData.timestamp).toLocaleString()}
            </ThemedText>
          </ThemedView>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  content: {
    padding: 20,
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 15,
  },
  dataContent: {
    flex: 1,
  },
  timestamp: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  timestampIcon: {
    marginRight: 8,
  },
}); 