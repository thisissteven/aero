import { useEffect } from 'react';

import { useCommandPaletteStore } from '@/app/components/command-palette/command-palette-store';
import { useDebounce } from '@/app/hooks/useDebounce';

export function CommandPaletteDebounceSync() {
  const searchValue = useCommandPaletteStore((state) => state.searchValue);
  const setDebouncedSearch = useCommandPaletteStore(
    (state) => state.setDebouncedSearch,
  );
  const debounced = useDebounce(searchValue.trim(), 300);

  useEffect(() => {
    setDebouncedSearch(debounced);
  }, [debounced, setDebouncedSearch]);

  return null;
}
