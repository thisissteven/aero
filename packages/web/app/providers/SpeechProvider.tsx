// SpeechContext.tsx
import { useRouter } from '@tanstack/react-router';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

interface SpeechContextType {
  activeId: string | null;
  isSpeaking: boolean;
  isSupported: boolean;
  play: (id: string, text: string) => void;
  stop: () => void;
  toggle: (id: string, text: string) => void;
}

const SpeechContext = createContext<SpeechContextType | null>(null);

export const SpeechProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const router = useRouter();

  const stop = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setActiveId(null);
    setIsSpeaking(false);
  }, []);

  // Listen to TanStack Router route transitions
  useEffect(() => {
    const unsubscribe = router.subscribe('onResolved', () => {
      stop();
    });

    return () => {
      unsubscribe();
    };
  }, [router, stop]);

  const play = useCallback((id: string, text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utteranceRef.current = utterance;

    utterance.onstart = () => {
      setActiveId(id);
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      setActiveId(null);
      setIsSpeaking(false);
    };

    utterance.onerror = () => {
      setActiveId(null);
      setIsSpeaking(false);
    };

    window.speechSynthesis.speak(utterance);
  }, []);

  const toggle = useCallback(
    (id: string, text: string) => {
      if (activeId === id && isSpeaking) {
        stop();
      } else {
        play(id, text);
      }
    },
    [activeId, isSpeaking, play, stop],
  );

  const isSupported =
    typeof window !== 'undefined' && 'speechSynthesis' in window;

  return (
    <SpeechContext.Provider
      value={{ activeId, isSpeaking, play, stop, toggle, isSupported }}
    >
      {children}
    </SpeechContext.Provider>
  );
};

export const useSpeech = () => {
  const context = useContext(SpeechContext);
  if (!context) {
    throw new Error('useSpeech must be used within a SpeechProvider');
  }
  return context;
};
