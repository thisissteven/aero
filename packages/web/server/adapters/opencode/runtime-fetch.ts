export const isLatin1Safe = (value: string): boolean => {
  for (let i = 0; i < value.length; i += 1) {
    if (value.charCodeAt(i) > 0xff) return false;
  }
  return true;
};

export const runtimeFetch = async (
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> => {
  if (init?.headers) {
    const headers = new Headers(init.headers);
    let dirty = false;
    let encodedDirectoryHint = false;

    headers.forEach((value, key) => {
      if (!isLatin1Safe(value)) {
        headers.set(key, encodeURIComponent(value));
        dirty = true;
        if (key.toLowerCase() === 'x-opencode-directory') {
          encodedDirectoryHint = true;
        }
      }
    });

    if (encodedDirectoryHint) {
      headers.set('x-opencode-directory-encoding', 'uri');
    }

    if (dirty) {
      init = { ...init, headers };
    }
  }

  return fetch(input, init);
};
