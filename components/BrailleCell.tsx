import React from 'react';
import { DOT_LABELS } from '../constants';

interface BrailleCellProps {
  char: string;
  dots: boolean[];
  isActiveChar: boolean;
  index: number; // Added index to identify the cell in the parent
}

const BrailleCell: React.FC<BrailleCellProps> = ({ char, dots, isActiveChar, index }) => {
  // Note: Touch logic is now handled by the parent container in App.tsx 
  // using document.elementFromPoint to allow continuous sliding between letters.

  return (
    <div 
      // data attributes allow the parent touch handler to identify what is being touched
      data-braille-char={char}
      data-char-index={index}
      className={`
        snap-center shrink-0 flex flex-col items-center justify-center 
        p-2 mx-1 my-2 rounded-xl border-2 select-none 
        transition-colors duration-300
        ${isActiveChar ? 'border-high-contrast-text bg-gray-900' : 'border-gray-700 bg-gray-800 opacity-50'}
      `}
      // touch-action: none is CRITICAL. It tells the browser "Don't scroll when I drag inside this box".
      // This fixes the "letters not fixed" issue by locking scroll while exploring dots.
      style={{ minWidth: '140px', touchAction: 'none' }} 
      aria-label={`Carácter Braille para la letra ${char}`}
    >
      <div className="text-5xl font-bold mb-4 text-white uppercase font-sans pointer-events-none">{char}</div>
      
      {/* Grid for dots: 2 columns, 3 rows */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-6 w-full px-2 justify-items-center pointer-events-none">
        {dots.map((isActive, dotIndex) => (
          <div
            key={dotIndex}
            // Markers for the global touch handler to detect dots
            data-dot-index={dotIndex}
            data-active={isActive ? "true" : "false"}
            // Actual visual dot
            className={`
              w-10 h-10 rounded-full border-2 
              flex items-center justify-center transition-all duration-100 pointer-events-auto
              ${isActive 
                ? 'bg-braille-active border-braille-active shadow-[0_0_15px_rgba(56,189,248,0.6)]' 
                : 'bg-transparent border-braille-inactive'
              }
            `}
            role="img"
            aria-label={DOT_LABELS[dotIndex]}
          >
             <span className="sr-only">{isActive ? "Punto" : "Vacío"}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BrailleCell;