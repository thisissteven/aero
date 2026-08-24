import { useEffect, useState } from 'react';

import {
  AeroConversationTurn,
  AeroPart,
} from '@/server/services/harness/types';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function useMockStreamFeed(
  fullGroups: AeroConversationTurn[],
  enabled = true,
  speed = 1, // 1 = 1x (normal), 2 = 2x faster, 5 = 5x faster, 0.5 = 0.5x (slower)
) {
  const [displayedGroups, setDisplayedGroups] = useState<
    AeroConversationTurn[]
  >([]);
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
    if (!enabled || !fullGroups.length) {
      setDisplayedGroups(fullGroups);
      return;
    }

    let cancelled = false;
    setIsStreaming(true);
    setDisplayedGroups([]);

    // Helper to scale delay time based on speed multiplier
    const delay = (ms: number) => sleep(Math.max(0, ms / Math.max(0.1, speed)));

    async function runStream() {
      let groupsState: AeroConversationTurn[] = [];

      for (const targetTurn of fullGroups) {
        if (cancelled) break;

        if (targetTurn.role === 'user') {
          groupsState = [...groupsState, structuredClone(targetTurn)];
          setDisplayedGroups(groupsState);
          await delay(400);
        } else {
          const assistantTurn: AeroConversationTurn = {
            ...targetTurn,
            parts: [],
          };
          groupsState = [...groupsState, assistantTurn];
          setDisplayedGroups(groupsState);

          const turnIndex = groupsState.length - 1;

          for (const targetPart of targetTurn.parts) {
            if (cancelled) break;

            if (targetPart.type === 'text' || targetPart.type === 'reasoning') {
              const currentPart: AeroPart = { ...targetPart, text: '' };

              groupsState = groupsState.map((turn, tIdx) =>
                tIdx === turnIndex
                  ? { ...turn, parts: [...turn.parts, currentPart] }
                  : turn,
              );
              setDisplayedGroups(groupsState);

              const partIndex = groupsState[turnIndex].parts.length - 1;
              const fullText = targetPart.text;

              // Split text into word tokens (words including trailing spaces)
              const words = fullText.match(/\S+\s*/g) || [];
              const WORDS_PER_CHUNK = 1; // Increase to 2 or 3 if you want larger word chunks
              let accumulatedText = '';

              for (let i = 0; i < words.length; i += WORDS_PER_CHUNK) {
                if (cancelled) break;

                accumulatedText += words.slice(i, i + WORDS_PER_CHUNK).join('');

                groupsState = groupsState.map((turn, tIdx) => {
                  if (tIdx !== turnIndex) return turn;
                  const updatedParts = [...turn.parts];
                  updatedParts[partIndex] = {
                    ...updatedParts[partIndex],
                    text: accumulatedText,
                  } as AeroPart;
                  return { ...turn, parts: updatedParts };
                });

                setDisplayedGroups(groupsState);
                await delay(60); // Adjusted delay for word pace
              }

              if (!cancelled) {
                groupsState = groupsState.map((turn, tIdx) => {
                  if (tIdx !== turnIndex) return turn;
                  const updatedParts = [...turn.parts];
                  updatedParts[partIndex] = {
                    ...updatedParts[partIndex],
                    text: fullText,
                  } as AeroPart;
                  return { ...turn, parts: updatedParts };
                });
                setDisplayedGroups(groupsState);
              }
            } else if (targetPart.type === 'tool') {
              const pendingTool: AeroPart = {
                ...targetPart,
                status: 'pending',
              };

              groupsState = groupsState.map((turn, tIdx) =>
                tIdx === turnIndex
                  ? { ...turn, parts: [...turn.parts, pendingTool] }
                  : turn,
              );
              setDisplayedGroups(groupsState);
              await delay(350);

              if (cancelled) break;

              const partIndex = groupsState[turnIndex].parts.length - 1;

              groupsState = groupsState.map((turn, tIdx) => {
                if (tIdx !== turnIndex) return turn;
                const updatedParts = [...turn.parts];
                updatedParts[partIndex] = {
                  ...updatedParts[partIndex],
                  status: 'running',
                } as AeroPart;
                return { ...turn, parts: updatedParts };
              });
              setDisplayedGroups(groupsState);
              await delay(600);

              if (cancelled) break;

              groupsState = groupsState.map((turn, tIdx) => {
                if (tIdx !== turnIndex) return turn;
                const updatedParts = [...turn.parts];
                updatedParts[partIndex] = { ...targetPart };
                return { ...turn, parts: updatedParts };
              });
              setDisplayedGroups(groupsState);
              await delay(250);
            } else {
              groupsState = groupsState.map((turn, tIdx) =>
                tIdx === turnIndex
                  ? { ...turn, parts: [...turn.parts, targetPart] }
                  : turn,
              );
              setDisplayedGroups(groupsState);
              await delay(100);
            }
          }

          await delay(400);
        }
      }

      if (!cancelled) setIsStreaming(false);
    }

    runStream();

    return () => {
      cancelled = true;
    };
  }, [fullGroups, enabled, speed]);

  return { displayedGroups, isStreaming };
}
