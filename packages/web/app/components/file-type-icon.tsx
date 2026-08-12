import React, { useEffect, useState } from 'react';

import { cn } from '@aero/ui';

import { getFileTypeIconHref } from '@/app/lib/file-icons';

type FileTypeIconProps = {
  filePath: string;
  extension?: string;
  className?: string;
};

// Helper function to resolve the current theme variant
const getSystemOrDomTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'dark';

  // 1. Check if dark class is present on <html> or <body>
  const isDarkClassPresent =
    document.documentElement.classList.contains('dark') ||
    document.body.classList.contains('dark') ||
    document.documentElement.getAttribute('data-theme') === 'dark';

  if (isDarkClassPresent) return 'dark';

  // 2. Fallback to OS system preference
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
};

export const FileTypeIcon: React.FC<FileTypeIconProps> = ({
  filePath,
  extension,
  className,
}) => {
  const [variant, setVariant] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    // Set initial theme on mount
    setVariant(getSystemOrDomTheme());

    // A. Listen for DOM class/attribute updates on <html>
    const observer = new MutationObserver(() => {
      setVariant(getSystemOrDomTheme());
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme'],
    });

    // B. Listen for system preference changes (e.g. OS auto dark-mode)
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleMediaChange = () => setVariant(getSystemOrDomTheme());

    mediaQuery.addEventListener('change', handleMediaChange);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', handleMediaChange);
    };
  }, []);

  const iconHref = getFileTypeIconHref(filePath, {
    extension,
    themeVariant: variant,
  });

  return (
    <svg
      className={cn('block h-4 w-4 flex-shrink-0', className)}
      aria-hidden='true'
      focusable='false'
    >
      <use href={iconHref} xlinkHref={iconHref} />
    </svg>
  );
};
