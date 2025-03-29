import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  return (
    <View style={styles.container}>
      <Pressable 
        style={({ pressed }) => [
          styles.navItem,
          isActive('/') && styles.activeNavItem,
          pressed && styles.buttonPressed
        ]}
        onPress={() => router.push('/')}
      >
        <Ionicons 
          name="home" 
          size={24} 
          color={isActive('/') ? '#4A90E2' : '#666666'} 
        />
        <Text style={[
          styles.navText,
          isActive('/') && styles.activeNavText
        ]}>Home</Text>
      </Pressable>

      <Pressable 
        style={({ pressed }) => [
          styles.navItem,
          isActive('/sleep') && styles.activeNavItem,
          pressed && styles.buttonPressed
        ]}
        onPress={() => router.push('/sleep')}
      >
        <Ionicons 
          name="moon" 
          size={24} 
          color={isActive('/sleep') ? '#4A90E2' : '#666666'} 
        />
        <Text style={[
          styles.navText,
          isActive('/sleep') && styles.activeNavText
        ]}>Sleep</Text>
      </Pressable>

      <Pressable 
        style={({ pressed }) => [
          styles.navItem,
          isActive('/profile') && styles.activeNavItem,
          pressed && styles.buttonPressed
        ]}
        onPress={() => router.push('/profile')}
      >
        <Ionicons 
          name="person" 
          size={24} 
          color={isActive('/profile') ? '#4A90E2' : '#666666'} 
        />
        <Text style={[
          styles.navText,
          isActive('/profile') && styles.activeNavText
        ]}>Profile</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  navItem: {
    alignItems: 'center',
    padding: 8,
  },
  activeNavItem: {
    backgroundColor: '#F0F8FF',
    borderRadius: 8,
  },
  navText: {
    fontSize: 12,
    color: '#666666',
    marginTop: 4,
  },
  activeNavText: {
    color: '#4A90E2',
    fontWeight: '600',
  },
  buttonPressed: {
    opacity: 0.7,
  },
}); 