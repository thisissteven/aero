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
