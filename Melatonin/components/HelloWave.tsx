import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export function HelloWave() {
  const waveAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Create a continuous wave animation
    const waveSequence = Animated.sequence([
      Animated.timing(waveAnim, {
        toValue: 1,
        duration: 1000,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(waveAnim, {
        toValue: 0,
        duration: 1000,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    ]);

    // Create a subtle scale animation
    const scaleSequence = Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.2,
        duration: 1000,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 1000,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    ]);

    // Run animations in parallel and loop them
    Animated.loop(
      Animated.parallel([waveSequence, scaleSequence])
    ).start();
  }, []);

  const rotate = waveAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '20deg'],
  });

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.waveContainer,
          {
            transform: [
              { rotate },
              { scale: scaleAnim },
            ],
          },
        ]}
      >
        <MaterialCommunityIcons
          name="hand-wave"
          size={40}
          color="#fff"
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  waveContainer: {
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 30,
  },
});
