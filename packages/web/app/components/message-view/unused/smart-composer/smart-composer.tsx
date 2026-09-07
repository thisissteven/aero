import React, { useCallback, useEffect, useRef } from 'react';

import { cn } from '@aero/ui';

import { useComposerClipboard } from '@/app/components/message-view/unused/smart-composer/use-composer-clipboard';

import { ComposerCommandPalette } from './components/composer-cp';
import { ComposerPlaceholder } from './components/composer-placeholder';
import { ComposerTextarea } from './components/composer-text-area';
import { useComposerStore } from './smart-composer-store';
import { useComposerPalette } from './use-composer-palette';
import { useSmartComposer } from './use-smart-composer';

interface AeroSmartChatComposerProps {
  onSubmit?: (payload: {
    text: string;
    segments:
      | ReturnType<typeof useComposerStore.getState>['segments']
      | Array<{
          type: 'shell';
          text: string;
        }>;
  }) => void;

  className?: string;
}

export function AeroSmartChatComposer({
  onSubmit,

  className,
}: AeroSmartChatComposerProps) {
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

  const handleSubmit = useCallback(() => {
    composer.submit(onSubmit);
  }, [composer.submit, onSubmit]);

  const handlePaletteSelect = useCallback(
    (item: Parameters<typeof composer.insertToken>[0]) => {
      if (!palette.activeTrigger) {
        return;
      }

      composer.insertToken(item, palette.activeTrigger.editableOffset);

      palette.close();

      requestAnimationFrame(() => {
        palette.sync();
      });
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
    <div className={cn('text-foreground m-8 space-y-4 font-sans', className)}>
      <h2 className='text-muted mt-6 mb-1 text-[13px]'>Structured Payload</h2>

      <pre
        className={cn(
          'mt-6 max-h-80 overflow-auto',
          'border-border rounded-md border',
          'bg-surface p-4',
          'font-mono text-[13px] leading-[1.5]',
          'break-words whitespace-pre-wrap',
          'text-muted',
          'shadow-[var(--surface-shadow)]',
        )}
      >
        {useComposerStore((state) => state.payload) ? (
          JSON.stringify(useComposerStore.getState().payload, null, 2)
        ) : (
          <strong className='text-foreground'>Awaiting submit...</strong>
        )}
      </pre>

      <div className='relative'>
        <ComposerTextarea
          editorRef={editorRef}
          paletteOpen={palette.open}
          selectedItem={palette.selectedItem}
          onInput={handleInput}
          onCopy={clipboard.handleCopy}
          onPaste={clipboard.handlePaste}
          onSubmit={handleSubmit}
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
          editorRef={editorRef}
          onSelect={handlePaletteSelect}
        />

        <div className='mt-6 flex items-center justify-between gap-3'>
          <div className='text-muted text-[13px]'>
            Enter = submit · Shift+Enter = newline · ↑/↓ = palette
          </div>

          <button
            type='button'
            className={cn(
              'cursor-pointer rounded-md',
              'bg-accent text-accent-foreground',
              'px-4 py-2',
              'text-[13px] font-medium',
              'shadow-[var(--surface-shadow)]',
              'transition-colors',
              'hover:bg-accent-hover',
              'active:bg-accent-hover',
            )}
            onClick={handleSubmit}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
