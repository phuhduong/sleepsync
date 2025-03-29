import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';

export default function Profile() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.subtitle}>Your sleep preferences and settings</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sleep Preferences</Text>
          <View style={styles.preferenceItem}>
            <Text style={styles.preferenceLabel}>Preferred Sleep Time</Text>
            <Text style={styles.preferenceValue}>10:00 PM</Text>
          </View>
          <View style={styles.preferenceItem}>
            <Text style={styles.preferenceLabel}>Target Sleep Duration</Text>
            <Text style={styles.preferenceValue}>8 hours</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Device Settings</Text>
          <View style={styles.preferenceItem}>
            <Text style={styles.preferenceLabel}>ESP8266 IP Address</Text>
            <Text style={styles.preferenceValue}>192.168.4.3</Text>
          </View>
          <View style={styles.preferenceItem}>
            <Text style={styles.preferenceLabel}>Fitbit Connected</Text>
            <Text style={styles.preferenceValue}>Not Connected</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Settings</Text>
          <Pressable 
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed
            ]}
            onPress={() => console.log('Clear history')}
          >
            <Text style={styles.buttonText}>Clear Sleep History</Text>
          </Pressable>
          <Pressable 
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed
            ]}
            onPress={() => console.log('Reset settings')}
          >
            <Text style={styles.buttonText}>Reset to Defaults</Text>
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
    paddingBottom: 60, // Add padding for bottom navigation
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
  section: {
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 15,
  },
  preferenceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  preferenceLabel: {
    fontSize: 16,
    color: '#666666',
  },
  preferenceValue: {
    fontSize: 16,
    color: '#333333',
    fontWeight: '500',
  },
  button: {
    backgroundColor: '#4A90E2',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonPressed: {
    opacity: 0.7,
  },
}); 