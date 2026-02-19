import React from 'react';
import { DOT_LABELS } from '../constants';

interface BrailleCellProps {
  char: string;
  dots: boolean[];
  isActiveChar: boolean;
  index: number; // Added index to identify the cell in the parent
}

const BrailleCell: React.FC<BrailleCellProps> = ({ char, dots, isActiveChar, index }) => {
  // Touch logic is handled by the parent container in App.tsx 

  return (
    <div 
      // data attributes allow the parent handler to identify what is being touched
      data-braille-char={char}
      data-char-index={index}
      className={`
        snap-center shrink-0 flex flex-col items-center justify-center 
        p-2 mx-1 my-2 rounded-xl border-2 select-none 
        transition-colors duration-300
        ${isActiveChar ? 'border-high-contrast-text bg-gray-900' : 'border-gray-700 bg-gray-800 opacity-50'}
      `}
      // Re-enabled touch actions (removed touchAction: none) to allow scrolling interaction
      style={{ minWidth: '160px' }} 
      aria-label={`Carácter Braille para la letra ${char}`}
    >
      <div className="text-6xl font-bold mb-6 text-white uppercase font-sans pointer-events-none">{char}</div>
      
      {/* Grid for dots: 2 columns, 3 rows, filled by column (1,2,3 then 4,5,6) */}
      <div className="grid grid-cols-2 grid-rows-3 grid-flow-col gap-x-8 gap-y-6 w-full px-4 justify-items-center pointer-events-none">
        {dots.map((isActive, dotIndex) => (
          <div
            key={dotIndex}
            data-dot-index={dotIndex}
            data-active={isActive ? "true" : "false"}
            className={`
              w-12 h-12 rounded-full border-4 
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