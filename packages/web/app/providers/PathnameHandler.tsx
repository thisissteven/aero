import { useLocation } from '@tanstack/react-router';
import { useEffect } from 'react';

import { setActiveSessionId } from '@/app/stores/active-session-id';

export function PathnameHandler() {
  const location = useLocation();

  useEffect(() => {
    // Extract session ID from path (e.g., /sessions/ses_123 -> ses_123)
    const match = location.pathname.match(/\/sessions\/([^/]+)/);
    const sessionId = match ? match[1] : null;

    if (sessionId) {
      setActiveSessionId(sessionId);
    }
  }, [location.pathname]);

  return null;
}
