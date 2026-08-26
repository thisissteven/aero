export function capitalizeFirstLetter(str: string) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export const handleDownloadMarkdown = (content: string, filename: string) => {
  // 1. Create a Blob with the markdown content
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });

  // 2. Create a temporary URL for the Blob
  const url = URL.createObjectURL(blob);

  // 3. Create a temporary hidden anchor tag
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.md`;
  document.body.appendChild(link);

  // 4. Trigger the native file save/download dialog
  link.click();

  // 5. Clean up DOM and memory
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export function formatSnakeOrKebabCase(str: string): string {
  if (!str) return '';

  return (
    str
      // 1. Replace underscores and hyphens with spaces
      .replace(/[-_]+/g, ' ')
      // 2. Capitalize the first letter of the string
      .replace(/^./, (char) => char.toUpperCase())
  );
}

export function toTitleCase(str: string): string {
  if (!str) return '';

  return str
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function stripMarkdown(markdown: string): string {
  if (!markdown) return '';

  return (
    markdown
      // Remove headers (# Header)
      .replace(/^#{1,6}\s+/gm, '')
      // Remove code blocks (```code```)
      .replace(/```[\s\S]*?```/g, (match) => match.replace(/```/g, ''))
      // Remove inline code (`code`)
      .replace(/`([^`]+)`/g, '$1')
      // Remove images (![alt](url))
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
      // Remove links ([text](url)) -> keep text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Remove bold and italics (*text*, **text**, _text_, __text__)
      .replace(/(\*\*|__|\*|_)(.*?)\1/g, '$2')
      // Remove strikethrough (~~text~~)
      .replace(/~~(.*?)~~/g, '$1')
      // Remove blockquotes (> quote)
      .replace(/^\s*>\s+/gm, '')
      // Remove horizontal rules (---, ***)
      .replace(/^[-*_]{3,}\s*$/gm, '')
      // Trim extra surrounding whitespace
      .trim()
  );
}

export const copyButtonCss = `
  .t-text-swap {
    --text-swap-dur: 150ms;
    --text-swap-translate-y: 4px;
    --text-swap-blur: 2px;
    --text-swap-ease: ease-in-out;

    display: flex;
    transform: translateY(0);
    filter: blur(0);
    opacity: 1;
    transition:
      transform var(--text-swap-dur) var(--text-swap-ease),
      filter var(--text-swap-dur) var(--text-swap-ease),
      opacity var(--text-swap-dur) var(--text-swap-ease);
    will-change: transform, filter, opacity;
  }

  .t-text-swap.is-exit {
    transform: translateY(calc(var(--text-swap-translate-y) * -1));
    filter: blur(var(--text-swap-blur));
    opacity: 0;
  }

  .t-text-swap.is-enter-start {
    transform: translateY(var(--text-swap-translate-y));
    filter: blur(var(--text-swap-blur));
    opacity: 0;
    transition: none;
  }

  @media (prefers-reduced-motion: reduce) {
    .t-text-swap {
      transition: none !important;
    }
  }
`;
