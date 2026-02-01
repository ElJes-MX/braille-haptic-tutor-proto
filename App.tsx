import React, { useState, useEffect, useRef } from 'react';
import { IWindow, BrailleMap } from './types';
import { BRAILLE_MAP } from './constants';
import { translateWord } from './services/geminiService';
import BrailleCell from './components/BrailleCell';
import { Mic, Volume2, Globe, RefreshCcw, Info } from 'lucide-react';

const App: React.FC = () => {
  const [currentWord, setCurrentWord] = useState<string>("");
  const [translatedWord, setTranslatedWord] = useState<string>("");
  const [isListening, setIsListening] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [displayMode, setDisplayMode] = useState<'spanish' | 'english'>('spanish');
  const [error, setError] = useState<string | null>(null);

  // Focus management
  const recordButtonRef = useRef<HTMLButtonElement>(null);

  // Helper to convert string to Braille objects
  const getBrailleData = (text: string) => {
    return text.toLowerCase().split('').map((char) => {
      const normalizedChar = char.normalize("NFD").replace(/[\u0300-\u036f]/g, "") === 'n' && char !== 'ñ' 
        ? char 
        : char; 
      
      const dots = BRAILLE_MAP[char.toLowerCase()] || BRAILLE_MAP[normalizedChar] || [false, false, false, false, false, false];
      return { char, dots };
    });
  };

  // Simple speak for single language (UI feedback)
  const speak = (text: string, lang = 'es-ES') => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    window.speechSynthesis.speak(utterance);
  };

  // Advanced speak for mixed languages (Intro in Spanish + Content in Target Lang)
  const speakMixed = (introText: string, contentText: string, contentLang: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    // 1. Speak the intro (e.g., "Translation ready") in Spanish
    const u1 = new SpeechSynthesisUtterance(introText);
    u1.lang = 'es-ES';
    
    // 2. Speak the content (e.g., "Food") in the correct language (English)
    const u2 = new SpeechSynthesisUtterance(contentText);
    u2.lang = contentLang;
    u2.rate = 0.9; // Slightly slower for clarity on the target word

    window.speechSynthesis.speak(u1);
    window.speechSynthesis.speak(u2);
  };

  const handleListening = () => {
    const windowObj = window as unknown as IWindow;
    const SpeechRecognition = windowObj.SpeechRecognition || windowObj.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError("Tu navegador no soporta reconocimiento de voz. Intenta usar Chrome o Safari.");
      speak("Tu navegador no soporta reconocimiento de voz.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'es-ES';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
      if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript;
      // Sanitize input: Trim whitespace and take the first token
      const firstWord = transcript.trim().split(' ')[0]; 
      
      if (!firstWord) return;

      setCurrentWord(firstWord);
      setDisplayMode('spanish');
      
      speak(`Palabra detectada: ${firstWord}. Traduciendo.`);
      
      // Trigger translation
      handleTranslate(firstWord);
    };

    recognition.onerror = (event: any) => {
      setIsListening(false);
      setError("Error al escuchar. Inténtalo de nuevo.");
      speak("Error al escuchar.");
    };

    recognition.start();
  };

  const handleTranslate = async (word: string) => {
    setIsTranslating(true);
    try {
      const translation = await translateWord(word);
      
      if (translation === "UNAVAILABLE") {
        setTranslatedWord(word); // Fallback to showing original word if needed, or keep empty
        speak("Lo siento, no conozco la traducción de esa palabra todavía.", 'es-ES');
        // Keep display mode in Spanish as translation failed
        setDisplayMode('spanish');
      } else {
        setTranslatedWord(translation);
        setIsTranslating(false);
        speakMixed("Traducción lista. En inglés:", translation, 'en-US');
      }
      
    } catch (err) {
      setError("No se pudo conectar con el servicio de traducción.");
      speak("Error en la traducción.");
      setIsTranslating(false);
    }
  };

  const toggleLanguage = () => {
    const newMode = displayMode === 'spanish' ? 'english' : 'spanish';
    
    // Prevent switching if no valid translation
    if (newMode === 'english' && (!translatedWord || translatedWord === "UNAVAILABLE")) {
        speak("Traducción no disponible.", 'es-ES');
        return;
    }

    setDisplayMode(newMode);
    
    const textToRead = newMode === 'spanish' ? currentWord : translatedWord;
    const targetLang = newMode === 'spanish' ? 'es-ES' : 'en-US';
    
    if (textToRead) {
        const intro = `Cambiando a ${newMode === 'spanish' ? 'Español' : 'Inglés'}`;
        speakMixed(intro, textToRead, targetLang);
    } else {
      speak(`Cambiando a ${newMode === 'spanish' ? 'Español' : 'Inglés'}.`, 'es-ES');
    }
  };

  // Initial welcome message
  useEffect(() => {
    const timer = setTimeout(() => {
        // Optional auto-welcome logic
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const activeText = displayMode === 'spanish' ? currentWord : translatedWord;
  const brailleData = getBrailleData(activeText || "");

  return (
    <main className="flex flex-col h-full bg-high-contrast-bg text-high-contrast-text p-4 md:p-8 overflow-y-auto">
      
      {/* Header */}
      <header className="flex justify-between items-center mb-8 border-b-2 border-gray-700 pb-4">
        <h1 className="text-3xl font-bold tracking-wider" aria-label="Aplicación Tutor Braille">
          Braille<span className="text-braille-active">Tutor</span>
        </h1>
        <div className="flex gap-2">
            <button 
                onClick={() => speak("Instrucciones: Presiona el botón grande del micrófono para dictar una palabra. Luego explora los puntos Braille en la parte inferior. Usa el botón de mundo para cambiar entre español e inglés.")}
                className="p-2 border-2 border-white rounded-full hover:bg-gray-800"
                aria-label="Escuchar instrucciones"
            >
                <Info size={24} />
            </button>
        </div>
      </header>

      {/* Main Controls */}
      <section className="flex flex-col items-center gap-6 mb-8 relative z-10">
        
        {/* Record Button */}
        <button
          ref={recordButtonRef}
          onClick={handleListening}
          disabled={isListening || isTranslating}
          className={`
            relative w-32 h-32 rounded-full flex items-center justify-center
            border-4 transition-all duration-300 shadow-xl
            ${isListening 
              ? 'bg-red-600 border-red-400 animate-pulse scale-110' 
              : 'bg-braille-active text-black border-white hover:scale-105 active:scale-95'
            }
          `}
          aria-label={isListening ? "Escuchando..." : "Presiona para dictar palabra"}
        >
          <Mic size={48} />
          {isListening && (
            <span className="absolute -bottom-10 text-white font-bold text-lg">Escuchando...</span>
          )}
        </button>

        {/* Status / Error Message */}
        <div aria-live="polite" className="h-8 text-center">
            {isTranslating && <p className="text-xl animate-pulse text-white">Traduciendo...</p>}
            {error && <p className="text-red-400 font-bold bg-gray-900 px-4 py-1 rounded">{error}</p>}
        </div>

        {/* Word Display & Actions */}
        {currentWord && !isListening && (
            <div className="flex flex-col items-center gap-4 w-full bg-gray-800 p-6 rounded-2xl border border-gray-600">
                
                <div className="flex items-center gap-4">
                    <h2 className="text-5xl md:text-6xl font-bold text-white tracking-widest uppercase">
                        {activeText}
                    </h2>
                    <button 
                        onClick={() => {
                            if (activeText === "UNAVAILABLE") {
                                speak("Texto no disponible.", 'es-ES');
                            } else {
                                speak(activeText, displayMode === 'spanish' ? 'es-ES' : 'en-US');
                            }
                        }}
                        className="p-3 bg-gray-700 rounded-full hover:bg-gray-600 focus:ring-2 focus:ring-yellow-400"
                        aria-label={`Escuchar palabra en ${displayMode}`}
                    >
                        <Volume2 size={28} />
                    </button>
                </div>

                <div className="flex gap-4 mt-4 w-full justify-center">
                     {translatedWord && translatedWord !== "UNAVAILABLE" && (
                         <button
                            onClick={toggleLanguage}
                            className={`
                                flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-lg border-2
                                ${displayMode === 'english' ? 'bg-green-700 border-green-500 text-white' : 'bg-gray-700 border-gray-500 text-gray-300'}
                            `}
                            aria-label={displayMode === 'english' ? "Viendo Inglés. Cambiar a Español" : "Viendo Español. Cambiar a Inglés"}
                         >
                            <Globe size={24} />
                            {displayMode === 'english' ? "INGLÉS" : "ESPAÑOL"}
                         </button>
                     )}
                </div>
            </div>
        )}
      </section>

      {/* Braille Display Area */}
      {currentWord && (
        <section 
            className="flex-1 overflow-x-auto pb-8 w-full touch-none" 
            aria-label={`Representación en Braille de ${activeText}`}
        >
             <div className="flex flex-nowrap md:flex-wrap items-start justify-center min-w-min gap-2 px-4">
                {brailleData.map((data, index) => (
                    <BrailleCell 
                        key={`${displayMode}-${index}-${data.char}`} 
                        char={data.char} 
                        dots={data.dots} 
                        isActiveChar={true}
                    />
                ))}
             </div>
             
             <p className="text-center text-gray-400 mt-6 text-sm mx-auto max-w-md">
                Desliza tu dedo sobre los puntos. Los puntos rellenos (Azul) vibrarán fuerte, los vacíos suavemente.
             </p>
        </section>
      )}

      {!currentWord && !isListening && (
          <div className="flex-1 flex flex-col items-center justify-center opacity-30">
              <div className="text-8xl mb-4">⠃⠗⠇</div>
              <p className="text-xl text-center max-w-xs">Presiona el micrófono para comenzar a aprender.</p>
          </div>
      )}

    </main>
  );
};

export default App;