// src/components/RotatingWord.jsx
//
// Cycles through a short list of words, one at a time — used in the landing
// hero to make the headline feel alive without a heavy animation library.
// Sizes itself to the widest word up front (an invisible stack) so the
// layout never jumps as words of different lengths swap in.

import { useEffect, useState } from 'react';

export default function RotatingWord({ words, intervalMs = 2200, className = '' }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (words.length <= 1) return undefined;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    const timer = setInterval(() => setIndex((i) => (i + 1) % words.length), intervalMs);
    return () => clearInterval(timer);
  }, [words, intervalMs]);

  return (
    <span className="relative inline-grid align-bottom">
      {words.map((word) => (
        <span key={word} className="col-start-1 row-start-1 invisible" aria-hidden="true">
          {word}
        </span>
      ))}
      <span key={index} className={`col-start-1 row-start-1 animate-word-rotate ${className}`}>
        {words[index]}
      </span>
    </span>
  );
}
