import { useState } from 'react';

interface HelpTipProps {
  text: string;
  /** Position of tooltip relative to the icon. Default: 'above' */
  position?: 'above' | 'below' | 'left' | 'right';
}

export default function HelpTip({ text, position = 'above' }: HelpTipProps) {
  const [open, setOpen] = useState(false);

  const positionClasses: Record<string, string> = {
    above: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    below: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left:  'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const arrowClasses: Record<string, string> = {
    above: 'top-full left-1/2 -translate-x-1/2 border-t-gray-900',
    below: 'bottom-full left-1/2 -translate-x-1/2 border-b-gray-900',
    left:  'left-full top-1/2 -translate-y-1/2 border-l-gray-900',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-gray-900',
  };

  return (
    <span className="relative inline-flex items-center ml-1 align-middle">
      <button
        type="button"
        className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-200 text-gray-500 text-xs font-semibold hover:bg-amber-100 hover:text-amber-700 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
        aria-label="Help"
      >
        ?
      </button>
      {open && (
        <span
          className={`absolute ${positionClasses[position]} w-60 rounded-lg bg-gray-900 px-3 py-2 text-xs text-white z-50 shadow-xl pointer-events-none`}
          role="tooltip"
        >
          {text}
          <span className={`absolute border-4 border-transparent ${arrowClasses[position]}`} />
        </span>
      )}
    </span>
  );
}
