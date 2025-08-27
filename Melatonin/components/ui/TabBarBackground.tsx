import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';

export default function TabBarBackground() {
  if (Platform.OS === 'ios') {
    return (
      <BlurView
        intensity={80}
        style={StyleSheet.absoluteFill}
        tint="dark"
      />
    );
  }

  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
        },
      ]}
    />
  );
}

export function useBottomTabOverflow() {
  return 0;
}
