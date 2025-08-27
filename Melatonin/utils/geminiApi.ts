import { Alert } from 'react-native';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

let globalFeedback = 0;

export const getGlobalFeedback = () => globalFeedback;

export const analyzeSleepDescription = async (description: string): Promise<number> => {
  try {
    if (!GEMINI_API_KEY) {
      console.error("Invalid Gemini API key");
      Alert.alert(
        "Configuration Error",
        "Gemini API key is not properly configured. Please check your .env file."
      );
      return 0;
    }

    const prompt = `Analyze this sleep description and provide a score between -1 and 1, where:
    - Negative values (-1 to 0) indicate good sleep quality (decrease dosage)
    - Positive values (0 to 1) indicate poor sleep quality (increase dosage)
    
    Consider these factors:
    - Sleep duration and quality
    - Stress levels
    - Physical activity
    - Sleep disturbances
    - Overall well-being
    
    Description: "${description}"
    
    Respond with ONLY a single number between -1 and 1, nothing else. For example: 0.5 or -0.3`;

    const response = await fetch(
      `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Gemini API error:", {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    const responseText = data.candidates[0].content.parts[0].text.trim();

    let score = 0;
    const numberMatch = responseText.match(/-?\d*\.?\d+/);
    if (numberMatch) {
      score = parseFloat(numberMatch[0]);
      score = Math.max(-1, Math.min(1, score));
    } else {
      Alert.alert(
        "Analysis Error",
        "Could not parse the sleep analysis result. Please try again."
      );
    }
    
    globalFeedback = score;
    
    return globalFeedback;
  } catch (error) {
    console.error("Error analyzing sleep description:", error);
    Alert.alert(
      "Analysis Error",
      "Failed to analyze sleep description. Please check your internet connection and try again."
    );
    return 0;
  }
}; 