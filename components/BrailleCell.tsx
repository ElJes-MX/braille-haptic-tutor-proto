import React, { useCallback, useRef } from 'react';
import { DOT_LABELS } from '../constants';

interface BrailleCellProps {
  char: string;
  dots: boolean[];
  isActiveChar: boolean;
  audioEnabled: boolean; // New prop to toggle voice feedback
}

const BrailleCell: React.FC<BrailleCellProps> = ({ char, dots, isActiveChar, audioEnabled }) => {
  // Refs to track the state of the drag gesture without triggering re-renders
  const lastTouchedElementRef = useRef<HTMLElement | null>(null);

  const triggerFeedback = useCallback((index: number, isActive: boolean) => {
    // 1. Advanced Haptic Feedback (ALWAYS ACTIVE)
    if (navigator.vibrate) {
      if (isActive) {
        // Active Dot: Sharp, strong "bump" simulation
        navigator.vibrate(50);
      } else {
        // Inactive Dot: Very short "tick" or "texture" simulation
        navigator.vibrate(10);
      }
    }

    // 2. Audio Cue (CONDITIONAL)
    if (window.speechSynthesis && audioEnabled) {
        // Cancel any pending speech to ensure immediate feedback for the current dot
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance();
        utterance.lang = 'es-ES';
        utterance.rate = 2.0; // Fast rate for scanning/scrubbing
        
        // Short, concise audio for rapid exploration
        if (isActive) {
             utterance.text = `${index + 1}`; 
        } else {
             // Silence for empty dots to reduce noise, rely on vibration
        }

        if (isActive) {
            window.speechSynthesis.speak(utterance);
        }
    }
  }, [audioEnabled]);

  // Universal handler for processing a specific dot element
  const processDotInteraction = (element: HTMLElement) => {
    // Prevent re-triggering on the exact same element continuously during a slight finger roll
    if (lastTouchedElementRef.current === element) return;

    const indexStr = element.getAttribute('data-dot-index');
    if (indexStr !== null) {
      const index = parseInt(indexStr, 10);
      const isActive = dots[index];
      
      lastTouchedElementRef.current = element;
      triggerFeedback(index, isActive);
    }
  };

  // Handle Touch Move (Scrubbing behavior)
  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement;

    if (element && element.hasAttribute('data-dot-index')) {
      processDotInteraction(element);
    } else {
      lastTouchedElementRef.current = null;
    }
  };

  const handleMouseEnter = (index: number) => {
    triggerFeedback(index, dots[index]);
  };

  return (
    <div 
      className={`
        flex flex-col items-center justify-center p-2 mx-1 my-2 rounded-xl border-2 select-none shrink-0
        transition-colors duration-300
        ${isActiveChar ? 'border-high-contrast-text bg-gray-900' : 'border-gray-700 bg-gray-800 opacity-50'}
      `}
      aria-label={`Carácter Braille para la letra ${char}`}
      onTouchMove={handleTouchMove}
      onTouchStart={handleTouchMove}
      onTouchEnd={() => { lastTouchedElementRef.current = null; }}
      style={{ minWidth: '120px' }} // Ensure cell is wide enough on mobile
    >
      <div className="text-4xl font-bold mb-2 text-white uppercase font-sans pointer-events-none">{char}</div>
      
      {/* Grid for dots: 2 columns, 3 rows - Optimized for touch size */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-4 w-full px-2 justify-items-center">
        {dots.map((isActive, index) => (
          <div
            key={index}
            data-dot-index={index}
            data-active={isActive}
            className={`
              w-12 h-12 rounded-full border-2 
              flex items-center justify-center transition-all duration-100
              ${isActive 
                ? 'bg-braille-active border-braille-active shadow-[0_0_15px_rgba(56,189,248,0.6)]' 
                : 'bg-transparent border-braille-inactive'
              }
            `}
            onMouseEnter={() => handleMouseEnter(index)}
            role="img"
            aria-label={DOT_LABELS[index] + (isActive ? " (Relieve)" : " (Plano)")}
          >
             <span className="sr-only pointer-events-none">{isActive ? "Punto" : "Vacío"}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BrailleCell;