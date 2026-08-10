import { useCallback, useEffect, useRef, useState } from 'react';

interface UseBrowserSpeechOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
  voice?: SpeechSynthesisVoice;
  onStart?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onEnd?: () => void;
  onError?: (event: SpeechSynthesisErrorEvent) => void;
}

export function useBrowserSpeech(
  text: string,
  options: UseBrowserSpeechOptions = {},
) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Keep options in a ref so event handlers always have fresh callbacks
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Cleanup on unmount or text change
  const stop = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setIsPaused(false);
  }, []);

  useEffect(() => {
    return () => {
      stop();
    };
  }, [text, stop]);

  const speak = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      console.warn('SpeechSynthesis API is not supported in this environment.');
      return;
    }

    // Always cancel ongoing speech so reading restarts from the beginning
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utteranceRef.current = utterance;

    // Apply configuration options
    if (optionsRef.current.rate) utterance.rate = optionsRef.current.rate;
    if (optionsRef.current.pitch) utterance.pitch = optionsRef.current.pitch;
    if (optionsRef.current.volume) utterance.volume = optionsRef.current.volume;
    if (optionsRef.current.voice) utterance.voice = optionsRef.current.voice;

    // Event listeners
    utterance.onstart = () => {
      setIsSpeaking(true);
      setIsPaused(false);
      optionsRef.current.onStart?.();
    };

    utterance.onpause = () => {
      setIsPaused(true);
      optionsRef.current.onPause?.();
    };

    utterance.onresume = () => {
      setIsPaused(false);
      optionsRef.current.onResume?.();
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
      optionsRef.current.onEnd?.();
    };

    utterance.onerror = (e) => {
      setIsSpeaking(false);
      setIsPaused(false);
      optionsRef.current.onError?.(e);
    };

    window.speechSynthesis.speak(utterance);
  }, [text]);

  const pause = useCallback(() => {
    if (window.speechSynthesis?.speaking) {
      window.speechSynthesis.pause();
    }
  }, []);

  const resume = useCallback(() => {
    if (window.speechSynthesis?.paused) {
      window.speechSynthesis.resume();
    }
  }, []);

  const toggle = useCallback(() => {
    if (isSpeaking) {
      stop();
    } else {
      speak();
    }
  }, [isSpeaking, stop, speak]);

  return {
    isSpeaking,
    isPaused,
    speak,
    stop,
    pause,
    resume,
    toggle,
    isSupported: typeof window !== 'undefined' && 'speechSynthesis' in window,
  };
}
