import { COMPOSER_TEXTAREA_ID } from '@/app/components/smart-composer/components/composer-text-area';
import { serializeEditor } from '@/app/components/smart-composer/smart-composer-dom';
import { buildText } from '@/app/components/smart-composer/smart-composer-helpers';
import {
  ComposerPayload,
  useComposerStore,
} from '@/app/components/smart-composer/smart-composer-store';

export function composerSubmitBefore() {
  const editor = document.getElementById(COMPOSER_TEXTAREA_ID);

  if (!editor) {
    return;
  }

  const setPayload = useComposerStore.getState().setPayload;

  const state = useComposerStore.getState();

  const segments = serializeEditor(editor);
  const text = buildText(segments);

  const payload: ComposerPayload =
    state.mode === 'shell'
      ? {
          text,
          segments: [
            {
              type: 'shell',
              text,
            },
          ],
        }
      : {
          text,
          segments,
        };

  setPayload(payload);
}

export function composerSubmitAfter() {
  const editor = document.getElementById(COMPOSER_TEXTAREA_ID);

  if (!editor) {
    return;
  }

  editor.innerHTML = '';

  const setSegments = useComposerStore.getState().setSegments;
  const setMode = useComposerStore.getState().setMode;
  const initializeHistory = useComposerStore.getState().initializeHistory;

  setSegments([]);
  setMode('normal');

  initializeHistory({
    segments: [],
    caret: 0,
    mode: 'normal',
  });

  editor.focus();
}
