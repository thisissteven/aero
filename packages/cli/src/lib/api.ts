export async function getSessionStatus(port: number, sessionId?: string) {
  try {
    const url = sessionId
      ? `http://localhost:${port}/api/sessions/${sessionId}/status`
      : `http://localhost:${port}/api/sessions/merged?limit=1`;
    const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}
