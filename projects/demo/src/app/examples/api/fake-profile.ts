export interface Profile {
  displayName: string;
  email: string;
  phone: string;
  birthday: Date | null;
  salary: number;
  bio: string;
  notify: { product: boolean; security: boolean };
}

let stored: Profile = {
  displayName: 'Umang T',
  email: 'umang@example.com',
  phone: '9876543210',
  birthday: new Date('1994-08-15'),
  salary: 1250000,
  bio: 'Angular developer. Building ngu-form.',
  notify: { product: false, security: true },
};

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(signal.reason);
    });
  });
}

/** Pretends to load the signed-in user's profile. */
export async function fetchProfile(signal: AbortSignal): Promise<Profile> {
  await delay(1200, signal);
  return structuredClone(stored);
}

/** Pretends to PATCH the profile with only the changed values. */
export async function patchProfile(changes: Partial<Profile>): Promise<void> {
  await delay(600);
  stored = { ...stored, ...structuredClone(changes) } as Profile;
}

const COMMON_DOMAINS = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com'];

/** "ana@gmial.com" → "gmail.com": a domain one or two letters away from a common one. */
export function suggestDomain(email: string): string | undefined {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain || COMMON_DOMAINS.includes(domain)) {
    return undefined;
  }
  return COMMON_DOMAINS.find((d) => distance(d, domain) <= 2);
}

function distance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const next = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = row[j];
      row[j] = next;
    }
  }
  return row[b.length];
}
