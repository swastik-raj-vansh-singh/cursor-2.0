
import { useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';

interface KeyboardShortcutsProps {
  children: React.ReactNode;
}

export function KeyboardShortcuts({ children }: KeyboardShortcutsProps) {
  const { 
    toggleCommandPalette, 
    isCommandPaletteOpen,
    canUndo,
    undo,
    code,
    suggestionCode,
    setCode
  } = useAppStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K - Open command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggleCommandPalette();
      }
      
      // Cmd/Ctrl + Z - Undo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        if (canUndo()) {
          e.preventDefault();
          undo();
        }
      }
      
      // Cmd/Ctrl + I - Integrate suggestion
      if ((e.metaKey || e.ctrlKey) && e.key === 'i') {
        if (suggestionCode) {
          e.preventDefault();
          setCode(suggestionCode);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [toggleCommandPalette, isCommandPaletteOpen, canUndo, undo, code, suggestionCode, setCode]);
  
  return <>{children}</>;
}
