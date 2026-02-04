import React, { useState, useEffect, useRef } from 'react';
import { IWindow } from './types';
import { BRAILLE_MAP } from './constants';
import { translateWord } from './services/geminiService';
import BrailleCell from './components/BrailleCell';
import { Mic, Volume2, Globe, Info, Ear, EarOff, ChevronLeft, ChevronRight } from 'lucide-react';

const App: React.FC = () => {
  const [currentWord, setCurrentWord] = useState<string>("");
  const [translatedWord, setTranslatedWord] = useState<string>("");
  const [isListening, setIsListening] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [displayMode, setDisplayMode] = useState<'spanish' | 'english'>('spanish');
  const [error, setError] = useState<string | null>(null);
  const [audioFeedbackEnabled, setAudioFeedbackEnabled] = useState(true);
  
  // State for the currently centered letter index (-1 if no word)
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  // Refs for interactions
  const recordButtonRef = useRef<HTMLButtonElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lastTouchedDotRef = useRef<string | null>(null);

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

  const activeText = displayMode === 'spanish' ? currentWord : translatedWord;
  const brailleData = getBrailleData(activeText || "");

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
        setTranslatedWord(word); // Fallback to original
        speak("Traducción no disponible.", 'es-ES');
        setDisplayMode('spanish');
      } else {
        setTranslatedWord(translation);
        speakMixed("En inglés:", translation, 'en-US');
      }
    } catch (err) {
      console.error(err);
      setError("Error de conexión.");
      setTranslatedWord(word); // Fallback to original
    } finally {
      setIsTranslating(false);
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

  // --- NAVIGATION & SCROLL LOGIC ---

  // Function to programmatically scroll to a specific letter index
  const scrollToIndex = (index: number) => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    
    // The inner flex container (first child) holds the cells
    const innerFlex = container.firstElementChild; 
    if (!innerFlex) return;
    
    // Structure: [Spacer, Cell0, Cell1, ..., Spacer]
    // Index 0 in logic maps to Child 1 in DOM (Child 0 is Spacer)
    const targetCell = innerFlex.children[index + 1] as HTMLElement;
    
    if (targetCell) {
        // Calculate: Position of cell relative to parent - Half viewport + Half cell
        const scrollAmount = targetCell.offsetLeft + (targetCell.offsetWidth / 2) - (container.clientWidth / 2);
        
        container.scrollTo({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Handle scroll events (User Swipe)
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    
    const container = scrollContainerRef.current;
    const containerRect = container.getBoundingClientRect();
    const containerCenter = containerRect.left + (containerRect.width / 2);
    
    // Check inner children
    const cells = Array.from(container.children[0].children) as HTMLElement[]; 
    let closestCell: HTMLElement | null = null;
    let minDistance = Infinity;

    for (const cell of cells) {
      // Look for braille cells only
      if (!cell.hasAttribute('data-char-index')) continue;

      const cellRect = cell.getBoundingClientRect();
      const cellCenter = cellRect.left + (cellRect.width / 2);
      const distance = Math.abs(containerCenter - cellCenter);
      
      if (distance < minDistance) {
        minDistance = distance;
        closestCell = cell;
      }
    }

    // Threshold to consider a cell "active" (e.g. within 60px of center)
    if (closestCell && minDistance < 60) { 
       const newIndex = parseInt((closestCell as HTMLElement).getAttribute('data-char-index') || '-1');
       
       if (newIndex !== -1 && newIndex !== activeIndex) {
          setActiveIndex(newIndex);
          
          const char = (closestCell as HTMLElement).getAttribute('data-braille-char');
          if (char) {
             // Speak letter in CURRENT language only
             const lang = displayMode === 'spanish' ? 'es-ES' : 'en-US';
             speak(char.toUpperCase(), lang, 1.0);
             if (navigator.vibrate) navigator.vibrate(20);
          }
       }
    }
  };

  const handleNext = () => {
    if (activeIndex < brailleData.length - 1) {
        scrollToIndex(activeIndex + 1);
    }
  };

  const handlePrev = () => {
    if (activeIndex > 0) {
        scrollToIndex(activeIndex - 1);
    }
  };

  // --- TOUCH DOT INTERACTION ---
  const handleBrailleTouch = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const target = document.elementFromPoint(touch.clientX, touch.clientY);

    if (!target) return;

    const dotElement = target.closest('[data-dot-index]');
    
    if (dotElement) {
        const dotIndexStr = dotElement.getAttribute('data-dot-index');
        const isActiveStr = dotElement.getAttribute('data-active');
        const uniqueDotId = `${activeIndex}-${dotIndexStr}`;

        if (dotIndexStr && uniqueDotId !== lastTouchedDotRef.current) {
            const dotIndex = parseInt(dotIndexStr);
            const isActive = isActiveStr === "true";
            
            lastTouchedDotRef.current = uniqueDotId;
            
            // Haptics (Always)
            if (navigator.vibrate) {
                navigator.vibrate(isActive ? 50 : 10);
            }

            // Audio for dots
            if (audioFeedbackEnabled && isActive) {
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

  // Reset when word changes
  useEffect(() => {
    lastTouchedDotRef.current = null;
    
    if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({ left: 0, behavior: 'auto' });
    }
    
    if (activeText && activeText.length > 0) {
        setActiveIndex(0);
        // Small timeout to ensure DOM is ready before initial scroll (if needed)
        setTimeout(() => scrollToIndex(0), 50);
    } else {
        setActiveIndex(-1);
    }
  }, [currentWord, displayMode]);

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
                onClick={() => speak("Usa los botones o desliza la barra amarilla inferior para leer cada letra.")}
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

      {/* 3. Braille Area - Scroll Reader with Central Bar */}
      <section 
        className="flex-grow flex flex-col bg-gray-900 border-t-4 border-gray-800 shadow-inner relative"
        aria-label="Zona de lectura Braille"
      >
        {/* Navigation Controls & Label */}
        <div className="absolute top-2 left-0 w-full flex justify-center items-center gap-6 z-20 pointer-events-none">
             <button 
                onClick={handlePrev}
                disabled={activeIndex <= 0 || !currentWord}
                className="pointer-events-auto p-3 bg-gray-800 rounded-full border border-gray-600 text-white active:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed disabled:border-gray-800 transition-colors shadow-lg"
                aria-label="Letra anterior"
             >
                <ChevronLeft size={24} />
             </button>

             <span className="text-xs text-gray-400 uppercase tracking-widest bg-gray-900/90 px-3 py-1 rounded shadow-sm">
                Barra de Lectura
             </span>

             <button 
                onClick={handleNext}
                disabled={activeIndex >= brailleData.length - 1 || !currentWord}
                className="pointer-events-auto p-3 bg-gray-800 rounded-full border border-gray-600 text-white active:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed disabled:border-gray-800 transition-colors shadow-lg"
                aria-label="Letra siguiente"
             >
                <ChevronRight size={24} />
             </button>
        </div>

        {/* --- CENTRAL READING BAR (Visual Indicator) --- */}
        {/* Horizontal Track Line */}
        <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-700/50 -translate-y-1/2 z-0 pointer-events-none"></div>
        
        {/* Scanner Vertical Bar */}
        <div className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2 w-1 bg-yellow-500/50 z-0 pointer-events-none shadow-[0_0_20px_rgba(234,179,8,0.5)]"></div>
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-full border-x-2 border-yellow-500/30 bg-yellow-500/5 pointer-events-none z-0"></div>

        <div 
            ref={scrollContainerRef}
            // Logic for scrolling reading
            onScroll={handleScroll}
            // Logic for dot scrubbing interaction
            onTouchStart={handleBrailleTouch}
            onTouchMove={handleBrailleTouch}
            onTouchEnd={() => { lastTouchedDotRef.current = null; }}
            
            // Snap scrolling
            className="flex-1 overflow-x-auto overflow-y-hidden flex items-center hide-scrollbar snap-x snap-mandatory"
        >
             <div className="flex items-center">
                {/* Spacer Start: Half screen width minus half cell width (approx 80px) to center first item */}
                <div className="shrink-0 w-[calc(50vw-5rem)]"></div>

                {currentWord ? (
                    brailleData.map((data, index) => (
                        <div key={`${displayMode}-${index}`} className="relative snap-center mx-6">
                            <BrailleCell 
                                char={data.char} 
                                dots={data.dots} 
                                isActiveChar={index === activeIndex}
                                index={index}
                            />
                        </div>
                    ))
                ) : (
                    <div className="w-[200px] text-center opacity-20 snap-center mx-auto">
                        <div className="text-6xl mb-2">⠃⠗⠇</div>
                        <p className="text-sm">Área Táctil</p>
                    </div>
                )}

                {/* Spacer End: Ensures last item can reach center */}
                <div className="shrink-0 w-[calc(50vw-5rem)]"></div>
             </div>
        </div>
      </section>

    </main>
  );
};

export default App;