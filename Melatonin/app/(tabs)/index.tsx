import { Image, StyleSheet, Platform, TouchableOpacity, ScrollView, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';

export default function HomeScreen() {
  const router = useRouter();
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Load dark mode preference
    AsyncStorage.getItem('isDarkMode').then(value => {
      if (value !== null) {
        setIsDarkMode(value === 'true');
      }
    });
  }, []);

  const handleDarkModeChange = async (value: boolean) => {
    setIsDarkMode(value);
    await AsyncStorage.setItem('isDarkMode', value.toString());
  };

  return (
    <LinearGradient
      colors={isDarkMode ? ['#1a1a2e', '#16213e', '#0f3460'] : ['#1a2a6c', '#b21f1f', '#fdbb2d']}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Image
            source={require('../../assets/images/partial-react-logo.png')}
            style={styles.logo}
          />
          <ThemedView style={styles.titleContainer}>
            <ThemedText type="title" style={styles.title}>SleepSync</ThemedText>
            <ThemedText style={styles.subtitle}>Your AI-Powered Sleep Assistant</ThemedText>
          </ThemedView>
        </View>

        <ThemedView style={styles.featuresContainer}>
          <View style={styles.featuresGrid}>
            <TouchableOpacity 
              style={styles.featureCard}
              onPress={() => router.push('/sleep')}
            >
              <MaterialCommunityIcons name="sleep" size={32} color="#fff" />
              <ThemedText style={styles.featureTitle}>Smart Sleep Timer</ThemedText>
              <ThemedText style={styles.featureDescription}>
                Get personalized melatonin dosing based on your biometrics
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.featureCard}
              onPress={() => router.push('/data')}
            >
              <MaterialCommunityIcons name="chart-line" size={32} color="#fff" />
              <ThemedText style={styles.featureTitle}>Sleep Analytics</ThemedText>
              <ThemedText style={styles.featureDescription}>
                Track your sleep patterns and quality over time
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.featureCard}
              onPress={() => router.push('/profile')}
            >
              <MaterialCommunityIcons name="account-cog" size={32} color="#fff" />
              <ThemedText style={styles.featureTitle}>Personal Settings</ThemedText>
              <ThemedText style={styles.featureDescription}>
                Customize your sleep preferences and device settings
              </ThemedText>
            </TouchableOpacity>
          </View>
        </ThemedView>
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
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    padding: 20,
    paddingTop: 40,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  titleContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: 1,
    textAlign: 'center',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-black',
    }),
  },
  subtitle: {
    fontSize: 20,
    opacity: 0.95,
    marginTop: 8,
    letterSpacing: 0.5,
    textAlign: 'center',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
    }),
  },
  featuresContainer: {
    padding: 20,
    width: '100%',
    alignItems: 'center',
  },
  featuresGrid: {
    width: '90%',
    gap: 20,
  },
  featureCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
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
  featureTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginTop: 15,
    marginBottom: 8,
    letterSpacing: 0.5,
    textAlign: 'center',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-black',
    }),
  },
  featureDescription: {
    fontSize: 16,
    opacity: 0.95,
    textAlign: 'center',
    lineHeight: 24,
    letterSpacing: 0.3,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif',
    }),
  },
});
