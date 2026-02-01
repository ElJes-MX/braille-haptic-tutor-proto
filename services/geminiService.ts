import { GoogleGenAI } from "@google/genai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';

// Initialize client only if key exists (handled in component)
const getClient = () => new GoogleGenAI({ apiKey });

// Dictionary keys must be normalized (lowercase, no accents, no punctuation)
const MOCK_DICTIONARY: Record<string, string> = {
  // Basics
  "hola": "hello",
  "adios": "goodbye",
  "gracias": "thank you",
  "por favor": "please",
  "si": "yes",
  "no": "no",
  
  // Objects & Technology
  "computadora": "computer",
  "ordenador": "computer",
  "telefono": "phone",
  "celular": "cellphone",
  "mesa": "table",
  "silla": "chair",
  "libro": "book",
  "cuaderno": "notebook",
  "lapiz": "pencil",
  "boligrafo": "pen",
  "pluma": "pen",
  "mochila": "backpack",
  "escuela": "school",
  "casa": "house",
  "coche": "car",
  "auto": "car",
  "carro": "car",
  "autobus": "bus",
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
  "arbol": "tree",
  "flor": "flower",
  "perro": "dog",
  "gato": "cat",
  "pajaro": "bird",
  "pez": "fish",
  "mar": "sea",
  "rio": "river",

  // Food
  "comida": "food",
  "pan": "bread",
  "leche": "milk",
  "manzana": "apple",
  "naranja": "orange",
  "platano": "banana",
  "huevo": "egg",
  "queso": "cheese",
  
  // Abstract/Other
  "amigo": "friend",
  "familia": "family",
  "amor": "love",
  "tiempo": "time",
  "dia": "day",
  "noche": "night",
  "feliz": "happy",
  "triste": "sad",
  "braille": "braille",
  "musica": "music",
  "rojo": "red",
  "azul": "blue",
  "verde": "green",
  "amarillo": "yellow"
};

export const translateWord = async (word: string): Promise<string> => {
  // Aggressive normalization: 
  // 1. Trim whitespace
  // 2. Lowercase
  // 3. Remove accents (NFD decomposition + regex)
  // 4. Remove all non-alphanumeric characters except ñ
  const cleanWord = word.trim().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") 
    .replace(/[^a-z0-9ñ]/g, "");

  console.log(`Translating: "${word}" -> normalized: "${cleanWord}"`);

  // 1. Check Dictionary First
  if (MOCK_DICTIONARY[cleanWord]) {
    return MOCK_DICTIONARY[cleanWord];
  }

  // 2. If not in dictionary, try API
  if (!apiKey) {
    console.warn("API Key missing and word not in dict");
    await new Promise(resolve => setTimeout(resolve, 500));
    // Return specific tag for unavailable
    return "UNAVAILABLE";
  }

  try {
    const ai = getClient();
    const prompt = `Translate the following Spanish word to English. Return ONLY the English word, nothing else. No punctuation. Word: "${word}"`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    const translatedText = response.text?.trim() || "";
    // Clean up result just in case
    return translatedText.replace(/[.]/g, '');
  } catch (error) {
    console.error("Translation error:", error);
    return "UNAVAILABLE";
  }
};