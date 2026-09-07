import React, { useCallback, useEffect, useRef } from 'react';

import { useComposerClipboard } from '@/app/components/smart-composer/use-composer-clipboard';

import { ComposerCommandPalette } from './components/composer-cp';
import { ComposerPlaceholder } from './components/composer-placeholder';
import { ComposerTextarea } from './components/composer-text-area';
import { useComposerStore } from './smart-composer-store';
import { useComposerPalette } from './use-composer-palette';
import { useSmartComposer } from './use-smart-composer';

interface SmartComposerProps {
  onSubmit?: (payload: {
    text: string;
    segments:
      | ReturnType<typeof useComposerStore.getState>['segments']
      | Array<{
          type: 'shell';
          text: string;
        }>;
  }) => void;

  enabledClassName?: string;
}

export const SmartComposer = React.memo(function SmartComposer({
  onSubmit,
  enabledClassName,
}: SmartComposerProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);

  const clipboard = useComposerClipboard(editorRef);

  const composer = useSmartComposer({
    editorRef,
  });

  const palette = useComposerPalette({
    editorRef,
  });

  const setMode = useComposerStore((state) => state.setMode);

  useEffect(() => {
    composer.initialize();
  }, [composer.initialize]);

  const handleInput = useCallback(() => {
    composer.commitFromDom();
    palette.sync();
  }, [composer.commitFromDom, palette.sync]);

  const handleShellEnter = useCallback(() => {
    setMode('shell');
    palette.close();
    composer.commitFromDom();
  }, [composer.commitFromDom, palette.close, setMode]);

  const handleShellExit = useCallback(() => {
    setMode('normal');
    palette.close();

    requestAnimationFrame(() => {
      editorRef.current?.focus();
      composer.commitFromDom();
    });
  }, [composer.commitFromDom, palette.close, setMode]);

  const handlePaletteSelect = useCallback(
    (item: Parameters<typeof composer.insertToken>[0]) => {
      if (!palette.activeTrigger) {
        return;
      }

      composer.insertToken(item, palette.activeTrigger.editableOffset);

      palette.close();
    },
    [composer.insertToken, palette],
  );

  const handleUndo = useCallback(() => {
    composer.handleUndo();
    palette.close();
  }, [composer.handleUndo, palette.close]);

  const handleRedo = useCallback(() => {
    composer.handleRedo();
    palette.close();
  }, [composer.handleRedo, palette.close]);

  return (
    <div>
      <ComposerTextarea
        enabledClassName={enabledClassName}
        editorRef={editorRef}
        paletteOpen={palette.open}
        selectedItem={palette.selectedItem}
        onInput={handleInput}
        onCopy={clipboard.handleCopy}
        onPaste={clipboard.handlePaste}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onShellEnter={handleShellEnter}
        onShellExit={handleShellExit}
        onPaletteSelect={handlePaletteSelect}
        onPaletteClose={palette.close}
        onPaletteMove={palette.moveSelection}
      />

      <ComposerPlaceholder />

      <ComposerCommandPalette
        open={palette.open}
        results={palette.results}
        selectedIndex={palette.selectedIndex}
        caretRect={palette.caretRect}
        onSelect={handlePaletteSelect}
      />
    </div>
  );
});
