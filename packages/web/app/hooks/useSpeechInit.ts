import { useRouter } from '@tanstack/react-router';
import { useEffect } from 'react';

import { useSpeechStore } from '@/app/stores/speech';

export function useSpeechInit() {
  const router = useRouter();
  const loadVoices = useSpeechStore((state) => state.loadVoices);
  const stop = useSpeechStore((state) => state.stop);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    // Load initial voices
    loadVoices();

    // Chrome/Safari fire onvoiceschanged asynchronously
    window.speechSynthesis.onvoiceschanged = () => {
      loadVoices();
    };
  }, [loadVoices]);

  // Stop speech synthesis on route changes
  useEffect(() => {
    const unsubscribe = router.subscribe('onResolved', () => {
      stop();
    });

    return () => {
      unsubscribe();
    };
  }, [router, stop]);
}
