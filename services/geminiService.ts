import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY || '';

// Initialize client only if key exists (handled in component)
const getClient = () => new GoogleGenAI({ apiKey });

// Expanded Fallback dictionary for demo purposes or when API is unavailable
const MOCK_DICTIONARY: Record<string, string> = {
  // Basics
  "hola": "hello",
  "adios": "goodbye",
  "adiós": "goodbye",
  "gracias": "thank you",
  "por favor": "please",
  "si": "yes",
  "sí": "yes",
  "no": "no",
  
  // Objects & Technology
  "computadora": "computer",
  "ordenador": "computer",
  "teléfono": "phone",
  "celular": "cellphone",
  "mesa": "table",
  "silla": "chair",
  "libro": "book",
  "cuaderno": "notebook",
  "lápiz": "pencil",
  "bolígrafo": "pen",
  "pluma": "pen",
  "mochila": "backpack",
  "escuela": "school",
  "casa": "house",
  "coche": "car",
  "auto": "car",
  "carro": "car",
  "autobús": "bus",
  "bicicleta": "bicycle",
  "reloj": "clock",
  "luz": "light",
  "ventana": "window",
  "puerta": "door",

  // Nature
  "sol": "sun",
  "luna": "moon",
  "estrella": "star",
  "agua": "water",
  "fuego": "fire",
  "tierra": "earth",
  "aire": "air",
  "árbol": "tree",
  "flor": "flower",
  "perro": "dog",
  "gato": "cat",
  "pájaro": "bird",
  "pez": "fish",
  "mar": "sea",
  "río": "river",

  // Food
  "comida": "food",
  "pan": "bread",
  "leche": "milk",
  "manzana": "apple",
  "naranja": "orange",
  "plátano": "banana",
  "huevo": "egg",
  "queso": "cheese",
  
  // Abstract/Other
  "amigo": "friend",
  "familia": "family",
  "amor": "love",
  "tiempo": "time",
  "día": "day",
  "noche": "night",
  "feliz": "happy",
  "triste": "sad",
  "braille": "braille",
  "música": "music",
  "rojo": "red",
  "azul": "blue",
  "verde": "green",
  "amarillo": "yellow"
};

export const translateWord = async (word: string): Promise<string> => {
  const cleanWord = word.trim().toLowerCase().replace(/[.,!¡?¿]/g, '');

  // 1. Check Dictionary First (Instant response for common words)
  if (MOCK_DICTIONARY[cleanWord]) {
    return MOCK_DICTIONARY[cleanWord];
  }

  // 2. If not in dictionary, try API
  if (!apiKey) {
    console.warn("API Key missing and word not in dict");
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    // Return a clearer error tag that the UI can detect
    return `[Sin conexión] ${word}`;
  }

  try {
    const ai = getClient();
    const prompt = `Translate the following Spanish word to English. Return ONLY the English word, nothing else. No punctuation, no explanation. Word: "${word}"`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    const translatedText = response.text?.trim() || "";
    return translatedText.replace(/[.]/g, '');
  } catch (error) {
    console.error("Translation error:", error);
    // If API fails, return the error tag
    return `[Error] ${word}`;
  }
};