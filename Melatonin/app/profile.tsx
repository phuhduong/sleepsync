import { View, Text, StyleSheet, ScrollView, Pressable, Animated, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Profile() {
  const router = useRouter();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    AsyncStorage.getItem('isDarkMode').then(value => {
      if (value !== null) {
        setIsDarkMode(value === 'true');
      }
    });

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleDarkModeChange = async (value: boolean) => {
    setIsDarkMode(value);
    await AsyncStorage.setItem('isDarkMode', value.toString());
  };

  const handleClearHistory = () => {
    Alert.alert(
      'Clear History',
      'Are you sure you want to clear your sleep history? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: () => console.log('Clear history') }
      ]
    );
  };

  const handleResetSettings = () => {
    Alert.alert(
      'Reset Settings',
      'Are you sure you want to reset all settings to default?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: () => console.log('Reset settings') }
      ]
    );
  };

  return (
    <LinearGradient
      colors={isDarkMode ? ['#1a1a2e', '#16213e', '#0f3460'] : ['#1a2a6c', '#b21f1f', '#fdbb2d']}
      style={styles.container}
    >
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <MaterialCommunityIcons name="account-circle" size={80} color="#fff" />
            <Text style={styles.title}>Profile</Text>
            <Text style={styles.subtitle}>Your sleep preferences and settings</Text>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="sleep" size={24} color="#fff" />
              <Text style={styles.sectionTitle}>Sleep Preferences</Text>
            </View>
            <View style={styles.preferenceItem}>
              <View style={styles.preferenceIcon}>
                <MaterialCommunityIcons name="clock-outline" size={20} color="#fff" />
              </View>
              <View style={styles.preferenceContent}>
                <Text style={styles.preferenceLabel}>Preferred Sleep Time</Text>
                <Text style={styles.preferenceValue}>10:00 PM</Text>
              </View>
            </View>
            <View style={styles.preferenceItem}>
              <View style={styles.preferenceIcon}>
                <MaterialCommunityIcons name="timer-outline" size={20} color="#fff" />
              </View>
              <View style={styles.preferenceContent}>
                <Text style={styles.preferenceLabel}>Target Sleep Duration</Text>
                <Text style={styles.preferenceValue}>8 hours</Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="devices" size={24} color="#fff" />
              <Text style={styles.sectionTitle}>Device Settings</Text>
            </View>
            <View style={styles.preferenceItem}>
              <View style={styles.preferenceIcon}>
                <MaterialCommunityIcons name="wifi" size={20} color="#fff" />
              </View>
              <View style={styles.preferenceContent}>
                <Text style={styles.preferenceLabel}>ESP8266 IP Address</Text>
                <Text style={styles.preferenceValue}>192.168.4.1</Text>
              </View>
            </View>
            <View style={styles.preferenceItem}>
              <View style={styles.preferenceIcon}>
                <MaterialCommunityIcons name="watch" size={20} color="#fff" />
              </View>
              <View style={styles.preferenceContent}>
                <Text style={styles.preferenceLabel}>Fitbit Connected</Text>
                <Text style={styles.preferenceValue}>Not Connected</Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="cog" size={24} color="#fff" />
              <Text style={styles.sectionTitle}>App Settings</Text>
            </View>
            <View style={styles.preferenceItem}>
              <View style={styles.preferenceIcon}>
                <MaterialCommunityIcons name="theme-light-dark" size={20} color="#fff" />
              </View>
              <View style={styles.preferenceContent}>
                <Text style={styles.preferenceLabel}>Dark Mode</Text>
                <Switch
                  value={isDarkMode}
                  onValueChange={handleDarkModeChange}
                  trackColor={{ false: '#767577', true: '#81b0ff' }}
                  thumbColor={isDarkMode ? '#f5dd4b' : '#f4f3f4'}
                />
              </View>
            </View>
            <View style={styles.preferenceItem}>
              <View style={styles.preferenceIcon}>
                <MaterialCommunityIcons name="bell-outline" size={20} color="#fff" />
              </View>
              <View style={styles.preferenceContent}>
                <Text style={styles.preferenceLabel}>Notifications</Text>
                <Switch
                  value={notifications}
                  onValueChange={setNotifications}
                  trackColor={{ false: '#767577', true: '#81b0ff' }}
                  thumbColor={notifications ? '#f5dd4b' : '#f4f3f4'}
                />
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="alert-circle" size={24} color="#fff" />
              <Text style={styles.sectionTitle}>Danger Zone</Text>
            </View>
            <Pressable 
              style={({ pressed }) => [
                styles.dangerButton,
                pressed && styles.buttonPressed
              ]}
              onPress={handleClearHistory}
            >
              <MaterialCommunityIcons name="delete" size={20} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.dangerButtonText}>Clear Sleep History</Text>
            </Pressable>
            <Pressable 
              style={({ pressed }) => [
                styles.dangerButton,
                pressed && styles.buttonPressed
              ]}
              onPress={handleResetSettings}
            >
              <MaterialCommunityIcons name="refresh" size={20} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.dangerButtonText}>Reset to Defaults</Text>
            </Pressable>
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
    paddingBottom: 60,
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 10,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  section: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 20,
    borderRadius: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 10,
  },
  preferenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  preferenceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  preferenceContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  preferenceLabel: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  preferenceValue: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,59,48,0.2)',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  buttonIcon: {
    marginRight: 10,
  },
  dangerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonPressed: {
    opacity: 0.7,
  },
}); 