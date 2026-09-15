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

export const SAMPLE = `# # Header 1
## ## Header 2
### ### Header 3
#### #### Header 4
##### ##### Header 5
###### ###### Header 6

---

## 1. Text Formatting & Inline Elements

* **Bold Text**: **The quick brown fox** or __jumps over the lazy dog__.
* *Italic Text*: *The quick brown fox* or _jumps over the lazy dog_.
* ***Bold and Italic***: ***Strong emphasis*** or ___strong emphasis___.
* ~~Strikethrough~~: ~~This text was removed.~~
* Subscript & Superscript: H~2~O and X^2^
* Footnotes: Here is a sentence with a footnote[^1].
* Combined: **Bold with *italic inside* and ~~strikethrough~~**.

[^1]: This is the footnote text detailing extra information.

---

## 2. Inline Code & Identifiers

Standard inline code: \`const count = 42;\`

File path inline code (testing custom handlers): \`src/components/MarkdownRenderer.tsx\`

Long inline string: \`npm install react-markdown remark-gfm remark-math rehype-katex rehype-raw\`

---

## 3. Blockquotes

> Standard single-line blockquote.
>
> > Nested blockquote level 2.
> > > Nested blockquote level 3.

> **Multi-line quote with formatting:**
> * Item 1 inside blockquote
> * Item 2 with \`inline code\`
> * Table inside quote:
> 
> | Key | Value |
> | :--- | :--- |
> | Env | Production |

---

## 4. Lists & Task Items

### Unordered Lists
* Item 1
* Item 2
  * Nested Sub-item 2.1
  * Nested Sub-item 2.2
    * Deeply nested Sub-item 2.2.1
* Item 3

### Ordered Lists
1. First step
2. Second step
   1. Sub-step A
   2. Sub-step B
3. Third step

### GFM Task Lists
- [x] Completed task item
- [ ] Incomplete task item
- [ ] Task with **bold priority** and \`code tag\`
  - [x] Sub-task checked
  - [ ] Sub-task unchecked

---

## 5. KaTeX Math Expressions

### Inline Math
* Inequality: $\\ge 40$ cases or $\\le 10$ items.
* Variable equations: $E = mc^2$, $a^2 + b^2 = c^2$, or $x \\in \\mathbb{R}$.
* Greek letters & symbols: $\\alpha, \\beta, \\gamma, \\theta, \\int_0^\\infty f(x)dx$.

### Display / Block Math
$$\\lim_{x \\to \\infty} \\left(1 + \\frac{1}{x}\\right)^x = e$$

$$\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix} \\begin{pmatrix} x \\\\ y \\end{pmatrix} = \\begin{pmatrix} ax + by \\\\ cx + dy \\end{pmatrix}$$

---

## 6. Complex GFM Tables & Raw HTML Breaks

| Completion Date | Milestone Event & Description | Status |
| :--- | :--- | :---: |
| **Month 1**<br>*Platform Construction* | Map target systems' capabilities, data flows, and knowledge bases.<br><br>**[Phase Deliverables]**<br>• System Capability Profiles<br>• Initial test suite ($\\\ge 40$ cases) | \`DONE\` |
| **Months 2–3**<br>*Testing & Auditing* | Conduct specialized testing on agents ($\\\le 100$ models).<br><br>Features audited:<br>1. Prompts & RAG<br>2. Tool metadata risk | \`IN_PROGRESS\` |
| **Month 4**<br>*Final Signoff* | Deploy runtime defense prototype.<br>Verify metrics ($x_i \\\ge y_i$). | \`PENDING\` |

---

## 7. Fenced Code Blocks

### TypeScript Block
\`\`\`typescript
interface User {
  id: string;
  role: 'admin' | 'user';
}

export function formatUser(user: User): string {
  return \`User #\${user.id} (\${user.role.toUpperCase()})\`;
}
\`\`\`

### JSON Block
\`\`\`json
{
  "name": "react-markdown-test",
  "version": "1.0.0",
  "dependencies": {
    "react": "^18.0.0",
    "remark-gfm": "^4.0.0"
  }
}
\`\`\`

### Plaintext / Unspecified
\`\`\`
No syntax highlighting configured for this block.
Raw text output verification.
\`\`\`

---

## 8. Embedded Raw HTML

<details>
<summary><b>Click to expand collapsed section (HTML &lt;details&gt;)</b></summary>

<br />

This content is hidden inside a native HTML disclosure element parsed via \`rehype-raw\`.

* Supports list inside HTML tag
* Supports \`inline code\` inside HTML tag

</details>

<br />

<p align="center">
  <b>Centered paragraph using inline HTML styling attributes.</b>
</p>

---

## 9. Links & Images

* Standard Link: [GitHub Homepage](https://github.com)
* Automatic Link: [https://github.com](https://github.com)
* Relative File Link: [View Context](./markdown-file-context.ts)
* Image with Alt Text:

![Placeholder Image](https://via.placeholder.com/600x200.png?text=Markdown+Renderer+Test+Image)`;

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
