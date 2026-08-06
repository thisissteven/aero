import { useEffect, useState } from 'react';

// Renders fallback / placeholder initially, then mounts heavy child after initial layout
export function DeferredView({
  children,
  fallback,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Postpone heavy component mount until idle / post-paint frame
    const id = requestAnimationFrame(() => {
      setReady(true);
    });
    return () => cancelAnimationFrame(id);
  }, []);

  if (!ready) {
    return (
      fallback ?? <div className='bg-muted/40 h-16 animate-pulse rounded' />
    );
  }

  return <>{children}</>;
}
