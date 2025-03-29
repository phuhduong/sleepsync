import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { Link } from 'expo-router';
import { LineChart } from 'react-native-chart-kit';
import { processBiometricData } from '../utils/dataProcessor';
import biometricData from '../data/sample_biometrics.json';


export default function Data() {
  // Process the last 24 hours of data
  const processedData = processBiometricData(
    biometricData.historical_data.hrv,
    biometricData.historical_data.rhr,
    biometricData.historical_data.respiratory_rate,
    biometricData.recommended_base_dose,
    new Date().toISOString() // Current time as target
  );

  // Sort data by hour (23 to 0)
  const sortedData = [...processedData].sort((a, b) => b.hour - a.hour);

  // Calculate min and max for y-axis scaling
  const doses = sortedData.map(d => d.calculatedDose);
  const minDose = Math.min(...doses);
  const maxDose = Math.max(...doses);
  const yAxisMin = 0; // Always start at 0
  const yAxisMax = maxDose + 0.5;

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(74, 144, 226, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: "4",
      strokeWidth: "2",
      stroke: "#4A90E2"
    },
    propsForLabels: {
      fontSize: 10
    }
  };

  const chartData = {
    labels: sortedData.map(d => d.hour.toString()),
    datasets: [
      {
        data: sortedData.map(d => d.calculatedDose),
      },
    ],
  };

  // Get the latest data point
  const latestData = processedData[processedData.length - 1];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Biometric Data</Text>
        <Text style={styles.subtitle}>Latest Readings</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Dose Rate (mg/hour) Over Last 24 Hours</Text>
          <LineChart
            data={chartData}
            width={Dimensions.get('window').width - 40}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
            yAxisLabel=""
            yAxisSuffix=" mg/hr"
            segments={4}
            fromZero
            withDots={true}
            withInnerLines={true}
            withOuterLines={true}
            withVerticalLines={true}
            withHorizontalLines={true}
            withVerticalLabels={true}
            withHorizontalLabels={true}
            withShadow={false}
          />
        </View>

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
  chartContainer: {
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
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333333',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
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