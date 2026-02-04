import React, { useState, useEffect, useRef } from 'react';
import { IWindow, BrailleMap } from './types';
import { BRAILLE_MAP } from './constants';
import { translateWord } from './services/geminiService';
import BrailleCell from './components/BrailleCell';
import { Mic, Volume2, Globe, Info, Ear, EarOff } from 'lucide-react';

const App: React.FC = () => {
  const [currentWord, setCurrentWord] = useState<string>("");
  const [translatedWord, setTranslatedWord] = useState<string>("");
  const [isListening, setIsListening] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [displayMode, setDisplayMode] = useState<'spanish' | 'english'>('spanish');
  const [error, setError] = useState<string | null>(null);
  const [audioFeedbackEnabled, setAudioFeedbackEnabled] = useState(true);

  // Refs for interactions
  const recordButtonRef = useRef<HTMLButtonElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lastTouchedDotRef = useRef<string | null>(null);
  const lastReadCharIndexRef = useRef<number | null>(null);
  const isScrollingRef = useRef<boolean>(false);
  const scrollTimeoutRef = useRef<number | null>(null);

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

  const speak = (text: string, lang = 'es-ES', rate = 1.0) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = rate;
    window.speechSynthesis.speak(utterance);
  };

  const speakMixed = (introText: string, contentText: string, contentLang: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    const u1 = new SpeechSynthesisUtterance(introText);
    u1.lang = 'es-ES';
    
    const u2 = new SpeechSynthesisUtterance(contentText);
    u2.lang = contentLang;
    u2.rate = 0.9; 

    window.speechSynthesis.speak(u1);
    window.speechSynthesis.speak(u2);
  };

  const handleListening = () => {
    const windowObj = window as unknown as IWindow;
    const SpeechRecognition = windowObj.SpeechRecognition || windowObj.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError("Tu navegador no soporta voz.");
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
      const firstWord = transcript.trim().split(' ')[0]; 
      
      if (!firstWord) return;

      setCurrentWord(firstWord);
      setDisplayMode('spanish');
      
      speak(`Palabra: ${firstWord}. Traduciendo.`);
      handleTranslate(firstWord);
    };

    recognition.onerror = (event: any) => {
      setIsListening(false);
      setError("Error. Intenta de nuevo.");
      speak("Error al escuchar.");
    };

    recognition.start();
  };

  const handleTranslate = async (word: string) => {
    setIsTranslating(true);
    try {
      const translation = await translateWord(word);
      
      if (translation === "UNAVAILABLE") {
        setTranslatedWord(word); 
        speak("Traducción no disponible.", 'es-ES');
        setDisplayMode('spanish');
        setIsTranslating(false); // FIX: Ensure loading state is cleared
      } else {
        setTranslatedWord(translation);
        setIsTranslating(false);
        speakMixed("En inglés:", translation, 'en-US');
      }
      
    } catch (err) {
      setError("Error de conexión.");
      setIsTranslating(false); // FIX: Ensure loading state is cleared on error
    }
  };

  const toggleLanguage = () => {
    const newMode = displayMode === 'spanish' ? 'english' : 'spanish';
    
    if (newMode === 'english' && (!translatedWord || translatedWord === "UNAVAILABLE")) {
        speak("No disponible.", 'es-ES');
        return;
    }

    setDisplayMode(newMode);
    
    const textToRead = newMode === 'spanish' ? currentWord : translatedWord;
    const targetLang = newMode === 'spanish' ? 'es-ES' : 'en-US';
    
    if (textToRead) {
        speakMixed(newMode === 'spanish' ? "Español" : "Inglés", textToRead, targetLang);
    }
  };

  const toggleAudioFeedback = () => {
    const newState = !audioFeedbackEnabled;
    setAudioFeedbackEnabled(newState);
    speak(newState ? "Sonido de puntos activado" : "Sonido de puntos desactivado");
  };

  // --- SCROLL READING LOGIC ---
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    
    // Mark as scrolling to disable dot interaction temporarily
    isScrollingRef.current = true;
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = window.setTimeout(() => {
        isScrollingRef.current = false;
    }, 150);

    const container = scrollContainerRef.current;
    const containerCenter = container.getBoundingClientRect().left + container.offsetWidth / 2;
    
    const cells = Array.from(container.children) as HTMLElement[];
    let closestCell: HTMLElement | null = null;
    let minDistance = Infinity;

    // Find the cell closest to the center
    cells.forEach(cell => {
      if (!cell.hasAttribute('data-char-index')) return;

      const rect = cell.getBoundingClientRect();
      const cellCenter = rect.left + rect.width / 2;
      const distance = Math.abs(containerCenter - cellCenter);
      
      if (distance < minDistance) {
        minDistance = distance;
        closestCell = cell;
      }
    });

    // If we have a central cell
    if (closestCell && minDistance < 100) { // Tolerance
       const index = parseInt((closestCell as HTMLElement).getAttribute('data-char-index') || '-1');
       const char = (closestCell as HTMLElement).getAttribute('data-braille-char');
       
       if (index !== -1 && index !== lastReadCharIndexRef.current) {
          lastReadCharIndexRef.current = index;
          if (char) {
             speak(char.toUpperCase(), displayMode === 'spanish' ? 'es-ES' : 'en-US', 1.2);
             if (navigator.vibrate) navigator.vibrate(20);
          }
       }
    }
  };

  // --- TOUCH DOT INTERACTION ---
  const handleBrailleTouch = (e: React.TouchEvent) => {
    // If scrolling rapidly, ignore dot exploration to avoid noise
    // But allow it if the user is deliberately touching/holding
    // We check this with a simple heuristic, but since we rely on 'touchMove', 
    // real scrolling is handled by browser. We just need to check if we are hitting a dot.
    
    const touch = e.touches[0];
    const target = document.elementFromPoint(touch.clientX, touch.clientY);

    if (!target) return;

    const dotElement = target.closest('[data-dot-index]');
    
    if (dotElement) {
        const dotIndexStr = dotElement.getAttribute('data-dot-index');
        const isActiveStr = dotElement.getAttribute('data-active');
        const uniqueDotId = `${lastReadCharIndexRef.current}-${dotIndexStr}`;

        if (dotIndexStr && uniqueDotId !== lastTouchedDotRef.current) {
            const dotIndex = parseInt(dotIndexStr);
            const isActive = isActiveStr === "true";
            
            lastTouchedDotRef.current = uniqueDotId;
            
            // Haptics (Always)
            if (navigator.vibrate) {
                navigator.vibrate(isActive ? 50 : 10);
            }

            // Audio (Only if active and enabled)
            if (audioFeedbackEnabled && isActive) {
                // Use a very short utterance for dots to avoid overlapping with letter names
                const u = new SpeechSynthesisUtterance(`${dotIndex + 1}`);
                u.lang = 'es-ES';
                u.rate = 2.5; 
                window.speechSynthesis.speak(u);
            }
        }
    } else {
        lastTouchedDotRef.current = null;
    }
  };

  // Reset refs when word changes
  useEffect(() => {
    lastReadCharIndexRef.current = null;
    lastTouchedDotRef.current = null;
    // Scroll to start
    if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({ left: 0, behavior: 'smooth' });
    }
  }, [currentWord, displayMode]);

  const activeText = displayMode === 'spanish' ? currentWord : translatedWord;
  const brailleData = getBrailleData(activeText || "");

  return (
    <main className="flex flex-col h-[100dvh] bg-high-contrast-bg text-high-contrast-text overflow-hidden">
      
      {/* 1. Header Area */}
      <header className="flex justify-between items-center px-4 py-2 border-b border-gray-800 shrink-0 h-16">
        <h1 className="text-xl font-bold tracking-wider truncate" aria-label="Tutor Braille">
          Braille<span className="text-braille-active">Tutor</span>
        </h1>
        <div className="flex gap-3">
            <button
                onClick={toggleAudioFeedback}
                className={`p-2 rounded-full border ${audioFeedbackEnabled ? 'bg-gray-800 border-yellow-500 text-yellow-500' : 'bg-gray-800 border-gray-600 text-gray-500'}`}
                aria-label={audioFeedbackEnabled ? "Desactivar sonido de puntos" : "Activar sonido de puntos"}
            >
                {audioFeedbackEnabled ? <Ear size={20} /> : <EarOff size={20} />}
            </button>

            <button 
                onClick={() => speak("Desliza horizontalmente la parte inferior para leer las letras. Toca los puntos para explorarlos.")}
                className="p-2 border border-white rounded-full hover:bg-gray-800"
                aria-label="Ayuda"
            >
                <Info size={20} />
            </button>
        </div>
      </header>

      {/* 2. Word Display & Actions */}
      <section className="flex flex-col items-center justify-center p-4 gap-4 shrink-0 bg-gray-900/50">
        <div className="flex items-center justify-center gap-3 w-full">
            <h2 className="text-4xl font-bold text-white uppercase tracking-widest truncate max-w-[70%] text-center">
                {activeText || "---"}
            </h2>
            {activeText && (
                <button 
                    onClick={() => speak(activeText, displayMode === 'spanish' ? 'es-ES' : 'en-US')}
                    className="p-2 bg-gray-800 rounded-full text-yellow-400"
                >
                    <Volume2 size={24} />
                </button>
            )}
        </div>

        <div className="flex items-center gap-6 mt-2">
            <button
                onClick={toggleLanguage}
                disabled={!currentWord}
                className={`
                    flex flex-col items-center justify-center w-16 h-16 rounded-xl border-2 transition-all
                    ${displayMode === 'english' 
                        ? 'bg-green-900/40 border-green-500 text-green-400' 
                        : 'bg-gray-800 border-gray-600 text-gray-400'
                    }
                `}
                aria-label={displayMode === 'english' ? "Cambiar a Español" : "Cambiar a Inglés"}
            >
                <Globe size={24} />
                <span className="text-[10px] font-bold mt-1">{displayMode === 'english' ? "EN" : "ES"}</span>
            </button>

            <button
                ref={recordButtonRef}
                onClick={handleListening}
                disabled={isListening || isTranslating}
                className={`
                    relative w-20 h-20 rounded-full flex items-center justify-center
                    border-4 shadow-lg transition-transform
                    ${isListening 
                    ? 'bg-red-600 border-red-400 animate-pulse scale-110' 
                    : 'bg-braille-active text-black border-white active:scale-95'
                    }
                `}
                aria-label={isListening ? "Escuchando..." : "Dictar"}
            >
                <Mic size={32} />
            </button>
        </div>

        <div className="h-6 text-center">
            {isListening && <span className="text-yellow-400 text-sm animate-pulse">Te escucho...</span>}
            {isTranslating && <span className="text-blue-400 text-sm animate-pulse">Traduciendo...</span>}
            {error && <span className="text-red-400 text-xs">{error}</span>}
        </div>
      </section>

      {/* 3. Braille Area - Scroll Reader */}
      <section 
        className="flex-grow flex flex-col bg-gray-900 border-t-4 border-gray-800 shadow-inner relative"
        aria-label="Zona de lectura Braille"
      >
        <div className="absolute top-2 left-0 w-full text-center pointer-events-none z-10">
             <span className="text-xs text-gray-500 uppercase tracking-widest bg-gray-900 px-2 rounded opacity-50">Desliza para leer</span>
        </div>

        {/* Central Focus Indicator / Selection Area */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-64 border-4 border-yellow-500/30 rounded-2xl pointer-events-none z-0"></div>

        <div 
            ref={scrollContainerRef}
            // Logic for scrolling reading
            onScroll={handleScroll}
            // Logic for dot scrubbing interaction
            onTouchStart={handleBrailleTouch}
            onTouchMove={handleBrailleTouch}
            onTouchEnd={() => { lastTouchedDotRef.current = null; }}
            
            // Snap scrolling for discrete letter feel
            className="flex-1 overflow-x-auto overflow-y-hidden flex items-center px-[50vw] hide-scrollbar snap-x snap-mandatory"
        >
             <div className="flex gap-20 items-center min-w-full">
                {currentWord ? (
                    brailleData.map((data, index) => (
                        <div key={`${displayMode}-${index}`} className="relative">
                            <BrailleCell 
                                char={data.char} 
                                dots={data.dots} 
                                isActiveChar={true}
                                index={index}
                            />
                            {/* Visual guide below cell */}
                            <div className="absolute -bottom-8 left-0 w-full text-center text-gray-600 text-xs">
                                Letra {index + 1}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="w-full text-center opacity-20 snap-center min-w-[200px]">
                        <div className="text-6xl mb-2">⠃⠗⠇</div>
                        <p className="text-sm">Área Táctil</p>
                    </div>
                )}
             </div>
        </div>
      </section>

    </main>
  );
};

export default App;