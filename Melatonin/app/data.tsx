import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { Link } from 'expo-router';
import { processBiometricData } from '../utils/dataProcessor';
import biometricData from '../data/sample_biometrics.json';
import DosePlot from '../components/DosePlot';

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
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Biometric Data</Text>
        <Text style={styles.subtitle}>Latest Readings</Text>
      </View>

      <View style={styles.content}>
        {processedData.length > 0 && (
          <DosePlot data={processedData} />
        )}

        <View style={styles.dataCard}>
          <Text style={styles.cardTitle}>Heart Rate Variability (HRV)</Text>
          <Text style={styles.cardValue}>
            {latestData.currentHRV.toFixed(1)}
          </Text>
          <Text style={styles.cardUnit}>ms</Text>
        </View>

        <View style={styles.dataCard}>
          <Text style={styles.cardTitle}>Resting Heart Rate (RHR)</Text>
          <Text style={styles.cardValue}>
            {latestData.currentRHR.toFixed(1)}
          </Text>
          <Text style={styles.cardUnit}>bpm</Text>
        </View>

        <View style={styles.dataCard}>
          <Text style={styles.cardTitle}>Respiratory Rate</Text>
          <Text style={styles.cardValue}>
            {latestData.currentRespRate.toFixed(1)}
          </Text>
          <Text style={styles.cardUnit}>breaths/min</Text>
        </View>

        <View style={styles.timestamp}>
          <Text style={styles.timestampText}>
            Last updated: {new Date(latestData.timestamp).toLocaleString()}
          </Text>
        </View>

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
  dataCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 8,
  },
  cardValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333333',
  },
  cardUnit: {
    fontSize: 14,
    color: '#999999',
  },
  timestamp: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    alignItems: 'center',
  },
  timestampText: {
    color: '#666666',
    fontSize: 14,
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