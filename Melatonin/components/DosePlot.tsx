import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { ProcessedData } from '../utils/dataProcessor';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface DosePlotProps {
  data: ProcessedData[];
}

export default function DosePlot({ data }: DosePlotProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const chartConfig = {
    backgroundColor: 'transparent',
    backgroundGradientFrom: 'transparent',
    backgroundGradientTo: 'transparent',
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(255,255,255,${opacity})`,
    labelColor: (opacity = 1) => `rgba(255,255,255,${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: '#fff',
    },
    propsForLabels: {
      fontSize: '12',
    },
  };

  const chartData = {
    labels: data.map(d => new Date(d.timestamp).toLocaleTimeString()),
    datasets: [
      {
        data: data.map(d => d.calculatedDose),
      },
    ],
  };

  const latestDose = data[data.length - 1]?.calculatedDose || 0;

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <View style={styles.header}>
        <MaterialCommunityIcons name="chart-line" size={24} color="#fff" />
        <Text style={styles.title}>Dose Calculation Over Time</Text>
      </View>
      
      <View style={styles.chartContainer}>
        <LineChart
          data={chartData}
          width={Dimensions.get('window').width - 60}
          height={220}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
          withInnerLines={false}
          withOuterLines={true}
          withVerticalLines={false}
          withHorizontalLines={true}
          withDots={true}
          withVerticalLabels={true}
          withHorizontalLabels={true}
        />
      </View>

      <View style={styles.summaryContainer}>
        <View style={styles.summaryItem}>
          <MaterialCommunityIcons name="clock-outline" size={20} color="#fff" />
          <Text style={styles.summaryLabel}>Latest Dose</Text>
          <Text style={styles.summaryValue}>{latestDose.toFixed(1)} mg</Text>
        </View>
        <View style={styles.summaryItem}>
          <MaterialCommunityIcons name="trending-up" size={20} color="#fff" />
          <Text style={styles.summaryLabel}>Peak Dose</Text>
          <Text style={styles.summaryValue}>
            {Math.max(...data.map(d => d.calculatedDose)).toFixed(1)} mg
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <MaterialCommunityIcons name="trending-down" size={20} color="#fff" />
          <Text style={styles.summaryLabel}>Min Dose</Text>
          <Text style={styles.summaryValue}>
            {Math.min(...data.map(d => d.calculatedDose)).toFixed(1)} mg
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    borderRadius: 20,
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 10,
    color: '#fff',
  },
  chartContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.8,
    marginTop: 5,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 2,
  },
}); 