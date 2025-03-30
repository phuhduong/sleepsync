import React, { useRef } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  Animated,
  ViewStyle,
  StyleProp,
} from 'react-native';

interface ParallaxScrollViewProps {
  children: React.ReactNode;
  headerImage: React.ReactNode;
  headerBackgroundColor: { light: string; dark: string };
  style?: StyleProp<ViewStyle>;
}

export default function ParallaxScrollView({
  children,
  headerImage,
  headerBackgroundColor,
  style,
}: ParallaxScrollViewProps) {
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerHeight = 200;

  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, headerHeight],
    outputRange: [0, -headerHeight],
    extrapolate: 'clamp',
  });

  const headerScale = scrollY.interpolate({
    inputRange: [-headerHeight, 0, headerHeight],
    outputRange: [1.5, 1, 0.8],
    extrapolate: 'clamp',
  });

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, headerHeight / 2, headerHeight],
    outputRange: [1, 0.5, 0],
    extrapolate: 'clamp',
  });

  return (
    <View style={[styles.container, style]}>
      <Animated.View
        style={[
          styles.header,
          {
            transform: [
              { translateY: headerTranslateY },
              { scale: headerScale },
            ],
            opacity: headerOpacity,
          },
        ]}
      >
        <View style={styles.headerContent}>{headerImage}</View>
      </Animated.View>

      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: headerHeight },
        ]}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        {children}
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
    zIndex: 1,
  },
  headerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
});
