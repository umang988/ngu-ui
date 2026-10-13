export interface Member {
  name: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  teams: string[];
  started: Date | null;
  active: boolean;
  notes: string;
}

export interface StoredMember extends Member {
  readonly id: number;
}

let nextId = 4;
let stored: StoredMember[] = [
  { id: 1, name: 'Asha Patel', email: 'asha@example.com', role: 'admin', teams: ['platform'], started: new Date(Date.UTC(2023, 3, 3)), active: true, notes: '' },
  { id: 2, name: 'Ravi Kumar', email: 'ravi@example.com', role: 'editor', teams: ['docs', 'design'], started: new Date(Date.UTC(2024, 0, 15)), active: true, notes: 'Owns the style guide.' },
  { id: 3, name: 'Mei Lin', email: 'mei@example.com', role: 'viewer', teams: [], started: null, active: false, notes: '' },
];

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Thrown when another member already has the email. */
export class EmailTaken extends Error {
  constructor(readonly owner: string) {
    super(`Already used by ${owner}`);
  }
}

/** Pretends to list the team. */
export async function listMembers(): Promise<StoredMember[]> {
  await delay(300);
  return structuredClone(stored);
}

/** Pretends to create (no id) or update a member. Emails are unique. */
export async function saveMember(member: Member, id?: number): Promise<StoredMember> {
  await delay(500);
  const owner = stored.find((m) => m.email.toLowerCase() === member.email.toLowerCase() && m.id !== id);
  if (owner) {
    throw new EmailTaken(owner.name);
  }
  const saved: StoredMember = { ...structuredClone(member), id: id ?? nextId++ };
  stored = id === undefined ? [...stored, saved] : stored.map((m) => (m.id === id ? saved : m));
  return structuredClone(saved);
}

/** Pretends to delete a member. */
export async function deleteMember(id: number): Promise<void> {
  await delay(300);
  stored = stored.filter((m) => m.id !== id);
}
