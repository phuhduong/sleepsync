import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';

interface ThemedViewProps extends ViewProps {
  type?: 'container' | 'card' | 'section';
}

export function ThemedView({ type = 'container', style, ...props }: ThemedViewProps) {
  return (
    <View
      style={[
        styles[type],
        style,
      ]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 15,
    padding: 20,
    marginVertical: 8,
  },
  section: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    padding: 15,
    marginVertical: 8,
  },
});
