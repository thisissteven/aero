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
