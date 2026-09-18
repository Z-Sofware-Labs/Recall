import React from 'react';

interface MathRendererProps {
  text: string;
  className?: string;
}

export function MathRenderer({ text, className = "" }: MathRendererProps) {
  const renderExpression = (s: string): React.ReactNode => {
    if (!s.trim()) return null;

    let cleaned = s.trim();
    while ((cleaned.startsWith('$$') && cleaned.endsWith('$$') && cleaned.length >= 4) ||
           (cleaned.startsWith('$') && cleaned.endsWith('$') && cleaned.length >= 2)) {
      if (cleaned.startsWith('$$')) {
        cleaned = cleaned.slice(2, -2).trim();
      } else {
        cleaned = cleaned.slice(1, -1).trim();
      }
    }
    s = cleaned;

    const sqrtIndex = s.indexOf('sqrt(');
    if (sqrtIndex !== -1) {
      let openBrackets = 1;
      let closeIndex = -1;
      for (let i = sqrtIndex + 5; i < s.length; i++) {
        if (s[i] === '(') openBrackets++;
        else if (s[i] === ')') {
          openBrackets--;
          if (openBrackets === 0) {
            closeIndex = i;
            break;
          }
        }
      }
      if (closeIndex !== -1) {
        const before = s.substring(0, sqrtIndex);
        const inner = s.substring(sqrtIndex + 5, closeIndex);
        const after = s.substring(closeIndex + 1);
        return (
          <>
            {renderExpression(before)}
            <span className="inline-flex items-center align-middle font-mono">
              <span className="text-sm font-bold mr-0.5">√</span>
              <span className="border-t border-slate-700 dark:border-slate-350 px-1 pt-0.5 text-xs font-bold">
                {renderExpression(inner)}
              </span>
            </span>
            {renderExpression(after)}
          </>
        );
      }
    }

    const fracRegex = /\(([^)]+)\)\/\(([^)]+)\)/;
    const fracMatch = s.match(fracRegex);
    if (fracMatch && fracMatch.index !== undefined) {
      const before = s.substring(0, fracMatch.index);
      const num = fracMatch[1];
      const den = fracMatch[2];
      const after = s.substring(fracMatch.index + fracMatch[0].length);
      return (
        <>
          {renderExpression(before)}
          <span className="inline-flex flex-col items-center justify-center align-middle mx-1 font-mono">
            <span className="px-1.5 border-b border-slate-400 dark:border-slate-500 text-xs font-bold">{renderExpression(num)}</span>
            <span className="px-1.5 text-xs font-bold">{renderExpression(den)}</span>
          </span>
          {renderExpression(after)}
        </>
      );
    }

    const simpleFracRegex = /(\b[a-zA-Z0-9]+)\/([a-zA-Z0-9]+\b)/;
    const simpleFracMatch = s.match(simpleFracRegex);
    if (simpleFracMatch && simpleFracMatch.index !== undefined) {
      const before = s.substring(0, simpleFracMatch.index);
      const num = simpleFracMatch[1];
      const den = simpleFracMatch[2];
      const after = s.substring(simpleFracMatch.index + simpleFracMatch[0].length);
      return (
        <>
          {renderExpression(before)}
          <span className="inline-flex flex-col items-center justify-center align-middle mx-1 font-mono">
            <span className="px-1.5 border-b border-slate-400 dark:border-slate-500 text-xs font-bold">{renderExpression(num)}</span>
            <span className="px-1.5 text-xs font-bold">{renderExpression(den)}</span>
          </span>
          {renderExpression(after)}
        </>
      );
    }

    const superGroupRegex = /([a-zA-Z0-9)]+)\^\(([^)]+)\)/;
    const superGroupMatch = s.match(superGroupRegex);
    if (superGroupMatch && superGroupMatch.index !== undefined) {
      const before = s.substring(0, superGroupMatch.index);
      const base = superGroupMatch[1];
      const exp = superGroupMatch[2];
      const after = s.substring(superGroupMatch.index + superGroupMatch[0].length);
      return (
        <>
          {renderExpression(before)}
          <span className="inline-flex items-baseline font-mono font-bold text-xs">
            {renderExpression(base)}
            <sup className="text-[10px] font-bold text-blue-600 dark:text-blue-400 align-super select-none ml-0.5">
              {renderExpression(exp)}
            </sup>
          </span>
          {renderExpression(after)}
        </>
      );
    }

    const superRegex = /([a-zA-Z0-9)]+)\^([a-zA-Z0-9]+)/;
    const superMatch = s.match(superRegex);
    if (superMatch && superMatch.index !== undefined) {
      const before = s.substring(0, superMatch.index);
      const base = superMatch[1];
      const exp = superMatch[2];
      const after = s.substring(superMatch.index + superMatch[0].length);
      return (
        <>
          {renderExpression(before)}
          <span className="inline-flex items-baseline font-mono font-bold text-xs">
            {renderExpression(base)}
            <sup className="text-[10px] font-bold text-blue-600 dark:text-blue-450 align-super select-none ml-0.5">
              {renderExpression(exp)}
            </sup>
          </span>
          {renderExpression(after)}
        </>
      );
    }

    const subGroupRegex = /([a-zA-Z0-9)]+)_\(([^)]+)\)/;
    const subGroupMatch = s.match(subGroupRegex);
    if (subGroupMatch && subGroupMatch.index !== undefined) {
      const before = s.substring(0, subGroupMatch.index);
      const base = subGroupMatch[1];
      const sub = subGroupMatch[2];
      const after = s.substring(subGroupMatch.index + subGroupMatch[0].length);
      return (
        <>
          {renderExpression(before)}
          <span className="inline-flex items-baseline font-mono font-bold text-xs">
            {renderExpression(base)}
            <sub className="text-[10px] font-bold text-purple-600 dark:text-purple-400 align-sub select-none ml-0.5">
              {renderExpression(sub)}
            </sub>
          </span>
          {renderExpression(after)}
        </>
      );
    }

    const subRegex = /([a-zA-Z0-9)]+)_([a-zA-Z0-9]+)/;
    const subMatch = s.match(subRegex);
    if (subMatch && subMatch.index !== undefined) {
      const before = s.substring(0, subMatch.index);
      const base = subMatch[1];
      const sub = subMatch[2];
      const after = s.substring(subMatch.index + subMatch[0].length);
      return (
        <>
          {renderExpression(before)}
          <span className="inline-flex items-baseline font-mono font-bold text-xs">
            {renderExpression(base)}
            <sub className="text-[10px] font-bold text-purple-600 dark:text-purple-400 align-sub select-none ml-0.5">
              {renderExpression(sub)}
            </sub>
          </span>
          {renderExpression(after)}
        </>
      );
    }

    return <span className={`font-mono text-xs font-bold text-slate-800 dark:text-slate-200 ${className}`}>{s}</span>;
  };

  return <>{renderExpression(text)}</>;
}
