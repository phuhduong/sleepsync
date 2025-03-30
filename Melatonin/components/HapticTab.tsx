import React from 'react';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { Pressable } from 'react-native';

export function HapticTab(props: BottomTabBarButtonProps) {
  const handlePress = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    props.onPress?.();
  };

  return (
    <Pressable
      {...props}
      onPress={handlePress}
    />
  );
}
