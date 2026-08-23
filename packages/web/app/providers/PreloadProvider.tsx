import { useOpencodeVersion } from '@/app/hooks/api/pool';

export function PreloadProvider() {
  useOpencodeVersion();

  return null;
}
