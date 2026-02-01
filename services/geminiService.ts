import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY || '';

// Initialize client only if key exists (handled in component)
const getClient = () => new GoogleGenAI({ apiKey });

// Fallback dictionary for demo purposes or when API is unavailable
const MOCK_DICTIONARY: Record<string, string> = {
  "comida": "food",
  "hola": "hello",
  "mundo": "world",
  "casa": "house",
  "gato": "cat",
  "perro": "dog",
  "escuela": "school",
  "amigo": "friend",
  "gracias": "thank you",
  "adiós": "goodbye",
  "adios": "goodbye",
  "braille": "braille",
  "música": "music",
  "agua": "water",
  "feliz": "happy",
  "triste": "sad",
  "rojo": "red",
  "azul": "blue"
};

export const translateWord = async (word: string): Promise<string> => {
  const cleanWord = word.trim().toLowerCase().replace(/[.,!¡?¿]/g, '');

  if (!apiKey) {
    console.warn("API Key missing, checking mock dictionary");
    // Simulate network delay for realism
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (MOCK_DICTIONARY[cleanWord]) {
        return MOCK_DICTIONARY[cleanWord];
    }
    return `[Mock] ${word}`;
  }

  try {
    const ai = getClient();
    const prompt = `Translate the following Spanish word to English. Return ONLY the English word, nothing else. No punctuation, no explanation. Word: "${word}"`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    const translatedText = response.text?.trim() || "";
    // Remove any trailing periods or whitespace
    return translatedText.replace(/[.]/g, '');
  } catch (error) {
    console.error("Translation error:", error);
    // Fallback to dictionary if API fails
    if (MOCK_DICTIONARY[cleanWord]) {
        return MOCK_DICTIONARY[cleanWord];
    }
    throw new Error("No se pudo traducir la palabra. Intenta de nuevo.");
  }
};