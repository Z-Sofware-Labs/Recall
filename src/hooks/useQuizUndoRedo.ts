import { useState, useRef, useEffect, useCallback } from 'react';

export interface UseQuizUndoRedoOptions {
  maxHistory?: number;
  debounceMs?: number;
}

export function useQuizUndoRedo<T>(
  currentState: T,
  onApplyState: (state: T) => void,
  options?: UseQuizUndoRedoOptions
) {
  const maxHistory = options?.maxHistory ?? 50;
  const debounceMs = options?.debounceMs ?? 350;

  const undoStackRef = useRef<T[]>([]);
  const redoStackRef = useRef<T[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const lastRecordedStateRef = useRef<string>(JSON.stringify(currentState));
  const debounceTimerRef = useRef<any>(null);
  const isApplyingHistoryRef = useRef<boolean>(false);

  // Immediately push previous state to undo stack before a major discrete action
  const recordSnapshot = useCallback((stateToRecord: T) => {
    if (isApplyingHistoryRef.current) return;
    const serialized = JSON.stringify(stateToRecord);
    if (serialized === lastRecordedStateRef.current) return;

    try {
      undoStackRef.current.push(JSON.parse(lastRecordedStateRef.current));
      if (undoStackRef.current.length > maxHistory) {
        undoStackRef.current.shift();
      }
      redoStackRef.current = [];
      lastRecordedStateRef.current = serialized;
      setCanUndo(true);
      setCanRedo(false);
    } catch {
      // ignore serialization errors
    }
  }, [maxHistory]);

  // Track state changes automatically with debouncing for typing
  useEffect(() => {
    if (isApplyingHistoryRef.current) {
      isApplyingHistoryRef.current = false;
      return;
    }

    const serialized = JSON.stringify(currentState);
    if (serialized === lastRecordedStateRef.current) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      try {
        undoStackRef.current.push(JSON.parse(lastRecordedStateRef.current));
        if (undoStackRef.current.length > maxHistory) {
          undoStackRef.current.shift();
        }
        redoStackRef.current = [];
        lastRecordedStateRef.current = serialized;
        setCanUndo(true);
        setCanRedo(false);
      } catch {
        // ignore serialization errors
      }
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [currentState, debounceMs, maxHistory]);

  const handleUndo = useCallback(() => {
    if (undoStackRef.current.length === 0) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const previousState = undoStackRef.current.pop()!;
    redoStackRef.current.push(JSON.parse(JSON.stringify(currentState)));

    lastRecordedStateRef.current = JSON.stringify(previousState);
    isApplyingHistoryRef.current = true;

    setCanUndo(undoStackRef.current.length > 0);
    setCanRedo(true);

    onApplyState(previousState);
  }, [currentState, onApplyState]);

  const handleRedo = useCallback(() => {
    if (redoStackRef.current.length === 0) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const nextState = redoStackRef.current.pop()!;
    undoStackRef.current.push(JSON.parse(JSON.stringify(currentState)));

    lastRecordedStateRef.current = JSON.stringify(nextState);
    isApplyingHistoryRef.current = true;

    setCanUndo(true);
    setCanRedo(redoStackRef.current.length > 0);

    onApplyState(nextState);
  }, [currentState, onApplyState]);

  // Global Keyboard shortcuts: Ctrl+Z for Undo, Ctrl+Y / Ctrl+Shift+Z / ⌘Shift+Z for Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      if (!modifier) return;

      if (e.key === 'z' || e.key === 'Z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if (e.key === 'y' || e.key === 'Y') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  return {
    canUndo,
    canRedo,
    handleUndo,
    handleRedo,
    recordSnapshot,
  };
}
