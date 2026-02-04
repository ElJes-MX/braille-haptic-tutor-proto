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
  "buenos dias": "good morning",
  "buenas noches": "good night",
  
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
  "camisa": "shirt",
  "zapato": "shoe",
  "pantalon": "pants",

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
  "lluvia": "rain",
  "nube": "cloud",

  // Food
  "comida": "food",
  "pan": "bread",
  "leche": "milk",
  "manzana": "apple",
  "naranja": "orange",
  "platano": "banana",
  "huevo": "egg",
  "queso": "cheese",
  "carne": "meat",
  "pollo": "chicken",
  "arroz": "rice",
  
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
  "amarillo": "yellow",
  "blanco": "white",
  "negro": "black"
};

export const translateWord = async (word: string): Promise<string> => {
  // Aggressive normalization
  const cleanWord = word.trim().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") 
    .replace(/[^a-z0-9ñ\s]/g, ""); // Keep spaces for phrases like "buenos dias"

  console.log(`Translating: "${word}" -> normalized: "${cleanWord}"`);

  // 1. Check Dictionary First (Instant fallback)
  if (MOCK_DICTIONARY[cleanWord]) {
    return MOCK_DICTIONARY[cleanWord];
  }

  // 2. If not in dictionary, try API
  if (!apiKey) {
    console.warn("API Key missing and word not in dict");
    // Simulate delay to prevent UI flicker
    await new Promise(resolve => setTimeout(resolve, 300));
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
    // If empty response, return UNAVAILABLE
    if (!translatedText) return "UNAVAILABLE";

    return translatedText.replace(/[.]/g, '');
  } catch (error) {
    console.error("Translation error:", error);
    return "UNAVAILABLE";
  }
};