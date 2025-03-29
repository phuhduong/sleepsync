import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Link } from 'expo-router';

export default function Home() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Welcome to Melatonin</Text>
        <Text style={styles.subtitle}>Your Smart Sleep Assistant</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.description}>
          Melatonin is your personalized sleep companion that helps you achieve better sleep
          by analyzing your biometric data and providing optimal melatonin dosage recommendations.
        </Text>

        <View style={styles.features}>
          <Text style={styles.featureTitle}>Key Features:</Text>
          <Text style={styles.feature}>• Personalized melatonin dosing</Text>
          <Text style={styles.feature}>• Real-time biometric monitoring</Text>
          <Text style={styles.feature}>• Sleep quality tracking</Text>
          <Text style={styles.feature}>• Smart sleep recommendations</Text>
        </View>

        <View style={styles.navigation}>
          <Link href="/data" style={styles.link}>
            View Your Data
          </Link>
          <Link href="/sleep" style={styles.link}>
            Plan Your Sleep
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
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333333',
    marginBottom: 20,
  },
  features: {
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333333',
  },
  feature: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 8,
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
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