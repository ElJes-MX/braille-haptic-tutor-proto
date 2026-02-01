import React, { useCallback, useRef } from 'react';
import { DOT_LABELS } from '../constants';

interface BrailleCellProps {
  char: string;
  dots: boolean[];
  isActiveChar: boolean;
}

const BrailleCell: React.FC<BrailleCellProps> = ({ char, dots, isActiveChar }) => {
  // Refs to track the state of the drag gesture without triggering re-renders
  const lastTouchedElementRef = useRef<HTMLElement | null>(null);

  const triggerFeedback = useCallback((index: number, isActive: boolean) => {
    // 1. Advanced Haptic Feedback
    if (navigator.vibrate) {
      if (isActive) {
        // Active Dot: Sharp, strong "bump" simulation
        // 50ms vibration
        navigator.vibrate(50);
      } else {
        // Inactive Dot: Very short "tick" or "texture" simulation
        // This lets the user know they found a dot position, but it's flat
        navigator.vibrate(10);
      }
    }

    // 2. Audio Cue
    if (window.speechSynthesis) {
        // Cancel any pending speech to ensure immediate feedback for the current dot
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance();
        utterance.lang = 'es-ES';
        utterance.rate = 2.0; // Fast rate for scanning/scrubbing
        
        // Short, concise audio for rapid exploration
        if (isActive) {
             utterance.text = `${index + 1}`; 
        } else {
             // Optional: subtle cue for empty or silence. 
             // Using silence or very short "vacio" allows focusing on the active bumps.
             // We will rely on the weak vibration for "empty" texture.
        }

        if (isActive) {
            window.speechSynthesis.speak(utterance);
        }
    }
  }, []);

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
    // Prevent default to ensure no scrolling/pull-refresh happens while tracing
    // Note: e.preventDefault() might be passive in React 18+, handled via CSS `touch-action: none` in App.tsx
    
    const touch = e.touches[0];
    // Identify element under the finger
    const element = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement;

    if (element && element.hasAttribute('data-dot-index')) {
      processDotInteraction(element);
    } else {
      // If we drifted off a dot, reset the ref so we can trigger it again if we slide back
      lastTouchedElementRef.current = null;
    }
  };

  // Handle Mouse/Click for desktop testing
  const handleMouseEnter = (index: number) => {
    // Mock the element structure for the shared logic
    // In a real scenario, we might just call triggerFeedback directly, 
    // but this keeps logic consistent.
    triggerFeedback(index, dots[index]);
  };

  return (
    <div 
      className={`
        flex flex-col items-center justify-center p-4 m-1 rounded-xl border-4 select-none
        transition-colors duration-300
        ${isActiveChar ? 'border-high-contrast-text bg-gray-900' : 'border-gray-700 bg-gray-800 opacity-50'}
      `}
      aria-label={`Carácter Braille para la letra ${char}`}
      onTouchMove={handleTouchMove}
      onTouchStart={handleTouchMove} // Trigger immediately on touch down
      onTouchEnd={() => { lastTouchedElementRef.current = null; }}
    >
      <div className="text-4xl font-bold mb-4 text-white uppercase font-sans pointer-events-none">{char}</div>
      
      {/* Grid for dots: 2 columns, 3 rows */}
      <div className="grid grid-cols-2 gap-5 w-[100px]">
        {dots.map((isActive, index) => (
          <div
            key={index}
            data-dot-index={index}
            data-active={isActive}
            className={`
              w-10 h-10 rounded-full border-2 
              flex items-center justify-center transition-all duration-100
              ${isActive 
                ? 'bg-braille-active border-braille-active shadow-[0_0_10px_rgba(56,189,248,0.8)]' 
                : 'bg-transparent border-braille-inactive'
              }
            `}
            // Use standard events for mouse/desktop accessibility
            onMouseEnter={() => handleMouseEnter(index)}
            // Touch events are handled by the parent container via delegation/elementFromPoint
            // but we keep the aria roles here
            role="img"
            aria-label={DOT_LABELS[index] + (isActive ? " (Relieve)" : " (Plano)")}
          >
             {/* Visual helper: purely decorative, pointer-events-none ensures it doesn't block elementFromPoint detection of the parent div if clicked exactly on center */}
             <span className="sr-only pointer-events-none">{isActive ? "Punto" : "Vacío"}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BrailleCell;