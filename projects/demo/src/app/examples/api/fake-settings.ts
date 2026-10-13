export interface Settings {
  profile: { displayName: string; language: string; timezone: string };
  notifications: { digest: 'never' | 'daily' | 'weekly'; product: boolean; security: boolean };
  privacy: { visibility: 'public' | 'team' | 'private'; showEmail: boolean; searchable: boolean };
}

let stored: Settings = {
  profile: { displayName: 'Umang T', language: 'en', timezone: 'Asia/Kolkata' },
  notifications: { digest: 'weekly', product: false, security: true },
  privacy: { visibility: 'team', showEmail: false, searchable: true },
};

const delay = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(signal.reason);
    });
  });

/** Pretends to load the signed-in user's settings. */
export async function fetchSettings(signal: AbortSignal): Promise<Settings> {
  await delay(500, signal);
  return structuredClone(stored);
}

/**
 * Pretends to PATCH the settings with the changed values only. Fails while the display name
 * is "offline", so the example can show a failed save.
 */
export async function patchSettings(changes: DeepPartialSettings): Promise<void> {
  await delay(400);
  if (changes.profile?.displayName?.trim().toLowerCase() === 'offline') {
    throw new Error('The server could not be reached');
  }
  stored = {
    profile: { ...stored.profile, ...changes.profile },
    notifications: { ...stored.notifications, ...changes.notifications },
    privacy: { ...stored.privacy, ...changes.privacy },
  };
}

export type DeepPartialSettings = { [K in keyof Settings]?: Partial<Settings[K]> };
