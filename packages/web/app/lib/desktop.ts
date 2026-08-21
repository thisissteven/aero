export async function openFolder(path: string): Promise<boolean> {
  const res = await fetch('/api/system/open-folder', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path }),
  });
  return res.ok;
}

export async function openEditor(
  path: string,
  editor = 'code',
): Promise<boolean> {
  const res = await fetch('/api/system/open-editor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, editor }),
  });
  return res.ok;
}

export async function openTerminal(path: string): Promise<boolean> {
  const res = await fetch('/api/system/open-terminal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path }),
  });
  return res.ok;
}
