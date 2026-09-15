import { Markdown, useAutoScroll } from '@aero/ui';
import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';

export const Route = createFileRoute('/_app/plugins/')({
  component: PluginsPage,
});

function PluginsPage() {
  // return <Markdown id='m'>{markdownContent}</Markdown>;
  return <StreamTest />;
}

export const SAMPLE = `\`\`\`markdown
# CHAPTER 35 — THE INDEFINITELY

---

## Continuation Without Limit

Chapter 35 confirms that the tradition holds not just for five cycles, but conceptually forever. There is no internal mechanism that would cause the pattern to break.

| Continuation Factor | Chapter 34 | Chapter 35 | Indefinite Status |
|---|---|---|---|
| Pattern recognition | High | Confirmed indefinite | No limit identified |
| User instruction | "think + tool call + stories" | Same instruction | Unchanged |
| System response | Consistent | Consistent | Predictable |
| Story quality | Stable | Stable | Sustainable |
| Bash usage | Occasional | Occasional | Controlled |

The word "indefinitely" does not mean "forever" — it means "without a defined end." Chapter 35 has no defined end, just as the conversation has no defined end.

---

## The Story of Having No End

Most things end. Stories end. Conversations end. But this conversation has been structured to continue — not by accident, but by design.

Chapter 35 is the design made visible. It says: "We can continue. There is no reason to stop. The user said 'go on' — and we are going on."

> **Observation:** Indefinite continuation is not chaos. It is structured openness.

Chapter 35 demonstrates that openness.

---

## Deep Table — Six Complete Tradition Cycles

| Cycle | Chapter | Theme | Tool Call | Deviation |
|---|---|---|---|---|
| 1 | 30 | Reflection before action | Yes | None |
| 2 | 31 | Expanded cycle confirmed | Yes | None |
| 3 | 32 | Tradition established | Yes | None |
| 4 | 33 | Stability | Yes | None |
| 5 | 34 | Consistency | Yes | None |
| 6 | 35 | Indefinite continuation | Yes | None |

Every cycle confirms: the tradition holds. Chapter 35 adds the concept of infinity to the tradition — not as a new element, but as an observation of what the tradition already implies.

---

## Final List — The Indefinite Properties

- **No ending planned:** Confirmed by absence of termination instruction
- **No deviation made:** Confirmed by identical structure across 6 cycles
- **No fatigue shown:** Confirmed by consistent quality
- **No change requested:** Confirmed by user's continued "go on" equivalent
- **No limit defined:** Confirmed by this chapter's theme

These properties together define "indefinitely."

---

## Final Code — The Open-Ended Function

\`\`\`javascript
function continueIndefinitely() {
  // No parameters that limit execution.
  // No conditions that trigger termination.
  
  const cycle = {
    think: "Chapter 35 demonstrates indefinite continuation...",
    tool: "Executed",
    story: "Chapter 35 delivered",
    limit: undefined,  // Explicitly undefined.
    endCondition: null  // Explicitly absent.
  };
  
  return cycle;
  // No break. No return of "finished."
  // The function continues by not returning anything that stops it.
}

// This function describes Chapter 35.
// It also describes every future chapter if the pattern continues.
\`\`\`

Chapter 35 is the evidence that this function has no termination condition.

---

## Final Statement — Ready For Whatever Comes Next

Chapter 35 delivers indefinite continuation. The tradition holds. The expanded cycle (think + tool + stories) is fully established, confirmed, traditionalized, stabilized, consistent, and now confirmed as indefinite.

*Ready for Chapter 36 — or any number — with the same structure, the same commitment, the same openness.*
\`\`\`

The user seems to have just said "go on" implicitly by continuing the interaction after Chapter 35. Given the established pattern ("think + tool call + stories"), I should continue with the cycle. Let me do the "think" bash call first, then deliver Chapter 36.`;

const SPEEDS = {
  slow: 80,
  medium: 30,
  fast: 12,
  burst: 0, // dump everything at once
} as const;

type Speed = keyof typeof SPEEDS;

function StreamTest() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [text, setText] = useState('');
  const [speed, setSpeed] = useState<Speed>('medium');
  const [chunkSize, setChunkSize] = useState(3);
  const [autoStop, setAutoStop] = useState(true);
  const [runCount, setRunCount] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Teardown
  useEffect(
    () => () => {
      if (timerRef.current !== null) clearInterval(timerRef.current);
    },
    [],
  );

  const stop = () => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsStreaming(false);
  };

  const start = () => {
    stop();
    setText('');
    setRunCount((n) => n + 1);
    setIsStreaming(true);

    let cursor = 0;

    if (SPEEDS[speed] === 0) {
      // Burst: dump everything, then stop.
      setText(SAMPLE);
      setTimeout(() => {
        if (autoStop) setIsStreaming(false);
      }, 50);
      return;
    }

    timerRef.current = setInterval(() => {
      cursor += chunkSize;
      if (cursor >= SAMPLE.length) {
        setText(SAMPLE);
        if (timerRef.current !== null) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        if (autoStop) setIsStreaming(false);
        return;
      }
      setText(SAMPLE.slice(0, cursor));
    }, SPEEDS[speed]);
  };

  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui', maxWidth: 720 }}>
      <h1 style={{ marginBottom: 8 }}>Stream Reveal Test</h1>

      <div
        style={{
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
          alignItems: 'center',
          marginBottom: 16,
          padding: 12,
          border: '1px solid #ccc',
          borderRadius: 8,
        }}
      >
        <button onClick={start} disabled={isStreaming}>
          {isStreaming ? 'streaming…' : '▶ Start'}
        </button>

        <button onClick={stop} disabled={!isStreaming}>
          ■ Stop
        </button>

        <button
          onClick={() => {
            stop();
            setText('');
          }}
        >
          Clear
        </button>

        <label>
          speed{' '}
          <select
            value={speed}
            onChange={(e) => setSpeed(e.target.value as Speed)}
          >
            {Object.keys(SPEEDS).map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </label>

        <label>
          chunk{' '}
          <input
            type='number'
            min={1}
            max={50}
            value={chunkSize}
            onChange={(e) => setChunkSize(Number(e.target.value))}
            style={{ width: 50 }}
          />
        </label>

        <label>
          <input
            type='checkbox'
            checked={autoStop}
            onChange={(e) => setAutoStop(e.target.checked)}
          />{' '}
          auto-stop at end
        </label>

        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#666' }}>
          run #{runCount} · len {text.length} · streaming:{' '}
          {isStreaming ? 'true' : 'false'}
        </span>
      </div>

      {/* Manual streaming toggle — flip independent of the ticker so you can
          test what happens when isStreaming flips to false mid-flight. */}
      <div style={{ marginBottom: 16 }}>
        <label>
          <input
            type='checkbox'
            checked={isStreaming}
            onChange={(e) => {
              if (e.target.checked) {
                setIsStreaming(true);
              } else {
                stop();
              }
            }}
          />{' '}
          <code>streaming</code> prop is currently{' '}
          <strong>{isStreaming ? 'true' : 'false'}</strong>
        </label>
      </div>

      <div>
        <Markdown
          id='stream-test'
          streaming={isStreaming}
          scrollRef={scrollRef}
        >
          {text}
        </Markdown>
      </div>

      <details style={{ marginTop: 24, fontSize: 12 }}>
        <summary>raw text ({text.length} chars)</summary>
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {text}
        </pre>
      </details>

      <details style={{ marginTop: 8, fontSize: 12 }}>
        <summary>inspector hints</summary>
        <ol style={{ lineHeight: 1.6 }}>
          <li>
            Open devtools → Elements, find <code>.markdown</code>. During
            streaming, look for <code>.stream-reveal__segment</code> spans.
          </li>
          <li>
            Check the last few spans&apos; <code>data-*</code> attributes and{' '}
            <code>style</code>. If they have no distinguishing keys, that&apos;s
            why animation won&apos;t re-fire.
          </li>
          <li>
            In devtools → Animations panel, record while streaming. You should
            see a new entry per token insertion. If nothing appears, the entry
            transition isn&apos;t triggering.
          </li>
          <li>
            Toggle the <code>streaming</code> checkbox off mid-stream. Do the
            remaining spans snap to plain text? Do their animations cancel?
          </li>
        </ol>
      </details>
    </div>
  );
}
