import { COMPOSER_TEXTAREA_ID } from '@/app/components/smart-composer/components/composer-text-area';
import { serializeEditor } from '@/app/components/smart-composer/smart-composer-dom';
import { buildText } from '@/app/components/smart-composer/smart-composer-helpers';
import {
  type ComposerPayload,
  getComposerSession,
  useComposerStore,
} from '@/app/components/smart-composer/smart-composer-store';

export function composerSubmitBefore(sessionId: string) {
  const editor = document.getElementById(COMPOSER_TEXTAREA_ID);

  if (!editor) {
    return;
  }

  const state = useComposerStore.getState();
  const { mode } = getComposerSession(state, sessionId);

  const segments = serializeEditor(editor);
  const text = buildText(segments);

  const payload: ComposerPayload =
    mode === 'shell'
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

  state.setPayload(sessionId, payload);
}

export function composerSubmitAfter(sessionId: string) {
  const editor = document.getElementById(COMPOSER_TEXTAREA_ID);

  if (!editor) {
    return;
  }

  editor.innerHTML = '';

  const { setSegments, setMode, initializeHistory } =
    useComposerStore.getState();

  setSegments(sessionId, []);
  setMode(sessionId, 'normal');

  initializeHistory(sessionId, {
    segments: [],
    caret: 0,
    mode: 'normal',
  });

  editor.focus();
}
