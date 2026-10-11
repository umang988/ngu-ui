const TAKEN = new Set(['admin', 'root', 'umang']);

/** Pretends to ask a server whether a username is free. Honors the abort signal. */
export function checkUsername(name: string, signal: AbortSignal): Promise<string | undefined> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      resolve(TAKEN.has(name.trim().toLowerCase()) ? `"${name}" is already taken` : undefined);
    }, 600);
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(signal.reason);
    });
  });
}
