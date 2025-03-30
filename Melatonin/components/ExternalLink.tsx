import React from 'react';
import { Pressable, StyleSheet, Linking, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface ExternalLinkProps {
  href: string;
  children: React.ReactNode;
}

export function ExternalLink({ href, children }: ExternalLinkProps) {
  const handlePress = async () => {
    try {
      await Linking.openURL(href);
    } catch (error) {
      console.error('Error opening URL:', error);
    }
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        pressed && styles.pressed,
      ]}
      onPress={handlePress}
    >
      <View style={styles.content}>
        {children}
        <MaterialCommunityIcons
          name="open-in-new"
          size={16}
          color="#fff"
          style={styles.icon}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 8,
    borderRadius: 8,
  },
  pressed: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginLeft: 4,
  },
});
