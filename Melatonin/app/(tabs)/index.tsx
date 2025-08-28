import { Image, StyleSheet, Platform, TouchableOpacity, ScrollView, View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Link } from 'expo-router';

import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';

export default function HomeScreen() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
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
            source={require('../../assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <ThemedView style={styles.titleContainer}>
            <ThemedText type="title" style={styles.title}>SleepSync</ThemedText>
            <ThemedText style={styles.subtitle}>Your Personalized Sleep Assistant</ThemedText>
          </ThemedView>
        </View>

        <ThemedView style={styles.featuresContainer}>
          <View style={styles.featuresGrid}>
            <Link href="/sleep" asChild>
              <TouchableOpacity 
                style={styles.featureCard}
              >
                <MaterialCommunityIcons name="sleep" size={32} color="#fff" />
                <ThemedText style={styles.featureTitle}>Sleep Timer</ThemedText>
                <ThemedText style={styles.featureDescription}>Set your sleep schedule and get personalized melatonin doses</ThemedText>
              </TouchableOpacity>
            </Link>

            <Link href="/data" asChild>
              <TouchableOpacity 
                style={styles.featureCard}
              >
                <MaterialCommunityIcons name="chart-line" size={32} color="#fff" />
                <ThemedText style={styles.featureTitle}>Biometric Data</ThemedText>
                <ThemedText style={styles.featureDescription}>Track your sleep metrics and see your progress</ThemedText>
              </TouchableOpacity>
            </Link>

            <Link href="/explore" asChild>
              <TouchableOpacity 
                style={styles.featureCard}
              >
                <MaterialCommunityIcons name="book-open-variant" size={32} color="#fff" />
                <ThemedText style={styles.featureTitle}>Sleep Guide</ThemedText>
                <ThemedText style={styles.featureDescription}>Learn about sleep science and get personalized tips</ThemedText>
              </TouchableOpacity>
            </Link>
          </View>
        </ThemedView>

        <TouchableOpacity style={styles.darkModeButton} onPress={() => handleDarkModeChange(!isDarkMode)}>
          <MaterialCommunityIcons 
            name={isDarkMode ? "white-balance-sunny" : "moon-waning-crescent"} 
            size={24} 
            color="#fff" 
          />
        </TouchableOpacity>
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
    paddingTop: 60,
    paddingBottom: 40,
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
  darkModeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    padding: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
});
