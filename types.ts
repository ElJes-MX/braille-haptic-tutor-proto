export interface BrailleCharacter {
  char: string;
  dots: boolean[]; // Array of 6 booleans representing dots 1-6
}

export type BrailleMap = Record<string, boolean[]>;

export interface TranslationResponse {
  original: string;
  translated: string;
}

// Web Speech API Types
export interface IWindow extends Window {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
}
