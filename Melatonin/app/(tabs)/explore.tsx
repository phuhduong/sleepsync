import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SleepTip {
  title: string;
  description: string;
  scientificEvidence: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  category: 'circadian' | 'environment' | 'lifestyle' | 'nutrition';
}

const sleepTips: SleepTip[] = [
  {
    title: "Maintain Consistent Sleep Schedule",
    description: "Go to bed and wake up at the same time every day, even on weekends. This helps regulate your circadian rhythm.",
    scientificEvidence: "Research shows that irregular sleep patterns can disrupt circadian rhythms and lead to sleep disorders. A study in Sleep Medicine Reviews found that consistent sleep schedules improve sleep quality by 40%.",
    icon: "clock-outline",
    category: "circadian"
  },
  {
    title: "Optimize Light Exposure",
    description: "Get bright light exposure in the morning and reduce blue light exposure in the evening. Use blue light filters on devices.",
    scientificEvidence: "Studies in Nature Communications demonstrate that blue light exposure suppresses melatonin production by 50% more than other wavelengths.",
    icon: "white-balance-sunny",
    category: "circadian"
  },
  {
    title: "Create Ideal Sleep Environment",
    description: "Keep your bedroom cool (65-67°F/18-19°C), dark, and quiet. Use blackout curtains and white noise if needed.",
    scientificEvidence: "Research in Sleep Health shows that room temperature significantly affects sleep quality, with cooler temperatures promoting deeper sleep stages.",
    icon: "bed",
    category: "environment"
  },
  {
    title: "Exercise Regularly",
    description: "Engage in moderate exercise during the day, but avoid vigorous activity close to bedtime.",
    scientificEvidence: "A meta-analysis in Sleep Medicine found that regular exercise improves sleep quality and reduces sleep onset latency by 55%.",
    icon: "run",
    category: "lifestyle"
  },
  {
    title: "Mind Your Diet",
    description: "Avoid caffeine after mid-day, limit alcohol, and don't eat large meals close to bedtime.",
    scientificEvidence: "Studies show caffeine can remain in your system for 6-8 hours, significantly impacting sleep quality.",
    icon: "food-apple",
    category: "nutrition"
  },
  {
    title: "Practice Relaxation Techniques",
    description: "Try meditation, deep breathing, or progressive muscle relaxation before bed.",
    scientificEvidence: "Research in JAMA Internal Medicine found that mindfulness meditation improved sleep quality and reduced insomnia symptoms by 60%.",
    icon: "meditation",
    category: "lifestyle"
  }
];

export default function Explore() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    loadDarkModePreference();
  }, []);

  const loadDarkModePreference = async () => {
    try {
      const value = await AsyncStorage.getItem('isDarkMode');
      if (value !== null) {
        setIsDarkMode(value === 'true');
      }
    } catch (error) {
      console.error('Error loading dark mode preference:', error);
    }
  };

  const filteredTips = selectedCategory 
    ? sleepTips.filter(tip => tip.category === selectedCategory)
    : sleepTips;

  return (
    <LinearGradient
      colors={isDarkMode ? ['#1a1a2e', '#16213e', '#0f3460'] : ['#1a2a6c', '#b21f1f', '#fdbb2d']}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <MaterialCommunityIcons name="book-open-variant" size={40} color="#fff" />
          <Text style={styles.title}>Sleep Science Guide</Text>
          <Text style={styles.subtitle}>Evidence-Based Tips for Better Sleep</Text>
        </View>

        <View style={styles.categoriesContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
            <TouchableOpacity 
              style={[styles.categoryButton, !selectedCategory && styles.selectedCategory]}
              onPress={() => setSelectedCategory(null)}
            >
              <Text style={[styles.categoryText, !selectedCategory && styles.selectedCategoryText]}>All</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.categoryButton, selectedCategory === 'circadian' && styles.selectedCategory]}
              onPress={() => setSelectedCategory('circadian')}
            >
              <MaterialCommunityIcons name="clock-outline" size={20} color={selectedCategory === 'circadian' ? '#fff' : 'rgba(255,255,255,0.7)'} />
              <Text style={[styles.categoryText, selectedCategory === 'circadian' && styles.selectedCategoryText]}>Circadian</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.categoryButton, selectedCategory === 'environment' && styles.selectedCategory]}
              onPress={() => setSelectedCategory('environment')}
            >
              <MaterialCommunityIcons name="home" size={20} color={selectedCategory === 'environment' ? '#fff' : 'rgba(255,255,255,0.7)'} />
              <Text style={[styles.categoryText, selectedCategory === 'environment' && styles.selectedCategoryText]}>Environment</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.categoryButton, selectedCategory === 'lifestyle' && styles.selectedCategory]}
              onPress={() => setSelectedCategory('lifestyle')}
            >
              <MaterialCommunityIcons name="run" size={20} color={selectedCategory === 'lifestyle' ? '#fff' : 'rgba(255,255,255,0.7)'} />
              <Text style={[styles.categoryText, selectedCategory === 'lifestyle' && styles.selectedCategoryText]}>Lifestyle</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.categoryButton, selectedCategory === 'nutrition' && styles.selectedCategory]}
              onPress={() => setSelectedCategory('nutrition')}
            >
              <MaterialCommunityIcons name="food-apple" size={20} color={selectedCategory === 'nutrition' ? '#fff' : 'rgba(255,255,255,0.7)'} />
              <Text style={[styles.categoryText, selectedCategory === 'nutrition' && styles.selectedCategoryText]}>Nutrition</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        <View style={styles.tipsContainer}>
          {filteredTips.map((tip, index) => (
            <View key={index} style={styles.tipCard}>
              <View style={styles.tipHeader}>
                <MaterialCommunityIcons name={tip.icon} size={24} color="#fff" />
                <Text style={styles.tipTitle}>{tip.title}</Text>
              </View>
              <Text style={styles.tipDescription}>{tip.description}</Text>
              <View style={styles.evidenceContainer}>
                <MaterialCommunityIcons name="book-open-page-variant" size={16} color="rgba(255,255,255,0.7)" />
                <Text style={styles.evidenceText}>{tip.scientificEvidence}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    marginTop: 15,
    letterSpacing: 1,
    textAlign: 'center',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-black',
    }),
  },
  subtitle: {
    fontSize: 18,
    color: '#fff',
    opacity: 0.9,
    marginTop: 8,
    letterSpacing: 0.5,
    textAlign: 'center',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif',
    }),
  },
  categoriesContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  categoriesScroll: {
    flexGrow: 1,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
  },
  selectedCategory: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  categoryText: {
    color: 'rgba(255,255,255,0.7)',
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
    }),
  },
  selectedCategoryText: {
    color: '#fff',
  },
  tipsContainer: {
    padding: 20,
  },
  tipCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tipTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginLeft: 12,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif-medium',
    }),
  },
  tipDescription: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
    lineHeight: 24,
    marginBottom: 16,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif',
    }),
  },
  evidenceContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 12,
    borderRadius: 12,
  },
  evidenceText: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
    fontStyle: 'italic',
    fontFamily: Platform.select({
      ios: 'System',
      android: 'sans-serif',
    }),
  },
});
