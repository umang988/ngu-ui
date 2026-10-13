import { ChangeDetectionStrategy, Component, computed, effect, resource, signal, untracked } from '@angular/core';
import { defineForm, NguForm, NguView, type SubmitAction, type SubmitErrors } from 'ngu-form';
import { deleteMember, EmailTaken, listMembers, saveMember, type Member, type StoredMember } from '../api/fake-team';

const EMPTY: Member = { name: '', email: '', role: 'viewer', teams: [], started: null, active: true, notes: '' };

type Mode = 'view' | 'edit' | 'new';

@Component({
  selector: 'app-team',
  imports: [NguForm, NguView],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="team">
      <section class="team__list" aria-labelledby="team-heading">
        <div class="demo-toolbar team__head">
          <h3 id="team-heading">Members</h3>
          <button type="button" (click)="create()">New member</button>
        </div>
        @if (members(); as list) {
          <ul>
            @for (m of list; track m.id) {
              <li>
                <button type="button" class="team__pick" [attr.aria-current]="m.id === selectedId() ? 'true' : null" (click)="select(m)">
                  <span>{{ m.name }}</span>
                  <small>{{ m.role }}{{ m.active ? '' : ', inactive' }}</small>
                </button>
              </li>
            } @empty {
              <li>No members yet.</li>
            }
          </ul>
        } @else {
          <p>Loading…</p>
        }
      </section>

      <section class="team__detail" aria-labelledby="detail-heading">
        <h3 id="detail-heading" tabindex="-1">{{ heading() }}</h3>
        @switch (mode()) {
          @case ('view') {
            @if (selected()) {
              <ngu-view [form]="member" />
              <div class="demo-toolbar">
                <button type="button" (click)="mode.set('edit')">Edit</button>
                @if (confirming()) {
                  <span>Delete {{ selected()!.name }}?</span>
                  <button type="button" (click)="remove()">Yes, delete</button>
                  <button type="button" (click)="confirming.set(false)">Keep</button>
                } @else {
                  <button type="button" (click)="confirming.set(true)">Delete</button>
                }
              </div>
            } @else {
              <p>Choose a member, or add a new one.</p>
            }
          }
          @default {
            <ngu-form [form]="member" [action]="save" [submitLabel]="mode() === 'new' ? 'Add member' : 'Save changes'" (submitted)="saved()" />
            <button type="button" (click)="cancel()">Cancel</button>
          }
        }
        <p role="status" class="demo-success">{{ notice() }}</p>
      </section>
    </div>
  `,
  styles: `
    .team {
      display: grid;
      grid-template-columns: minmax(12rem, 1fr) 2fr;
      gap: 2rem;
    }
    @media (width < 40rem) {
      .team {
        grid-template-columns: 1fr;
      }
    }
    .team__head {
      justify-content: space-between;
    }
    .team__head h3 {
      margin: 0;
    }
    ul {
      display: grid;
      gap: 0.375rem;
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .team__pick {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      inline-size: 100%;
      padding: 0.5rem 0.75rem;
      border: 1px solid var(--rule, #d0d5dd);
      border-radius: 0.5rem;
      background: transparent;
      color: inherit;
      font: inherit;
      text-align: start;
      cursor: pointer;
    }
    .team__pick small {
      opacity: 0.75;
    }
    .team__pick[aria-current] {
      border-color: currentColor;
      font-weight: 600;
    }
  `,
})
export class TeamPage {
  /** The list from the server; saves and deletes update it in place. */
  protected readonly list = resource({ loader: () => listMembers() });
  protected readonly members = computed(() => this.list.value());
  protected readonly selectedId = signal<number | undefined>(undefined);
  protected readonly selected = computed(() => this.members()?.find((m) => m.id === this.selectedId()));
  protected readonly mode = signal<Mode>('view');
  protected readonly confirming = signal(false);
  protected readonly notice = signal('');
  protected readonly heading = computed(() =>
    this.mode() === 'new' ? 'New member' : this.mode() === 'edit' ? `Edit ${this.selected()?.name}` : (this.selected()?.name ?? 'Details'),
  );

  // One definition for viewing, editing and adding: only the record in it changes.
  protected readonly member = defineForm<Member>(EMPTY, {
    name: { label: 'Name', required: true, maxLength: 60 },
    email: { label: 'Email', type: 'email', required: true },
    role: {
      label: 'Role',
      type: 'radio',
      options: [
        { value: 'admin', label: 'Admin' },
        { value: 'editor', label: 'Editor' },
        { value: 'viewer', label: 'Viewer' },
      ],
    },
    teams: { label: 'Teams', type: 'tags', max: 5, hint: 'Enter adds a team' },
    started: { label: 'Started on', type: 'date' },
    active: { label: 'Active', type: 'switch' },
    notes: { label: 'Notes', type: 'textarea', rows: 2, maxLength: 200, display: (v) => v || 'None' },
  });

  constructor() {
    // Show the first member once the list arrives.
    effect(() => {
      const first = this.members()?.[0];
      if (first && untracked(this.selectedId) === undefined) {
        untracked(() => this.select(first));
      }
    });
  }

  protected select(m: StoredMember): void {
    this.selectedId.set(m.id);
    this.member.reset(toMember(m));
    this.mode.set('view');
    this.confirming.set(false);
  }

  protected create(): void {
    this.member.reset(structuredClone(EMPTY));
    this.mode.set('new');
  }

  protected cancel(): void {
    const current = this.selected();
    this.member.reset(current ? toMember(current) : structuredClone(EMPTY));
    this.mode.set('view');
  }

  /** Saves, or returns the server's errors by field so they show under the fields. */
  protected readonly save: SubmitAction<Member> = async (value) => {
    try {
      const saved = await saveMember(value, this.mode() === 'new' ? undefined : this.selectedId());
      this.list.value.update((list = []) =>
        list.some((m) => m.id === saved.id) ? list.map((m) => (m.id === saved.id ? saved : m)) : [...list, saved],
      );
      this.selectedId.set(saved.id);
      return undefined;
    } catch (error) {
      if (error instanceof EmailTaken) {
        return { email: error.message } satisfies SubmitErrors<Member>;
      }
      return 'The member could not be saved. Try again.';
    }
  };

  protected saved(): void {
    this.notice.set(`Saved ${this.selected()?.name}.`);
    this.mode.set('view');
  }

  protected async remove(): Promise<void> {
    const gone = this.selected();
    if (!gone) return;
    await deleteMember(gone.id);
    const rest = (this.members() ?? []).filter((m) => m.id !== gone.id);
    this.list.value.set(rest);
    this.notice.set(`Deleted ${gone.name}.`);
    if (rest[0]) {
      this.select(rest[0]);
    } else {
      this.selectedId.set(undefined);
      this.member.reset(structuredClone(EMPTY));
    }
  }
}

function toMember({ id: _id, ...member }: StoredMember): Member {
  return structuredClone(member);
}
