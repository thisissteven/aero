import { Markdown } from '@aero/ui';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/plugins/')({
  component: PluginsPage,
});

function PluginsPage() {
  return <Markdown id='m'>{markdownContent}</Markdown>;
}

export const markdownContent = `# # Header 1
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
