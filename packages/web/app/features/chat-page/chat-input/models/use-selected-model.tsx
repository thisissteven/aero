import { useCallback, useEffect, useMemo } from 'react';

import { useNewSessionStore } from '@/app/features/new-session-page/new-session-store';
import {
  SELECTED_MODEL_METADATA_KEY,
  useSelectModelMutation,
  useSessionMetadataValue,
} from '@/app/hooks/api/sessions';
import { getModelKey, SearchableModel } from '@/app/lib/model';
import { useSessionId } from '@/app/providers/SessionIdProvider';

import { useChatSettingsStore } from '../chat-settings-store';

export function useSelectedModel(harnessId?: string): SearchableModel | null {
  const sessionId = useSessionId();

  const searchableModels = useChatSettingsStore((s) => s.searchableModels);
  const storeSelected = useChatSettingsStore((s) => s.selectedModel);

  const newSessionState = useNewSessionStore((s) => s.state);
  const selectedWorkspace = useNewSessionStore((s) => s.selectedWorkspace);
  const modelOverridden = useNewSessionStore((s) => s.modelOverridden);

  const { data } = useSessionMetadataValue<string>(
    harnessId,
    sessionId,
    SELECTED_MODEL_METADATA_KEY,
  );
  const { mutate } = useSelectModelMutation(harnessId, sessionId);

  // Seed: active session with no recorded selection yet inherits the store's
  // persisted value.
  useEffect(() => {
    if (!sessionId || !storeSelected || !data) return;
    if (data.value !== undefined) return;
    mutate({ selectedModelKey: getModelKey(storeSelected) });
  }, [sessionId, storeSelected, data, mutate]);

  const resolved = useMemo(() => {
    // 1. Session metadata.
    if (sessionId) {
      const key = data?.value;
      if (!key) return storeSelected;
      return searchableModels.find((m) => getModelKey(m) === key) ?? null;
    }

    // 2. Workspace default — only when the user hasn't overridden it.
    if (
      newSessionState === 'work' &&
      selectedWorkspace?.defaultModel &&
      !modelOverridden
    ) {
      const found = searchableModels.find(
        (m) => m.model.id === selectedWorkspace.defaultModel,
      );
      if (found) return found;
    }

    // 3. Persisted store.
    return storeSelected;
  }, [
    sessionId,
    data?.value,
    storeSelected,
    searchableModels,
    newSessionState,
    selectedWorkspace,
    modelOverridden,
  ]);

  // Keep `store.selectedModel` in lockstep with the effective model.
  //
  // Variant resolution (`loadVariantForModel`) and variant persistence
  // (`setSelectedVariant`, `cycleVariant`) all read `store.selectedModel`.
  // Without this sync, switching to a session whose metadata names a
  // different model would leave the store pointing at the previous one:
  // variants would render stale AND user picks would persist under the
  // wrong model id, leaking across sessions.
  useEffect(() => {
    if (!sessionId || !resolved) return;

    const current = useChatSettingsStore.getState().selectedModel;
    if (current && getModelKey(current) === getModelKey(resolved)) return;

    useChatSettingsStore.getState().setSelectedModel(resolved);
  }, [sessionId, resolved]);

  return resolved;
}

// `useSetSelectedModel` is unchanged from the previous version.
export function useSetSelectedModel(harnessId?: string) {
  const sessionId = useSessionId();
  const storeSet = useChatSettingsStore((s) => s.setSelectedModel);
  const setModelOverridden = useNewSessionStore((s) => s.setModelOverridden);
  const { mutate } = useSelectModelMutation(harnessId, sessionId);

  return useCallback(
    (model: SearchableModel) => {
      storeSet(model);
      if (sessionId) {
        mutate({ selectedModelKey: getModelKey(model) });
      } else {
        setModelOverridden(true);
      }
    },
    [storeSet, mutate, sessionId, setModelOverridden],
  );
}
