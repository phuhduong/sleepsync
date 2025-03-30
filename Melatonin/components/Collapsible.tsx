import React, { useState, useRef } from 'react';
import { View, StyleSheet, Pressable, Animated, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface CollapsibleProps {
  title: string;
  children: React.ReactNode;
}

export function Collapsible({ title, children }: CollapsibleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const heightAnim = useRef(new Animated.Value(0)).current;

  const toggle = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    setIsOpen(!isOpen);
    Animated.parallel([
      Animated.timing(rotateAnim, {
        toValue: isOpen ? 0 : 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(heightAnim, {
        toValue: isOpen ? 0 : 1,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <View style={styles.container}>
      <Pressable
        style={({ pressed }) => [
          styles.header,
          pressed && styles.headerPressed,
        ]}
        onPress={toggle}
      >
        <View style={styles.headerContent}>
          <Animated.View style={{ transform: [{ rotate }] }}>
            <MaterialCommunityIcons name="chevron-down" size={24} color="#fff" />
          </Animated.View>
          <View style={styles.titleContainer}>
            <MaterialCommunityIcons name="information" size={20} color="#fff" style={styles.titleIcon} />
            <Animated.Text style={styles.title}>{title}</Animated.Text>
          </View>
        </View>
      </Pressable>
      <Animated.View
        style={[
          styles.content,
          {
            maxHeight: heightAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 500], // Adjust this value based on your content
            }),
            opacity: heightAnim,
          },
        ]}
      >
        <View style={styles.contentInner}>{children}</View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 15,
    marginVertical: 8,
    overflow: 'hidden',
  },
  header: {
    padding: 15,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  headerPressed: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
  },
  titleIcon: {
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  content: {
    overflow: 'hidden',
  },
  contentInner: {
    padding: 15,
  },
});
