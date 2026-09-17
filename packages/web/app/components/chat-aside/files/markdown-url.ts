/**
 * Rewrite a URL found inside a markdown document so it resolves correctly
 * against the file's location on disk, instead of against the page URL.
 *
 * Returns:
 *   - the original URL for external / anchor / data URIs
 *   - an HTTP stream URL for images and other media
 *   - an `fs:<path>` sentinel for links to other project files, which the
 *     markdown preview's <a> handler intercepts and turns into an openFile()
 */
export function resolveMarkdownUrl(
  url: string,
  markdownPath: string,
  kind: 'image' | 'link',
  getFileUrl: (p: string) => string,
): string {
  // Leave external, protocol-relative, anchors, data URIs alone.
  if (
    /^(https?:|mailto:|tel:|data:|blob:|#|\/\/)/i.test(url) ||
    url.startsWith('fs:')
  ) {
    return url;
  }

  // `/foo.png` is project-root-relative in most markdown dialects.
  let target: string;
  if (url.startsWith('/')) {
    target = url.slice(1);
  } else {
    const dir = markdownPath.includes('/')
      ? markdownPath.slice(0, markdownPath.lastIndexOf('/'))
      : '';
    target = normalizeRelative(dir ? `${dir}/${url}` : url);
  }

  return kind === 'image' ? getFileUrl(target) : `fs:${target}`;
}

/** Collapse `./`, `../`, and duplicate slashes without touching the FS. */
function normalizeRelative(p: string): string {
  const out: string[] = [];
  for (const seg of p.split('/')) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') {
      out.pop();
      continue;
    }
    out.push(seg);
  }
  return out.join('/');
}
