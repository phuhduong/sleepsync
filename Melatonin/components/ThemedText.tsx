import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';

interface ThemedTextProps extends TextProps {
  type?: 'title' | 'default' | 'defaultSemiBold' | 'link';
}

export function ThemedText({ type = 'default', style, ...props }: ThemedTextProps) {
  return (
    <Text
      style={[
        styles[type],
        style,
      ]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  default: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
    lineHeight: 24,
  },
  defaultSemiBold: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    opacity: 0.9,
    lineHeight: 24,
  },
  link: {
    fontSize: 16,
    color: '#4A90E2',
    textDecorationLine: 'underline',
    lineHeight: 24,
  },
});
